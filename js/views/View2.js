// Second set of views: shell with profile chip, attendance by day, profile, settings, notifications, approvals.
Object.assign(SPES.View, {
  SUN: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  MOON: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>',
  CAM: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  LOCK: '<svg class="ic lockic" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>',
  // Admin only: the answer key for every learning game.
  keyGate(has, mode, wait, m) {
    const f = (name, label, min) => `<label for="k_${name}">${label}</label><input id="k_${name}" type="password" name="${name}" required ${min ? 'minlength="6"' : ''} autocomplete="new-password">`;
    let title, note, form;
    if (!has) { title = 'Set the answer key password'; note = 'Only people who know this password can open the answer key. Choose one and share it only with authorized staff.'; form = `<form data-form="keyset">${f('pw', 'New password', 1)}${f('pw2', 'Repeat the password', 1)}<button class="btn">Save and open</button></form>`; }
    else if (mode === 'forgot') { title = 'Reset the password'; note = 'Confirm it is you with your administrator account password, then choose a new answer key password.'; form = `<form data-form="keyreset">${f('acct', 'Your administrator account password')}${f('pw', 'New answer key password', 1)}${f('pw2', 'Repeat the new password', 1)}<button class="btn">Reset and open</button></form><p class="muted"><button type="button" class="link" data-act="keymode" data-v="">Back</button></p>`; }
    else { title = 'Enter the answer key password'; note = 'The answer key is protected. It locks again when you leave this page, log out, or stay idle.'; form = `<form data-form="keyunlock">${f('pw', 'Password')}<button class="btn">Unlock</button></form><p class="muted"><button type="button" class="link" data-act="keymode" data-v="forgot">Forgot the password?</button></p>`; }
    return `<h1>Game answers</h1>${this.msg(m)}<div class="card keygate"><div class="mic">${this.LOCK}</div><h2>${title}</h2><p class="muted">${note}</p>${wait ? `<p class="msg">Too many wrong tries. Try again in ${wait} minute(s).</p>` : form}</div>`;
  },
  answers(G, m, mode) {
    const e = s => this.esc(s), K = G.KINDS || {}, kindOf = i => i === 13 ? 'color' : (K[i] || 'mc');
    const names = { mc: 'Multiple choice', type: 'Type the answer', memory: 'Memory match', search: 'Word search', color: 'Color match' };
    const marks = items => `<div class="ansans">${items.map(x => `<mark>${e(x)}</mark>`).join(' ')}</div>`;
    const body = (i, items) => {
      const k = kindOf(i);
      if (k === 'color') return '<li class="ansitem"><b>Color match</b> shows a color word printed in a different ink color. The correct answer is always the <mark>ink color</mark>, never the word. The rounds are random every time the room opens.</li>';
      if (k === 'memory') return `<li class="ansitem"><b>Match the pairs.</b> Each of these 10 symbols appears twice on the board:${marks(items)}</li>`;
      if (k === 'search') return `<li class="ansitem"><b>Words hidden in the grid</b>${marks(items)}</li>`;
      if (k === 'type') return items.map((q, n) => `<li class="ansitem"><b>${n + 1}. ${e(q.q)}</b> <span class="muted">${e(q.prompt || '')}</span><div class="ansans">Answer: <mark>${e(q.ans)}</mark></div></li>`).join('');
      return items.map((q, n) => `<li class="ansitem"><b>${n + 1}. ${e(q.q)}</b><ul class="ansopts">${q.o.map((o, x) => `<li class="${x === q.a ? 'right' : ''}">${e(o)}${x === q.a ? ' &#10003;' : ''}</li>`).join('')}</ul></li>`).join('');
    };
    return `<h1>Game answers</h1>${this.msg(m)}<div class="keybar"><span class="tag ok">Unlocked</span><button class="btn alt" data-act="keylock">Lock now</button><button class="btn alt" data-act="keymode" data-v="${mode === 'change' ? '' : 'change'}">Change password</button></div>
      ${mode === 'change' ? `<form class="card" data-form="keychange" style="max-width:480px"><h3>Change the answer key password</h3><label for="k_cur">Current password</label><input id="k_cur" type="password" name="cur" required autocomplete="off"><label for="k_pw">New password</label><input id="k_pw" type="password" name="pw" required minlength="6" autocomplete="new-password"><label for="k_pw2">Repeat the new password</label><input id="k_pw2" type="password" name="pw2" required minlength="6" autocomplete="new-password"><button class="btn">Save new password</button></form>` : ''}
      <p class="muted">The answer key for every learning game. Correct answers are highlighted.</p>
      <label for="ansSearch">Search questions and answers</label><input id="ansSearch" type="search" placeholder="Type a word, for example printer" autocomplete="off">
      ${G.TITLES.map((t, i) => `<details class="card ansroom"><summary><b>Room ${i + 1} · ${e(t)}</b><span class="tag">${names[kindOf(i)]}</span></summary><ul class="anslist">${body(i, G.QUESTIONS[i] || [])}</ul></details>`).join('')}`;
  },
  lockTile(w) { const early = w.state === 'early'; return `<div class="lockbox">${this.LOCK}<b>${early ? 'Opens at ' + w.opensAt : 'Closed for today'}</b><small>${early ? 'Come back then to send your photo.' : 'This slot is no longer open.'}</small></div>`; },
  noteLive(u) { return u.note && Date.now() - new Date(u.note.at).getTime() < 864e5 ? u.note : null; },
  frameOf(u, cls = '') { const b = u.avBorder || (cls === 'xl' ? 'gold' : 'none'); return { yellow: 'gold', black: 'champion', white: 'champion', double: 'champion', glow: 'pulse', dashed: 'checker' }[b] || b; },
  // Profile photo with an optional game-style frame (yellow / black / white).
  av(u, cls = '') {
    const fr = this.frameOf(u, cls), k = `av ${cls} ${fr === 'none' ? 'plain' : ''}`;
    const inner = u.avatar ? `<img class="${k}" src="${u.avatar}" alt="">` : `<span class="${k}">${this.esc((u.name || '?')[0].toUpperCase())}</span>`;
    return fr === 'none' ? inner : `<span class="frame fr-${fr} ${cls}">${inner}</span>`;
  },
  TRASH: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/></svg>',
  deleteModal(t) {
    return `<div class="modal" role="dialog" aria-modal="true"><div class="mbox"><div class="mic bad">${this.TRASH}</div><h2>Are you sure you want to delete it?</h2>
      <p class="muted">This permanently deletes <b>${this.esc(t.name)}</b>${t.spesId ? ' (' + this.esc(t.spesId) + ')' : ''} and all of their attendance, journal and game records. This cannot be undone.</p>
      <div class="row" style="justify-content:center"><button class="btn alt" data-act="canceldel">Cancel</button><button class="btn bad" data-act="confirmdel">Yes, delete</button></div></div></div>`;
  },

  shell(user, tabs, tab, body, bd = {}) {
    const T = k => SPES.I18n.t(k), role = { beneficiary: 'SPES Beneficiary', head: 'Office Head', admin: 'Administrator' }[user.role];
    return `<div class="layout"><aside class="side"><div class="brand"><img src="img/logo.png" alt="SPES logo"><span>SPES<i>Hub</i></span><small>Learn · Earn · Grow</small></div>
      <nav>${tabs.map(k => `<button class="${k === tab ? 'on' : ''}" data-act="tab" data-t="${k}">${this.icon(k)}<span>${T(k)}</span>${bd[k] ? `<em class="nb">${bd[k]}</em>` : ''}</button>`).join('')}</nav>
      <div class="me"><div class="who">${this.av(user)}<div><b>${this.esc(user.name)}</b><small>${role}</small></div></div>
      <button class="out" data-act="askout">${this.icon('logout')}${T('logout')}</button></div></aside><main class="content"><div class="top-actions"><button class="theme-toggle theme-switch ${(user.settings||{}).theme === 'dark' ? 'is-dark' : 'is-light'}" data-act="theme" data-v="${(user.settings||{}).theme === 'dark' ? 'light' : 'dark'}" title="Switch to ${(user.settings||{}).theme === 'dark' ? 'light' : 'dark'} mode"><span class="theme-icon">${(user.settings||{}).theme === 'dark' ? this.SUN : this.MOON}</span><span>${(user.settings||{}).theme === 'dark' ? 'Light mode' : 'Dark mode'}</span><span class="theme-track"><i></i></span></button></div>${body}</main></div>`;
  },
  logoutModal() {
    return `<div class="modal" role="dialog" aria-modal="true"><div class="mbox"><div class="mic">${this.icon('logout')}</div><h2>Leaving already?</h2>
      <p class="muted">Your progress is saved. You can sign back in anytime.</p>
      <div class="row" style="justify-content:center"><button class="btn alt" data-act="cancelout">Stay</button><button class="btn" data-act="logout">Log out</button></div></div></div>`;
  },

  attendance(slots, days, sel, recs, canProof, m) {
    const d = days[sel - 1], A = SPES.AttendanceModel;
    const [dayLabel] = A.dayStatus(recs[0]?.userId || '', d.date, canProof);
    const isWFH = A.isWorkFromHome(d.date), rest = A.isRestDay(d.date);
    return `<h1>Attendance</h1><p class="muted">Submit separate photo proof for each morning and afternoon attendance slot. Every submission stays Pending until the Administrator reviews the image.</p><p class="muted">Your Day 1 is <b>${days[0].date}</b>.</p>${this.dayPicker(days, sel, 'attday')}${this.msg(m)}
      <div class="card tile row"><div><h2 style="margin:0">Day ${sel}</h2><span class="tag ${d.state === 'full' ? 'ok' : d.state === 'abs' ? 'bad' : 'gold'}">${rest ? 'Rest day' : isWFH ? 'Work from home' : d.label}</span></div></div>
      ${isWFH ? '<div class="card"><h3>Friday · Work from home</h3><p>No attendance submission is required. Friday remains part of the 20 scheduled workdays.</p></div>' : rest ? '<div class="card"><h3>Weekend rest day</h3><p>No attendance is required on Saturday or Sunday. These days are not counted among the 20 workdays.</p></div>' : `<div class="grid">${Object.entries(slots).map(([k, slot]) => { const r = recs.find(a => a.slot === k), w = A.windowState(k), lock = canProof && !r && !w.open; return `<div class="card tile ${lock ? 'locked' : ''}"><h3>${slot.label}</h3><p class="muted">${slot.rule}</p>${r ? `<span class="tag ${r.status === 'approved' ? 'ok' : r.status === 'rejected' ? 'bad' : 'gold'}">${r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : 'Pending admin review'}</span><p class="muted">Submitted: ${this.when(r.submittedAt)}</p>${r.photo ? `<a href="${r.photo}" target="_blank" rel="noopener"><img class="thumb" src="${r.photo}" alt="${slot.label} proof"></a>` : ''}` : lock ? this.lockTile(w) : canProof ? `<form data-form="attend" data-slot="${k}"><input type="file" name="photo" class="pick" accept="image/*" capture="environment" required><div class="pv"></div><div class="row"><button class="btn">Upload image</button><button type="reset" class="btn alt">Cancel</button></div></form>` : '<span class="tag">Not submitted</span>'}</div>`; }).join('')}</div>`}`;
  },

  attendanceConfirmModal() {
    return `<div class="modal" role="dialog" aria-modal="true"><div class="mbox"><div class="mic">${this.CAM}</div><h2>Confirm attendance upload</h2><p class="muted">Are you sure you want to upload this image? It will be sent to the Administrator for review and will remain Pending until approved.</p><div class="row" style="justify-content:center"><button class="btn alt" data-act="attcancel">Cancel</button><button class="btn" data-act="attsubmit">Submit image</button></div></div></div>`;
  },

  profile(u, stats, m) {
    return `<h1>Profile</h1>${this.msg(m)}<div class="card"><div class="avbig">${this.noteLive(u) ? `<div class="nbub">${this.esc(this.noteLive(u).text)}</div>` : '<div class="nbub empty">Your note shows here</div>'}${this.av(u, 'xl')}<label class="btn alt avl">Change photo<input type="file" class="avpick" accept="image/*" hidden></label>
      <div class="abpick" role="group" aria-label="Photo frame">${[['none', 'None'], ['gold', 'Gold'], ['champion', 'Champion'], ['spark', 'Spark'], ['pulse', 'Pulse'], ['checker', 'Checker'], ['star', 'Star']].map(([k, l]) => `<button type="button" class="abp ${this.frameOf(u, 'xl') === k ? 'on' : ''}" data-act="avborder" data-v="${k}" aria-pressed="${this.frameOf(u, 'xl') === k}"><span class="frame fr-${k} sm"><span class="av plain"></span></span><span>${l}</span></button>`).join('')}</div></div>
      <div class="profile-meta"><b>SPES ID:</b> ${this.esc(u.spesId || 'Not assigned')} · <b>Gender:</b> ${this.esc(u.gender || 'Not specified')}</div><form data-form="name"><label>Full name</label><input name="name" value="${this.esc(u.name)}" required><label>Gender identity</label><select name="gender" required><option value="Male" ${u.gender === 'Male' ? 'selected' : ''}>Male</option><option value="Female" ${u.gender === 'Female' ? 'selected' : ''}>Female</option></select><button class="btn">Save profile</button></form></div>
      <div class="card notes"><h3>My note</h3><p class="muted">Like a Messenger note: a short message that shows above your photo for 24 hours.</p>
        <form data-form="note"><input name="text" maxlength="60" required placeholder="What's on your mind?" value="${this.esc((this.noteLive(u) || {}).text || '')}"><button class="btn">${this.noteLive(u) ? 'Update note' : 'Share note'}</button></form>
        ${this.noteLive(u) ? `<p class="muted">Visible for about ${Math.max(1, Math.ceil((864e5 - (Date.now() - new Date(u.note.at).getTime())) / 36e5))} more hour(s). <button type="button" class="link" data-act="delnote">Delete note</button></p>` : ''}</div>
      <div class="stats">${stats.map((s, i) => `<div class="stat ${i === 0 ? 'hl' : ''}"><span>${s[0]}</span><b>${s[1]}</b></div>`).join('')}</div>`;
  },

  settings(u, sub, hist, m) {
    const st = u.settings || {}, e = s => this.esc(s);
    const tabs = [['account', 'Account'], ['prefs', 'Preferences'], ['history', 'Activity history'], ['privacy', 'Privacy & policy'], ['help', 'Help & support']].concat(u.role === 'beneficiary' ? [['feedback', 'Feedback']] : []);
    let b;
    if (sub === 'account') b = `<form class="card" data-form="name"><h3>Change name</h3><input name="name" value="${e(u.name)}" required><button class="btn">Save name</button></form>
      <form class="card" data-form="pass"><h3>Change password</h3><label>Current password</label><input name="cur" type="password" required autocomplete="current-password"><label>New password</label><input name="next" type="password" required autocomplete="new-password"><button class="btn">Update password</button></form>`;
    else if (sub === 'prefs') b = `<div class="card"><h3>Theme</h3><div class="seg"><button class="${st.theme === 'dark' ? '' : 'on'}" data-act="theme" data-v="light">☀️ Light</button><button class="${st.theme === 'dark' ? 'on' : ''}" data-act="theme" data-v="dark">🌙 Dark</button></div>
      <h3>Language</h3><select data-act="lang">${Object.entries(SPES.I18n.LANGS).map(([k, l]) => `<option value="${k}" ${(st.lang || 'en') === k ? 'selected' : ''}>${l}</option>`).join('')}</select><p class="muted">Menus and the welcome message change language.</p>
      <h3>Sound effects</h3><div class="seg"><button class="${st.sound === false ? '' : 'on'}" data-act="snd" data-v="1">On</button><button class="${st.sound === false ? 'on' : ''}" data-act="snd" data-v="0">Off</button></div></div>`;
    else if (sub === 'history') b = `<div class="card">${hist.map(h => `<div class="act"><span>${e(h.text)}</span><small>${this.when(h.ts)}</small></div>`).join('') || '<p class="muted">No activity yet.</p>'}</div>`;
    else if (sub === 'privacy') b = `<div class="card"><h3>Privacy & policy</h3><p>SPES Hub collects your name, attendance photos, daily journals and game scores only to run the SPES program of the Davao Oriental Provincial Capitol.</p><p>Your information is visible to you, the Office Head and the Administrator. It is not shared with outsiders or used for advertising.</p><p>Upload only photos taken at your duty station and keep your password private. You may ask the Administrator to correct or remove your data at any time.</p></div>`;
    else if (sub === 'help') b = `<div class="card"><h3>Help & support</h3><p><b>How do I mark attendance?</b> Open Attendance, pick your Day, tap “I’m present”, then send a photo with a date and time stamp on your duty day.</p><p><b>Why is my attendance Pending?</b> It becomes Present once your photo proof is sent.</p><p><b>I forgot my password.</b> Use “Forgot password?” on the login page.</p><p><b>Need more help?</b> Contact your Office Head or the SPES Administrator at the Provincial Capitol.</p></div>`;
    else b = `<form class="card" data-form="feedback"><h3>Give feedback</h3><p class="muted">Tell us what to improve. Your first feedback gives you +20 points!</p><label>Rating</label><select name="rating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select><label>Comments and suggestions</label><textarea name="text" rows="5" required></textarea><button class="btn">Send feedback</button></form>`;
    return `<h1>Settings</h1><div class="pills">${tabs.map(([k, l]) => `<button class="${k === sub ? 'on' : ''}" data-act="sub" data-v="${k}">${l}</button>`).join('')}</div>${this.msg(m)}${b}`;
  },

  notifs(list, seen) {
    const ic = { announce: 'announce', event: 'calendar', approval: 'approvals', feedback: 'feedback', attendance: 'attendance', journal: 'journal' };
    return `<h1>Notifications</h1>${list.map(n => `<div class="card nrow ${n.ts > (seen || '') ? 'new' : ''}"><span class="ni">${this.icon(ic[n.kind] || 'notifs')}</span><div><b>${this.esc(n.text)}</b><div class="muted">${this.when(n.ts)}</div></div></div>`).join('') || '<p class="muted">You are all caught up.</p>'}`;
  },
  approvals(list, bname, m) {
    return `<h1>Approvals</h1><p class="muted">New beneficiaries must be approved before they can log in.</p>${this.msg(m)}
      ${list.map(x => `<div class="card row">${this.av(x)}<div><b>${this.esc(x.name)}</b><div class="muted">@${this.esc(x.username)} · ${this.esc(bname(x.batch))}</div></div>
        <span class="row" style="margin-left:auto"><button class="btn" style="margin:0" data-act="approve" data-id="${x.id}">Approve</button><button class="btn bad" style="margin:0" data-act="decline" data-id="${x.id}">Decline</button></span></div>`).join('') || '<p class="muted">No one is waiting for approval.</p>'}`;
  },
  feedbackList(list) {
    return `<h1>Feedback</h1>${list.map(f => `<div class="card"><div class="row"><b>${this.esc(f.name)}</b><span class="tag gold">${'★'.repeat(+f.rating)}</span><span class="muted" style="margin-left:auto">${this.when(f.ts)}</span></div><p>${this.esc(f.text)}</p></div>`).join('') || '<p class="muted">No feedback yet.</p>'}`;
  },
  announce(batches, ann, m) {
    return `<h1>Announcements</h1><p class="muted">Users are notified right away. Add a date to also put it on everyone’s calendar.</p>${this.msg(m)}
      <form class="card" data-form="announce"><label>Title</label><input name="title" required><label>Message</label><textarea name="body" rows="3" required></textarea>
        <div class="row"><div><label>Send to</label><select name="to"><option value="all">All batches</option>${batches.map(b => `<option value="${b.code}">${this.esc(b.name)}</option>`).join('')}</select></div><div><label>Event date (optional)</label><input name="date" type="date"></div></div>
        <button class="btn">Send announcement</button></form>
      ${ann.map(a => `<div class="card"><b>${this.esc(a.title)}</b> <span class="muted">· ${this.when(a.ts)}</span><p>${this.esc(a.body)}</p></div>`).join('')}`;
  },
  staffDash(name, stats, links, bx) {
    return `${this.banner(name, 'Here is your overview for today.')}<div class="stats">${stats.map((s, i) => `<div class="stat ${i === 0 ? 'hl' : ''}"><span>${s[0]}</span><b>${s[1]}</b></div>`).join('')}</div>
      <h3>Batches</h3><div class="grid">${bx.map(b => `<div class="card tile"><h3>${this.esc(b.name)}</h3><span class="tag gold">${b.code}</span><p class="muted">Present today</p><div class="score" style="font-size:1.9rem">${b.present} / ${b.members}</div></div>`).join('') || '<p class="muted">No batches yet.</p>'}</div>
      <div class="row">${links.map(([t, l]) => `<button class="btn" data-act="tab" data-t="${t}">${l}</button>`).join('')}</div>`;
  }
});
Object.assign(SPES.View.ICONS, {
  notifs: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.7 21a2 2 0 01-3.4 0', profile: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  settings: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2', approvals: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM17 11l2 2 4-4',
  announce: 'M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zM16 8a5 5 0 010 8', feedback: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z', logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9'
});

SPES.View.ICONS.answers = 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11';
