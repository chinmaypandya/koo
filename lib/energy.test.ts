import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMatches, afterBreak, fullEnergy, isIrritated, tick, type Energy } from './energy.ts';

test('water breaks at 90, 80 … 30, each mark once; +4% does not re-trigger the same mark', () => {
  let e = fullEnergy(0);
  assert.equal(tick(e, 9_000).due, null); // 91
  const at90 = tick(e, 10_000);
  assert.equal(at90.due, 'water');
  e = afterBreak(at90.energy, 'water', 15_000);
  assert.equal(e.level, 94);
  assert.equal(tick(e, 15_000 + 5_000).due, null); // back at 89: the 90 mark is used up
  assert.equal(tick(e, 15_000 + 14_000).due, 'water'); // 80
  // Walk down: the marks hit are exactly 90..30.
  const marks: number[] = [];
  let x: Energy = fullEnergy(0), t = 0;
  while (x.level > 26) {
    t += 1000;
    const r = tick(x, t);
    x = r.energy;
    if (r.due === 'water') { marks.push(x.level); x = afterBreak(x, 'water', t); }
  }
  assert.deepEqual(marks, [90, 80, 70, 60, 50, 40, 30]);
});

test('at 25% or below the energy drink is due and restores 75%; the next water mark is 70', () => {
  const t = tick({ level: 27, lastTick: 0, nextWater: 20 }, 2_000); // 25
  assert.equal(t.due, 'energy');
  const e = afterBreak(t.energy, 'energy', 17_000);
  assert.equal(e.level, 75);
  assert.equal(tick(e, 17_000 + 5_000).due, 'water'); // 70
  assert.equal(tick({ level: 1, lastTick: 0, nextWater: 20 }, 60_000).energy.level, 0);
});

test('matches add 2% each (capped at 100); irritated between 25 and 50', () => {
  assert.equal(addMatches({ level: 40, lastTick: 0, nextWater: 30 }, 3).level, 46);
  assert.equal(addMatches({ level: 99, lastTick: 0, nextWater: 90 }, 3).level, 100);
  assert.equal(isIrritated(49), true);
  assert.equal(isIrritated(50), false);
});
