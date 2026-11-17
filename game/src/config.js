// FULGURITE tuning: dunes, squalls, wraith types, relics, palette.
// One file holds every number a balance pass would touch, so the sim and the
// renderer never disagree about what a squall is.
export const STEP = 1000 / 60;
export const W = 1280;
export const H = 720;
export const OBELISK = { x: 640, y: 360, r: 46 };

export const PALETTE = {
  bgTop: '#0b0e1d',
  bgBottom: '#090b14',
  sand: '#10142a',
  duneFar: '#0d1122',
  duneNear: '#080a12',
  vein: '#ffb347',
  veinHot: '#ffe9a8',
  veinCool: '#c98a2e',
  boltCore: '#ffffff',
  boltGlow: '#5ef2ff',
  boltViolet: '#b86bff',
  wraith: '#c9d2e8',
  wraithEye: '#ff6b81',
  armored: '#8f97b5',
  brine: '#2ee6c8',
  steam: '#d8f6f0',
  obeliskStone: '#8a8fa3',
  obeliskRing: '#ffd97a',
  hud: '#e8ecf7',
  hudDim: '#8b93ad',
  gold: '#ffc53d',
  danger: '#ff5d73',
};

export const DUNES = [
  { name: 'Salt Basin', hint: 'The storm is young. Draw wide, strike early.' },
  { name: 'Obsidian Glassfields', hint: 'Armored wraiths shrug off a single arc. Close loops.' },
  { name: 'Thunderhead Caldera', hint: 'The Seraph wakes. Spend every volt like it matters.' },
];

// One row per squall: how many wraiths, how fast they arrive, which kinds,
// how much glass the player may draw, and which boss (if any) leads it.
export const SQUALLS = [
  { dune: 0, count: 8, interval: 2600, speed: 1.0, kinds: ['dust'], budget: 2600 },
  { dune: 0, count: 12, interval: 2300, speed: 1.05, kinds: ['dust', 'swift'], budget: 2800 },
  { dune: 0, count: 16, interval: 2000, speed: 1.1, kinds: ['dust', 'swift', 'armored'], budget: 3000 },
  { dune: 1, count: 20, interval: 1800, speed: 1.18, kinds: ['dust', 'swift', 'armored'], budget: 3200 },
  { dune: 1, count: 24, interval: 1600, speed: 1.25, kinds: ['swift', 'armored'], budget: 3400 },
  { dune: 1, count: 16, interval: 1700, speed: 1.3, kinds: ['armored', 'swift'], boss: 'leviathan', budget: 3600 },
  { dune: 2, count: 28, interval: 1400, speed: 1.38, kinds: ['swift', 'armored'], budget: 3800 },
  { dune: 2, count: 22, interval: 1500, speed: 1.45, kinds: ['armored', 'swift'], boss: 'seraph', budget: 4000 },
];

export const WRAITH_TYPES = {
  dust: { hp: 1, speed: 26, radius: 15, score: 100, label: 'Dust Wraith' },
  swift: { hp: 1, speed: 48, radius: 13, score: 100, label: 'Swift Wraith' },
  armored: { hp: 2, speed: 20, radius: 17, score: 150, label: 'Armored Wraith' },
  leviathan: { hp: 14, speed: 14, radius: 34, score: 1000, label: 'The Dust Leviathan', boss: true },
  seraph: { hp: 22, speed: 22, radius: 30, score: 1500, label: 'The Static Seraph', boss: true },
};

// Storm-forged relics, offered one pick after each cleared squall (1-7).
export const RELICS = {
  fork: { name: 'Forked Anode', text: 'Every discharge strikes TWO vein points at once.' },
  ball: { name: 'Ball Lightning', text: 'A roaming orb circles the Obelisk, zapping wraiths.' },
  piezo: { name: 'Piezo-Shatter', text: 'Shattered wraiths explode, wounding wraiths nearby.' },
  conduit: { name: 'Long Conduit', text: '+800 glass length every squall.' },
  deep: { name: 'Deep Charge', text: 'Lightning loses half as much charge over distance.' },
  skin: { name: 'Stormglass Skin', text: 'The Obelisk gains a 4th ring and heals one now.' },
  geyser: { name: 'Geyser Heart', text: 'Steam vents erupt twice as often, wider and harder.' },
};

export const TUNE = {
  dischargeCooldownMs: 1400,
  strikeRadius: 130, // how far from the release point a vein node may be struck
  boltKillRadius: 26, // wraith distance from an energized vein that takes a hit
  boltMinEnergy: 25, // a vein weaker than this cannot wound
  boltDecay: 0.9, // energy kept per 40px of glass (0.95 with Deep Charge)
  ringArmMs: 600, // a closed loop charges this long before it detonates
  ringRadius: 150,
  ringDamage: 3,
  ventIntervalMs: 4000,
  ventRadius: 90,
  ventDamage: 1,
  wallChance: 0.5, // a lightning-shattered wraith vitrifies into a crystal wall
  wallHp: 8, // seconds a wraith grinds against a wall before it crumbles
  maxWalls: 24,
  maxScars: 320,
  obeliskHitRadius: 46,
  squallClearBonus: 500,
  ringBonus: 100,
  ringDetonateBonus: 50,
  ventLaunchBonus: 25,
  nodeSnap: 7, // a drawn point this close to a node joins it
  sampleGap: 10, // drag points are sampled every 10px into vein segments
};
