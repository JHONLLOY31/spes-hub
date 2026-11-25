// Small sound effects made with the browser's Web Audio (no audio files needed).
SPES.Sound = {
  on: true, ctx: null,
  tone(f, d, type = 'sine', v = 0.15, at = 0) {
    if (!this.on) return;
    try {
      const c = this.ctx || (this.ctx = new (window.AudioContext || window.webkitAudioContext)()), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
      o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d);
    } catch (e) { /* sound is optional */ }
  },
  play(n) {
    const m = { ok: () => { this.tone(660, .12); this.tone(990, .2, 'sine', .15, .1); }, bad: () => this.tone(140, .3, 'sawtooth', .1),
      click: () => this.tone(520, .05, 'square', .04), flip: () => this.tone(420, .07, 'triangle'),
      win: () => [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .3, 'sine', .15, i * .12)) };
    (m[n] || (() => {}))();
  }
};
