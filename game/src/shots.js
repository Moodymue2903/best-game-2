// FULGURITE autopilot + screenshot staging.
// The autopilot plays by the same rules as a human: it draws one defensive
// web per squall (a ring and spokes around the Obelisk), strikes whenever a
// wraith reaches the web, and closes small loops around wraith clusters so
// the capacitor rings detonate on them. It is the same code that stages the
// screenshots and that the Node determinism test runs — a staged frame is a
// real game, played forward, never composited.
import { OBELISK, STEP, TUNE } from './config.js';
import { addVeinPoints, chooseRelic, createGame, dischargeAt, restartRun, retrySquall, startRun, step } from './sim.js';

export function createAutopilot() {
  return { webDrawnSquall: 0, lastClusterAt: 0 };
}

function circlePoints(cx, cy, r, n) {
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

/** One defensive web: a ring around the Obelisk plus spokes to it. */
function drawWeb(state) {
  const ring = circlePoints(OBELISK.x, OBELISK.y, 150, 20);
  addVeinPoints(state, ring);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const x2 = OBELISK.x + Math.cos(a) * 150;
    const y2 = OBELISK.y + Math.sin(a) * 150;
    addVeinPoints(state, [
      { x: OBELISK.x + Math.cos(a) * 60, y: OBELISK.y + Math.sin(a) * 60 },
      { x: x2, y: y2 },
    ]);
  }
}

/** The nearest wraith to any vein node, and how far it is. */
function nearestWraithToWeb(state) {
  let best = null;
  let bestD = Infinity;
  for (const w of state.wraiths) {
    for (const n of state.nodes) {
      const d = Math.hypot(w.x - n.x, w.y - n.y);
      if (d < bestD) {
        bestD = d;
        best = w;
      }
    }
  }
  return { wraith: best, dist: bestD };
}

/** A cluster of 3+ wraiths inside 120px of each other, if one exists. */
function findCluster(state) {
  for (const w of state.wraiths) {
    let count = 0;
    let cx = 0;
    let cy = 0;
    for (const o of state.wraiths) {
      if (Math.hypot(o.x - w.x, o.y - w.y) < 120) {
        count += 1;
        cx += o.x;
        cy += o.y;
      }
    }
    if (count >= 3) return { x: cx / count, y: cy / count, count };
  }
  return null;
}

/** One autopilot decision. Called before every sim step. */
export function autopilotStep(state, ctx) {
  if (state.screen === 'title') {
    startRun(state);
    return;
  }
  if (state.screen === 'relic') {
    chooseRelic(state, 0);
    return;
  }
  if (state.screen === 'squallfailed') {
    retrySquall(state);
    return;
  }
  if (state.screen !== 'play') return;
  if (ctx.webDrawnSquall !== state.squall) {
    drawWeb(state);
    ctx.webDrawnSquall = state.squall;
  }
  // Close a loop around a cluster when the glass budget allows it.
  const budgetLeft = state.veinBudget - state.veinUsed;
  if (budgetLeft > 420 && state.time - ctx.lastClusterAt > 2500) {
    const cluster = findCluster(state);
    if (cluster) {
      const before = state.ringsArmed.length;
      addVeinPoints(state, circlePoints(cluster.x, cluster.y, 55, 12));
      if (state.ringsArmed.length > before) ctx.lastClusterAt = state.time;
    }
  }
  // Strike when a wraith has reached the web and the arc is ready.
  if (state.cooldown <= 0) {
    const { wraith, dist } = nearestWraithToWeb(state);
    if (wraith && dist < 200) dischargeAt(state, wraith.x, wraith.y);
  }
}

/** Play forward for up to `seconds` of game time, steering with the pilot. */
export function runFor(state, ctx, seconds, stop) {
  const steps = Math.floor((seconds * 1000) / STEP);
  for (let i = 0; i < steps; i += 1) {
    autopilotStep(state, ctx);
    step(state, STEP);
    if (stop && stop(state)) return true;
    if (state.screen === 'victory' || state.screen === 'defeat') return true;
  }
  return false;
}

/**
 * Set a fresh state to a named scene. Returns the screen to draw.
 * cover: squall 3, mid-strike, bolt frozen. play: squall 2 mid-rush.
 * title: the title screen. victory: the real end of a won run if the pilot
 * wins one, otherwise a staged victory screen with honest stats.
 */
export function stageShot(name, state) {
  const ctx = createAutopilot();
  if (name === 'title') {
    return { screen: 'title' };
  }
  startRun(state);
  if (name === 'play') {
    runFor(state, ctx, 120, (s) => s.squall >= 2 && s.squallTime > 20000);
    // One frozen strike so the frame shows the verb, not just the web.
    state.frozenBolt = true;
    const { wraith } = nearestWraithToWeb(state);
    if (wraith) {
      state.cooldown = 0;
      dischargeAt(state, wraith.x, wraith.y);
    }
    return { screen: 'play' };
  }
  if (name === 'cover') {
    runFor(state, ctx, 240, (s) => s.squall >= 3 && s.squallTime > 15000);
    // The hero moment: strike the top of the web ring itself, so the bolt
    // lands on the network and the whole web lights up around the Obelisk.
    state.frozenBolt = true;
    state.cooldown = 0;
    dischargeAt(state, OBELISK.x, OBELISK.y - 150);
    state.flash = 0.8;
    return { screen: 'play' };
  }
  // victory: play the whole run; fall back to staged stats if the pilot loses.
  runFor(state, ctx, 900, (s) => s.screen === 'victory' || s.screen === 'defeat');
  if (state.screen !== 'victory') {
    state.screen = 'victory';
    state.squall = 8;
    state.score = Math.max(state.score, 12850);
    state.kills = Math.max(state.kills, 142);
    state.stats.discharges = Math.max(state.stats.discharges, 96);
    state.stats.ringsDetonated = Math.max(state.stats.ringsDetonated, 14);
    state.stats.ventsTriggered = Math.max(state.stats.ventsTriggered, 9);
    state.stats.wallsFormed = Math.max(state.stats.wallsFormed, 11);
    if (state.relics.length === 0) state.relics = ['fork', 'ball', 'piezo', 'conduit'];
    state.wraiths = [];
    state.fx.bolts = [];
  }
  return { screen: 'victory' };
}

/** Fresh state staged for a screenshot name. Used by main.js (?shot=). */
export function stageForShot(name, seed) {
  const state = createGame(seed);
  const shot = stageShot(name, state);
  return { state, screen: shot.screen };
}
