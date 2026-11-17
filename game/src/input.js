// FULGURITE input — mouse drag draws glass, release calls the lightning.
// Coordinates are converted from the page into the game's 1280x720 logical
// space, so a resized window never changes where a vein lands.
import { TUNE, W, H } from './config.js';
import { addVeinPoints, dischargeAt } from './sim.js';

/** Convert a pointer event into logical game coordinates. */
export function toLogical(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * W,
    y: ((clientY - rect.top) / rect.height) * H,
  };
}

/**
 * Attach input to a canvas. `ui` is shared with the renderer (it carries the
 * live drag preview); `hooks` lets main.js react to screen changes (audio
 * unlock, relic picks, restarts). Returns a handle with the last cursor.
 */
export function attachInput(canvas, state, ui, hooks) {
  let drawing = false;
  let dragPoints = [];
  let lastSample = null;
  let cursor = { x: W / 2, y: H / 2 };

  function sample(p) {
    if (!lastSample || Math.hypot(p.x - lastSample.x, p.y - lastSample.y) >= TUNE.sampleGap) {
      dragPoints.push(p);
      lastSample = p;
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    hooks.audio();
    const p = toLogical(canvas, e.clientX, e.clientY);
    cursor = p;
    if (state.screen === 'title') {
      hooks.start();
      return;
    }
    if (state.screen === 'relic') {
      hooks.pickRelic(p);
      return;
    }
    if (state.screen === 'squallfailed') {
      hooks.retry();
      return;
    }
    if (state.screen === 'victory' || state.screen === 'defeat') {
      hooks.restart();
      return;
    }
    if (state.screen !== 'play') return;
    drawing = true;
    dragPoints = [p];
    lastSample = p;
    ui.preview = dragPoints;
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = toLogical(canvas, e.clientX, e.clientY);
    cursor = p;
    if (!drawing) return;
    sample(p);
    // Feed the drag into the network in chunks so a long stroke never waits.
    if (dragPoints.length >= 6) {
      addVeinPoints(state, dragPoints);
      dragPoints = [p];
      lastSample = p;
      ui.preview = dragPoints;
    }
  });

  function release(e) {
    if (!drawing) return;
    drawing = false;
    const p = e ? toLogical(canvas, e.clientX, e.clientY) : cursor;
    if (dragPoints.length > 1) addVeinPoints(state, dragPoints);
    dragPoints = [];
    ui.preview = null;
    dischargeAt(state, p.x, p.y);
  }

  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => release(null));
  canvas.addEventListener('pointerleave', () => {
    if (drawing) release(null);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      hooks.mute();
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      if (state.screen === 'victory' || state.screen === 'defeat') hooks.restart();
      return;
    }
    if (e.key === ' ') {
      if (state.screen === 'play') {
        e.preventDefault();
        dischargeAt(state, cursor.x, cursor.y);
      }
      return;
    }
    if (state.screen === 'relic' && (e.key === '1' || e.key === '2')) {
      hooks.pickRelicIndex(Number(e.key) - 1);
    }
    if (state.screen === 'title' && (e.key === 'Enter' || e.key === ' ')) {
      hooks.start();
    }
  });

  return {
    get cursor() {
      return cursor;
    },
  };
}
