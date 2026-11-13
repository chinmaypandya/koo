import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from './csv.ts';

test('csv quotes commas/quotes/newlines, neutralises formulas, keeps negative numbers', () => {
  const [header, row] = toCsv([
    { seenAt: 0, society_name: 'Sobha, "Dream" Acres', price: 26000, budget_difference: -4000, contact: ['98861 82945', '+91 1'], raw_text: '=HYPERLINK("x")\nline2' },
  ]).split('\r\n');
  assert.ok(header!.startsWith('found_at,society_name,location,bhk,rent,deposit,budget_difference'));
  assert.ok(row!.includes('"Sobha, ""Dream"" Acres"'));
  assert.ok(row!.includes(',26000,,-4000,'));
  assert.ok(row!.includes('98861 82945; +91 1'));
  assert.ok(row!.endsWith(`"'=HYPERLINK(""x"")\nline2"`));
});
