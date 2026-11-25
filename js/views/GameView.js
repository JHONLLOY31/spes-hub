SPES.GameView = {
  e(s) { return SPES.View.esc(s); },
  ICONS: ['💼','📄','🗂️','🤝','🦺','✉️','🏛️','⏱️','✅','⚖️','💡','🖼️','🃏','🎨','🔎','📖','🔀','📍','🕊️','🌏'],
  LAB: { 8: 'True or False', 9: 'True or False', 10: 'Guess the word', 11: 'Type the word', 12: 'Match pairs', 13: 'Color match', 14: 'Find the words', 16: 'Unscramble', 18: 'Guess the name' },
  mute() { return `<button class="back" style="margin:0" data-act="mute">${SPES.Sound.on ? '🔊 Sound on' : '🔇 Sound off'}</button>`; },

  lobby(G, u) {
    const pr = G.userProgress(u.id), done = G.completed(u.id);
    return `<div class="ghead"><div><h1>Learning games</h1><p class="muted">Every correct answer gives +20 points and every wrong answer takes away 1, instantly.</p></div>${this.mute()}<div class="pill"><span>Total points</span><b id="tp">${G.total(u.id)}</b></div></div>
      <div class="bar"><i style="width:${done * 5}%"></i></div>
      <p class="muted">${done} of 20 rooms complete ${G.hasCertificate(u.id) ? '· <button class="link" data-act="cert">View certificate</button>' : ''}</p>
      <div class="tiles">${G.TITLES.map((t, i) => {
        const r = pr[i], open = G.isOpen(i), ok = r && r.done;
        return `<button class="gt ${ok ? 'done' : ''} ${open ? '' : 'soon'}" ${open ? `data-act="open" data-room="${i}"` : 'disabled'}><span class="gi">${this.ICONS[i]}</span><small>Room ${i + 1}</small><b>${t}</b><em>${ok ? r.score + ' pts · replay' : open ? (this.LAB[i] || 'Quiz') : 'Coming soon'}</em></button>`;
      }).join('')}</div>`;
  },

  play(p, G, u) {
    const x = (G.QUESTIONS[p.room] || [])[p.i];
    let body;
    if (p.kind === 'memory') body = this.memory(p);
    else if (p.kind === 'search') body = this.search(p);
    else body = `<div class="prog"><i style="width:${p.i * 10}%"></i></div><p class="muted">Question ${p.i + 1} of 10</p>` + (p.kind === 'type' ? this.type(x, p.fb) : this.mc(x, p.fb))
      + (p.fb ? `<button class="btn" data-act="next">${p.i === 9 ? 'Finish room' : 'Next'}</button>` : '');
    return `${SPES.View.back('quit', 'Rooms')}<div class="hud"><div><small>Room ${p.room + 1}</small><b>${G.TITLES[p.room]}</b></div>${this.mute()}
      <div class="pill"><span>This room</span><b id="rp">${p.pts}</b></div><div class="pill"><span>Total</span><b id="tp">${G.total(u.id)}</b></div></div><div class="stage">${body}</div>`;
  },

  mc(x, fb) {
    return `${x.prompt ? `<p class="muted">${x.prompt}</p>` : ''}<h2 class="qtxt" ${x.ink ? `style="color:${x.ink};font-size:3rem;text-align:center"` : ''}>${this.e(x.q)}</h2>
      <div class="opts">${x.o.map((o, k) => `<button class="opt3 ${fb ? (k === x.a ? 'right' : k === fb.pick ? 'wrong' : '') : ''}" ${fb ? 'disabled' : ''} data-act="answer" data-i="${k}">${this.e(o)}</button>`).join('')}</div>
      ${fb ? `<p class="fb ${fb.ok ? 'g' : 'r'}">${fb.ok ? '+20 points!' : '−1 point'}</p>` : ''}`;
  },
  type(x, fb) {
    return `<p class="muted">${x.prompt}</p><h2 class="qtxt big">${this.e(x.q)}</h2>` + (fb
      ? `<p class="fb ${fb.ok ? 'g' : 'r'}">${fb.ok ? 'Correct! +20 points' : 'Answer: ' + this.e(x.ans) + ' (−1 point)'}</p>`
      : `<form data-form="gtype" class="row"><input name="val" autocomplete="off" autofocus placeholder="Type your answer" style="flex:1"><button class="btn" style="margin:0">Check</button></form>`);
  },
  memory(p) {
    return `<p class="muted">Flip two cards. A match gives +20, a miss takes away 1.</p><div class="mem">${p.m.cards.map(c => `<div class="mc ${c.state}" data-act="flip" data-k="${c.k}"><div class="mi"><span class="f">❓</span><span class="b">${c.e}</span></div></div>`).join('')}</div>`;
  },
  search(p) {
    const w = p.w;
    return `<p class="muted">Tap the first letter, then the last letter of a word. Words run across, down or diagonally.</p><div class="wsw"><div class="wsg">${w.g.map((row, r) => row.map((ch, c) => `<button class="wc" data-act="cell" data-r="${r}" data-c="${c}">${ch}</button>`).join('')).join('')}</div>
      <ul class="wl">${w.words.map(x => `<li id="w-${x}" class="${w.found.includes(x) ? 'on' : ''}">${x}</li>`).join('')}</ul></div>`;
  },
  result(p, t) {
    return `${SPES.View.back('tab', 'Rooms', 'games')}<div class="stage center"><h1 style="font-size:3.5rem">${p.pts >= 100 ? '🏆' : '⭐'}</h1><h2>${t} complete!</h2><div class="score">${p.pts} pts</div>
      <p>${p.correct} correct. ${p.first ? 'Your points were added as you played.' : 'This was a replay, so no extra points were added.'}</p><button class="btn" data-act="tab" data-t="games">Back to rooms</button></div>`;
  }
};

// v5 overrides: progress is kept between visits, wrong answers never reveal the correct one.
Object.assign(SPES.GameView, {
  lobby(G, u) {
    const done = G.completed(u.id);
    return `<div class="ghead"><div><h1>Learning games</h1><p class="muted">+20 for every correct answer, −1 for every wrong one. Your points update instantly and are never lost.</p></div>${this.mute()}<div class="pill"><span>Total points</span><b id="tp">${G.total(u.id)}</b></div></div>
      <div class="bar"><i style="width:${done * 5}%"></i></div>
      <p class="muted">${done} of 20 rooms complete ${G.hasCertificate(u.id) ? '· <button class="link" data-act="cert">View certificate</button>' : ''}</p>
      <div class="tiles">${G.TITLES.map((t, i) => {
        const r = G.room(u.id, i), open = G.isOpen(i);
        const sub = r.done ? 'Completed · replay' : r.got.length ? `${r.got.length} / 10 · continue` : open ? (this.LAB[i] || 'Quiz') : 'Coming soon';
        return `<button class="gt ${r.done ? 'done' : ''} ${open ? '' : 'soon'}" ${open ? `data-act="open" data-room="${i}"` : 'disabled'}><span class="gi">${this.ICONS[i]}</span><b>${t}</b><small>Room ${i + 1}</small><em>${sub}</em></button>`;
      }).join('')}</div>`;
  },
  play(p, G, u) {
    const x = (G.QUESTIONS[p.room] || [])[p.order[p.n]];
    let body;
    if (p.kind === 'memory') body = this.memory(p);
    else if (p.kind === 'search') body = this.search(p);
    else body = `<div class="prog"><i style="width:${(p.base + p.n) * 10}%"></i></div><p class="muted">Question ${p.base + p.n + 1} of 10${p.replay ? ' · replay, no points' : ''}</p>` + (p.kind === 'type' ? this.type(x, p.fb) : this.mc(x, p.fb))
      + (p.fb ? `<button class="btn ${p.fb.ok ? '' : 'alt'}" data-act="${p.fb.ok ? 'next' : 'retry'}">${p.fb.ok ? (p.n + 1 >= p.order.length ? 'Finish room' : 'Next') : 'Try again'}</button>` : '');
    return `${SPES.View.back('quit', 'Rooms')}<div class="hud"><div><small>Room ${p.room + 1}</small><b>${G.TITLES[p.room]}</b></div>${this.mute()}
      <div class="pill"><span>This visit</span><b id="rp">${p.pts}</b></div><div class="pill"><span>Total</span><b id="tp">${G.total(u.id)}</b></div></div><div class="stage">${body}</div>`;
  },
  mc(x, fb) {
    return `${x.prompt ? `<p class="muted">${x.prompt}</p>` : ''}<h2 class="qtxt" ${x.ink ? `style="color:${x.ink};font-size:3rem;text-align:center"` : ''}>${this.e(x.q)}</h2>
      <div class="opts">${x.o.map((o, k) => `<button class="opt3 ${fb && k === fb.pick ? (fb.ok ? 'right' : 'wrong') : ''}" ${fb ? 'disabled' : ''} data-act="answer" data-i="${k}">${this.e(o)}</button>`).join('')}</div>
      ${fb ? `<p class="fb ${fb.ok ? 'g' : 'r'}">${fb.ok ? '+20 points!' : 'Not quite · −1 point'}</p>` : ''}`;
  },
  type(x, fb) {
    return `<p class="muted">${x.prompt}</p><h2 class="qtxt big">${this.e(x.q)}</h2>` + (fb
      ? `<p class="fb ${fb.ok ? 'g' : 'r'}">${fb.ok ? 'Correct! +20 points' : 'Not quite · −1 point'}</p>`
      : `<form data-form="gtype" class="row"><input name="val" autocomplete="off" autofocus placeholder="Type your answer" style="flex:1"><button class="btn" style="margin:0">Check</button></form>`);
  },
  result(p, t) {
    return `${SPES.View.back('tab', 'Rooms', 'games')}<div class="stage center"><h1 style="font-size:3.5rem">${p.replay ? '🔁' : '🏆'}</h1><h2>${t} complete!</h2><div class="score">${p.pts >= 0 ? '+' : ''}${p.pts} pts</div>
      <p>${p.replay ? 'This was a replay, so no extra points were added.' : 'Points from this visit were added to your total as you played.'}</p><button class="btn" data-act="tab" data-t="games">Back to rooms</button></div>`;
  }
});
