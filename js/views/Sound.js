// Small sound effects made with the browser's Web Audio (no audio files needed).
SPES.Sound = {
  on: true, ctx: null,
  tone(f, d, type = 'sine', v = 0.15, at = 0) {
    if (!this.on) return;
    try {
      const c = this.ctx || (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
      if (c.state === 'suspended') c.resume();
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
      o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d);
    } catch (e) { /* sound is optional */ }
  },
  play(n) {
    const m = { ok: () => { this.tone(660, .12); this.tone(990, .2, 'sine', .15, .1); }, bad: () => this.tone(140, .3, 'sawtooth', .1),
      click: () => this.tone(520, .05, 'square', .04), flip: () => this.tone(420, .07, 'triangle'),
      lampOn: () => { this.tone(1200, .025, 'square', .06, 0); this.tone(1650, .035, 'triangle', .07, .028); this.tone(523, .16, 'sine', .09, .05); this.tone(784, .22, 'sine', .08, .09); },
      lampOff: () => { this.tone(920, .025, 'square', .06, 0); this.tone(480, .04, 'triangle', .06, .026); this.tone(260, .16, 'sine', .07, .05); },
      win: () => [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .3, 'sine', .15, i * .12)) };
    (m[n] || (() => {}))();
  }
};
