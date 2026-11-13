import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortResults } from './sort.ts';

const items = [
  { id: 'a', price: 30000, amenities_score: 0.5 },
  { id: 'b', price: 25000, amenities_score: 0.5 },
  { id: 'c', price: 25000, amenities_score: 1 },
  { id: 'd', price: null, amenities_score: 1 },
];
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).join('');

test('rent ascending first, amenities descending as tie-break, unknown rent last', () => {
  assert.equal(ids(sortResults(items, [{ key: 'price', dir: 1 }, { key: 'amenities_score', dir: -1 }])), 'cbad');
});

test('first selected column wins; empty sort keeps the original order', () => {
  assert.equal(ids(sortResults(items, [{ key: 'amenities_score', dir: -1 }, { key: 'price', dir: 1 }])), 'cdba');
  assert.equal(ids(sortResults(items, [])), 'abcd');
});
