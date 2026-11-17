// FULGURITE autopilot test (Node). Drives the real sim with the real
// autopilot and reports exact numbers. Run: node tests/autopilot.mjs
// 1. Squall-1 invariant: two runs with seed 1 must be byte-identical in
//    every reported number (kills, score, vein used, steps, outcome).
// 2. Full-game balance: the autopilot plays all 8 squalls on seeds 1 and 7
//    and reports where it ends — a winnable game must be winnable by it.
import { createGame, startRun, step, STEP } from '../game/src/sim.js';
import { createAutopilot, autopilotStep } from '../game/src/shots.js';

function play(seed, maxSeconds, stop) {
  const state = createGame(seed);
  const ctx = createAutopilot();
  startRun(state);
  let steps = 0;
  const maxSteps = Math.floor((maxSeconds * 1000) / STEP);
  const squallLog = [];
  let lastSquall = 1;
  while (steps < maxSteps) {
    autopilotStep(state, ctx);
    step(state, STEP);
    steps += 1;
    if (state.squall !== lastSquall) {
      squallLog.push({ squall: lastSquall, rings: state.rings, score: state.score, kills: state.kills });
      lastSquall = state.squall;
    }
    if (stop(state)) break;
    if (state.screen === 'victory' || state.screen === 'defeat') break;
  }
  return {
    seed,
    screen: state.screen,
    squall: state.squall,
    kills: state.kills,
    score: state.score,
    rings: state.rings,
    failedSqualls: state.failedSqualls,
    relics: [...state.relics],
    veinUsedTotal: Math.round(state.veinUsed),
    discharges: state.stats.discharges,
    ringsDetonated: state.stats.ringsDetonated,
    ventsTriggered: state.stats.ventsTriggered,
    wallsFormed: state.stats.wallsFormed,
    steps,
    squallLog,
  };
}

function invariant(seed) {
  const a = play(seed, 240, (s) => s.squall > 1 || s.screen === 'defeat');
  const b = play(seed, 240, (s) => s.squall > 1 || s.screen === 'defeat');
  const keys = ['screen', 'squall', 'kills', 'score', 'rings', 'failedSqualls', 'veinUsedTotal', 'discharges', 'ringsDetonated', 'ventsTriggered', 'wallsFormed', 'steps'];
  const diffs = keys.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  return { a, b, identical: diffs.length === 0, diffs };
}

console.log('=== FULGURITE autopilot test ===');
const inv = invariant(1);
console.log('--- squall-1 invariant (seed 1, run twice) ---');
console.log(JSON.stringify(inv.a, null, 1));
console.log('identical:', inv.identical, inv.diffs.length ? `DIFFS: ${inv.diffs.join(', ')}` : '');
if (!inv.identical) process.exitCode = 1;

for (const seed of [1, 7]) {
  const full = play(seed, 900, () => false);
  console.log(`--- full game (seed ${seed}) ---`);
  console.log(JSON.stringify(full, null, 1));
}
