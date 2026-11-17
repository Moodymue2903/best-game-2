// Seeded randomness for FULGURITE. Every random draw in the game goes through
// the state's rng counter, so a run with a fixed seed replays exactly — the
// autopilot test depends on it. mulberry32: small, fast, good enough.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [0, n). */
export function randInt(rng, n) {
  return Math.floor(rng() * n);
}

/** Pick one element of an array. */
export function randPick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Float in [min, max). */
export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}
