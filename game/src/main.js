// FULGURITE boot — wires the sim, renderer, input and audio together and
// runs the fixed-step game loop. A ?shot= query stages a screenshot scene
// instead of starting the title screen: the staged frame is a real game
// played forward, frozen for the camera.
import { STEP, W, H } from './config.js';
import { AudioEngine } from './audio.js';
import { attachInput } from './input.js';
import { draw, relicCardRects } from './render.js';
import { chooseRelic, createGame, restartRun, retrySquall, startRun, step } from './sim.js';
import { stageForShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
canvas.width = W;
canvas.height = H;

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1) || 1;
const shot = params.get('shot');

let state;
let shotMode = false;
if (shot) {
  const staged = stageForShot(shot, seed);
  state = staged.state;
  shotMode = true;
} else {
  state = createGame(seed);
  try {
    state.best = Number(window.localStorage.getItem('fulgurite-best') || 0) || 0;
  } catch {
    state.best = 0;
  }
}

const audio = new AudioEngine();
const ui = { preview: null };

function drainEvents() {
  for (const ev of state.events) {
    if (ev.kind === 'thunder') audio.thunder(ev.strong);
    else if (ev.kind === 'ring') audio.ringBoom();
    else if (ev.kind === 'vent') audio.hiss();
    else if (ev.kind === 'zap' || ev.kind === 'flicker') audio.zap();
    else if (ev.kind === 'vent-armed' || ev.kind === 'shatter') audio.chime();
  }
  state.events.length = 0;
  if ((state.screen === 'victory' || state.screen === 'defeat') && state.best < state.score) {
    state.best = state.score;
    try {
      window.localStorage.setItem('fulgurite-best', String(state.best));
    } catch {
      // Best score is a nicety; a blocked store never stops the game.
    }
  }
}

function pickRelicAt(p) {
  if (!state.offer) return;
  const rects = relicCardRects(state.offer.length);
  rects.forEach((r, i) => {
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
      chooseRelic(state, i);
    }
  });
}

const hooks = {
  audio: () => audio.ensure(),
  start: () => {
    audio.ensure();
    startRun(state);
  },
  restart: () => {
    audio.ensure();
    restartRun(state);
  },
  retry: () => {
    audio.ensure();
    retrySquall(state);
  },
  mute: () => {
    audio.ensure();
    audio.toggleMute();
  },
  pickRelic: (p) => pickRelicAt(p),
  pickRelicIndex: (i) => chooseRelic(state, i),
};

attachInput(canvas, state, ui, hooks);

function describe() {
  if (!statusEl) return;
  const screen = state.screen;
  if (screen === 'title') {
    statusEl.textContent = 'FULGURITE title screen. Click to begin the storm.';
  } else if (screen === 'relic') {
    statusEl.textContent = `Squall ${state.squall} cleared, score ${state.score}. Choose a relic.`;
  } else if (screen === 'victory') {
    statusEl.textContent = `Victory. Final score ${state.score}, ${state.kills} wraiths shattered. Press R to play again.`;
  } else if (screen === 'defeat') {
    statusEl.textContent = `Defeat. Final score ${state.score}. Press R to play again.`;
  } else if (screen === 'squallfailed') {
    statusEl.textContent = `Squall ${state.squall} failed, ${state.failedSqualls} of 3 failed. Click to retry.`;
  } else {
    statusEl.textContent = `Squall ${state.squall} of 8, score ${state.score}, `
      + `obelisk rings ${state.rings}, wraiths ${state.wraiths.length + state.spawnLeft}, `
      + `glass left ${Math.max(0, Math.round(state.veinBudget - state.veinUsed))}.`;
  }
}

let last = performance.now();
let acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(100, now - last);
  last = now;
  if (!shotMode) {
    acc += dt;
    while (acc >= STEP) {
      step(state, STEP);
      acc -= STEP;
    }
    drainEvents();
  }
  draw(ctx, state, ui);
  describe();
}
requestAnimationFrame(frame);

// The screenshot harness waits on this: true once the first frame is drawn.
window.__shotReady = true;
// Dev/test hook: the playtest reads the live state through this.
window.__fulgurite = state;
