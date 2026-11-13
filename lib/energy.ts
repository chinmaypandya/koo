// Koo's energy (0–100%, shown as a 10-segment bar that drains continuously). Never reaches 0.
export const ENERGY = {
  drainPerSecond: 1,
  firstWaterAt: 90, // water breaks at 90, 80, 70 … 30, each mark once on the way down
  lastWaterAt: 30,
  waterBreakMs: 5_000,
  waterGain: 4,
  matchGain: 2, // per matching flat
  irritatedBelow: 50, // 25–50% → irritated (still searching)
  energyDrinkAt: 25, // at or below: 15s energy drink back to 75%
  energyDrinkMs: 15_000,
  energyDrinkTo: 75,
} as const;

// nextWater: the next 10% mark that triggers a water break (it only moves down, so +4% from water can't re-trigger it).
export type Energy = { level: number; lastTick: number; nextWater: number };
export type Break = 'water' | 'energy' | null;

export const fullEnergy = (now: number): Energy => ({ level: 100, lastTick: now, nextWater: ENERGY.firstWaterAt });

// Drains for the time since the last tick, then says which break (if any) is due. The energy drink wins over water.
export function tick(e: Energy, now: number): { energy: Energy; due: Break } {
  const level = Math.max(0, e.level - ((now - e.lastTick) / 1000) * ENERGY.drainPerSecond);
  const energy = { ...e, level, lastTick: now };
  const due = level <= ENERGY.energyDrinkAt ? 'energy' : e.nextWater >= ENERGY.lastWaterAt && level <= e.nextWater ? 'water' : null;
  return { energy, due };
}

// Applied when a break finishes (no drain is counted for the break itself).
export function afterBreak(e: Energy, kind: 'water' | 'energy', now: number): Energy {
  if (kind === 'energy') return { level: Math.max(e.level, ENERGY.energyDrinkTo), lastTick: now, nextWater: ENERGY.energyDrinkTo - 5 };
  return { level: Math.min(100, e.level + ENERGY.waterGain), lastTick: now, nextWater: e.nextWater - 10 };
}

export const addMatches = (e: Energy, n: number): Energy => ({ ...e, level: Math.min(100, e.level + n * ENERGY.matchGain) });

export const isIrritated = (level: number) => level < ENERGY.irritatedBelow;
