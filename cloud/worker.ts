// OpenBroker cloud API (Cloudflare Worker + D1). Users sign in with Google, get an OpenBroker token, buy Koo credits over
// UPI (Razorpay Payment Links), and spend them on AI calls made with OUR provider key. Each user's credits are isolated.
import { classify, MAX_PROMPT, PROVIDERS, type Provider } from '../lib/classify.ts';
import { PACKS, costInr, creditPaymentStatements, creditsFor, sha256hex, verifyRazorpaySignature } from './billing.ts';

// Minimal D1 surface we use (avoids pulling in @cloudflare/workers-types).
interface D1Stmt { bind(...v: unknown[]): D1Stmt; first<T>(): Promise<T | null>; run(): Promise<unknown> }
interface D1 { prepare(sql: string): D1Stmt; batch(s: D1Stmt[]): Promise<unknown> }
interface Env {
  DB: D1;
  LLM_PROVIDER: string; LLM_API_KEY: string; LLM_MODEL?: string; // secret: LLM_API_KEY
  PRICE_INPUT_INR_PER_1M: string; PRICE_OUTPUT_INR_PER_1M: string; // your model's price, in ₹ per 1M tokens
  RZP_KEY_ID: string; RZP_KEY_SECRET: string; RZP_WEBHOOK_SECRET: string; // secrets
}
type User = { id: string; email: string; credits: number };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const fail = (status: number, message: string) => json({ error: { message } }, status);

// The user behind `Authorization: Bearer <token>`; throws a 401 response otherwise.
async function userOf(req: Request, env: Env): Promise<User> {
  const token = req.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  const user = token &&
    (await env.DB.prepare('SELECT u.id, u.email, u.credits FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.hash = ?')
      .bind(await sha256hex(token)).first<User>());
  if (!user) throw fail(401, 'Please sign in again.');
  return user;
}

// Google sign-in: the extension sends a Google access token; we read the account from Google and issue our own token.
async function auth(req: Request, env: Env) {
  const { googleToken } = (await req.json().catch(() => ({}))) as { googleToken?: string };
  const g = googleToken && (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { authorization: `Bearer ${googleToken}` } }));
  if (!g || !g.ok) return fail(401, 'Google sign-in failed.');
  const { sub, email } = (await g.json()) as { sub: string; email: string };
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users (id, email, credits, created_at) VALUES (?, ?, 0, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email')
      .bind(sub, email, Date.now()),
    env.DB.prepare('INSERT INTO tokens (hash, user_id, created_at) VALUES (?, ?, ?)').bind(await sha256hex(token), sub, Date.now()),
  ]);
  const user = await env.DB.prepare('SELECT credits FROM users WHERE id = ?').bind(sub).first<{ credits: number }>();
  return json({ token, email, credits: user?.credits ?? 0 });
}

// Starts a UPI-only Razorpay Payment Link for a fixed pack; the user id travels in `notes` and comes back in the webhook.
async function checkout(req: Request, env: Env) {
  const user = await userOf(req, env);
  const { rupees } = (await req.json().catch(() => ({}))) as { rupees?: number };
  if (!PACKS.includes(rupees as (typeof PACKS)[number])) return fail(400, `Choose one of: ${PACKS.map((p) => `₹${p}`).join(', ')}`);
  const res = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Basic ${btoa(`${env.RZP_KEY_ID}:${env.RZP_KEY_SECRET}`)}` },
    body: JSON.stringify({
      amount: rupees! * 100, currency: 'INR', upi_link: true,
      description: `${creditsFor(rupees!)} Koo credits`,
      customer: { email: user.email },
      notes: { user_id: user.id },
    }),
  });
  const link = (await res.json()) as { short_url?: string; error?: { description?: string } };
  if (!res.ok || !link.short_url) return fail(502, `Payment link failed: ${link.error?.description ?? res.status}`);
  return json({ url: link.short_url });
}

// Razorpay → us when a link is paid. Signature first; then credit exactly once (see creditPaymentStatements).
async function webhook(req: Request, env: Env) {
  const raw = await req.text();
  if (!(await verifyRazorpaySignature(raw, req.headers.get('x-razorpay-signature'), env.RZP_WEBHOOK_SECRET))) return fail(400, 'Bad signature');
  const ev = JSON.parse(raw);
  if (ev.event !== 'payment_link.paid') return json({ ignored: ev.event });
  const payment = ev.payload?.payment?.entity, link = ev.payload?.payment_link?.entity;
  const userId = link?.notes?.user_id ?? payment?.notes?.user_id;
  if (!payment?.id || !userId || !(payment.amount > 0)) return json({ ignored: 'missing payment or user' });
  await env.DB.batch(creditPaymentStatements(payment.id, userId, payment.amount, creditsFor(payment.amount / 100))
    .map(([sql, args]) => env.DB.prepare(sql).bind(...args)));
  return json({ ok: true }); // 2xx tells Razorpay to stop retrying
}

// Paid AI call: same input rules as the local server, then deduct the call's real cost from this user only.
async function classifyPaid(req: Request, env: Env) {
  const user = await userOf(req, env);
  // shortcut: concurrent calls can each pass this check, so a balance can dip slightly below 0; fine at ₹-per-call scale.
  if (user.credits <= 0) return fail(402, 'Out of Koo credits. Buy more in the 🪙 Koo credits panel.');
  const inPrice = Number(env.PRICE_INPUT_INR_PER_1M), outPrice = Number(env.PRICE_OUTPUT_INR_PER_1M);
  if (!(inPrice > 0 && outPrice > 0) || !(env.LLM_PROVIDER in PROVIDERS)) return fail(500, 'Server is not configured.');

  const raw = await req.text();
  if (raw.length > 200_000) return fail(413, 'Request too large');
  let posts, filters, group = '', prompt: string | undefined;
  try {
    const body = JSON.parse(raw);
    if (!Array.isArray(body.posts) || body.posts.length < 1 || body.posts.length > 20) throw 0;
    if (typeof body.group === 'string') group = body.group.slice(0, 200);
    if (typeof body.prompt === 'string') prompt = body.prompt.slice(0, MAX_PROMPT);
    posts = body.posts.map((p: any) => {
      if (typeof p?.id !== 'string' || typeof p?.text !== 'string') throw 0;
      return { id: p.id.slice(0, 100), text: p.text.slice(0, 5000), url: '', group };
    });
    filters = Object.fromEntries(
      Object.entries(body.filters ?? {}).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, (v as string).slice(0, 200)]),
    );
  } catch {
    return fail(400, 'Expected {posts: [{id, text}] (1-20), filters: {...}}');
  }

  const usage = { input: 0, output: 0 };
  let results;
  try {
    results = await classify(posts, filters, env.LLM_API_KEY, env.LLM_PROVIDER as Provider, env.LLM_MODEL, prompt, usage);
  } catch (e: any) {
    console.error('LLM call failed:', e?.message ?? e); // provider errors can echo key fragments: keep them in logs only
    return fail(502, 'The AI provider failed or is busy. Try again in a minute.');
  }
  const cost = costInr(usage, inPrice, outPrice);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').bind(cost, user.id),
    env.DB.prepare('INSERT INTO usage (user_id, posts, input_tokens, output_tokens, cost, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(user.id, posts.length, usage.input, usage.output, cost, Date.now()),
  ]);
  const left = await env.DB.prepare('SELECT credits FROM users WHERE id = ?').bind(user.id).first<{ credits: number }>();
  return json({ results, credits: left?.credits ?? 0, cost });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const route = `${req.method} ${new URL(req.url).pathname}`;
    try {
      if (route === 'POST /auth') return await auth(req, env);
      if (route === 'GET /me') { const u = await userOf(req, env); return json({ email: u.email, credits: u.credits }); }
      if (route === 'POST /checkout') return await checkout(req, env);
      if (route === 'POST /razorpay-webhook') return await webhook(req, env);
      if (route === 'POST /classify') return await classifyPaid(req, env);
      return fail(404, 'Not found');
    } catch (e) {
      if (e instanceof Response) return e; // thrown by userOf
      console.error(e);
      return fail(500, 'Server error');
    }
  },
};
