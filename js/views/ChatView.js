// Same-batch Messenger-style chat view: online status, 24h notes strip, and 1-to-1 direct messages.
window.SPES = window.SPES || {};

SPES.ChatView = {
  e(s) { return SPES.View.esc(s || ''); },
  all() { return SPES.DB.get('messages', []); },
  peersOf(u) {
    return SPES.UserModel.all().filter(x => x.role === 'beneficiary' && x.batch === u.batch && x.status === 'approved' && x.id !== u.id);
  },
  unreadCount(u) {
    if (!u || u.role !== 'beneficiary') return 0;
    return this.all().filter(m => m.to === u.id && !m.readAt).length;
  },
  unreadFrom(u, peerId) {
    return this.all().filter(m => m.from === peerId && m.to === u.id && !m.readAt).length;
  },
  thread(u, peerId) {
    return this.all().filter(m => (m.from === u.id && m.to === peerId) || (m.from === peerId && m.to === u.id));
  },
  shortTime(iso) {
    if (!iso) return '';
    return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));
  },

  render(u, peerId, q = '') {
    const V = SPES.View, P = SPES.PresenceModel;
    const peers = this.peersOf(u);
    const msgs = this.all();
    const onlineCnt = peers.filter(p => P.online(p.id)).length;

    // Sort classmates: unread first, then most recent message, then online, then name
    const sorted = peers.slice().sort((a, b) => {
      const ua = this.unreadFrom(u, a.id), ub = this.unreadFrom(u, b.id);
      if (ua !== ub) return ub - ua;
      const la = msgs.filter(m => (m.from === a.id && m.to === u.id) || (m.from === u.id && m.to === a.id)).pop();
      const lb = msgs.filter(m => (m.from === b.id && m.to === u.id) || (m.from === u.id && m.to === b.id)).pop();
      if (la && lb) return lb.ts.localeCompare(la.ts);
      if (la) return -1;
      if (lb) return 1;
      const oa = P.online(a.id) ? 1 : 0, ob = P.online(b.id) ? 1 : 0;
      if (oa !== ob) return ob - oa;
      return a.name.localeCompare(b.name);
    });

    const active = sorted.find(p => p.id === peerId) || null;
    const myNote = V.noteLive(u);

    // Messenger-style horizontal Notes strip (own note + same-batch classmates)
    const noteStrip = `<div class="chat-notes">
      <button type="button" class="cn-item" data-act="tab" data-t="profile" title="Update your 24-hour note in Profile">
        <span class="cn-bub ${myNote ? '' : 'empty'}">${this.e(myNote ? myNote.text : 'Add a note...')}</span>
        <span class="avw">${V.av(u)}<i class="dot on"></i></span>
        <small>Your note</small>
      </button>
      ${sorted.map(p => {
        const n = V.noteLive(p), on = P.online(p.id);
        return `<button type="button" class="cn-item ${active && active.id === p.id ? 'on' : ''}" data-act="chatpeer" data-id="${p.id}">
          ${n ? `<span class="cn-bub">${this.e(n.text)}</span>` : '<span class="cn-bub spacer"></span>'}
          <span class="avw">${V.av(p)}<i class="dot ${on ? 'on' : ''}"></i></span>
          <small>${this.e(p.name.split(' ')[0])}</small>
        </button>`;
      }).join('')}
    </div>`;

    // Left sidebar: classmate conversation list
    const listHtml = sorted.map(p => {
      const th = this.thread(u, p.id), last = th[th.length - 1], un = this.unreadFrom(u, p.id);
      const on = P.online(p.id), note = V.noteLive(p);
      const preview = last ? (last.from === u.id ? 'You: ' : '') + last.body : (note ? 'Note: ' + note.text : P.label(p.id));
      return `<button type="button" class="cl-row ${active && active.id === p.id ? 'on' : ''}" data-act="chatpeer" data-id="${p.id}" data-chat-search="${this.e(p.name.toLowerCase())}">
        <span class="avw">${V.av(p)}<i class="dot ${on ? 'on' : ''}"></i></span>
        <span class="cl-info">
          <span class="cl-top"><b>${this.e(p.name)}</b><small>${last ? this.shortTime(last.ts) : ''}</small></span>
          <span class="cl-sub">${this.e(preview)}</span>
        </span>
        ${un ? `<em class="nb">${un}</em>` : ''}
      </button>`;
    }).join('') || '<p class="muted" style="padding:1rem">No other approved beneficiaries in your batch yet.</p>';

    // Right pane: active conversation thread
    let paneHtml;
    if (!active) {
      paneHtml = `<div class="chat-empty"><div class="mic">${V.icon('messages')}</div><h3>Batch ${this.e(u.batch || '')} Messenger</h3><p class="muted">Select a classmate from your batch on the left (or tap their note above) to start chatting.</p></div>`;
    } else {
      const th = this.thread(u, active.id), on = P.online(active.id), note = V.noteLive(active);
      const lastMine = [...th].reverse().find(m => m.from === u.id);
      paneHtml = `<div class="chat-head">
          <button type="button" class="back chat-back" data-act="chatback" style="margin:0">${V.icon('back')}</button>
          <span class="avw">${V.av(active)}<i class="dot ${on ? 'on' : ''}"></i></span>
          <div class="chat-who">
            <b>${this.e(active.name)}</b>
            <small>${on ? 'Online now' : P.label(active.id)}</small>
          </div>
          ${note ? `<span class="chat-note-pill" title="24h note">“${this.e(note.text)}”</span>` : ''}
        </div>
        <div class="chat-msgs" id="chatMsgs">
          ${th.map(m => {
            const mine = m.from === u.id;
            return `<div class="bub-row ${mine ? 'mine' : 'theirs'}">
              <div class="bubble">${this.e(m.body)}</div>
              <small class="bub-meta">${this.shortTime(m.ts)}${mine && lastMine && lastMine.id === m.id && m.readAt ? ' · Seen' : ''}</small>
            </div>`;
          }).join('') || `<p class="muted" style="text-align:center;margin:auto">Say hi to ${this.e(active.name.split(' ')[0])}! Only members of batch ${this.e(u.batch)} can message each other.</p>`}
        </div>
        <form class="chat-bar" data-form="chatmsg" data-to="${active.id}">
          <input name="body" id="chatInput" maxlength="1000" required autocomplete="off" placeholder="Write a message to ${this.e(active.name.split(' ')[0])}...">
          <button class="btn" type="submit" style="margin:0">Send</button>
        </form>`;
    }

    return `<div class="ch"><div><h1 style="margin:0">Message</h1><p class="muted" style="margin:.15rem 0 0">Batch <b>${this.e(u.batch || '')}</b> · ${onlineCnt} classmate${onlineCnt === 1 ? '' : 's'} online</p></div></div>
      ${noteStrip}
      <div class="card chat-wrap ${active ? 'has-active' : ''}">
        <aside class="chat-list">
          <div class="chat-search-box"><input id="chatSearch" type="search" value="${this.e(q)}" placeholder="Search classmates..." autocomplete="off"></div>
          <div class="chat-list-items">${listHtml}</div>
        </aside>
        <section class="chat-pane">${paneHtml}</section>
      </div>`;
  }
};
