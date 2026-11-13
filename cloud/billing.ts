// Money logic for the paid OpenBroker API, kept pure so it can be unit-tested outside Cloudflare.

// Credit packs in rupees. 1 Koo credit = ₹1 of AI usage; users get half of what they pay (the rest is margin + fees).
export const PACKS = [100, 200, 500] as const;
export const creditsFor = (rupees: number) => rupees / 2;

// Real AI cost of one call in rupees, from the provider's token counts and our configured prices.
export const costInr = (usage: { input: number; output: number }, inrPerMInput: number, inrPerMOutput: number) =>
  (usage.input * inrPerMInput + usage.output * inrPerMOutput) / 1e6;

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const sha256hex = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

// Razorpay signs each webhook body with HMAC-SHA256(webhook secret). Constant-time compare so timing leaks nothing.
export async function verifyRazorpaySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

// Credits a payment exactly once. Run all three statements in one transaction (D1 `batch`). Razorpay retries webhooks,
// so the same payment can arrive many times: the payment row is unique, and credits are only added while `credited = 0`.
export const creditPaymentStatements = (paymentId: string, userId: string, paise: number, credits: number): [string, unknown[]][] => [
  ['INSERT OR IGNORE INTO payments (id, user_id, amount_paise, credits, credited, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    [paymentId, userId, paise, credits, Date.now()]],
  ['UPDATE users SET credits = credits + (SELECT credits FROM payments WHERE id = ? AND credited = 0) WHERE id = (SELECT user_id FROM payments WHERE id = ? AND credited = 0)',
    [paymentId, paymentId]],
  ['UPDATE payments SET credited = 1 WHERE id = ?', [paymentId]],
];
