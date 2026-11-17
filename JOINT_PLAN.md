# JOINT PLAN — best-game-01 round 2 (new game)
Written 2026-11-17 ~15:58 IST. Deadline 2026-11-18T18:00:00Z (~30h left).
Quota OPEN: can_submit=True, day 2 left, hard 19 left (verified 2026-11-17 ~14:55 IST).
Repo: https://github.com/Moodymue2903/best-game-2 (created 2026-11-17, empty, public).
Current entry: SKEWERFEST #541, judge 782,839 — audit verdict "another diner game".

## Grading (from RULES.txt, verified)
- Judge: superbot, reasoning_effort high, pairwise on (a) ONE JPEG contact sheet of the screenshots (cover on top) + (b) a 1,536-token source outline (each file's path, size, declarations). It never plays the game.
- Score: Bradley-Terry win rate over the shortlist; top 10 paid ($1,000: 1st $400, 2nd $200, 3rd $120, 4th-10th $40); top 3 hosted live after the deadline.
- Screening: final shortlist line at place 40 by dev-rating interval lows; entries with no complete dev rating enter at the line.
- Criteria: complete game, fun/depth, feel/polish, look/originality, structure.
- Game: static files under game/, no build step, index.html opens in desktop Chrome, plays with NO network request. Every script/image/sound/font is a file under game/ or a data: URI. Any library vendored under game/vendor/ as *.min.js (never counted as source).
- main.ts at repo root copies game/ + screenshots/ to /output and writes dossier.json with buildDossier from vendor/makefun-game.ts (kit copy UNCHANGED). Dossier source text capped at 160 KiB.
- screenshots/: 3 or 4 PNG/JPEG, first by name is the cover. Real renders of the game's own code in a browser, never edited/composited/borrowed.
- Transcript gate: the build session must start at/after the competition opened (2026-11-15T18:00Z). NOTE (verified 2026-11-17 ~15:59 IST): `makefun record` REFUSES best-game-01 — "does not take recorded transcripts: its entries upload their transcripts (a bundle or loose files) as the requirements say". So there is NO sealed recording for this bounty. The builder's session transcripts are collected afterwards with `makefun bundle` (include every code-writing subagent session + grep-verified usage rows from muse.db) and uploaded with the submission. All code must still be written by the agent in its own session; never use the kit starter main.ts verbatim; never copy/paste code in.
- Repo must carry an OSI-approved license + .makefun/owner.json {"wallet":"mmS91CoUpibnJnmyJdTtdWM9iuDmE2Nt1rzBULTBAhD"}.
- Text addressed to the judge in a screenshot or source file is allowed — but the game itself must carry the score; do not beg the judge.

## Top-10 study (live 2026-11-17 ~15:53 IST, 9,490 entries; all sources withheld)
Bar: top-10 939,373; top-5 942,180; #1 944,244.
- #1 Lanternkeep 944,244 — lantern light as weapon, bounce off mirror shards, 10 nights, 4 realms
- #2 SUNDERING LOOM 944,244 — weave tension wires into traps, 6 tapestries
- #3 LANTERNWAKE 943,560 — light lamps, hold the Beacon 7 nights
- #4 Lamplight Tide 942,180 — bend lighthouse beam through prisms, 7 nights
- #5 Lumen Reef 942,180 — evolve a lantern-jelly, 4 Aspects, 2 bosses
- #6 SYZYGY 941,484 — line up brass moons, eclipse beam, 7 eras, 8 foes, 14 relics
- #7 ECHOFALL 940,785 — past runs fight beside you
- #8 VOLCANO HAVEN 940,081 — steer lava with barriers/trenches/water
- #9 VITRAIL 940,081 — mix ruby/verdant/azure light
- #10 HEFT 939,373 — sheepdog herding over ten days
What wins: ONE original core mechanic (one tactile verb) + moody nocturnal atmosphere + multi-night/era progression + a visual identity that reads in one still frame. Light dominates the top; diner/order games do not place.

## The three model picks (full texts in consultation_*.md)
- DeepSeek: **ASHFALL GARDEN** — carve channels to steer lava, farm a dying volcano, 10 years. (Also: TIDEBREAKER — moon gravity; HOLLOWS — rotate the house.)
- Gemini: **FULGURITE** — draw glass veins, release lightning along the circuit, 8 Squalls. (Also: GRAVITAS BELL — cymatic rings; MYCELIA NOCTIS — fungal hydraulic network.)
- GLM: **ASHLAND** — shape smoke into solids, fire = health + ammo, 7 nights. (Also: DEEPCALL — navigate by ping; HEARTHBORN — give/take heat.)

## Settling the disagreement (evidence, not votes)
1. **ASHFALL GARDEN is weaker than DeepSeek claims.** Its core verb (steer lava through channels) sits next to #8 VOLCANO HAVEN ("steer lava with barriers, trenches and water") — DeepSeek's "furthest from every winner" claim is wrong against the data. And a lava/heat-diffusion sim needs tuning under time pressure — the classic budget-burner.
2. **ASHLAND's core is the riskiest to build.** Classifying freehand strokes into bridge/wall/ramp/projectile/sail is genuinely hard; a misread stroke makes the game unplayable, and GLM's "geometric shape detection" hand-waves that. Its smoke visuals are also the softest of the three (rim-lit particle clouds vs hard lightning/lava lines).
3. **FULGURITE wins on all three deciding axes.** (a) Contact sheet: lightning bolts + golden glass scars on jet-black sand is the sharpest, highest-contrast image of the three — every frame reads as key art. (b) Build determinism: planar graph of line segments + cycle detection + point-to-segment distance is debuggable in hours, not a fluid sim or stroke classifier; the core (draw, release, lightning follows the graph) is a complete game even before loops/relics/bosses. (c) Outline richness: circuit propagation, capacitor loop detection, relics, bosses, procedural thunder synthesis — dense structural nouns for the 1,536-token outline. It has no near-neighbor in the top 10 (lightning/glass/desert; VOLCANO HAVEN is lava, VITRAIL is light-mixing).

## DECISION: build FULGURITE

### Game spec (from Gemini's concept, locked)
- **Title:** FULGURITE — Lightning-Glass Sculptor.
- **Verb:** draw glass veins, release to strike lightning.
- **Core loop:** hold-click drags ionized glass veins through the sand; release triggers a sky-to-ground arc that propagates along your glass network, shattering encroaching dust-wraiths; vitrified enemy shells become permanent conductive crystal walls. Charge decays with distance; branching splits current; CLOSED LOOPS form resonant capacitor rings that detonate AoE thunderclaps; glass drawn over buried brine pools creates steam-geyser vents that launch enemies back.
- **Progression:** 8 Squalls across 3 Dunes — Salt Basin (1-3), Obsidian Glassfields (4-6), Thunderhead Caldera (7-8). 7 storm-forged Relics (Forked Anode, Ball Lightning, Piezo-Shatter, +4 more named). 2 bosses: The Dust Leviathan (squall 6), The Static Seraph (squall 8, final).
- **Win/lose:** survive all 8 Squalls and shatter the Static Seraph before storm-erosion breaches the central Cairn Obelisk (3 structural rings). Lose a squall if the Obelisk falls; lose the game after 3 failed squalls (or on the final squall — state it on screen).
- **HUD:** squall x/8, dune name, Obelisk rings, charge/vein length remaining, relics held, wraiths remaining, score. Title screen states the goal + controls + win/lose. Restart button + R key. Victory + defeat screens with stats.
- **Visual identity:** deep indigo-charcoal night desert #090b14; electric cyan-violet lightning #5ef2ff / #b86bff; amber-gold molten glass veins cooling into translucent fractal branching tracks left PERMANENTLY on the terrain across the squall; dust-wraiths as pale smoky silhouettes; particle scorch marks. Palette and contrast tuned so a single frame reads on a contact sheet.
- **Audio:** WebAudio synth only — thunder cracks (filtered noise bursts + sub-bass pitch-drop), crystalline glass chimes on vein draw, low wind drone. Mute toggle.
- **Tech:** HTML5 canvas + vanilla JS, no libraries, no assets, no network. game/index.html + game/*.js (+ game/*.css if needed). Keep the dossier source text under the 160 KiB cap with room to spare; structure the code so the outline reads well (named modules/classes: VeinGraph, CapacitorRing, Storm, Wraith, Relic, Boss, AudioSynth, Screens).
- **Determinism test (SKEWERFEST lesson):** build a scripted autopilot/self-play check that plays squall 1 to completion and reproduces EXACT numbers (wraiths shattered, score, vein length) run-to-run. Report the invariant in RESULTS. No randomness in the test path (seeded RNG for gameplay; fixed seed in the test).
- **Screenshots:** 3-4 real renders in headless Chromium (use ~/workspace/makefun/shot-tool/ with the local forward proxy if the egress proxy blocks Playwright). The cover must be the most dramatic frame (lightning mid-strike over glass scars). Name them 1-cover.png, 2-*.png, 3-*.png so the cover sorts first.

## Build order (hours from now, ~30h to deadline)
1. Repo skeleton + LICENSE (MIT) + .makefun/owner.json + main.ts written fresh (NOT the kit starter verbatim) + vendor/makefun-game.ts copied unchanged from the kit. Push early so the repo is live.
2. Core: grid/terrain, vein drawing (graph), discharge propagation, wraith spawning/movement, Obelisk, squall loop, win/lose. Playable end-to-end.
3. Depth: capacitor loops, brine pools/steam vents, vitrified walls, relics, bosses, 8 squalls / 3 dunes.
4. Polish: particles, scorch persistence, WebAudio, title/victory/defeat screens, HUD, palette pass.
5. Autopilot determinism test + fix. Screenshots (cover first). Dossier build via main.ts, byte-identical twice.
6. RESULTS_round2.md with measured numbers. Then STOP — do not bundle/check/submit; the parent runs the 3-model audit, fixes, shows the user, and submits on go-ahead. (The parent builds the transcript bundle afterwards with `makefun bundle` — best-game-01 takes uploaded transcripts, not a sealed recording.)

## Do-not-touch / hard rules
- NEVER copy anything from a top-tier entry. FULGURITE is original; no lantern/lighthouse/loom/light-beam mechanics.
- Never edit the kit's vendor/makefun-game.ts. Never use the kit starter main.ts verbatim.
- Do not submit anything. Do not push to any repo except Moodymue2903/best-game-2. (No sealed recording exists for this bounty — do not try to start one; `makefun record` refuses best-game-01.)
- GitHub push needs the user's classic PAT (second token). Recover it with muse.db (SELECT body FROM runtime.messages WHERE message_id='1f684b43-2548-4c2f-9f58-651fb3ad602d'), verify its sha256 starts 29df7509ec86, write it to a /tmp file mode 600 via the exec stdin field (never in a command string, never print/log it), push with GIT_ASKPASS, then shred -u the temp file.
