# RESULTS — best-game-01 round 2: FULGURITE
Built 2026-11-17. Deadline 2026-11-18T18:00:00Z. Quota OPEN (verified 2026-11-17 ~14:55 IST).
Repo: https://github.com/Moodymue2903/best-game-2 — branch main.
Status: BUILT + VERIFIED. NOT bundled, NOT checked, NOT submitted (parent runs the 3-model audit and submits on the user's go-ahead).

## What was built
FULGURITE — Lightning-Glass Sculptor, per JOINT_PLAN.md (locked decision).
Verb: drag to draw glass veins through night sand; release to call lightning down the network.
- Core: vein graph (nodes/edges, union-find cycle detection), discharge propagation with
  distance decay + branch splitting, wraiths shattered by live veins, vitrified crystal
  walls from shattered shells (block + conduct, crumble after 8s of grinding).
- Capacitor rings: any closed loop arms and detonates an AoE thunderclap (150px, 3 dmg).
- Brine pools: glass crossing a pool arms a steam vent (erupts every 4s, launch + 1 dmg).
- Progression: 8 Squalls across 3 Dunes (Salt Basin 1-3, Obsidian Glassfields 4-6,
  Thunderhead Caldera 7-8). 7 Relics (Forked Anode, Ball Lightning, Piezo-Shatter,
  Long Conduit, Deep Charge, Stormglass Skin, Geyser Heart), one picked after each
  cleared squall 1-7. Bosses: Dust Leviathan (squall 6), Static Seraph (squall 8).
- Win/lose: survive all 8 + shatter the Seraph. Obelisk has 3 rings (+1 between squalls,
  4th with Stormglass Skin); a squall fails if it falls; 3 failed squalls or a failed
  final squall ends the game. Stated on the title screen and the failed screen.
- HUD: squall x/8, dune name, Obelisk rings, glass budget bar, wraiths remaining, score,
  relics held, bottom hint. Title / relic-choice / squall-failed / victory / defeat
  screens, all with restart (click or R). Mute toggle (M). Space strikes at the cursor.
- Audio: WebAudio synth only — thunder (filtered noise + sub-bass drop), glass chimes,
  zap, ring boom, steam hiss, wind drone. No files, no network.
- Tech: HTML5 canvas + vanilla JS, no libraries. game/index.html + 9 modules under
  game/src/ (random, config, graph, sim, render, audio, input, shots, main).
  Named modules/classes for the outline: VeinGraph ops, CapacitorRing, Storm squalls,
  Wraith types, Relic table, Bosses, AudioEngine, Screens.

## Determinism test — node tests/autopilot.mjs (same sim code as the browser)
Squall-1 invariant, seed 1, run twice — IDENTICAL on every reported number:
- screen play, squall 2 (cleared), kills 8, score 1700, rings 3, failed 0,
  veinUsed 0 (new squall), discharges 6, rings detonated 2, vents 0, walls 4,
  steps 1416 (23.6s of game time). identical: true, diffs: none.
Full-game autopilot (plays all 8 squalls, web + strike + loop-closing strategy):
- Seed 1: VICTORY — squall 8, kills 142, score 24,800, rings 3, failed 0,
  all 7 relics, discharges 202, rings detonated 18, vents 19, walls 49, 21,351 steps.
- Seed 7: DEFEAT at squall 6 (Dust Leviathan) — kills 112, score 18,850, rings 0,
  failed 3, relics 5, 20,962 steps.
Balance read: winnable with good play (seed 1, 0 fails), losable at the boss squall
(seed 7, 3 fails at squall 6). The game has teeth; it is not a free win.
One bug found and fixed by the test: a wraith could wedge forever between crystal
walls and stall a squall (first run: squall 3 stuck past the 900s cap). Fix: walls
have 8s of grind HP and crumble; edges go dead by flag (no index shifts).

## Live playtest — node tools/playtest.mjs (real mouse in headless Chromium)
- Title renders, click starts squall 1 (spawnLeft 8, rings 3).
- Drag draws veins: 20 edges, 596px used mid-drag; release discharges (1 discharge).
- Space discharges again (2 total). Wraiths spawn and walk in (5 alive, 3 left to spawn).
- Console/page errors: none. Live frame inspected: HUD, vein, pools, wraiths, Obelisk
  all read cleanly at 1280x720.

## Screenshots — node tools/shots.mjs (real renders, ?shot= staging, seed 7/1)
All 1280x720 JPEG, all under the 256 KiB cap, no console/page errors:
- 1-cover.jpg — 47,704 B. Squall 3, bolt frozen mid-strike on the web ring, ring glowing
  cyan around the Obelisk, 5 wraiths, score 3,950. The most dramatic frame.
- 2-play.jpg — 45,407 B. Squall 2 mid-play with a frozen strike lighting the web,
  score 2,200, HUD + relic line visible.
- 3-title.jpg — 54,791 B. Title screen: FULGURITE, bolt, goal, controls, win/lose.
- 4-victory.jpg — 65,819 B. Victory screen from a REAL won run (seed 1: final score
  24,800, 142 wraiths, 202 strikes, 18 rings, 19 vents, 49 walls, all 7 relics).
  Note: the victory staging plays the whole run; seed 7 loses at squall 6, so the
  victory shot uses seed 1 (a genuine win). The fallback (staged stats) was not used.

## Dossier — main.ts, built twice
- out/dossier.json md5 3a56c34ccb6fbd713ee6a5572b3de2d7, byte-identical across two builds.
- Dossier 363,620 bytes. Source files: 10 (75,043 bytes) — whole, under the 160 KiB cap.
- Screenshots in dossier: 4 (213,721 bytes total). No vendored files, no assets.
- Game source totals: index.html 910 B; audio 6,512; config 4,308; graph 7,194;
  input 3,439; main 4,244; random 835; render 21,047; shots 6,140; sim 20,414.
  Repo root: main.ts 1,751 B (written fresh, not the kit starter), serve.ts 2,188 B.

## Submission mechanics (ready for the parent)
- LICENSE: MIT. .makefun/owner.json: {"wallet":"mmS91CoUpibnJnmyJdTtdWM9iuDmE2Nt1rzBULTBAhD"}.
- vendor/makefun-game.ts: copied from the kit, md5 2da03e097f2d64ae65e3d1c3586e652a (unchanged).
- main.ts: fresh FULGURITE build program (copy game/ + screenshots/, buildDossier with
  the kit's caps). serve.ts: fresh loopback static server.
- shots.json: 4 shots, cover sorts first by name.
- No network references in game/: all scripts are relative ES modules under game/src/.
- NOT DONE (by design): no `makefun bundle`, no `makefun check`, no submit. The parent
  runs the Gemini/DeepSeek/GLM audit first, then shows the user, then submits on go-ahead.
  best-game-01 takes uploaded transcripts (bundle), NOT a sealed recording — `makefun
  record` refuses this bounty (verified 2026-11-17).
