// VeinGraph — the conductive network the player draws in the sand.
// Nodes are points, edges are glass segments. The graph answers three
// questions: does this new segment close a loop (capacitor ring)?, how does
// a lightning strike spread from a node (decay + branching)?, and how far is
// a wraith from the nearest live vein? Everything here is pure arithmetic on
// the state's arrays, so the Node autopilot test runs the same code as the
// browser game.
import { TUNE } from './config.js';

/** Squared distance from point p to segment ab. */
export function distToSegmentSq(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
}

export function distToSegment(px, py, ax, ay, bx, by) {
  return Math.sqrt(distToSegmentSq(px, py, ax, ay, bx, by));
}

/** Find the node index nearest to (x, y), or -1 when none is within maxDist. */
export function nearestNode(state, x, y, maxDist) {
  let best = -1;
  let bestD = maxDist * maxDist;
  for (let i = 0; i < state.nodes.length; i += 1) {
    const n = state.nodes[i];
    const d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Add one glass segment between two points. Nodes snap together inside
 * TUNE.nodeSnap so a drawn line joins the network it touches. Returns the
 * new edge, or null when the points are the same node or the budget is spent.
 * A segment whose ends are already connected closes a loop: the loop's edges
 * become an armed capacitor ring, reported back in `cycles`.
 */
export function addSegment(state, x1, y1, x2, y2) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 2) return null;
  if (state.veinBudget - state.veinUsed < len) return null;
  let a = nearestNode(state, x1, y1, TUNE.nodeSnap);
  if (a === -1) {
    a = state.nodes.length;
    state.nodes.push({ x: x1, y: y1 });
  }
  let b = nearestNode(state, x2, y2, TUNE.nodeSnap);
  if (b === -1) {
    b = state.nodes.length;
    state.nodes.push({ x: x2, y: y2 });
  }
  if (a === b) return null;
  // Refuse a segment that duplicates an existing live edge.
  for (const e of state.edges) {
    if (e.dead) continue;
    if ((e.a === a && e.b === b) || (e.a === b && e.b === a)) return null;
  }
  const cycles = [];
  if (connected(state, a, b)) {
    const path = findPath(state, a, b);
    if (path.length > 0) cycles.push(path);
  }
  const edge = { a, b, len, ring: 0, spent: false, energy: 0, flashUntil: 0 };
  state.edges.push(edge);
  state.veinUsed += len;
  for (const path of cycles) {
    const ringEdges = [...path, state.edges.length - 1];
    for (const ei of ringEdges) state.edges[ei].ring = 1;
    state.ringsArmed.push({ edges: ringEdges, armUntil: state.time + TUNE.ringArmMs });
  }
  return edge;
}

/** Add a whole drag polyline, segment by segment. Returns edges added. */
export function addPolyline(state, points) {
  const added = [];
  for (let i = 1; i < points.length; i += 1) {
    const e = addSegment(state, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
    if (e) added.push(e);
    else if (state.veinBudget - state.veinUsed <= 0) break;
  }
  return added;
}

/** Union-find connectivity over the graph's nodes, rebuilt per query. */
function connected(state, a, b) {
  const parent = new Int32Array(state.nodes.length);
  for (let i = 0; i < parent.length; i += 1) parent[i] = i;
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (const e of state.edges) {
    if (e.dead) continue;
    const ra = find(e.a);
    const rb = find(e.b);
    if (ra !== rb) parent[ra] = rb;
  }
  return find(a) === find(b);
}

/** BFS path of edge indices between two nodes over existing edges. */
function findPath(state, from, to) {
  const prev = new Map(); // node -> {node, edge}
  const queue = [from];
  prev.set(from, null);
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === to) break;
    for (let ei = 0; ei < state.edges.length; ei += 1) {
      const e = state.edges[ei];
      if (e.dead) continue;
      let next = -1;
      if (e.a === cur) next = e.b;
      else if (e.b === cur) next = e.a;
      else continue;
      if (!prev.has(next)) {
        prev.set(next, { node: cur, edge: ei });
        queue.push(next);
      }
    }
  }
  if (!prev.has(to)) return [];
  const path = [];
  let cur = to;
  while (cur !== from) {
    const step = prev.get(cur);
    path.push(step.edge);
    cur = step.node;
  }
  return path;
}

/**
 * Spread a lightning strike from a node. Energy decays with distance and
 * splits at branches, so a long thin vein can only sting and a dense web
 * hits hard. Returns the energized edges with their energy, for damage and
 * for the bolt renderer. Edges keep their energy until the flash fades.
 */
export function propagate(state, startNode, startEnergy) {
  const decay = state.relics.includes('deep') ? 0.95 : TUNE.boltDecay;
  const energized = [];
  const bestEnergy = new Map(); // node -> best energy seen there
  const queue = [{ node: startNode, energy: startEnergy }];
  bestEnergy.set(startNode, startEnergy);
  const seenEdge = new Set();
  while (queue.length > 0) {
    const { node, energy } = queue.shift();
    // Incident edges that have not carried this strike yet.
    const incident = [];
    for (let ei = 0; ei < state.edges.length; ei += 1) {
      const e = state.edges[ei];
      if (seenEdge.has(ei) || e.dead) continue;
      if (e.a === node || e.b === node) incident.push(ei);
    }
    for (const ei of incident) {
      const e = state.edges[ei];
      const e2 = energy * Math.pow(decay, e.len / 40);
      if (e2 < 18) continue;
      seenEdge.add(ei);
      e.energy = Math.max(e.energy, e2);
      e.flashUntil = state.time + 140;
      energized.push({ edge: ei, energy: e2 });
      const far = e.a === node ? e.b : e.a;
      // Count the far node's other fresh branches: the current splits there.
      let branches = 0;
      for (let ej = 0; ej < state.edges.length; ej += 1) {
        if (seenEdge.has(ej)) continue;
        const o = state.edges[ej];
        if (o.dead) continue;
        if (o.a === far || o.b === far) branches += 1;
      }
      const share = branches > 1 ? e2 / branches : e2;
      if (share > (bestEnergy.get(far) || 0) && share >= 18) {
        bestEnergy.set(far, share);
        queue.push({ node: far, energy: share });
      }
    }
  }
  return energized;
}

/** Nearest distance from a point to any energized edge (energy >= min). */
export function distToLiveVein(state, x, y, minEnergy) {
  let best = Infinity;
  for (const e of state.edges) {
    if (e.dead) continue;
    if (e.energy < minEnergy) continue;
    const n1 = state.nodes[e.a];
    const n2 = state.nodes[e.b];
    const d = distToSegment(x, y, n1.x, n1.y, n2.x, n2.y);
    if (d < best) best = d;
  }
  return best;
}
