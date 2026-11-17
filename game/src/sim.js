// FULGURITE simulation — pure game logic, no canvas, no audio, no window.
// The browser game and the Node autopilot test both drive these functions,
// so a fixed seed replays exactly. Time advances only through step() in
// fixed STEP slices; nothing here reads Date.now or Math.random.
import { OBELISK, RELICS, SQUALLS, TUNE, WRAITH_TYPES, W, H } from './config.js';
import { makeRng, randPick, randRange } from './random.js';
import { addPolyline, addSegment, distToLiveVein, distToSegment, nearestNode, propagate } from './graph.js';

export const STEP = 1000 / 60;

let nextWraithId = 1;

/** A fresh run state. `seed` fixes every spawn, pool and flicker. */
export function createGame(seed = 1) {
  const rng = makeRng(seed);
  const state = {
    seed,
    rng,
    screen: 'title',
    squall: 0,
    failedSqualls: 0,
    score: 0,
    kills: 0,
    best: 0,
    rings: 3,
    maxRings: 3,
    veinBudget: 0,
    veinUsed: 0,
    nodes: [],
    edges: [],
    ringsArmed: [],
    wraiths: [],
    pools: [],
    walls: [],
    scars: [],
    relics: [],
    offer: null,
    spawnLeft: 0,
    spawnTimer: 0,
    bossSpawned: false,
    squallTime: 0,
    cooldown: 0,
    ballAngle: 0,
    ballTimer: 0,
    time: 0,
    flash: 0,
    fx: { bolts: [], particles: [], scorch: [] },
    events: [],
    stats: { discharges: 0, ringsDetonated: 0, ventsTriggered: 0, wallsFormed: 0, relicsTaken: 0 },
    frozenBolt: false,
  };
  return state;
}

/** Begin a run from the title screen: squall 1, full rings, no relics. */
export function startRun(state) {
  const seed = state.seed;
  const best = state.best;
  const fresh = createGame(seed);
  Object.assign(state, fresh);
  state.best = best;
  state.screen = 'play';
  startSquall(state, 1);
}

/** Restart after victory or defeat (same seed: the run is replayable). */
export function restartRun(state) {
  startRun(state);
}

function duneOf(squall) {
  return SQUALLS[squall - 1].dune;
}

/** Place the squall's brine pools: seeded, clear of the Obelisk and each other. */
function placePools(state) {
  const rng = state.rng;
  state.pools = [];
  let guard = 0;
  while (state.pools.length < 3 && guard < 200) {
    guard += 1;
    const x = randRange(rng, 90, W - 90);
    const y = randRange(rng, 90, H - 90);
    if (Math.hypot(x - OBELISK.x, y - OBELISK.y) < 190) continue;
    if (state.pools.some((p) => Math.hypot(p.x - x, p.y - y) < 210)) continue;
    state.pools.push({ x, y, r: 46, vented: false, timer: randRange(rng, 1500, 3500) });
  }
}

/** Open a squall: fresh glass budget, old veins cool into scars, pools reset. */
export function startSquall(state, n) {
  const def = SQUALLS[n - 1];
  for (const e of state.edges) {
    if (e.dead) continue;
    const a = state.nodes[e.a];
    const b = state.nodes[e.b];
    if (a && b) state.scars.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  if (state.scars.length > TUNE.maxScars) state.scars.splice(0, state.scars.length - TUNE.maxScars);
  state.nodes = [];
  state.edges = [];
  state.ringsArmed = [];
  state.squall = n;
  state.dune = duneOf(n);
  state.veinBudget = def.budget + (state.relics.includes('conduit') ? 800 : 0);
  state.veinUsed = 0;
  state.rings = Math.min(state.maxRings, state.rings + 1);
  state.wraiths = [];
  state.spawnLeft = def.count;
  state.spawnTimer = 1200;
  state.bossSpawned = false;
  state.squallTime = 0;
  state.cooldown = 0;
  state.fx.bolts = [];
  placePools(state);
  state.events.push({ kind: 'squall', squall: n });
}

/** Draw a drag polyline into the network. Marks pools the glass crosses. */
export function addVeinPoints(state, points) {
  if (state.screen !== 'play') return [];
  const added = addPolyline(state, points);
  for (const e of added) {
    const a = state.nodes[e.a];
    const b = state.nodes[e.b];
    for (const p of state.pools) {
      if (!p.vented && distToSegment(p.x, p.y, a.x, a.y, b.x, b.y) < p.r) {
        p.vented = true;
        state.events.push({ kind: 'vent-armed', x: p.x, y: p.y });
      }
    }
  }
  return added;
}

/** A jagged sky-to-ground bolt between two points (seeded, so replays match). */
export function makeBolt(state, x1, y1, x2, y2, segments = 9) {
  const pts = [{ x: x1, y: y1 }];
  for (let i = 1; i < segments; i += 1) {
    const t = i / segments;
    const jag = (1 - Math.abs(t - 0.5) * 2) * 26;
    pts.push({
      x: x1 + (x2 - x1) * t + (state.rng() - 0.5) * jag * 2,
      y: y1 + (y2 - y1) * t + (state.rng() - 0.5) * jag,
    });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

/** Strike lightning at (x, y): the nearest vein node carries the arc. */
export function dischargeAt(state, x, y) {
  if (state.screen !== 'play' || state.cooldown > 0) return null;
  state.cooldown = TUNE.dischargeCooldownMs;
  state.stats.discharges += 1;
  const strikes = [];
  const first = nearestNode(state, x, y, TUNE.strikeRadius);
  if (first !== -1) strikes.push(first);
  if (state.relics.includes('fork') && first !== -1) {
    let second = -1;
    let bestD = Infinity;
    for (let i = 0; i < state.nodes.length; i += 1) {
      if (i === first) continue;
      const n = state.nodes[i];
      const d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y);
      if (d < bestD && d < TUNE.strikeRadius * TUNE.strikeRadius) {
        bestD = d;
        second = i;
      }
    }
    if (second !== -1) strikes.push(second);
  }
  let totalKills = 0;
  if (strikes.length === 0) {
    // A bare ground strike: weak, but it still bites.
    const bolt = makeBolt(state, x + (state.rng() - 0.5) * 120, -20, x, y, 7);
    state.fx.bolts.push({ points: bolt, ttl: state.frozenBolt ? -1 : 150, maxTtl: 150 });
    for (const w of [...state.wraiths]) {
      if (Math.hypot(w.x - x, w.y - y) < 42) {
        if (damageWraith(state, w, 1, 'bolt')) totalKills += 1;
      }
    }
    state.flash = 0.5;
    state.events.push({ kind: 'thunder', strong: false });
    return { struck: false, kills: totalKills };
  }
  for (const nodeIdx of strikes) {
    const n = state.nodes[nodeIdx];
    const skyX = n.x + (state.rng() - 0.5) * 160;
    const bolt = makeBolt(state, skyX, -20, n.x, n.y, 10);
    state.fx.bolts.push({ points: bolt, ttl: state.frozenBolt ? -1 : 150, maxTtl: 150 });
    propagate(state, nodeIdx, 100);
  }
  // Every wraith touching a live vein takes the hit.
  for (const w of [...state.wraiths]) {
    const d = distToLiveVein(state, w.x, w.y, TUNE.boltMinEnergy);
    if (d < TUNE.boltKillRadius) {
      if (damageWraith(state, w, 1, 'bolt')) totalKills += 1;
    }
  }
  state.flash = 1;
  state.events.push({ kind: 'thunder', strong: true });
  return { struck: true, kills: totalKills };
}

/** Vitrify a shattered wraith's shell into a permanent crystal wall. */
function vitrify(state, w) {
  if (state.walls.length >= TUNE.maxWalls) return;
  const angle = state.rng() * Math.PI;
  const len = 46;
  const x1 = w.x - Math.cos(angle) * len / 2;
  const y1 = w.y - Math.sin(angle) * len / 2;
  const x2 = w.x + Math.cos(angle) * len / 2;
  const y2 = w.y + Math.sin(angle) * len / 2;
  const a = state.nodes.length;
  state.nodes.push({ x: x1, y: y1 });
  const b = state.nodes.length;
  state.nodes.push({ x: x2, y: y2 });
  const edgeIdx = state.edges.length;
  state.edges.push({ a, b, len, ring: 0, spent: false, energy: 0, flashUntil: 0, wall: true });
  state.walls.push({ x: w.x, y: w.y, angle, len, hp: TUNE.wallHp, edge: edgeIdx });
  state.stats.wallsFormed += 1;
}

/** The wall blocking a point (within radius), or null. */
function wallAt(state, x, y, radius) {
  for (const wall of state.walls) {
    const x1 = wall.x - Math.cos(wall.angle) * wall.len / 2;
    const y1 = wall.y - Math.sin(wall.angle) * wall.len / 2;
    const x2 = wall.x + Math.cos(wall.angle) * wall.len / 2;
    const y2 = wall.y + Math.sin(wall.angle) * wall.len / 2;
    if (distToSegment(x, y, x1, y1, x2, y2) < radius + 8) return wall;
  }
  return null;
}

/** A wall ground to dust: its glass goes dead, never shifting indices. */
function crumbleWall(state, wall) {
  const edge = state.edges[wall.edge];
  if (edge) edge.dead = true;
  state.walls.splice(state.walls.indexOf(wall), 1);
  burst(state, wall.x, wall.y, 8, '#bedcff', 'shard');
  state.events.push({ kind: 'wall-crumble', x: wall.x, y: wall.y });
}

/** Damage a wraith; returns true when it shatters. Handles chains and bosses. */
export function damageWraith(state, w, dmg, cause, depth = 0) {
  if (!state.wraiths.includes(w)) return false;
  w.hp -= dmg;
  if (w.hp > 0) {
    burst(state, w.x, w.y, 4, '#9be8ff', 'spark');
    return false;
  }
  state.wraiths.splice(state.wraiths.indexOf(w), 1);
  state.kills += 1;
  state.score += WRAITH_TYPES[w.type].score;
  burst(state, w.x, w.y, 14, '#ffe9a8', 'shard');
  burst(state, w.x, w.y, 8, '#c9d2e8', 'smoke');
  state.fx.scorch.push({ x: w.x, y: w.y, r: w.radius + 6, life: 30000 });
  if (state.fx.scorch.length > 60) state.fx.scorch.shift();
  state.events.push({ kind: 'shatter', x: w.x, y: w.y, boss: !!WRAITH_TYPES[w.type].boss });
  if (cause === 'bolt' || cause === 'ring') {
    if (state.rng() < TUNE.wallChance) vitrify(state, w);
  }
  if (state.relics.includes('piezo') && depth < 3) {
    for (const o of [...state.wraiths]) {
      if (Math.hypot(o.x - w.x, o.y - w.y) < 70) damageWraith(state, o, 1, 'piezo-chain', depth + 1);
    }
  }
  if (w.type === 'leviathan') {
    for (let i = 0; i < 4; i += 1) {
      spawnWraith(state, 'dust', w.x + (state.rng() - 0.5) * 90, w.y + (state.rng() - 0.5) * 90);
    }
  }
  return true;
}

function burst(state, x, y, n, color, kind) {
  for (let i = 0; i < n; i += 1) {
    const a = state.rng() * Math.PI * 2;
    const sp = 40 + state.rng() * 160;
    state.fx.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 350 + state.rng() * 500,
      maxLife: 850,
      size: 1.5 + state.rng() * 2.5,
      color,
      kind,
    });
  }
  if (state.fx.particles.length > 420) state.fx.particles.splice(0, state.fx.particles.length - 420);
}

/** Spawn one wraith at a point (or a random edge point when none is given). */
export function spawnWraith(state, type, x, y) {
  const def = SQUALLS[state.squall - 1];
  if (x === undefined || y === undefined) {
    // Random border point, clear of the Obelisk.
    for (let tries = 0; tries < 12; tries += 1) {
      const side = Math.floor(state.rng() * 4);
      if (side === 0) { x = 24 + state.rng() * (W - 48); y = 24; }
      else if (side === 1) { x = 24 + state.rng() * (W - 48); y = H - 24; }
      else if (side === 2) { x = 24; y = 24 + state.rng() * (H - 48); }
      else { x = W - 24; y = 24 + state.rng() * (H - 48); }
      if (Math.hypot(x - OBELISK.x, y - OBELISK.y) > 280) break;
    }
  }
  const t = WRAITH_TYPES[type];
  state.wraiths.push({
    id: nextWraithId += 1,
    type,
    x, y,
    hp: t.hp,
    maxHp: t.hp,
    speed: t.speed * def.speed,
    radius: t.radius,
    slowUntil: 0,
    kx: 0,
    ky: 0,
    flickerTimer: type === 'seraph' ? 5000 : 0,
  });
}

function spawnNext(state) {
  const def = SQUALLS[state.squall - 1];
  if (def.boss && !state.bossSpawned) {
    state.bossSpawned = true;
    spawnWraith(state, def.boss);
    return;
  }
  spawnWraith(state, randPick(state.rng, def.kinds));
}

/** Detonate an armed capacitor ring: AoE around its centroid. */
function detonateRing(state, ring) {
  let cx = 0;
  let cy = 0;
  let n = 0;
  for (const ei of ring.edges) {
    const e = state.edges[ei];
    if (!e) continue;
    const a = state.nodes[e.a];
    const b = state.nodes[e.b];
    if (!a || !b) continue;
    cx += a.x + b.x;
    cy += a.y + b.y;
    n += 2;
    e.ring = 0;
    e.spent = true;
  }
  if (n === 0) return;
  cx /= n;
  cy /= n;
  state.stats.ringsDetonated += 1;
  state.score += TUNE.ringDetonateBonus;
  burst(state, cx, cy, 26, '#b86bff', 'spark');
  burst(state, cx, cy, 12, '#5ef2ff', 'smoke');
  state.fx.bolts.push({
    points: makeBolt(state, cx + (state.rng() - 0.5) * 200, -20, cx, cy, 8),
    ttl: 150,
    maxTtl: 150,
  });
  for (const w of [...state.wraiths]) {
    if (Math.hypot(w.x - cx, w.y - cy) < TUNE.ringRadius) damageWraith(state, w, TUNE.ringDamage, 'ring');
  }
  state.flash = Math.max(state.flash, 0.7);
  state.events.push({ kind: 'ring', x: cx, y: cy });
}

/** A steam vent erupts: launch + wound every wraith in its radius. */
function eruptVent(state, pool) {
  const radius = state.relics.includes('geyser') ? TUNE.ventRadius * 1.5 : TUNE.ventRadius;
  state.stats.ventsTriggered += 1;
  for (const w of [...state.wraiths]) {
    const d = Math.hypot(w.x - pool.x, w.y - pool.y);
    if (d < radius) {
      const push = 300 * (1 - d / radius) + 120;
      const ux = d === 0 ? 0 : (w.x - pool.x) / d;
      const uy = d === 0 ? -1 : (w.y - pool.y) / d;
      w.kx += ux * push;
      w.ky += uy * push;
      w.slowUntil = state.time + 1200;
      state.score += TUNE.ventLaunchBonus;
      damageWraith(state, w, TUNE.ventDamage, 'vent');
    }
  }
  for (let i = 0; i < 18; i += 1) {
    state.fx.particles.push({
      x: pool.x + (state.rng() - 0.5) * 50,
      y: pool.y + (state.rng() - 0.5) * 20,
      vx: (state.rng() - 0.5) * 30,
      vy: -60 - state.rng() * 90,
      life: 600 + state.rng() * 600,
      maxLife: 1200,
      size: 3 + state.rng() * 5,
      color: '#d8f6f0',
      kind: 'steam',
    });
  }
  state.events.push({ kind: 'vent', x: pool.x, y: pool.y });
}

function breachObelisk(state, w) {
  state.wraiths.splice(state.wraiths.indexOf(w), 1);
  state.rings -= 1;
  burst(state, OBELISK.x, OBELISK.y, 20, '#ff5d73', 'spark');
  state.events.push({ kind: 'lose-ring', rings: state.rings });
  if (state.rings <= 0) {
    state.failedSqualls += 1;
    state.fx.bolts = [];
    if (state.failedSqualls >= 3 || state.squall === 8) {
      state.screen = 'defeat';
      state.best = Math.max(state.best, state.score);
      state.events.push({ kind: 'defeat' });
    } else {
      state.screen = 'squallfailed';
      state.events.push({ kind: 'squall-failed', squall: state.squall });
    }
  }
}

/** Retry the failed squall with full rings. */
export function retrySquall(state) {
  if (state.screen !== 'squallfailed') return;
  state.rings = state.maxRings;
  state.screen = 'play';
  startSquall(state, state.squall);
}

/** Pick one of the two offered relics, then open the next squall. */
export function chooseRelic(state, index) {
  if (state.screen !== 'relic' || !state.offer) return;
  const id = state.offer[index];
  if (!id) return;
  state.relics.push(id);
  state.stats.relicsTaken += 1;
  if (id === 'skin') {
    state.maxRings = 4;
    state.rings = Math.min(4, state.rings + 1);
  }
  state.offer = null;
  state.screen = 'play';
  startSquall(state, state.squall + 1);
}

/** Offer two unowned relics after a cleared squall (1-7). */
function offerRelics(state) {
  const remaining = Object.keys(RELICS).filter((id) => !state.relics.includes(id));
  if (remaining.length === 0) {
    state.screen = 'play';
    startSquall(state, state.squall + 1);
    return;
  }
  const first = remaining.splice(Math.floor(state.rng() * remaining.length), 1)[0];
  const second = remaining.length > 0
    ? remaining.splice(Math.floor(state.rng() * remaining.length), 1)[0]
    : null;
  state.offer = second ? [first, second] : [first];
  state.screen = 'relic';
}

function clearSquall(state) {
  const bonus = TUNE.squallClearBonus + TUNE.ringBonus * state.rings;
  state.score += bonus;
  state.events.push({ kind: 'squall-clear', squall: state.squall, bonus });
  if (state.squall === 8) {
    state.screen = 'victory';
    state.best = Math.max(state.best, state.score);
    state.events.push({ kind: 'victory' });
    return;
  }
  offerRelics(state);
}

/** One fixed step of the world. Only runs while the screen is 'play'. */
export function step(state, dt) {
  if (state.screen !== 'play') return;
  state.time += dt;
  state.squallTime += dt;
  if (state.cooldown > 0) state.cooldown -= dt;
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt / 220);

  // Spawning.
  if (state.spawnLeft > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnNext(state);
      state.spawnLeft -= 1;
      state.spawnTimer = SQUALLS[state.squall - 1].interval * randRange(state.rng, 0.8, 1.2);
    }
  }

  // Capacitor rings whose charge is up detonate.
  for (const ring of [...state.ringsArmed]) {
    if (state.time >= ring.armUntil) {
      state.ringsArmed.splice(state.ringsArmed.indexOf(ring), 1);
      detonateRing(state, ring);
      if (state.screen !== 'play') return;
    }
  }

  // Steam vents.
  for (const pool of state.pools) {
    if (!pool.vented) continue;
    pool.timer -= dt;
    if (pool.timer <= 0) {
      pool.timer = state.relics.includes('geyser') ? TUNE.ventIntervalMs / 2 : TUNE.ventIntervalMs;
      eruptVent(state, pool);
      if (state.screen !== 'play') return;
    }
  }

  // Ball Lightning roams the Obelisk and zaps.
  if (state.relics.includes('ball')) {
    state.ballAngle += dt * 0.0011;
    state.ballTimer -= dt;
    if (state.ballTimer <= 0) {
      state.ballTimer = 2000;
      const bx = OBELISK.x + Math.cos(state.ballAngle) * 150;
      const by = OBELISK.y + Math.sin(state.ballAngle) * 150;
      let nearest = null;
      let nearestD = 130;
      for (const w of state.wraiths) {
        const d = Math.hypot(w.x - bx, w.y - by);
        if (d < nearestD) {
          nearestD = d;
          nearest = w;
        }
      }
      if (nearest) {
        state.fx.bolts.push({
          points: makeBolt(state, bx, by, nearest.x, nearest.y, 5),
          ttl: 110,
          maxTtl: 110,
        });
        damageWraith(state, nearest, 1, 'ball');
        state.events.push({ kind: 'zap' });
      }
    }
  }

  // Wraiths march on the Obelisk.
  for (const w of [...state.wraiths]) {
    const dx = OBELISK.x - w.x;
    const dy = OBELISK.y - w.y;
    const dist = Math.hypot(dx, dy) || 1;
    const slow = state.time < w.slowUntil ? 0.45 : 1;
    const sp = w.speed * slow * (dt / 1000);
    let nx = w.x + (dx / dist) * sp + w.kx * (dt / 1000);
    let ny = w.y + (dy / dist) * sp + w.ky * (dt / 1000);
    w.kx *= 0.86;
    w.ky *= 0.86;
    // Crystal walls block: slide along them, grinding them down as you push.
    const blocking = wallAt(state, nx, ny, w.radius);
    if (blocking) {
      blocking.hp -= dt / 1000;
      if (blocking.hp <= 0) {
        crumbleWall(state, blocking);
      } else {
        const tx = w.x + (dx / dist) * sp + w.kx * (dt / 1000);
        if (!wallAt(state, tx, w.y, w.radius)) {
          nx = tx;
          ny = w.y;
        } else {
          const uy = w.y + (dy / dist) * sp + w.ky * (dt / 1000);
          if (!wallAt(state, w.x, uy, w.radius)) {
            nx = w.x;
            ny = uy;
          } else {
            nx = w.x;
            ny = w.y;
          }
        }
      }
    }
    w.x = Math.max(14, Math.min(W - 14, nx));
    w.y = Math.max(14, Math.min(H - 14, ny));
    // The Static Seraph flickers toward the Obelisk.
    if (w.type === 'seraph') {
      w.flickerTimer -= dt;
      if (w.flickerTimer <= 0) {
        w.flickerTimer = 5000;
        w.x += (dx / dist) * 100;
        w.y += (dy / dist) * 100;
        burst(state, w.x, w.y, 10, '#b86bff', 'spark');
        state.events.push({ kind: 'flicker' });
      }
    }
    if (Math.hypot(w.x - OBELISK.x, w.y - OBELISK.y) < TUNE.obeliskHitRadius) {
      breachObelisk(state, w);
      if (state.screen !== 'play') return;
    }
  }

  // Squall cleared: nothing left to spawn and nothing left alive.
  if (state.spawnLeft === 0 && state.wraiths.length === 0) {
    clearSquall(state);
    return;
  }

  // Fade old energy off the veins; age particles, scorch and bolts.
  for (const e of state.edges) {
    if (state.time > e.flashUntil) e.energy = 0;
  }
  for (const b of [...state.fx.bolts]) {
    if (b.ttl > 0) {
      b.ttl -= dt;
      if (b.ttl <= 0) state.fx.bolts.splice(state.fx.bolts.indexOf(b), 1);
    }
  }
  for (const p of [...state.fx.particles]) {
    p.x += p.vx * (dt / 1000);
    p.y += p.vy * (dt / 1000);
    p.vy -= p.kind === 'steam' ? 0 : 30 * (dt / 1000);
    p.life -= dt;
    if (p.life <= 0) state.fx.particles.splice(state.fx.particles.indexOf(p), 1);
  }
  for (const s of [...state.fx.scorch]) {
    s.life -= dt;
    if (s.life <= 0) state.fx.scorch.splice(state.fx.scorch.indexOf(s), 1);
  }
}
