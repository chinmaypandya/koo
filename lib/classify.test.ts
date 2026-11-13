import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, longestLine, phones, postId, parseResults, providerOf } from './classify.ts';

test('phones finds numbers from any country, deduped, ignoring prices, dates and post ids', () => {
  assert.deepEqual(phones('feel free to DM/Whatsapp me @ 9003219830. Looking to finalize'), ['9003219830']);
  assert.deepEqual(phones('Call +91 98861 82945 or 098861-82945, alt 7012345678'), ['+91 98861 82945', '7012345678']);
  assert.deepEqual(phones('US +1 (415) 555-2671, UK +44 20 7946 0958'), ['+1 (415) 555-2671', '+44 20 7946 0958']);
  assert.deepEqual(phones('Rent 28000, deposit 1,00,000, from 14-11-2026, post 2643168469514006'), []);
});

test('cleanText drops FB anti-scraping noise; distinct posts get distinct ids', () => {
  const a = 'Facebook Facebook Facebook Facebook\nRavi Kumar\n3h\nf\nb\n2BHK in HSR sector 2, rent 28k, furnished\nLike\nComment';
  const b = 'Facebook\nFacebook\nFacebook\nAsha\n1d\n1RK near Bellandur, 12k, bachelors ok\nLike';
  assert.equal(cleanText(a), 'Ravi Kumar\n2BHK in HSR sector 2, rent 28k, furnished\nLike\nComment');
  assert.equal(longestLine(cleanText(a)), '2BHK in HSR sector 2, rent 28k, furnished');
  assert.notEqual(postId(undefined, longestLine(cleanText(a))), postId(undefined, longestLine(cleanText(b))));
  // Same post seen later (timestamp changed) keeps its id.
  assert.equal(postId(undefined, longestLine(cleanText(a))), postId(undefined, longestLine(cleanText(a.replace('3h', '1d')))));
});

test('providerOf', () => {
  assert.equal(providerOf('sk-ant-api03-x'), 'anthropic');
  assert.equal(providerOf('sk-proj-x'), 'openai');
  assert.equal(providerOf('AIzaSyx'), 'gemini');
  assert.equal(providerOf(''), 'openbroker');
});

test('postId', () => {
  assert.equal(postId('https://www.facebook.com/groups/1/posts/987/?x=1', ''), '987');
  assert.equal(postId('https://www.facebook.com/groups/1/permalink/555/', ''), '555');
  assert.equal(postId('https://www.facebook.com/permalink.php?story_fbid=777&id=1', ''), '777');
  assert.equal(postId('https://www.facebook.com/groups/1/?multi_permalinks=888', ''), '888');
  assert.equal(postId(undefined, 'abc'), postId('#', 'abc'));
  assert.notEqual(postId(undefined, 'abc'), postId(undefined, 'abd'));
});

test('parseResults strips prose around JSON', () => {
  assert.deepEqual(parseResults('Here:\n```json\n[{"id":"1","match":true}]\n```'), [{ id: '1', match: true }]);
  assert.throws(() => parseResults('no json'));
});

test('toIntl makes WhatsApp-ready numbers: own +code wins, trunk 0 dropped, code not doubled', async () => {
  const { toIntl } = await import('./classify.ts');
  assert.equal(toIntl('9003219830', '+91'), '+919003219830');
  assert.equal(toIntl('098861-82945', '+91'), '+919886182945');
  assert.equal(toIntl('919003219830', '+91'), '+919003219830');
  assert.equal(toIntl('+44 20 7946 0958', '+91'), '+442079460958');
  assert.equal(toIntl('9003219830', null), '9003219830');
});
