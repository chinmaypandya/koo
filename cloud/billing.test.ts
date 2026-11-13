import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { costInr, creditPaymentStatements, creditsFor, sha256hex, verifyRazorpaySignature } from './billing.ts';

test('a payment is credited exactly once, to the right user, even if the webhook repeats', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  db.prepare('INSERT INTO users (id, email, credits, created_at) VALUES (?, ?, 0, 0)').run('alice', 'a@x');
  db.prepare('INSERT INTO users (id, email, credits, created_at) VALUES (?, ?, 0, 0)').run('bob', 'b@x');
  const credit = (payId: string, user: string, paise: number) => {
    db.exec('BEGIN');
    for (const [sql, args] of creditPaymentStatements(payId, user, paise, creditsFor(paise / 100))) db.prepare(sql).run(...(args as any[]));
    db.exec('COMMIT');
  };
  credit('pay_1', 'alice', 20000); // ₹200 → 100 credits
  credit('pay_1', 'alice', 20000); // Razorpay retry: no effect
  credit('pay_1', 'bob', 20000); // a forged reuse of the same payment id for someone else: no effect
  credit('pay_2', 'bob', 10000); // ₹100 → 50 credits
  const credits = (id: string) => (db.prepare('SELECT credits FROM users WHERE id = ?').get(id) as { credits: number }).credits;
  assert.equal(credits('alice'), 100);
  assert.equal(credits('bob'), 50);
});

test('razorpay signature: accepts the real HMAC, rejects tampered bodies and missing secrets', async () => {
  const body = '{"event":"payment_link.paid"}';
  const { createHmac } = await import('node:crypto');
  const sig = createHmac('sha256', 'whsec').update(body).digest('hex');
  assert.equal(await verifyRazorpaySignature(body, sig, 'whsec'), true);
  assert.equal(await verifyRazorpaySignature(body + ' ', sig, 'whsec'), false);
  assert.equal(await verifyRazorpaySignature(body, sig, ''), false);
  assert.equal(await verifyRazorpaySignature(body, null, 'whsec'), false);
});

test('cost and token hashing', async () => {
  assert.equal(costInr({ input: 1_000_000, output: 500_000 }, 20, 80), 60);
  assert.equal((await sha256hex('abc')).slice(0, 8), 'ba7816bf');
});
