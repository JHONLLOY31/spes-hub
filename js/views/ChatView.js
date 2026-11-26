// Full Messenger-style chat: Beneficiary <-> Same-Batch Classmates + Beneficiary <-> Admin.
// Features: Online status, 24h Notes strip, React, Edit, Unsend, Seen receipts, Live Typing indicator.
window.SPES = window.SPES || {};

SPES.ChatView = {
  EMOJIS: ['👍', '❤️', '😂', '😮', '😢', '🙏'],
  e(s) { return SPES.View.esc(s || ''); },
  all() { return SPES.DB.get('messages', []); },
  peersOf(u) {
    if (!u) return [];
    const users = SPES.UserModel.all();
    if (u.role === 'admin') {
      return users.filter(x => x.role === 'beneficiary' && x.status === 'approved' && x.id !== u.id);
    }
    return users.filter(x => x.id !== u.id && (
      x.role === 'admin' || (x.role === 'beneficiary' && x.batch === u.batch && x.status === 'approved')
    ));
  },
  unreadCount(u) {
    if (!u || (u.role !== 'beneficiary' && u.role !== 'admin')) return 0;
    return this.all().filter(m => m.to === u.id && !m.readAt && !m.unsent).length;
  },
  unreadFrom(u, peerId) {
    return this.all().filter(m => m.from === peerId && m.to === u.id && !m.readAt && !m.unsent).length;
  },
  thread(u, peerId) {
    return this.all().filter(m => (m.from === u.id && m.to === peerId) || (m.from === peerId && m.to === u.id));
  },
  isTypingToMe(peerId, myId) {
    const p = SPES.PresenceModel.all()[peerId];
    return !!(p && p.typingTo === myId && p.typingAt && Date.now() - p.typingAt < 6500);
  },
  shortTime(iso) {
    if (!iso) return '';
    return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));
  },

  render(u, peerId, q = '', editingId = null) {
    const V = SPES.View, P = SPES.PresenceModel;
    const peers = this.peersOf(u);
    const msgs = this.all();
    const onlineCnt = peers.filter(p => P.online(p.id)).length;

    const sorted = peers.slice().sort((a, b) => {
      const ua = this.unreadFrom(u, a.id), ub = this.unreadFrom(u, b.id);
      if (ua !== ub) return ub - ua;
      const la = msgs.filter(m => (m.from === a.id && m.to === u.id) || (m.from === u.id && m.to === a.id)).pop();
      const lb = msgs.filter(m => (m.from === b.id && m.to === u.id) || (m.from === u.id && m.to === b.id)).pop();
      if (la && lb) return lb.ts.localeCompare(la.ts);
      if (la) return -1;
      if (lb) return 1;
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      const oa = P.online(a.id) ? 1 : 0, ob = P.online(b.id) ? 1 : 0;
      if (oa !== ob) return ob - oa;
      return a.name.localeCompare(b.name);
    });

    const active = sorted.find(p => p.id === peerId) || null;
    const myNote = V.noteLive(u);

    // Messenger-style horizontal Notes strip
    const noteStrip = `<div class="chat-notes">
      <button type="button" class="cn-item" data-act="editnote" title="Share or edit your 24-hour note">
        <span class="cn-bub ${myNote ? '' : 'empty'}">${this.e(myNote ? myNote.text : '+ Note...')}</span>
        <span class="avw">${V.av(u)}<i class="dot on"></i></span>
        <small>Your note</small>
      </button>
      ${sorted.slice(0, 20).map(p => {
        const n = V.noteLive(p), on = P.online(p.id);
        return `<button type="button" class="cn-item ${active && active.id === p.id ? 'on' : ''}" data-act="chatpeer" data-id="${p.id}">
          ${n ? `<span class="cn-bub">${this.e(n.text)}</span>` : '<span class="cn-bub spacer"></span>'}
          <span class="avw">${V.av(p)}<i class="dot ${on ? 'on' : ''}"></i></span>
          <small>${p.role === 'admin' ? 'Admin' : this.e(p.name.split(' ')[0])}</small>
        </button>`;
      }).join('')}
    </div>`;

    const listHtml = sorted.map(p => {
      const th = this.thread(u, p.id), last = th[th.length - 1], un = this.unreadFrom(u, p.id);
      const on = P.online(p.id), note = V.noteLive(p), typing = this.isTypingToMe(p.id, u.id);
      const preview = typing
        ? 'Typing...'
        : last
          ? (last.unsent ? 'Message unsent' : (last.from === u.id ? 'You: ' : '') + last.body)
          : (note ? 'Note: ' + note.text : P.label(p.id));
      const badge = p.role === 'admin' ? '<span class="tag gold" style="font-size:.66rem;padding:0 .4rem">Admin</span>'
        : (u.role === 'admin' && p.batch ? `<span class="tag" style="font-size:.64rem;padding:0 .38rem">${this.e(p.batch)}</span>` : '');
      return `<button type="button" class="cl-row ${active && active.id === p.id ? 'on' : ''}" data-act="chatpeer" data-id="${p.id}" data-chat-search="${this.e((p.name + ' ' + (p.batch || '') + ' ' + (p.role || '')).toLowerCase())}">
        <span class="avw">${V.av(p)}<i class="dot ${on ? 'on' : ''}"></i></span>
        <span class="cl-info">
          <span class="cl-top"><b>${this.e(p.name)}</b> ${badge}<small style="margin-left:auto">${last ? this.shortTime(last.ts) : ''}</small></span>
          <span class="cl-sub ${typing ? 'is-typing' : ''}">${this.e(preview)}</span>
        </span>
        ${un ? `<em class="nb">${un}</em>` : ''}
      </button>`;
    }).join('') || '<p class="muted" style="padding:1rem">No contacts available yet.</p>';

    let paneHtml;
    if (!active) {
      paneHtml = `<div class="chat-empty"><div class="mic">${V.icon('messages')}</div><h3>${u.role === 'admin' ? 'Admin Messenger' : `Batch ${this.e(u.batch || '')} Messenger`}</h3><p class="muted">${u.role === 'admin' ? 'Select any beneficiary on the left to read and reply to their messages.' : 'Message classmates in your batch or the Administrator directly.'}</p></div>`;
    } else {
      const th = this.thread(u, active.id), on = P.online(active.id), note = V.noteLive(active);
      const typing = this.isTypingToMe(active.id, u.id);
      const lastMine = [...th].reverse().find(m => m.from === u.id && !m.unsent);
      paneHtml = `<div class="chat-head">
          <button type="button" class="back chat-back" data-act="chatback" style="margin:0">${V.icon('back')}</button>
          <span class="avw">${V.av(active)}<i class="dot ${on ? 'on' : ''}"></i></span>
          <div class="chat-who">
            <b>${this.e(active.name)} ${active.role === 'admin' ? '<span class="tag gold" style="font-size:.7rem">Admin</span>' : (u.role === 'admin' && active.batch ? `<span class="tag" style="font-size:.7rem">${this.e(active.batch)}</span>` : '')}</b>
            <small>${typing ? '<span class="typing-txt">Typing...</span>' : (on ? 'Online now' : P.label(active.id))}</small>
          </div>
          ${note ? `<span class="chat-note-pill" title="24h note">“${this.e(note.text)}”</span>` : ''}
        </div>
        <div class="chat-msgs" id="chatMsgs">
          ${th.map(m => {
            const mine = m.from === u.id;
            const reacts = Object.values(m.reactions || {});
            const reactCounts = reacts.reduce((acc, em) => { acc[em] = (acc[em] || 0) + 1; return acc; }, {});
            const reactBadges = Object.entries(reactCounts).map(([em, cnt]) => `<span class="rx-pill">${em}${cnt > 1 ? ' ' + cnt : ''}</span>`).join('');
            const isEditing = editingId === m.id;
            return `<div class="bub-row ${mine ? 'mine' : 'theirs'} ${m.unsent ? 'unsent' : ''}">
              <div class="bub-wrap">
                ${isEditing
                  ? `<form class="bub-edit-form" data-form="chatedit" data-mid="${m.id}"><input name="body" value="${this.e(m.body)}" maxlength="1000" required autofocus><div class="row" style="gap:.35rem;margin-top:.35rem"><button class="btn" style="margin:0;padding:.3rem .7rem;font-size:.78rem" type="submit">Save</button><button class="btn alt" style="margin:0;padding:.3rem .7rem;font-size:.78rem" type="button" data-act="chat_edit_cancel">Cancel</button></div></form>`
                  : `<div class="bubble">${m.unsent ? '<em>Message unsent</em>' : this.e(m.body)}</div>`}
                ${!m.unsent && !isEditing ? `<div class="bub-tools">
                  <span class="rx-bar">${this.EMOJIS.map(em => `<button type="button" class="rx-btn ${(m.reactions || {})[u.id] === em ? 'on' : ''}" data-act="chat_react" data-mid="${m.id}" data-emoji="${em}" title="React ${em}">${em}</button>`).join('')}</span>
                  ${mine ? `<button type="button" class="bt-btn" data-act="chat_edit" data-mid="${m.id}" title="Edit message">Edit</button><button type="button" class="bt-btn bad" data-act="chat_unsend" data-mid="${m.id}" title="Unsend message">Unsend</button>` : ''}
                </div>` : ''}
              </div>
              ${reactBadges ? `<div class="rx-list">${reactBadges}</div>` : ''}
              <small class="bub-meta">${this.shortTime(m.ts)}${m.editedAt && !m.unsent ? ' · Edited' : ''}${mine && lastMine && lastMine.id === m.id && m.readAt ? ' · <b>Seen</b>' : ''}</small>
            </div>`;
          }).join('') || `<p class="muted" style="text-align:center;margin:auto">Say hi to ${this.e(active.name.split(' ')[0])}!</p>`}
          ${typing ? `<div class="bub-row theirs"><div class="bubble typing-bub"><i></i><i></i><i></i></div></div>` : ''}
        </div>
        <form class="chat-bar" data-form="chatmsg" data-to="${active.id}">
          <input name="body" id="chatInput" maxlength="1000" required autocomplete="off" placeholder="Write a message to ${this.e(active.name.split(' ')[0])}...">
          <button class="btn" type="submit" style="margin:0">Send</button>
        </form>`;
    }

    return `<div class="ch"><div><h1 style="margin:0">Message</h1><p class="muted" style="margin:.15rem 0 0">${u.role === 'admin' ? `All Beneficiaries · ${onlineCnt} online` : `Batch <b>${this.e(u.batch || '')}</b> &amp; Admin · ${onlineCnt} online`}</p></div></div>
      ${noteStrip}
      <div class="card chat-wrap ${active ? 'has-active' : ''}">
        <aside class="chat-list">
          <div class="chat-search-box"><input id="chatSearch" type="search" value="${this.e(q)}" placeholder="Search people..." autocomplete="off"></div>
          <div class="chat-list-items">${listHtml}</div>
        </aside>
        <section class="chat-pane">${paneHtml}</section>
      </div>`;
  }
};
