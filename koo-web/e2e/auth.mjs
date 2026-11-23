// End-to-end check of login + credits against the real Supabase project:
// creates a confirmed throwaway user (admin API, no email sent), logs in through /login.html, expects 🪙 50,
// confirms the user can't raise their own balance, logs out, then deletes the user.
// Needs SUPABASE_URL + SUPABASE_SECRET_KEY (server/.env) and VITE_SUPABASE_PUBLISHABLE_KEY (koo-web/.env); dev server on :5173.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret, VITE_SUPABASE_PUBLISHABLE_KEY: pub } = process.env;
const site = process.argv[2] ?? 'http://localhost:5173';
const email = `koo-e2e-${Date.now()}@example.com`, password = `Koo-${crypto.randomUUID()}`;
const admin = (path, init = {}) => fetch(`${url}/auth/v1/admin/${path}`, { ...init, headers: { apikey: secret, authorization: `Bearer ${secret}`, 'content-type': 'application/json' } });

const created = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })).json();
assert.ok(created.id, `create user failed: ${JSON.stringify(created).slice(0, 200)}`);
try {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${site}/login.html`);
  await page.getByRole('tab', { name: 'Log in' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.locator('form button[type=submit]').click();
  await page.locator('.balance').waitFor({ timeout: 15000 });
  assert.equal((await page.locator('.balance').textContent()).replace(/\D+/g, ''), '50');
  await page.screenshot({ path: 'e2e/out/login.png' });

  // As this user (their own JWT + the public key), try to cheat.
  const token = await page.evaluate(() => JSON.parse(Object.entries(localStorage).find(([k]) => k.endsWith('-auth-token'))[1]).access_token);
  const rest = (path, init = {}) => fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: pub, authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'return=representation' } });
  assert.deepEqual(await (await rest(`credits?user_id=eq.${created.id}`, { method: 'PATCH', body: '{"balance":999}' })).json(), []); // RLS: 0 rows changed
  assert.equal((await rest('rpc/apply_credits', { method: 'POST', body: JSON.stringify({ p_user: created.id, p_delta: 999, p_reason: 'admin' }) })).ok, false);
  assert.equal((await (await rest('credits?select=balance')).json())[0].balance, 50);
  assert.equal((await (await rest('credits?select=user_id')).json()).length, 1); // sees only own row

  // The home page's 🪙 pill shows the balance too; then log out.
  await page.goto(site); await page.waitForTimeout(1500);
  assert.match(await page.locator('.coin b').textContent(), /^50$/);
  await page.goto(`${site}/login.html`);
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.getByRole('tab', { name: 'Sign up' }).waitFor();
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('auth e2e: login, 🪙 50, RLS, pill, logout all OK');
} finally {
  const del = await admin(`users/${created.id}`, { method: 'DELETE' });
  console.log('test user deleted:', del.ok);
}
