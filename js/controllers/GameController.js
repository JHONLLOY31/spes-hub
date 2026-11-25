// Game logic. Points are one running total per user. Answered items are remembered, so leaving a room
// never resets anything and coming back continues with the remaining items in a new order.
SPES.Games = {
  s() { return SPES.App.s; },
  user() { return SPES.UserModel.session(); },
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },

  open(room) {
    const G = SPES.GameModel, u = this.user(), kind = G.KINDS[room] || 'mc', r = G.room(u.id, room), replay = r.done, items = G.QUESTIONS[room];
    if (room === 13) G.QUESTIONS[13] = this.colorQs();
    const todo = this.shuffle([...Array(10).keys()].filter(i => replay || !r.got.includes(i)));
    const p = { room, kind, replay, order: todo, n: 0, base: replay ? 0 : r.got.length, pts: 0, fb: null, res: null };
    if (kind === 'memory') p.m = { cards: this.shuffle(todo.flatMap(i => [{ e: items[i], item: i }, { e: items[i], item: i }])).map((c, k) => ({ ...c, k, state: '' })), open: [], busy: false, pairs: 0, total: todo.length };
    if (kind === 'search') p.w = this.makeSearch(todo.map(i => items[i]), todo);
    Object.assign(this.s(), { tab: 'games', play: p, cert: false });
  },

  award(ok, key) {
    const p = this.s().play, d = p.replay ? 0 : SPES.GameModel.add(this.user().id, p.room, key, ok);
    p.pts += d; SPES.Sound.play(ok ? 'ok' : 'bad');
  },
  hud() {
    const p = this.s().play, set = (id, v) => { const el = document.getElementById(id); if (el) { el.textContent = v; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } };
    set('rp', p.pts); set('tp', SPES.GameModel.total(this.user().id));
  },
  done() {
    const u = this.user(), p = this.s().play;
    if (!u || !p || p.res) return;
    p.res = { replay: p.replay }; SPES.Sound.play('win');
    if (!p.replay) SPES.ActivityModel.log(u.id, `Completed room ${p.room + 1}: ${SPES.GameModel.TITLES[p.room]}`);
  },

  act(a, d) {
    const s = this.s(), p = s.play;
    if (!['flip', 'cell'].includes(a)) SPES.Sound.play('click');
    if (a === 'mute') SPES.Sound.on = !SPES.Sound.on;
    else if (a === 'open') this.open(+d.room);
    else if (a === 'quit') s.play = null;
    else if (a === 'cert') s.cert = true;
    else if (a === 'retry') { if (!p.fb || p.fb.ok) return 'skip'; p.fb = null; }
    else if (a === 'answer') {
      if (p.fb && p.fb.ok) return 'skip';
      if (p.fb && !p.fb.ok) p.fb = null;
      const idx = p.order[p.n], ok = +d.i === SPES.GameModel.QUESTIONS[p.room][idx].a;
      p.fb = { pick: +d.i, ok }; this.award(ok, idx);
    } else if (a === 'next') { if (!p.fb || !p.fb.ok) return 'skip'; p.fb = null; if (++p.n >= p.order.length) this.done(); }
    else if (a === 'flip') return this.flip(+d.k);
    else if (a === 'cell') return this.cell(+d.r, +d.c);
  },
  type(val) {
    const p = this.s().play, idx = p.order[p.n];
    if ((p.fb && p.fb.ok) || !val.trim()) return;
    if (p.fb && !p.fb.ok) p.fb = null;
    const ok = val.trim().toUpperCase() === SPES.GameModel.QUESTIONS[p.room][idx].ans.toUpperCase();
    p.fb = { pick: val, ok }; this.award(ok, idx);
  },

  el(sel) { return document.querySelector(sel); },
  flip(k) {
    const m = this.s().play.m, c = m.cards[k];
    if (m.busy || c.state) return 'skip';
    c.state = 'on'; m.open.push(k); this.el(`[data-k="${k}"]`).classList.add('on'); SPES.Sound.play('flip');
    if (m.open.length === 2) {
      const [a, b] = m.open, A = m.cards[a], B = m.cards[b], ok = A.item === B.item;
      this.award(ok, ok ? A.item : null); this.hud();
      if (ok) {
        [a, b].forEach(x => { m.cards[x].state = 'done'; this.el(`[data-k="${x}"]`).classList.add('done'); });
        m.open = [];
        if (++m.pairs === m.total) setTimeout(() => { this.done(); SPES.App.render(); }, 700);
      } else {
        m.busy = true;
        setTimeout(() => { [a, b].forEach(x => { m.cards[x].state = ''; this.el(`[data-k="${x}"]`).classList.remove('on'); }); m.open = []; m.busy = false; }, 800);
      }
    }
    return 'skip';
  },

  makeSearch(words, idxs) {
    const N = 12, g = Array.from({ length: N }, () => Array(N).fill('')), dirs = [[1, 0], [0, 1], [1, 1]], idx = {};
    words.forEach((w, n) => {
      idx[w] = idxs[n];
      for (let t = 0; t < 300; t++) {
        const [dx, dy] = dirs[Math.floor(Math.random() * 3)], x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
        if (x + dx * (w.length - 1) >= N || y + dy * (w.length - 1) >= N) continue;
        let fit = true;
        for (let i = 0; i < w.length; i++) { const c = g[y + dy * i][x + dx * i]; if (c && c !== w[i]) { fit = false; break; } }
        if (fit) { for (let i = 0; i < w.length; i++) g[y + dy * i][x + dx * i] = w[i]; break; }
      }
    });
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    g.forEach(row => row.forEach((c, x) => { if (!c) row[x] = L[Math.floor(Math.random() * 26)]; }));
    return { g, words, idx, found: [], start: null };
  },
  cell(r, c) {
    const w = this.s().play.w, q = (y, x) => this.el(`[data-r="${y}"][data-c="${x}"]`);
    if (!w.start) { w.start = [r, c]; q(r, c).classList.add('sel'); return 'skip'; }
    const [r0, c0] = w.start; w.start = null;
    document.querySelectorAll('.wc.sel').forEach(e => e.classList.remove('sel'));
    if (r === r0 && c === c0) return 'skip';
    const straight = r === r0 || c === c0 || Math.abs(r - r0) === Math.abs(c - c0), n = Math.max(Math.abs(r - r0), Math.abs(c - c0)) + 1;
    let str = '', cells = [];
    if (straight) for (let i = 0; i < n; i++) { const y = r0 + Math.sign(r - r0) * i, x = c0 + Math.sign(c - c0) * i; cells.push([y, x]); str += w.g[y][x]; }
    const rev = [...str].reverse().join(''), hit = w.words.find(x => !w.found.includes(x) && (x === str || x === rev));
    if (hit) {
      w.found.push(hit); cells.forEach(([y, x]) => q(y, x).classList.add('fnd'));
      const li = document.getElementById('w-' + hit); if (li) li.classList.add('on');
      this.award(true, w.idx[hit]);
      if (w.found.length === w.words.length) setTimeout(() => { this.done(); SPES.App.render(); }, 700);
    } else this.award(false, null);
    this.hud();
    return 'skip';
  },

  colorQs() {
    const C = [['Red', '#ff5252'], ['Blue', '#448aff'], ['Green', '#4cd97b'], ['Yellow', '#ffd600'], ['Purple', '#c77dff'], ['Orange', '#ff9100']], pick = () => C[Math.floor(Math.random() * 6)];
    return Array.from({ length: 10 }, () => {
      const word = pick(); let ink = pick(); while (ink === word) ink = pick();
      const o = this.shuffle(C.map(c => c[0])).slice(0, 4); if (!o.includes(ink[0])) o[0] = ink[0]; this.shuffle(o);
      return { q: word[0].toUpperCase(), ink: ink[1], o, a: o.indexOf(ink[0]), prompt: 'What COLOR is the ink, not the word?' };
    });
  },

  body(u) {
    const s = this.s(), G = SPES.GameModel, V = SPES.GameView, p = s.play;
    if (s.cert) return SPES.View.certificate(u.name);
    if (!p) return V.lobby(G, u);
    return p.res ? V.result(p, G.TITLES[p.room]) : V.play(p, G, u);
  }
};
