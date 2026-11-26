// The controller connects user actions to the Supabase-backed API and tells the views what to draw.
SPES.App = {
  s: { mode: 'login', tab: null, m: null, play: null, board: null, cert: false, as: 'user', day: null, jday: null, cal: null, sub: 'account', confirm: false, lampOn: false },
  anim: true, jpics: [], jkey: null, draft: null, pendingAtt: null, _syncAt: 0, _syncing: false,
  GAME_ACTS: ['open', 'quit', 'cert', 'answer', 'next', 'retry', 'flip', 'cell', 'mute'],
  TABS: {
    beneficiary: ['dashboard', 'attendance', 'journal', 'messages', 'calendar', 'games', 'board', 'badges', 'notifs', 'profile', 'settings'],
    head: ['dashboard', 'personal', 'accounts', 'journals', 'board', 'answers', 'calendar', 'notifs', 'profile', 'settings'],
    admin: ['dashboard', 'approvals', 'review', 'journals', 'messages', 'admin', 'announce', 'feedback', 'calendar', 'board', 'notifs', 'profile', 'settings']
  },

  async init() {
    const root = document.getElementById('app');
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-act]');
      if (t && t.tagName !== 'SELECT') this.act(t.dataset.act, t.dataset, t);
      const tog = e.target.closest('[data-gdd-toggle]');
      if (tog) {
        const box = tog.closest('[data-gdd]'), open = !box.classList.contains('open');
        document.querySelectorAll('[data-gdd].open').forEach(x => { x.classList.remove('open'); x.querySelector('[data-gdd-toggle]').setAttribute('aria-expanded', 'false'); });
        if (open) { box.classList.add('open'); tog.setAttribute('aria-expanded', 'true'); }
        return;
      }
      const pick = e.target.closest('[data-gdd-pick]');
      if (pick) {
        const box = pick.closest('[data-gdd]'), val = pick.dataset.gddPick, btn = box.querySelector('[data-gdd-toggle]');
        box.querySelector('input[name="gender"]').value = val;
        btn.querySelector('.gdd-txt').textContent = val;
        btn.classList.remove('is-m', 'is-f');
        btn.classList.add(val === 'Male' ? 'is-m' : 'is-f');
        box.querySelectorAll('[data-gdd-pick]').forEach(o => o.classList.toggle('on', o === pick));
        box.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
        return;
      }
      if (!e.target.closest('[data-gdd]')) {
        document.querySelectorAll('[data-gdd].open').forEach(x => { x.classList.remove('open'); x.querySelector('[data-gdd-toggle]').setAttribute('aria-expanded', 'false'); });
      }
    });
    root.addEventListener('input', e => {
      if (e.target.id === 'classSearch') { this.s.roomQ = e.target.value; this.applySearch(); }
      if (e.target.id === 'chatSearch') {
        this.s.chatQ = e.target.value;
        const q = e.target.value.trim().toLowerCase();
        document.querySelectorAll('[data-chat-search]').forEach(el => { el.hidden = !el.dataset.chatSearch.includes(q); });
      }
      if (e.target.id === 'pisSearch') {
        this.s.pisQ = e.target.value;
        const q = e.target.value.trim().toLowerCase();
        document.querySelectorAll('[data-pis-search]').forEach(el => { el.hidden = !el.dataset.pisSearch.includes(q); });
      }
      if (e.target.id === 'acctSearch') {
        this.s.acctQ = e.target.value;
        const q = e.target.value.trim().toLowerCase();
        document.querySelectorAll('[data-acct-search]').forEach(el => { el.hidden = !el.dataset.acctSearch.includes(q); });
      }
      if (e.target.id === 'chatInput' && this.s.chatPeer) {
        const now = Date.now();
        if (!this._lastTypePing || now - this._lastTypePing > 2200) {
          this._lastTypePing = now;
          SPES.API.post('/api/messages/typing', { to: this.s.chatPeer });
        }
        clearTimeout(this._typeOffTimer);
        this._typeOffTimer = setTimeout(() => { SPES.API.post('/api/messages/typing', { to: null }); }, 4000);
      }
      if (e.target.id === 'noteModalInp') {
        const cnt = document.getElementById('noteCount');
        if (cnt) cnt.textContent = `${e.target.value.length} / 60`;
      }
    });
    root.addEventListener('input', e => {
      if (e.target.id !== 'ansSearch') return;
      this.s.keyOpen = Date.now();
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('.ansroom').forEach(r => { let n = 0; r.querySelectorAll('.ansitem').forEach(i => { const hit = !q || i.textContent.toLowerCase().includes(q); i.hidden = !hit; if (hit) n++; }); r.hidden = !n; r.open = !!q && n > 0; });
    });
    root.addEventListener('click', () => { if (this.s.keyOpen) this.s.keyOpen = Date.now(); }, true);
    root.addEventListener('change', e => {
      if (e.target.id === 'attDate' && e.target.value) { this.s.roomDate = e.target.value; this.render(); }
      if (e.target.id === 'privacyAgreeChk') { const b = document.getElementById('privacyAgreeBtn'); if (b) b.disabled = !e.target.checked; }
    });

    // Cross-device presence heartbeat & idle lock for answer key
    setInterval(async () => {
      const u = this.user();
      if (u) {
        const pr = await SPES.API.post('/api/presence', { online: true });
        if (pr.ok && pr.data && pr.data.presence) {
          SPES.DB.set('presence', pr.data.presence);
          this.refreshPresence();
        }
      }
      if (this.s.keyOpen && this.s.tab === 'answers' && Date.now() - this.s.keyOpen > 600000) { this.s.keyOpen = 0; this.render(); }
    }, 15000);

    root.addEventListener('change', e => {
      const i = e.target, u = this.user();
      if (i.dataset.act === 'board') { this.s.board = i.value; this.render(); }
      else if (i.dataset.act === 'lang') { this.pref('lang', i.value); }
      else if (i.classList.contains('pick')) { i.closest('form').querySelector('.pv').innerHTML = i.files[0] ? `<img class="thumb" src="${URL.createObjectURL(i.files[0])}" alt="Preview">` : ''; }
      else if (i.classList.contains('jpick')) this.addPics([...i.files]).then(() => { i.value = ''; });
      else if (i.classList.contains('avpick') && i.files[0]) this.readImage(i.files[0], 220).then(async img => {
        SPES.UserModel.updateLocal(u.id, { avatar: img });
        this.flash('Profile photo updated.', true);
        this.render();
        const r = await SPES.API.patch('/api/profile', { avatar: img });
        if (r.ok) SPES.UserModel.updateLocal(u.id, r.data.user);
        else { this.flash(r.error); this.render(); }
      });
      else if (i.classList.contains('idpick') && i.files[0]) this.readImage(i.files[0], 480).then(async img => {
        const curSettings = { ...(u.settings || {}), idCard: { ...((u.settings || {}).idCard || {}), photo: img } };
        SPES.UserModel.updateLocal(u.id, { settings: curSettings });
        this.flash('Formal ID photo updated.', true);
        this.anim = false;
        this.render();
        const r = await SPES.API.patch('/api/profile', { idPhoto: img });
        if (r.ok) SPES.UserModel.updateLocal(u.id, r.data.user);
        else { this.flash(r.error); this.render(); }
      });
    });

    root.addEventListener('click', e => {
      const b = e.target.closest('.pw-eye'); if (!b) return;
      const i = b.parentElement.querySelector('input'), show = i.type === 'password';
      i.type = show ? 'text' : 'password';
      b.innerHTML = show ? this.EYE_OFF : this.EYE;
      b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      b.setAttribute('aria-pressed', String(show));
    });
    root.addEventListener('submit', e => { e.preventDefault(); this.submit(e.target.dataset.form, e.target, e.submitter && e.submitter.value, e.submitter); });
    root.addEventListener('reset', e => { const pv = e.target.querySelector('.pv'); if (pv) pv.innerHTML = ''; });
    // Fast 2.5s live Messenger polling (Beneficiary & Admin) for instant messages, typing, seen, reactions, edits & unsends
    setInterval(async () => {
      const u = this.user();
      if (!u || (u.role !== 'beneficiary' && u.role !== 'admin') || this.s.tab !== 'messages' || this._chatPollBusy || this.s.chatEditId) return;
      this._chatPollBusy = true;
      try {
        const r = await SPES.API.get('/api/messages');
        if (r.ok && r.data) {
          const prevSig = JSON.stringify(SPES.DB.get('messages', []));
          const prevTyping = this.s.chatPeer ? SPES.ChatView.isTypingToMe(this.s.chatPeer, u.id) : false;
          const next = r.data.messages || [];
          SPES.DB.set('presence', r.data.presence || SPES.DB.get('presence', {}));
          if (r.data.peers) {
            const me = this.user();
            const existing = SPES.UserModel.all().filter(x => !r.data.peers.some(p => p.id === x.id) && x.id !== me.id);
            SPES.DB.set('users', [me, ...r.data.peers, ...existing]);
          }
          SPES.DB.set('messages', next);
          const nextTyping = this.s.chatPeer ? SPES.ChatView.isTypingToMe(this.s.chatPeer, u.id) : false;
          const changed = prevSig !== JSON.stringify(next) || prevTyping !== nextTyping;
          if (changed) {
            const input = document.getElementById('chatInput');
            const draft = input ? input.value : '';
            const focused = input && document.activeElement === input;
            if (this.s.chatPeer && next.some(m => m.from === this.s.chatPeer && m.to === u.id && !m.readAt && !m.unsent)) {
              SPES.API.post('/api/messages/read', { from: this.s.chatPeer });
            }
            this.anim = false;
            this.render();
            const ni = document.getElementById('chatInput');
            if (ni && draft) ni.value = draft;
            if (ni && focused) ni.focus();
            const box = document.getElementById('chatMsgs');
            if (box) box.scrollTop = box.scrollHeight;
          }
        }
      } finally { this._chatPollBusy = false; }
    }, 2500);

    setInterval(() => this.tickClock(), 1000);
    setInterval(() => {
      if (!this.user() || this.s.tab !== 'attendance' || this.s.attConfirm || this.attSig === undefined) return;
      const sig = this.attSigNow();
      if (sig !== this.attSig) { this.attSig = sig; this.render(); }
    }, 10000);

    this.s.as = this.portal();
    window.addEventListener('hashchange', () => { this.s.as = this.portal(); this.s.mode = 'login'; this.render(); });

    // Handle Google OAuth redirect (#access_token=... or #error_description=...)
    if (this.portal() === 'user' && (location.hash.includes('access_token=') || location.hash.includes('error'))) {
      const hp = new URLSearchParams(location.hash.slice(1));
      const qp = new URLSearchParams(location.search);
      const isReset = qp.get('flow') === 'reset';
      history.replaceState(null, '', location.pathname);
      if (hp.get('error_description') || hp.get('error')) {
        this.flash(hp.get('error_description') || 'Google sign-in was cancelled.');
        if (isReset) this.s.mode = 'forgot';
      } else if (hp.get('access_token')) {
        SPES.View.mount(`<div class="fx"><div class="fx-in"><img src="img/logo.png" alt=""><b>${isReset ? 'Verifying Google account' : 'Signing in with Google'}</b><span>Please wait...</span><i class="fx-bar"></i></div></div>`);
        const accessToken = hp.get('access_token');
        if (isReset) {
          const vr = await SPES.API.post('/api/auth/google/verify-reset', { accessToken });
          this.s.mode = 'forgot';
          if (!vr.ok) this.flash(vr.error);
          else { this.s.googleResetToken = accessToken; this.s.googleReset = vr.data; }
        } else {
          const gr = await SPES.API.post('/api/auth/google/session', { accessToken });
          if (!gr.ok) {
            this.flash(gr.error);
          } else if (gr.data.status === 'needs_profile') {
            this.s.googleToken = accessToken;
            this.s.googleData = gr.data;
            this.s.mode = 'google_setup';
          } else if (gr.data.status === 'logged_in') {
            await SPES.API.bootstrap();
            this._syncAt = Date.now();
            this.transition('Welcome back,', gr.data.user.name, true);
            return;
          }
        }
      }
      this.render();
      return;
    }

    // Restore active session from HttpOnly cookie
    const meRes = await SPES.API.get('/api/me');
    if (meRes.ok && meRes.data && meRes.data.user) {
      const u = meRes.data.user;
      if ((u.role !== 'beneficiary') === (this.portal() === 'admin')) {
        await SPES.API.bootstrap();
        this._syncAt = Date.now();
      }
    }
    this.render();
  },

  // Silent background refresh so clicks render in 0ms while staying up to date across devices
  syncBg(force = false) {
    if (!this.user() || this._syncing) return;
    if (!force && Date.now() - this._syncAt < 8000) return;
    this._syncing = true;
    const prevTab = this.s.tab;
    SPES.API.bootstrap().then(r => {
      this._syncing = false;
      if (!r.ok) return;
      this._syncAt = Date.now();
      // Don't interrupt active typing, open modals, or an active game round
      const ae = document.activeElement;
      const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT');
      if (!typing && !this.s.play && !this.s.confirm && !this.s.delConfirm && !this.s.declineConfirm && !this.s.attConfirm && this.s.tab === prevTab) {
        this.anim = false;
        this.render();
      }
    }).catch(() => { this._syncing = false; });
  },

  setBusy(btn, on) {
    if (!btn) return;
    btn.classList.toggle('is-busy', !!on);
    btn.disabled = !!on;
  },

  portal() { return window.SPES_PORTAL || (location.hash === '#admin' ? 'admin' : 'user'); },

  EYE: '<svg class="ic" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  EYE_OFF: '<svg class="ic" viewBox="0 0 24 24"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.9 9.9 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>',
  addEyes() {
    document.querySelectorAll('#app input[type=password]').forEach(i => {
      if (i.parentElement.classList.contains('pw')) return;
      const w = document.createElement('span'), b = document.createElement('button');
      w.className = 'pw'; i.parentNode.insertBefore(w, i); w.appendChild(i);
      b.type = 'button'; b.className = 'pw-eye'; b.innerHTML = this.EYE; b.setAttribute('aria-label', 'Show password'); b.setAttribute('aria-pressed', 'false'); w.appendChild(b);
    });
  },
  user() { return SPES.UserModel.session(); },
  pref(k, v) {
    const u = this.user();
    if (!u) return;
    const settings = { ...(u.settings || {}), [k]: v };
    SPES.UserModel.updateLocal(u.id, { settings });
    this.anim = false;
    this.render();
    SPES.API.patch('/api/profile', { settings });
  },
  applyPrefs(u) {
    const st = (u && u.settings) || {};
    document.documentElement.dataset.theme = st.theme || 'light';
    SPES.I18n.lang = st.lang || 'en'; SPES.Sound.on = st.sound !== false;
  },
  flash(text, ok, info) { this.s.m = { text, ok, info }; },
  applySearch() {
    const inp = document.getElementById('classSearch'); if (!inp) return;
    const q = inp.value.trim().toLowerCase(); let n = 0;
    document.querySelectorAll('.classroom-user,.attrow').forEach(x => { const hit = x.dataset.search.includes(q); x.hidden = !hit; if (hit) n++; });
    const nm = document.getElementById('noMatch'); if (nm) nm.hidden = n > 0 || !q;
  },
  refreshPresence() {
    const box = document.getElementById('onlinePanel'); if (!box || !this.s.room) return;
    const P = SPES.PresenceModel, V = SPES.View;
    box.innerHTML = V.onlineInner(SPES.UserModel.all().filter(x => x.role === 'beneficiary' && x.batch === this.s.room));
    document.querySelectorAll('[data-presence]').forEach(el => el.classList.toggle('on', P.online(el.dataset.presence)));
    document.querySelectorAll('[data-pres-text]').forEach(el => { el.textContent = P.label(el.dataset.presText); });
  },
  attSigNow() { const A = SPES.AttendanceModel; return Object.keys(A.SLOTS).map(k => A.windowState(k).state).join(); },
  tickClock() {
    const tEl = document.querySelector('[data-clk-time]');
    if (!tEl) return;
    const now = new Date();
    tEl.textContent = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(now);
    const dEl = document.querySelector('[data-clk-date]');
    if (dEl) dEl.textContent = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' }).format(now);
  },
  transition(title, sub, reveal) {
    const o = document.createElement('div');
    o.className = 'fx'; o.setAttribute('aria-hidden', 'true');
    o.innerHTML = `<div class="fx-in"><img src="img/logo.png" alt=""><b>${SPES.View.esc(title)}</b><span>${SPES.View.esc(sub)}</span><i class="fx-bar"></i></div>`;
    document.body.appendChild(o);
    setTimeout(() => {
      this.render(true);
      const app = document.getElementById('app');
      if (reveal) { app.classList.add('just-in'); setTimeout(() => app.classList.remove('just-in'), 900); }
      o.classList.add('out'); setTimeout(() => o.remove(), 450);
    }, 550);
  },
  go(tab) {
    this.anim = true;
    Object.assign(this.s, { tab, m: null, play: null, cert: false, room: null, pisBatch: null, pisUser: null, pisQ: '', keyOpen: 0, keyMode: '' });
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.syncBg();
  },

  switchAuthMode(nextMode) {
    const auth = document.querySelector('#app > .auth');
    const oldPanel = auth && auth.querySelector('.panel');
    if (!auth || !oldPanel || this._switchingAuth) {
      this.s.mode = nextMode; this.s.m = null; this.render(); return;
    }
    this._switchingAuth = true;
    const forward = nextMode !== 'login';
    oldPanel.classList.remove('enter', 'panel-in-r', 'panel-in-l');
    oldPanel.classList.add(forward ? 'panel-out-l' : 'panel-out-r');
    auth.classList.toggle('is-reg', nextMode === 'register');

    setTimeout(() => {
      this.s.mode = nextMode;
      this.s.m = null;
      if (nextMode === 'login') { this.s.googleReset = null; this.s.googleResetToken = null; }
      const tmp = document.createElement('div');
      tmp.innerHTML = SPES.View.auth(this.s.mode, null, this.s.as, this.s.googleData, this.s.googleReset);
      const newPanel = tmp.querySelector('.panel');
      if (newPanel) {
        const cls = forward ? 'panel-in-r' : 'panel-in-l';
        newPanel.classList.add(cls);
        oldPanel.replaceWith(newPanel);
        this.addEyes();
        setTimeout(() => newPanel.classList.remove(cls), 720);
        const firstInput = newPanel.querySelector('input:not([type=hidden])');
        if (firstInput) firstInput.focus({ preventScroll: true });
      } else {
        this.render();
      }
      this._switchingAuth = false;
    }, 180);
  },

  readImage(file, max = 640) {
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, max / img.width), c = document.createElement('canvas');
          c.width = img.width * k; c.height = img.height * k;
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.6));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  },
  async addPics(files) {
    const room = 5 - this.jpics.length, more = await Promise.all(files.slice(0, room).map(f => this.readImage(f)));
    this.jpics.push(...more);
    const el = document.getElementById('jpics'); if (el) el.innerHTML = SPES.View.pics(this.jpics, false);
    if (files.length > room) alert('You can upload a maximum of 5 images.');
  },

  async act(a, d, btn) {
    const s = this.s, u = this.user();
    this.anim = !['review', 'reviewexcuse', 'awardjournal', 'delnotif', 'clearnotifs', 'chatpeer', 'chatback', 'chat_react', 'chat_edit', 'chat_edit_cancel', 'chat_unsend', 'editnote', 'closenote', 'answer', 'attday', 'jday', 'flip', 'cell', 'rmpic', 'mute', 'sub', 'theme', 'lang', 'snd', 'markday', 'avborder', 'delnote', 'google', 'markpresent', 'deleteuser', 'canceldel', 'confirmdel', 'keylock', 'keymode', 'approve', 'decline', 'canceldecline', 'confirmdecline', 'reopen'].includes(a);

    if (a === 'as') { s.as = d.v; s.m = null; }
    else if (a === 'deleteuser' && u.role === 'admin') { const t = SPES.UserModel.byId(d.id); if (t && t.role === 'beneficiary') s.delConfirm = t.id; }
    else if (a === 'canceldel') s.delConfirm = null;
    else if (a === 'confirmdel' && u.role === 'admin') {
      const id = s.delConfirm, t = SPES.UserModel.byId(id);
      s.delConfirm = null;
      if (t) {
        // Optimistic removal
        SPES.DB.set('users', SPES.UserModel.all().filter(x => x.id !== id));
        this.flash(`${t.name}'s account and records were deleted.`, true);
        this.render();
        const r = await SPES.API.del(`/api/users/${id}`);
        if (!r.ok) { this.flash(r.error); await SPES.API.bootstrap(); this.render(); }
        return;
      }
    }
    else if (a === 'markpresent' && u.role === 'admin') {
      const period = d.period || 'FULL';
      const rows = SPES.AttendanceModel.manual();
      const exists = rows.some(x => x.userId === d.id && x.date === d.date && (x.period || 'FULL') === period);
      SPES.DB.set('attmanual', exists
        ? rows.filter(x => !(x.userId === d.id && x.date === d.date && (x.period || 'FULL') === period))
        : [...rows, { userId: d.id, date: d.date, period, by: u.id, at: new Date().toISOString() }]);
      this.render();
      const r = await SPES.API.post('/api/attendance/manual', { userId: d.id, date: d.date, period });
      if (!r.ok) { this.flash(r.error); await SPES.API.bootstrap(); this.render(); }
      return;
    }
    else if (a === 'lamp') {
      s.lampOn = !s.lampOn;
      SPES.Sound.play(s.lampOn ? 'lampOn' : 'lampOff');
      const auth = document.querySelector('#app > .auth');
      if (auth) auth.classList.toggle('lamp-on', s.lampOn);
      const rig = document.querySelector('.lamp-rig');
      if (rig) {
        rig.setAttribute('aria-pressed', String(s.lampOn));
        rig.title = s.lampOn ? 'Pull cord to turn lamp OFF (Dark mode)' : 'Pull cord to turn lamp ON (Light mode)';
        const hint = rig.querySelector('.lamp-hint');
        if (hint) hint.textContent = s.lampOn ? 'Lamp ON · Light' : 'Pull lamp · Dark';
        rig.classList.remove('tug');
        void rig.offsetWidth;
        rig.classList.add('tug');
      }
      return;
    }
    else if (a === 'mode') { return this.switchAuthMode(d.m); }
    else if (a === 'tab') return this.go(d.t);
    else if (a === 'askout' || a === 'cancelout') { s.confirm = a === 'askout'; this.anim = false; }
    else if (a === 'attcancel') { this.pendingAtt = null; s.attConfirm = false; }
    else if (a === 'attsubmit') { return this.uploadAttendance(btn); }
    else if (a === 'logout') {
      SPES.DB.clear();
      Object.assign(s, { tab: null, mode: 'login', m: null, play: null, confirm: false, delConfirm: null, room: null, keyOpen: 0, keyMode: '' });
      this.render(true);
      SPES.API.post('/api/logout', {});
      return;
    }
    else if (a === 'google') {
      if (btn) { btn.disabled = true; btn.classList.add('is-busy'); btn.textContent = 'Connecting to Google...'; }
      location.href = '/api/auth/google';
      return;
    }
    else if (a === 'google_reset_start') {
      if (btn) { btn.disabled = true; btn.classList.add('is-busy'); btn.textContent = 'Connecting to Google...'; }
      location.href = '/api/auth/google?flow=reset';
      return;
    }
    else if (a === 'pis_cancel') {
      s.mode = this.pendingReg && this.pendingReg.kind === 'google_complete' ? 'google_setup' : 'register';
      this.pendingReg = null;
    }
    else if (a === 'pis_batch') { s.pisBatch = d.code || null; s.pisUser = null; s.pisQ = ''; }
    else if (a === 'pis_user') { s.pisUser = d.id || null; }
    else if (a === 'awardjournal' && u.role === 'admin') {
      const uid = d.uid, day = +d.day, nextPts = Number(d.pts) || 0;
      SPES.DB.set('journals', SPES.JournalModel.all().map(j => j.userId === uid && j.day === day ? { ...j, pointsAwarded: nextPts } : j));
      this.flash(nextPts ? `Awarded +${nextPts} journal points (Admin only).` : 'Cleared journal points.', true);
      this.render();
      const r = await SPES.API.post(`/api/journals/${uid}/${day}/award`, { points: nextPts });
      if (!r.ok) { this.flash(r.error); await SPES.API.bootstrap(); this.render(); }
      return;
    }
    else if (a === 'privacy_cancel') {
      this.pendingReg = null;
      s.privacyModal = false;
      this.anim = false;
    }
    else if (a === 'privacy_agree') {
      const chk = document.getElementById('privacyAgreeChk');
      if (!chk || !chk.checked) return;
      return this.finishRegistration(btn);
    }
    else if (a === 'room') { s.room = d.code || null; s.roomQ = ''; s.roomDate = null; }
    else if (a === 'avborder') {
      SPES.UserModel.updateLocal(u.id, { avBorder: d.v });
      this.render();
      SPES.API.patch('/api/profile', { avBorder: d.v });
      return;
    }
    else if (a === 'editnote') { s.noteModal = true; }
    else if (a === 'closenote') { s.noteModal = false; }
    else if (a === 'delnote') {
      s.noteModal = false;
      SPES.UserModel.updateLocal(u.id, { note: null });
      this.render();
      SPES.API.patch('/api/profile', { note: null });
      return;
    }
    else if (a === 'keylock') { s.keyOpen = 0; s.keyMode = ''; }
    else if (a === 'keymode') s.keyMode = d.v || '';
    else if (a === 'attday') s.day = +d.n;
    else if (a === 'jday') s.jday = +d.n;
    else if (a === 'calnav') { const c = s.cal; c.m += +d.d; if (c.m < 0) { c.m = 11; c.y--; } if (c.m > 11) { c.m = 0; c.y++; } }
    else if (a === 'delevent' && u.role === 'admin') {
      SPES.DB.set('events', SPES.EventModel.all().filter(e => e.id !== d.id));
      this.render();
      const r = await SPES.API.del(`/api/events/${d.id}`);
      if (!r.ok) { this.flash(r.error); await SPES.API.bootstrap(); this.render(); }
      return;
    }
    else if (a === 'unsubmit') {
      const day = +d.day;
      SPES.DB.set('journals', SPES.JournalModel.all().map(j => j.userId === u.id && j.day === day ? { ...j, status: 'draft' } : j));
      this.jkey = null;
      this.flash('Journal unsubmitted. You can edit it now.', true);
      this.render();
      const r = await SPES.API.patch(`/api/journals/${day}/status`, { status: 'draft' });
      if (!r.ok) { this.flash(r.error); await SPES.API.bootstrap(); this.render(); }
      return;
    }
    else if (a === 'rmpic') { this.jpics.splice(+d.k, 1); document.getElementById('jpics').innerHTML = SPES.View.pics(this.jpics, false); return; }
    else if (a === 'review' && u.role === 'admin') {
      SPES.DB.set('attendance', SPES.AttendanceModel.all().map(x => x.id === d.id ? { ...x, status: d.st, reviewedBy: u.name, pointsDeducted: d.st === 'approved' && x.lateMinutes ? x.lateMinutes * 2 : x.pointsDeducted } : x));
      this.render();
      const r = await SPES.API.patch(`/api/attendance/${d.id}`, { status: d.st });
      if (!r.ok) { this.flash(r.error); await SPES.API.bootstrap(); this.render(); }
      else if (d.st === 'approved') this.syncBg(true);
      return;
    }
    else if (a === 'reviewexcuse' && u.role === 'admin') {
      const mk = document.getElementById('mk_' + d.id);
      const grantMakeup = d.st === 'approved' && (!mk || mk.checked);
      SPES.DB.set('excuses', SPES.AttendanceModel.excuses().map(x => x.id === d.id ? { ...x, status: d.st, makeupGranted: grantMakeup, reviewedBy: u.name } : x));
      this.flash(d.st === 'approved' ? (grantMakeup ? 'Excuse approved and +1 make-up workday granted.' : 'Excuse approved.') : 'Excuse declined.', true);
      this.render();
      const r = await SPES.API.patch(`/api/attendance/excuse/${d.id}`, { status: d.st, grantMakeup });
      if (!r.ok) { this.flash(r.error); await SPES.API.bootstrap(); this.render(); }
      return;
    }
    else if (a === 'decline' && u.role === 'admin') {
      const t = SPES.UserModel.byId(d.id);
      if (t && t.role === 'beneficiary') s.declineConfirm = t.id;
    }
    else if (a === 'canceldecline') s.declineConfirm = null;
    else if (a === 'confirmdecline' && u.role === 'admin') {
      const id = s.declineConfirm, target = SPES.UserModel.byId(id);
      s.declineConfirm = null;
      if (target) {
        SPES.UserModel.updateLocal(id, { status: 'rejected' });
        this.flash(`${target.name} was declined and moved to the Declined list.`, true);
        this.render();
        const r = await SPES.API.patch(`/api/users/${id}/status`, { status: 'rejected' });
        if (!r.ok) { this.flash(r.error); await SPES.API.bootstrap(); this.render(); }
        return;
      }
    }
    else if ((a === 'approve' || a === 'reopen') && u.role === 'admin') {
      const st = a === 'approve' ? 'approved' : 'pending', target = SPES.UserModel.byId(d.id);
      SPES.UserModel.updateLocal(d.id, { status: st });
      if (target) this.flash(st === 'approved' ? `${target.name} was approved.` : `${target.name} was moved back to pending.`, true);
      this.render();
      const r = await SPES.API.patch(`/api/users/${d.id}/status`, { status: st });
      if (!r.ok) { this.flash(r.error); await SPES.API.bootstrap(); this.render(); }
      return;
    }
    else if (a === 'delnotif' && (u.role === 'admin' || u.role === 'head')) {
      SPES.DB.set('notifs', SPES.NotifModel.all().filter(n => n.id !== d.id));
      this.render();
      SPES.API.del(`/api/notifications/${d.id}`);
      return;
    }
    else if (a === 'clearnotifs' && (u.role === 'admin' || u.role === 'head')) {
      SPES.DB.set('notifs', []);
      this.flash('All notifications cleared.', true);
      this.render();
      SPES.API.del('/api/notifications');
      return;
    }
    else if (a === 'chatpeer') {
      s.chatPeer = d.id; s.chatEditId = null;
      const now = new Date().toISOString();
      const hadUnread = SPES.ChatView.unreadFrom(u, d.id) > 0;
      if (hadUnread) {
        SPES.DB.set('messages', SPES.ChatView.all().map(m => m.from === d.id && m.to === u.id && !m.readAt ? { ...m, readAt: now } : m));
        SPES.API.post('/api/messages/read', { from: d.id });
      }
      this.render();
      const box = document.getElementById('chatMsgs');
      if (box) box.scrollTop = box.scrollHeight;
      return;
    }
    else if (a === 'chatback') { s.chatPeer = null; s.chatEditId = null; }
    else if (a === 'chat_edit') { s.chatEditId = d.mid; }
    else if (a === 'chat_edit_cancel') { s.chatEditId = null; }
    else if (a === 'chat_unsend') {
      const mid = d.mid;
      SPES.DB.set('messages', SPES.ChatView.all().map(m => m.id === mid ? { ...m, unsent: true, body: '', reactions: {} } : m));
      this.render();
      SPES.API.post(`/api/messages/${mid}/unsend`, {});
      return;
    }
    else if (a === 'chat_react') {
      const mid = d.mid, emoji = d.emoji;
      SPES.DB.set('messages', SPES.ChatView.all().map(m => {
        if (m.id !== mid) return m;
        const rx = { ...(m.reactions || {}) };
        if (rx[u.id] === emoji) delete rx[u.id]; else rx[u.id] = emoji;
        return { ...m, reactions: rx };
      }));
      this.render();
      SPES.API.post(`/api/messages/${mid}/react`, { emoji });
      return;
    }
    else if (a === 'dl_id' && SPES.IdCard) {
      this.setBusy(btn, true);
      await SPES.IdCard.download(u, d.side || 'both');
      this.setBusy(btn, false);
      return;
    }
    else if (a === 'sub') s.sub = d.v;
    else if (a === 'theme') return this.pref('theme', d.v);
    else if (a === 'snd') return this.pref('sound', d.v === '1');
    else if (this.GAME_ACTS.includes(a)) { if (SPES.Games.act(a, d) === 'skip') return; }
    this.render();
  },

  async submit(form, el, mode, submitter) {
    const f = Object.fromEntries(new FormData(el).entries()), s = this.s, u = this.user(), M = SPES;
    const btn = submitter || el.querySelector('button[type=submit], button:not([type])');
    const needsNet = !['attend', 'gtype', 'register', 'google_complete', 'chatmsg', 'chatedit'].includes(form);
    if (needsNet) this.setBusy(btn, true);

    try {
      if (form === 'login') {
        const r = await M.API.post('/api/login', { username: f.username.trim(), password: f.password, portal: s.as });
        if (!r.ok) this.flash(r.error);
        else {
          await M.API.bootstrap();
          this._syncAt = Date.now();
          s.tab = null; this.anim = true;
          this.transition('Welcome back,', r.data.user.name, true);
          return;
        }
      } else if (form === 'register') {
        if (!f.gender) { this.flash('Please select your gender.'); this.render(); return; }
        this.pendingReg = { kind: 'register', payload: { ...f, username: f.username.trim(), name: f.name.trim(), privacyAccepted: true } };
        s.mode = 'pis_form'; this.render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return;
      } else if (form === 'pis_submit') {
        if (!this.pendingReg) { s.mode = 'register'; this.render(); return; }
        const pis = SPES.PisView.collect(el);
        if (!pis.privacyConsent) { this.flash('You must agree to the Data Privacy Consent before submitting.'); this.render(); return; }
        const photoFile = el.pisPhoto && el.pisPhoto.files && el.pisPhoto.files[0];
        const pisPhoto = photoFile ? await this.readImage(photoFile, 480) : null;
        const endpoint = this.pendingReg.kind === 'google_complete' ? '/api/auth/google/complete' : '/api/register';
        const r = await M.API.post(endpoint, { ...this.pendingReg.payload, pis, pisPhoto, privacyAccepted: true });
        if (!r.ok) { this.flash(r.error); this.render(); return; }
        const wasGoogle = this.pendingReg.kind === 'google_complete';
        this.pendingReg = null;
        if (wasGoogle) { s.googleToken = null; s.googleData = null; }
        this.flash(`Account & Personal Information submitted (SPES ID: ${r.data.spesId}). Please wait for the administrator to approve it before you log in.`, true);
        s.mode = 'login'; s.as = this.portal();
        this.transition('Registration submitted!', 'Waiting for administrator approval', false);
        return;
      } else if (form === 'forgot') {
        const r = await M.API.post('/api/forgot', { username: f.username.trim(), batch: f.batch, password: f.password });
        if (!r.ok) this.flash(r.error);
        else { this.flash('Password updated. You can log in now.', true); s.mode = 'login'; s.as = this.portal(); }
      } else if (form === 'google_reset') {
        if (f.password !== f.password2) { this.flash('The two passwords do not match.'); this.render(); return; }
        const r = await M.API.post('/api/auth/google/reset-password', { accessToken: s.googleResetToken, password: f.password });
        if (!r.ok) this.flash(r.error);
        else {
          s.googleResetToken = null; s.googleReset = null;
          this.flash('Password updated! You can now log in with your new password or Google.', true);
          s.mode = 'login'; s.as = this.portal();
        }
      } else if (form === 'google_complete') {
        if (!f.gender) { this.flash('Please select your gender.'); this.render(); return; }
        this.pendingReg = {
          kind: 'google_complete',
          payload: { accessToken: s.googleToken, name: f.name.trim(), username: f.username.trim(), gender: f.gender, batch: f.batch, email: (s.googleData && s.googleData.email) || '', privacyAccepted: true }
        };
        s.mode = 'pis_form'; this.render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return;
      } else if (form === 'attend') {
        const day = this.selDay('day', u);
        if (!el.photo.files[0]) { this.flash('Please choose an image first.'); this.render(); return; }
        this.pendingAtt = { slot: el.dataset.slot, file: el.photo.files[0], date: this.ctx(u).dates[day - 1], day };
        s.attConfirm = true; this.anim = false; this.render(); return;
      } else if (form === 'excuse') {
        const photo = el.photo && el.photo.files[0] ? await this.readImage(el.photo.files[0]) : null;
        const r = await M.API.post('/api/attendance/excuse', {
          date: el.dataset.date, category: f.category, reason: (f.reason || '').trim(), photo
        });
        if (!r.ok) this.flash(r.error);
        else {
          const rest = SPES.AttendanceModel.excuses().filter(x => !(x.userId === u.id && x.date === r.data.excuse.date));
          SPES.DB.set('excuses', [r.data.excuse, ...rest]);
          this.flash('Excuse submitted for administrator approval.', true);
        }
      } else if (form === 'journal') {
        const day = +el.dataset.day;
        const date = this.days(u, 'jr')[day - 1].date;
        const r = await M.API.put(`/api/journals/${day}`, { date, text: f.text, event: f.event, photos: this.jpics, status: mode });
        if (!r.ok) { this.draft = { text: f.text, event: f.event }; this.flash(r.error); }
        else {
          const all = SPES.JournalModel.all().filter(x => !(x.userId === u.id && x.day === day));
          SPES.DB.set('journals', [r.data.journal, ...all]);
          this.jkey = null;
          this.flash(mode === 'submitted' ? 'Journal submitted.' : 'Draft saved.', true);
        }
      } else if (form === 'chatmsg') {
        const to = el.dataset.to, body = (f.body || '').trim();
        if (!to || !body) return;
        const tempId = 'tmp_' + Date.now();
        const optimistic = { id: tempId, batch: u.batch, from: u.id, to, body, readAt: null, ts: new Date().toISOString() };
        SPES.DB.set('messages', [...SPES.ChatView.all(), optimistic]);
        this.anim = false;
        this.render();
        const box = document.getElementById('chatMsgs'); if (box) box.scrollTop = box.scrollHeight;
        const inp = document.getElementById('chatInput'); if (inp) inp.focus();
        const r = await M.API.post('/api/messages', { to, body });
        if (r.ok && r.data && r.data.message) {
          SPES.DB.set('messages', SPES.ChatView.all().map(m => m.id === tempId ? r.data.message : m));
        } else {
          SPES.DB.set('messages', SPES.ChatView.all().filter(m => m.id !== tempId));
          this.flash(r.error || 'Could not send message.');
          this.render();
        }
        return;
      } else if (form === 'chatedit') {
        const mid = el.dataset.mid, body = (f.body || '').trim();
        if (!mid || !body) return;
        s.chatEditId = null;
        SPES.DB.set('messages', SPES.ChatView.all().map(m => m.id === mid ? { ...m, body, editedAt: new Date().toISOString() } : m));
        this.anim = false;
        this.render();
        const r = await M.API.patch(`/api/messages/${mid}`, { body });
        if (!r.ok) { this.flash(r.error); await M.API.bootstrap(); this.render(); }
        return;
      } else if (form === 'gtype') { M.Games.type(f.val || '');
      } else if (form === 'name') {
        if (f.name.trim()) {
          const r = await M.API.patch('/api/profile', { name: f.name.trim(), ...(f.gender ? { gender: f.gender } : {}) });
          if (r.ok) { M.UserModel.updateLocal(u.id, r.data.user); this.flash('Profile updated.', true); }
          else this.flash(r.error);
        }
      } else if (form === 'idcard') {
        const prev = (u.settings && u.settings.idCard) || {};
        const idCard = {
          ...prev,
          fullName: (f.fullName || '').trim(),
          nickname: (f.nickname || '').trim(),
          address: (f.address || '').trim(),
          contact: (f.contact || '').trim(),
          emgName: (f.emgName || '').trim(),
          emgRel: (f.emgRel || '').trim(),
          emgContact: (f.emgContact || '').trim(),
          effectivity: (f.effectivity || '').trim()
        };
        const settings = { ...(u.settings || {}), idCard };
        const r = await M.API.patch('/api/profile', { settings });
        if (r.ok) { M.UserModel.updateLocal(u.id, r.data.user); this.flash('SPES ID card details saved! You can download your ID now.', true); }
        else this.flash(r.error);
      } else if (['keyset', 'keychange', 'keyreset', 'keyunlock'].includes(form)) {
        const action = form.slice(3);
        const r = await M.API.post('/api/answerkey', { action, pw: f.pw, pw2: f.pw2, cur: f.cur, acct: f.acct });
        if (!r.ok) this.flash(r.error);
        else {
          SPES.DB.set('answerKeyHas', true);
          s.keyOpen = Date.now(); s.keyMode = '';
          if (action !== 'unlock') this.flash('Answer key password saved.', true);
        }
      } else if (form === 'note') {
        const text = f.text.trim().slice(0, 60);
        if (text) {
          s.noteModal = false;
          const r = await M.API.patch('/api/profile', { note: { text } });
          if (r.ok) { M.UserModel.updateLocal(u.id, r.data.user); this.flash('Note shared above your photo for 24 hours.', true); }
          else this.flash(r.error);
        }
      } else if (form === 'pass') {
        const r = await M.API.post('/api/profile/password', { cur: f.cur, next: f.next });
        if (r.ok) this.flash('Password updated.', true); else this.flash(r.error);
      } else if (form === 'feedback') {
        const r = await M.API.post('/api/feedback', { text: f.text.trim(), rating: f.rating });
        if (!r.ok) this.flash(r.error);
        else {
          if (r.data.total !== null) SPES.GameModel.setTotal(u.id, r.data.total);
          SPES.DB.set('feedback', [r.data.feedback, ...SPES.FeedbackModel.all()]);
          this.flash(r.data.first ? 'Thank you! You earned +20 points.' : 'Thank you for your feedback!', true);
        }
      } else if (form === 'announce') {
        const r = await M.API.post('/api/announcements', { title: f.title.trim(), body: f.body.trim(), to: f.to, date: f.date });
        if (r.ok) {
          SPES.DB.set('ann', [r.data.announcement, ...SPES.DB.get('ann', [])]);
          this.flash('Announcement sent.', true);
          this.syncBg(true);
        } else this.flash(r.error);
      } else if (form === 'event') {
        const r = await M.API.post('/api/events', { title: f.title.trim(), date: f.date, type: f.type });
        if (r.ok) {
          SPES.DB.set('events', [...SPES.EventModel.all(), r.data.event]);
          this.flash('Event added.', true);
        } else this.flash(r.error);
      } else if (form === 'batch') {
        const r = await M.API.post('/api/batches', { name: f.name.trim(), year: f.year, start: f.start });
        if (r.ok) {
          SPES.DB.set('batches', [r.data.batch, ...SPES.BatchModel.all()]);
          this.flash('Batch created. Code: ' + r.data.batch.code, true);
        } else this.flash(r.error);
      }
      this.render();
    } finally {
      if (needsNet) this.setBusy(btn, false);
    }
  },

  async finishRegistration(btn) {
    const reg = this.pendingReg, s = this.s;
    if (!reg) return;
    this.setBusy(btn, true);
    const endpoint = reg.kind === 'google_complete' ? '/api/auth/google/complete' : '/api/register';
    const r = await SPES.API.post(endpoint, reg.payload);
    this.setBusy(btn, false);
    this.pendingReg = null;
    s.privacyModal = false;
    if (!r.ok) {
      this.flash(r.error);
      this.render();
      return;
    }
    if (reg.kind === 'google_complete') { s.googleToken = null; s.googleData = null; }
    this.flash(`Account created (SPES ID: ${r.data.spesId}). Please wait for the administrator to approve it before you log in.`, true);
    s.mode = 'login'; s.as = this.portal();
    this.transition('Account created!', 'Waiting for administrator approval', false);
  },

  async uploadAttendance(btn) {
    const u = this.user(), p = this.pendingAtt;
    if (!u || !p) return;
    this.setBusy(btn, true);
    const image = await this.readImage(p.file);
    const r = await SPES.API.post('/api/attendance', { slot: p.slot, photo: image, date: p.date });
    this.pendingAtt = null; this.s.attConfirm = false;
    if (r.ok) {
      SPES.DB.set('attendance', [...SPES.AttendanceModel.all(), r.data.record]);
      this.flash('Image submitted. Attendance is pending administrator review.', true);
    } else {
      this.flash(r.error);
    }
    this.render();
  },

  render(forceFull = false) {
    const u = this.user(), V = SPES.View, s = this.s;
    this.applyPrefs(u);
    if (!u) {
      if (s.mode === 'pis_form' && SPES.PisView) {
        V.mount(SPES.PisView.form((this.pendingReg && this.pendingReg.payload) || {}, s.m));
      } else {
        V.mount(V.auth(s.mode, s.m, s.as, s.googleData, s.googleReset, s.lampOn) + (s.privacyModal ? V.privacyConsentModal() : ''));
      }
    } else {
      const tabs = this.TABS[u.role];
      const tab = s.tab && tabs.includes(s.tab) ? s.tab : tabs[0];
      const body = this.body(u, tab);
      const me = this.user();
      const badges = {
        notifs: SPES.NotifModel.unread(me),
        messages: SPES.ChatView ? SPES.ChatView.unreadCount(me) : 0,
        approvals: me.role === 'beneficiary' ? 0 : SPES.UserModel.all().filter(x => x.status === 'pending').length
      };
      const modalHtml = (s.confirm ? V.logoutModal() : '')
        + (s.delConfirm && SPES.UserModel.byId(s.delConfirm) ? V.deleteModal(SPES.UserModel.byId(s.delConfirm)) : '')
        + (s.declineConfirm && SPES.UserModel.byId(s.declineConfirm) ? V.declineModal(SPES.UserModel.byId(s.declineConfirm)) : '')
        + (s.noteModal ? V.noteModal(me) : '')
        + (s.attConfirm ? V.attendanceConfirmModal() : '');

      const existingMain = !forceFull && document.querySelector('#app > .layout > main.content');
      if (existingMain && existingMain.dataset.uid === String(me.id)) {
        // Partial DOM update: keep the sidebar rock-solid (no flicker, no scroll jump)
        const dark = (me.settings || {}).theme === 'dark';
        const topBtn = `<div class="top-actions">${V.liveClock()}<button class="theme-toggle theme-switch ${dark ? 'is-dark' : 'is-light'}" data-act="theme" data-v="${dark ? 'light' : 'dark'}" title="Switch to ${dark ? 'light' : 'dark'} mode"><span class="theme-icon">${dark ? V.SUN : V.MOON}</span><span>${dark ? 'Light mode' : 'Dark mode'}</span><span class="theme-track"><i></i></span></button></div>`;
        existingMain.innerHTML = `${topBtn}<div class="content-body${this.anim ? ' enter' : ''}">${body}</div>`;

        // Update sidebar active state, badges, and user chip in place
        const side = document.querySelector('#app > .layout > aside.side');
        if (side) {
          side.querySelectorAll('nav button[data-t]').forEach(b => {
            const k = b.dataset.t;
            b.classList.toggle('on', k === tab);
            const nb = b.querySelector('.nb');
            if (badges[k]) {
              if (nb) nb.textContent = badges[k];
              else b.insertAdjacentHTML('beforeend', `<em class="nb">${badges[k]}</em>`);
            } else if (nb) {
              nb.remove();
            }
          });
          const who = side.querySelector('.who');
          const role = { beneficiary: 'SPES Beneficiary', head: 'Office Head', admin: 'Administrator' }[me.role];
          if (who) who.innerHTML = `${V.av(me)}<div><b>${V.esc(me.name)}</b><small>${role}</small></div>`;
        }

        // Update modal layer cleanly
        document.querySelectorAll('#app > .modal').forEach(m => m.remove());
        if (modalHtml) document.getElementById('app').insertAdjacentHTML('beforeend', modalHtml);
      } else {
        V.mount(V.shell(me, tabs, tab, `<div class="content-body${this.anim ? ' enter' : ''}">${body}</div>`, badges) + modalHtml);
        const main = document.querySelector('#app > .layout > main.content');
        if (main) main.dataset.uid = String(me.id);
      }
    }

    this.addEyes();
    const nav = document.querySelector('.side nav'), on = nav && nav.querySelector('button.on');
    if (on && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2;
    if (this.anim && !u) { const el = document.querySelector('.panel'); if (el) el.classList.add('enter'); }
    this.anim = false;
    const af = document.querySelector('input[autofocus]'); if (af) af.focus();
    s.m = null;
    this.applySearch(); this.refreshPresence();
  },

  ctx(u) { const dates = SPES.UserModel.workDates(u), today = SPES.DB.get('serverDate') || SPES.AttendanceModel.day(); return { dates, today, idx: dates.indexOf(today) + 1 }; },
  days(u, kind) {
    const { dates, today } = this.ctx(u), A = SPES.AttendanceModel, jr = kind === 'jr';
    return dates.map((date, i) => {
      let state = '', label = '';
      if (jr) { const j = SPES.JournalModel.get(u.id, i + 1); state = j ? (j.status === 'submitted' ? 'full' : 'part') : ''; label = j ? (j.status === 'submitted' ? 'Done' : 'Draft') : 'Empty'; }
      else [label, state] = A.dayStatus(u.id, date, date >= today);
      return { n: i + 1, date, state, label, today: date === today, future: false, makeup: i >= 20 };
    });
  },
  selDay(key, u) { return this.s[key] || this.ctx(u).idx || 1; },
  badgeList(u) {
    const G = SPES.GameModel, A = SPES.AttendanceModel, rooms = G.completed(u.id), pts = G.total(u.id), perDay = {};
    A.forUser(u.id).filter(a => a.status === 'approved').forEach(a => perDay[a.date] = (perDay[a.date] || 0) + 1);
    const days = Object.keys(perDay).length, jn = SPES.JournalModel.forUser(u.id).filter(j => j.status === 'submitted').length, top = G.leaderboard(u.batch)[0] || {};
    const perfect = Object.values(G.userProgress(u.id)).some(r => r.done && r.wrong === 0);
    return [
      ['First Room', 'games', rooms >= 1], ['5 Rooms', 'games', rooms >= 5], ['10 Rooms', 'games', rooms >= 10], ['15 Rooms', 'games', rooms >= 15], ['All 20 Rooms', 'badges', rooms >= 20],
      ['Perfect Room', 'review', perfect], ['500 Points', 'board', pts >= 500], ['1000 Points', 'board', pts >= 1000], ['First Check-in', 'attendance', days >= 1], ['Perfect Day', 'attendance', Object.values(perDay).some(c => c >= 4)],
      ['5 Days Present', 'attendance', days >= 5], ['10 Days Present', 'attendance', days >= 10], ['20 Days Present', 'attendance', days >= 20], ['First Journal', 'journal', jn >= 1], ['5 Journals', 'journal', jn >= 5],
      ['10 Journals', 'journal', jn >= 10], ['20 Journals', 'journal', jn >= 20], ['Point Starter', 'board', pts >= 100], ['Quiz Master', 'games', pts >= 300], ['Batch Leader', 'admin', top.name === u.name && pts > 0]
    ].map(([name, ic, got]) => ({ name, ic, got }));
  },

  dashboard(u) {
    const V = SPES.View, G = SPES.GameModel, A = SPES.AttendanceModel, J = SPES.JournalModel, M = SPES.UserModel;
    if (u.role === 'beneficiary') {
      const mine = A.forUser(u.id), cnt = st => mine.filter(a => a.status === st).length, done = G.completed(u.id), badges = this.badgeList(u);
      const recent = [...mine.filter(a => a.photo).map(a => ['Sent proof: ' + A.SLOTS[a.slot].label, a.submittedAt]), ...J.forUser(u.id).filter(j => j.status === 'submitted').map(j => ['Submitted Journal Day ' + j.day, j.updatedAt])]
        .sort((x, y) => y[1].localeCompare(x[1])).slice(0, 4).map(r => [r[0], V.when(r[1])]);
      return V.userDash({ name: u.name, att: { ok: cnt('approved'), pend: cnt('pending'), rej: cnt('rejected') + cnt('absent'), pct: mine.length ? Math.round(cnt('approved') / mine.length * 100) : 0 },
        stats: [['Days present', this.days(u, 'att').filter(x => x.state === 'full').length + ' / 20'], ['Total points', G.total(u.id)], ['Learning progress', done * 5 + '%'], ['Badges earned', badges.filter(b => b.got).length + ' / ' + badges.length]],
        rooms: G.TITLES.map((t, i) => { const r = G.room(u.id, i); return { i, t, open: G.isOpen(i), cls: r.done ? 'done' : G.isOpen(i) ? 'open' : 'soon' }; }), badges, recent, done,
        board: G.leaderboard(u.batch).slice(0, 3).map(r => ({ ...r, me: r.name === u.name })),
        events: SPES.EventModel.all().filter(e => e.date >= (SPES.DB.get('serverDate') || A.day())).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3) });
    }
    const all = A.all(), today = SPES.DB.get('serverDate') || A.day(), users = M.all().filter(x => x.role === 'beneficiary'), ok = users.filter(x => x.status !== 'pending');
    const bx = SPES.BatchModel.all().map(b => { const mem = ok.filter(x => x.batch === b.code); return { name: b.name, code: b.code, members: mem.length, present: mem.filter(x => all.some(a => a.userId === x.id && a.date === today && a.status !== 'absent')).length }; });
    const links = [['approvals', 'Approvals'], ['review', 'Review attendance']].concat(u.role === 'admin' ? [['announce', 'Announcements'], ['admin', 'Batches']] : []);
    return V.staffDash(u.name, [['Beneficiaries', ok.length], ['Awaiting approval', users.length - ok.length], ['Pending attendance', all.filter(a => a.status === 'pending').length], ['Journals submitted', J.all().filter(j => j.status === 'submitted').length]], links, bx);
  },

  body(u, tab) {
    const V = SPES.View, s = this.s, G = SPES.GameModel, A = SPES.AttendanceModel, M = SPES.UserModel, N = SPES.NotifModel, names = Object.fromEntries(M.all().map(x => [x.id, x.name]));
    if (tab === 'dashboard') return this.dashboard(u);
    if (tab === 'attendance') { this.attSig = this.attSigNow(); const days = this.days(u, 'att'), n = this.selDay('day', u), d = days[n - 1], today = SPES.DB.get('serverDate') || A.day(), allow = d.today && !A.isRestDay(d.date) && !A.isWorkFromHome(d.date); return V.attendance(A.SLOTS, days, n, A.forUser(u.id).filter(a => a.date === d.date), allow, s.m, A.excuseOn(u.id, d.date), today); }
    if (tab === 'journal') {
      const days = this.days(u, 'jr'), n = this.selDay('jday', u), d = days[n - 1], saved = SPES.JournalModel.get(u.id, n);
      if (this.jkey !== n) { this.jkey = n; this.jpics = saved ? [...saved.photos] : []; }
      const en = this.draft ? { ...(saved || { status: 'draft' }), text: this.draft.text, event: this.draft.event } : saved; this.draft = null;
      return V.journal(days, n, en, SPES.EventModel.on(d.date), this.jpics, s.m);
    }
    if (tab === 'messages' && SPES.ChatView) return SPES.ChatView.render(u, s.chatPeer, s.chatQ || '', s.chatEditId);
    if (tab === 'journals') return '<h2>Beneficiary journals</h2>' + V.entries(SPES.JournalModel.all().filter(j => j.status === 'submitted'), names, u.role === 'admin');
    if (tab === 'personal' && SPES.PisView) return u.role === 'head' ? SPES.PisView.adminIndex(SPES.BatchModel.all(), M.all(), s.pisBatch, s.pisUser, s.pisQ || '') : '<h1>Not authorized</h1>';
    if (tab === 'accounts') return u.role === 'head' ? V.accountsList(M.all(), s.acctQ || '') : '<h1>Not authorized</h1>';
    if (tab === 'review') return u.role === 'admin' ? V.review(A.all().slice().reverse().map(a => ({ ...a, name: names[a.userId] || 'Beneficiary', label: A.SLOTS[a.slot] ? A.SLOTS[a.slot].label : 'Attendance' })), s.m, A.excuses().map(ex => ({ ...ex, name: names[ex.userId] || 'Beneficiary' }))) : '<h1>Not authorized</h1>';
    if (tab === 'answers') {
      if (u.role !== 'head') return '<h1>Not authorized</h1>';
      const K = SPES.KeyModel;
      if (s.keyOpen && Date.now() - s.keyOpen < 600000) { s.keyOpen = Date.now(); return V.answers(SPES.GameModel, s.m, s.keyMode); }
      s.keyOpen = 0;
      return V.keyGate(K.has(), s.keyMode, K.locked(), s.m);
    }
    if (tab === 'admin') return V.admin(SPES.BatchModel.all(), M.all(), s.m, s.room, { date: s.roomDate || SPES.DB.get('serverDate') || A.day(), q: s.roomQ || '' });
    if (tab === 'approvals') {
      const bens = M.all().filter(x => x.role === 'beneficiary');
      return V.approvals(bens.filter(x => x.status === 'pending'), bens.filter(x => x.status === 'rejected'), c => (SPES.BatchModel.find(c) || { name: c }).name, s.m);
    }
    if (tab === 'announce') return V.announce(SPES.BatchModel.all(), SPES.DB.get('ann', []), s.m);
    if (tab === 'feedback') return V.feedbackList(SPES.FeedbackModel.all());
    if (tab === 'notifs') { const html = V.notifs(N.for(u), u.seen, u.role === 'admin' || u.role === 'head'); N.markSeen(u); return html; }
    if (tab === 'badges') return `<h1>Badges & achievements</h1><div class="card">${V.badges(this.badgeList(u))}</div>`;
    if (tab === 'profile') {
      const st = u.role === 'beneficiary' ? [['Total points', G.total(u.id)], ['Rooms completed', G.completed(u.id) + ' / 20'], ['Batch', u.batch]] : [['Role', u.role === 'admin' ? 'Administrator' : 'Office Head'], ['Username', u.username]];
      return V.profile(u, st, s.m);
    }
    if (tab === 'settings') return V.settings(u, s.sub === 'feedback' && u.role !== 'beneficiary' ? 'account' : s.sub, SPES.ActivityModel.for(u.id), s.m);
    if (tab === 'calendar') {
      const c = s.cal || (s.cal = { y: new Date().getFullYear(), m: new Date().getMonth() }), marks = {};
      if (u.role === 'beneficiary') A.forUser(u.id).filter(a => a.status === 'approved').forEach(a => marks[a.date] = 1);
      return V.calendar(c.y, c.m, SPES.EventModel.inMonth(c.y, c.m), marks, u.role === 'admin', s.m);
    }
    if (tab === 'board') {
      const batches = SPES.BatchModel.all(), cur = u.role === 'beneficiary' ? u.batch : (s.board || (batches[0] || {}).code);
      return V.leaderboard(G.leaderboard(cur), batches, cur, u.role !== 'beneficiary', u.name, u.role === 'head');
    }
    if (tab === 'games') return SPES.Games.body(u);
  }
};
