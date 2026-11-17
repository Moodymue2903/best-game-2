// FULGURITE audio — everything is synthesized in WebAudio, no files.
// Thunder is filtered noise plus a sub-bass pitch-drop; glass is a stack of
// sine partials; the wind is a looped, band-passed noise bed. Nothing here
// is required for play: every call is guarded, and a muted engine is silent.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.drone = null;
  }

  /** Create the context on first user gesture (browsers demand it). */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.startDrone();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /** Low wind bed: looped noise through a slow-breathing band-pass. */
  startDrone() {
    if (!this.ctx || this.drone) return;
    try {
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 220;
      filter.Q.value = 0.6;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.035;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.018;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
      lfo.start();
      this.drone = { src, lfo };
    } catch {
      this.drone = null;
    }
  }

  /** A thunder crack: noise burst through a falling low-pass + sub drop. */
  thunder(strong) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const dur = strong ? 1.4 : 0.7;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(strong ? 900 : 500, t);
      filter.frequency.exponentialRampToValueAtTime(90, t + dur);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(strong ? 0.5 : 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
      // Sub-bass pitch drop underneath the crack.
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + dur * 0.8);
      const og = this.ctx.createGain();
      og.gain.setValueAtTime(strong ? 0.4 : 0.2, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(og);
      og.connect(this.ctx.destination);
      osc.start();
      osc.stop(t + dur);
    } catch {
      // Sound is garnish; a failed crack never stops the game.
    }
  }

  /** A glass chime: two high sine partials with a fast decay. */
  chime() {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      for (const [freq, vol] of [[1320, 0.08], [1978, 0.05], [2637, 0.03]]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(t + 0.55);
      }
    } catch {
      // Ignore.
    }
  }

  /** A short electric zap for Ball Lightning and small hits. */
  zap() {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2400, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.12);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(t + 0.13);
    } catch {
      // Ignore.
    }
  }

  /** The deep boom of a capacitor ring detonating. */
  ringBoom() {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(24, t + 0.9);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(t + 0.95);
    } catch {
      // Ignore.
    }
  }

  /** Steam hiss for a vent erupting. */
  hiss() {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1800;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
    } catch {
      // Ignore.
    }
  }
}
