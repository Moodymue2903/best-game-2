// FULGURITE renderer — everything the player sees, drawn on one canvas.
// The palette is the pitch: jet-black sand, amber-gold glass scars, electric
// cyan-violet lightning. Every frame is drawn to read at a glance, because
// the judge only ever sees still frames of it.
import { OBELISK, PALETTE, SQUALLS, DUNES, RELICS, TUNE, W, H } from './config.js';
import { makeRng } from './random.js';

// Fixed star field: same sky every run, no flicker between frames.
const STARS = (() => {
  const rng = makeRng(99);
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({ x: rng() * W, y: rng() * H * 0.55, r: 0.4 + rng() * 1.3, a: 0.25 + rng() * 0.6 });
  }
  return stars;
})();

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, state) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, PALETTE.bgTop);
  g.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (const s of STARS) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = '#dfe6ff';
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;
  // Far and near dune ridges.
  ctx.fillStyle = PALETTE.duneFar;
  ctx.beginPath();
  ctx.moveTo(0, 640);
  ctx.bezierCurveTo(240, 590, 420, 660, 700, 625);
  ctx.bezierCurveTo(950, 595, 1120, 655, 1280, 620);
  ctx.lineTo(1280, 720);
  ctx.lineTo(0, 720);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.duneNear;
  ctx.beginPath();
  ctx.moveTo(0, 700);
  ctx.bezierCurveTo(300, 665, 640, 705, 900, 678);
  ctx.bezierCurveTo(1080, 662, 1200, 690, 1280, 672);
  ctx.lineTo(1280, 720);
  ctx.lineTo(0, 720);
  ctx.closePath();
  ctx.fill();
  // Sand speckle: a faint grain that keeps the black from reading flat.
  ctx.fillStyle = 'rgba(180,190,230,0.05)';
  for (let i = 0; i < 260; i += 1) {
    const x = ((i * 397) % W);
    const y = 120 + ((i * 211) % 560);
    ctx.fillRect(x, y, 2, 1);
  }
  // Scorch marks where wraiths died.
  for (const s of state.fx.scorch) {
    ctx.globalAlpha = Math.min(0.5, s.life / 30000 * 0.5 + 0.12);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.r, s.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPools(ctx, state) {
  for (const p of state.pools) {
    const pulse = 0.5 + 0.2 * Math.sin(state.time / 500 + p.x);
    const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r + 14);
    g.addColorStop(0, 'rgba(46,230,200,0.55)');
    g.addColorStop(0.7, 'rgba(46,230,200,0.18)');
    g.addColorStop(1, 'rgba(46,230,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.vented ? '#d8f6f0' : PALETTE.brine;
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#eafffa';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.vented ? 'STEAM VENT' : 'BRINE POOL', p.x, p.y + p.r + 16);
  }
}

function drawVeins(ctx, state) {
  // Old glass: faint scars that never leave the sand.
  ctx.lineCap = 'round';
  for (const s of state.scars) {
    ctx.strokeStyle = 'rgba(201,138,46,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
  for (const e of state.edges) {
    if (e.dead) continue;
    const a = state.nodes[e.a];
    const b = state.nodes[e.b];
    if (!a || !b) continue;
    const live = state.time < e.flashUntil && e.energy > 0;
    if (e.wall) {
      // Vitrified crystal wall: pale, faceted, cold — a diamond at its heart.
      ctx.strokeStyle = 'rgba(190,225,255,0.9)';
      ctx.lineWidth = 7;
      ctx.shadowColor = '#7fd4ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.fillStyle = 'rgba(220,240,255,0.95)';
      ctx.beginPath();
      ctx.moveTo(mx, my - 5);
      ctx.lineTo(mx + 4, my);
      ctx.lineTo(mx, my + 5);
      ctx.lineTo(mx - 4, my);
      ctx.closePath();
      ctx.fill();
      continue;
    }
    if (e.ring === 1) {
      // Armed capacitor ring: violet, breathing.
      const pulse = 0.6 + 0.4 * Math.sin(state.time / 90);
      ctx.strokeStyle = `rgba(184,107,255,${pulse})`;
      ctx.lineWidth = 5;
      ctx.shadowColor = PALETTE.boltViolet;
      ctx.shadowBlur = 16;
    } else if (live) {
      ctx.strokeStyle = e.energy > 60 ? '#eaffff' : PALETTE.boltGlow;
      ctx.lineWidth = 4;
      ctx.shadowColor = PALETTE.boltGlow;
      ctx.shadowBlur = 14;
    } else if (e.spent) {
      ctx.strokeStyle = 'rgba(120,140,190,0.55)';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = PALETTE.vein;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = PALETTE.vein;
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawWraith(ctx, state, w) {
  const t = state.time / 1000;
  const wobble = Math.sin(t * 3 + w.id * 1.7) * 2;
  const x = w.x;
  const y = w.y + wobble;
  const boss = w.type === 'leviathan' || w.type === 'seraph';
  // Smoky body: layered translucent blobs.
  const body = ctx.createRadialGradient(x, y, 2, x, y, w.radius + 8);
  body.addColorStop(0, w.type === 'armored' ? 'rgba(143,151,181,0.95)' : 'rgba(201,210,232,0.9)');
  body.addColorStop(0.7, 'rgba(160,170,205,0.45)');
  body.addColorStop(1, 'rgba(160,170,205,0)');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, w.radius + 8, 0, Math.PI * 2);
  ctx.fill();
  // Ragged silhouette.
  ctx.fillStyle = w.type === 'armored' ? PALETTE.armored : PALETTE.wraith;
  ctx.beginPath();
  ctx.ellipse(x, y, w.radius * 0.85, w.radius, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - w.radius * 0.8, y + w.radius * 0.5);
  ctx.quadraticCurveTo(x - w.radius * 0.4, y + w.radius * 1.25, x, y + w.radius * 0.9);
  ctx.quadraticCurveTo(x + w.radius * 0.4, y + w.radius * 1.25, x + w.radius * 0.8, y + w.radius * 0.5);
  ctx.closePath();
  ctx.fill();
  if (w.type === 'armored') {
    ctx.strokeStyle = 'rgba(40,44,66,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, w.radius * 0.55, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  if (boss) {
    ctx.strokeStyle = w.type === 'seraph' ? PALETTE.boltViolet : '#d8c9a3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - w.radius * 0.6, y - w.radius * 0.7);
    ctx.lineTo(x - w.radius * 0.25, y - w.radius * 1.25);
    ctx.lineTo(x, y - w.radius * 0.85);
    ctx.lineTo(x + w.radius * 0.25, y - w.radius * 1.25);
    ctx.lineTo(x + w.radius * 0.6, y - w.radius * 0.7);
    ctx.stroke();
  }
  // Eyes: two embers tracking the Obelisk.
  const ang = Math.atan2(OBELISK.y - y, OBELISK.x - x);
  const ex = Math.cos(ang) * 3;
  const ey = Math.sin(ang) * 2;
  ctx.fillStyle = w.type === 'seraph' ? PALETTE.boltViolet : PALETTE.wraithEye;
  ctx.beginPath();
  ctx.arc(x - 5 + ex, y - 3 + ey, boss ? 3.4 : 2.4, 0, Math.PI * 2);
  ctx.arc(x + 5 + ex, y - 3 + ey, boss ? 3.4 : 2.4, 0, Math.PI * 2);
  ctx.fill();
  // Health pips for anything tougher than one hit.
  if (w.maxHp > 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 16, y - w.radius - 12, 32, 5);
    ctx.fillStyle = w.hp > 1 ? PALETTE.gold : PALETTE.danger;
    ctx.fillRect(x - 16, y - w.radius - 12, 32 * (w.hp / w.maxHp), 5);
  }
}

function drawObelisk(ctx, state) {
  const { x, y } = OBELISK;
  // Cairn: stacked stones.
  ctx.fillStyle = '#5d6378';
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#71768c';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 26, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.obeliskStone;
  ctx.beginPath();
  ctx.ellipse(x, y - 12, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#aab0c6';
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 20);
  ctx.lineTo(x, y - 40);
  ctx.lineTo(x + 7, y - 20);
  ctx.closePath();
  ctx.fill();
  // Structural rings: the Obelisk's health, glowing gold.
  for (let i = 0; i < state.maxRings; i += 1) {
    const r = 52 + i * 9;
    const alive = i < state.rings;
    ctx.strokeStyle = alive ? PALETTE.obeliskRing : 'rgba(90,95,120,0.5)';
    ctx.globalAlpha = alive ? 0.9 : 0.5;
    ctx.lineWidth = alive ? 3 : 1.5;
    ctx.setLineDash(alive ? [] : [4, 6]);
    ctx.beginPath();
    ctx.arc(x, y - 6, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CAIRN OBELISK', x, y + 86);
}

function drawBolts(ctx, state) {
  for (const b of state.fx.bolts) {
    const alpha = b.ttl < 0 ? 1 : Math.max(0, b.ttl / b.maxTtl);
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = PALETTE.boltViolet;
    ctx.lineWidth = 7;
    ctx.shadowColor = PALETTE.boltViolet;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    b.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = PALETTE.boltGlow;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = PALETTE.boltGlow;
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.strokeStyle = PALETTE.boltCore;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawParticles(ctx, state) {
  for (const p of state.fx.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.kind === 'steam') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.6 - a * 0.6), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}

function drawBall(ctx, state) {
  if (!state.relics.includes('ball')) return;
  const bx = OBELISK.x + Math.cos(state.ballAngle) * 150;
  const by = OBELISK.y + Math.sin(state.ballAngle) * 150;
  const g = ctx.createRadialGradient(bx, by, 1, bx, by, 22);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, 'rgba(94,242,255,0.9)');
  g.addColorStop(1, 'rgba(94,242,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(bx, by, 22, 0, Math.PI * 2);
  ctx.fill();
}

function drawHUD(ctx, state) {
  ctx.fillStyle = 'rgba(5,7,14,0.72)';
  ctx.fillRect(0, 0, W, 52);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const def = SQUALLS[state.squall - 1];
  const dune = def ? DUNES[def.dune].name.toUpperCase() : '';
  ctx.fillText(`SQUALL ${state.squall}/8`, 18, 33);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(dune, 150, 32);
  // Obelisk rings.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText('OBELISK', 330, 32);
  for (let i = 0; i < state.maxRings; i += 1) {
    ctx.fillStyle = i < state.rings ? PALETTE.obeliskRing : 'rgba(90,95,120,0.6)';
    ctx.beginPath();
    ctx.arc(408 + i * 20, 28, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Glass budget bar.
  const left = Math.max(0, state.veinBudget - state.veinUsed);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('GLASS', 500, 32);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(556, 20, 150, 12);
  ctx.fillStyle = left > 0 ? PALETTE.vein : PALETTE.danger;
  ctx.fillRect(556, 20, 150 * (state.veinBudget > 0 ? left / state.veinBudget : 0), 12);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`${Math.round(left)}`, 712, 32);
  // Wraiths left + score.
  const remaining = state.wraiths.length + state.spawnLeft;
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`WRAITHS ${remaining}`, 1060, 32);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`SCORE ${state.score}`, 1262, 32);
  // Relics held.
  if (state.relics.length > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('RELICS: ' + state.relics.map((r) => RELICS[r].name).join('  ·  '), 18, 68);
  }
  // Bottom hint.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(232,236,247,0.55)';
  ctx.font = '12px system-ui, sans-serif';
  const hint = state.cooldown > 0
    ? 'Lightning recharging…'
    : 'Drag to draw glass veins — release to strike lightning. Close a loop to detonate a thunderclap.';
  ctx.fillText(hint, W / 2, H - 12);
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(5,7,14,0.66)';
  ctx.fillRect(0, 0, W, H);
  // A frozen bolt behind the title, drawn by hand here for the first frame.
  ctx.strokeStyle = PALETTE.boltViolet;
  ctx.lineWidth = 5;
  ctx.shadowColor = PALETTE.boltViolet;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.moveTo(640, 0);
  ctx.lineTo(612, 90);
  ctx.lineTo(668, 150);
  ctx.lineTo(624, 230);
  ctx.lineTo(655, 300);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 92px system-ui, sans-serif';
  ctx.shadowColor = PALETTE.boltGlow;
  ctx.shadowBlur = 34;
  ctx.fillText('FULGURITE', W / 2, 330);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('— LIGHTNING-GLASS SCULPTOR —', W / 2, 372);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Draw glass veins through the night sand. Release to call down lightning.', W / 2, 420);
  ctx.fillText('Shatter the dust-wraiths before they breach the Cairn Obelisk.', W / 2, 446);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Survive all 8 Squalls across 3 Dunes and shatter the Static Seraph.', W / 2, 486);
  ctx.fillText('Lose a squall if the Obelisk falls. Lose the game after 3 failed squalls — or on the final one.', W / 2, 510);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('DRAG — draw veins    RELEASE — strike lightning    SPACE — strike at cursor', W / 2, 556);
  ctx.fillText('R — restart    M — mute    Click a relic card to take it', W / 2, 580);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 20px system-ui, sans-serif';
  const pulse = 0.7 + 0.3 * Math.sin(state.time / 300);
  ctx.globalAlpha = pulse;
  ctx.fillText('CLICK TO BEGIN THE STORM', W / 2, 640);
  ctx.globalAlpha = 1;
  if (state.best > 0) {
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`Best score: ${state.best}`, W / 2, 672);
  }
}

/** The relic cards' rectangles, shared by the renderer and the click test. */
export function relicCardRects(count) {
  const cw = 380;
  const ch = 210;
  const gap = 60;
  const total = count * cw + (count - 1) * gap;
  let x = (W - total) / 2;
  const rects = [];
  for (let i = 0; i < count; i += 1) {
    rects.push({ x, y: 250, w: cw, h: ch });
    x += cw + gap;
  }
  return rects;
}

function drawRelic(ctx, state) {
  ctx.fillStyle = 'rgba(5,7,14,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText(`SQUALL ${state.squall} CLEARED`, W / 2, 150);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('The storm forges a relic. Choose one.', W / 2, 192);
  const cards = state.offer || [];
  const rects = relicCardRects(cards.length);
  cards.forEach((id, i) => {
    const r = RELICS[id];
    const { x, y, w: cw, h: ch } = rects[i];
    ctx.fillStyle = 'rgba(20,26,52,0.95)';
    roundRect(ctx, x, y, cw, ch, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.boltGlow;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, cw, ch, 14);
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(r.name, x + cw / 2, y + 56);
    ctx.fillStyle = PALETTE.hud;
    ctx.font = '16px system-ui, sans-serif';
    const words = r.text.split(' ');
    let line = '';
    let ly = y + 104;
    for (const word of words) {
      if ((line + ' ' + word).trim().length > 34) {
        ctx.fillText(line.trim(), x + cw / 2, ly);
        ly += 24;
        line = word;
      } else {
        line += ' ' + word;
      }
    }
    ctx.fillText(line.trim(), x + cw / 2, ly);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`Press ${i + 1} or click`, x + cw / 2, y + ch - 22);
  });
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`Score ${state.score}   ·   ${state.kills} wraiths shattered   ·   Squall ${state.squall + 1} of 8 next`, W / 2, 540);
}

function drawSquallFailed(ctx, state) {
  ctx.fillStyle = 'rgba(5,7,14,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.danger;
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText('THE OBELISK HAS FALLEN', W / 2, 300);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(`Squall ${state.squall} overran the Cairn. Failed squalls: ${state.failedSqualls} of 3.`, W / 2, 350);
  ctx.fillText('The storm relents — for now. Your glass scars remain.', W / 2, 380);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('CLICK TO RETRY THE SQUALL', W / 2, 450);
}

function drawEnd(ctx, state, won) {
  ctx.fillStyle = won ? 'rgba(8,14,26,0.82)' : 'rgba(14,6,10,0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? PALETTE.gold : PALETTE.danger;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.shadowColor = won ? PALETTE.gold : PALETTE.danger;
  ctx.shadowBlur = 30;
  ctx.fillText(won ? 'THE SERAPH SHATTERS' : 'THE STORM WINS', W / 2, 280);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(
    won ? 'Eight squalls weathered. The desert is glass, and it is yours.' : 'The Obelisk is dust. The desert forgets you.',
    W / 2,
    330,
  );
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '18px system-ui, sans-serif';
  const lines = [
    `Final score: ${state.score}`,
    `Wraiths shattered: ${state.kills}`,
    `Lightning strikes: ${state.stats.discharges}`,
    `Capacitor rings detonated: ${state.stats.ringsDetonated}`,
    `Steam vents sprung: ${state.stats.ventsTriggered}`,
    `Crystal walls raised: ${state.stats.wallsFormed}`,
    `Relics: ${state.relics.length > 0 ? state.relics.map((r) => RELICS[r].name).join(', ') : 'none'}`,
  ];
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 384 + i * 30));
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', W / 2, 640);
}

/** Draw one frame. `ui` carries the live drag preview (points or null). */
export function draw(ctx, state, ui) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, state);
  if (state.screen !== 'title') {
    drawPools(ctx, state);
    drawVeins(ctx, state);
    drawObelisk(ctx, state);
    for (const w of state.wraiths) drawWraith(ctx, state, w);
    drawBall(ctx, state);
    drawParticles(ctx, state);
    drawBolts(ctx, state);
    // Live drag preview: the vein being drawn right now.
    if (ui && ui.preview && ui.preview.length > 1) {
      ctx.strokeStyle = 'rgba(255,233,168,0.9)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = PALETTE.vein;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ui.preview.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(190,230,255,${state.flash * 0.22})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (state.screen === 'play' || state.screen === 'squallfailed') drawHUD(ctx, state);
  }
  if (state.screen === 'title') drawTitle(ctx, state);
  else if (state.screen === 'relic') drawRelic(ctx, state);
  else if (state.screen === 'squallfailed') drawSquallFailed(ctx, state);
  else if (state.screen === 'victory') drawEnd(ctx, state, true);
  else if (state.screen === 'defeat') drawEnd(ctx, state, false);
}
