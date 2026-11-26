// In-memory state cache + HTTP API client backed by the Node.js / Supabase server.
window.SPES = window.SPES || {};

SPES.DB = {
  _store: {},
  get(key, fallback) {
    return key in this._store && this._store[key] !== undefined ? this._store[key] : fallback;
  },
  set(key, value) {
    this._store[key] = value;
    return true;
  },
  clear() {
    this._store = {};
  },
  id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
};

SPES.API = {
  async req(method, path, body) {
    try {
      const res = await fetch(path, {
        method,
        credentials: 'same-origin',
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, status: res.status, error: data.error || 'Request failed.', data };
      return { ok: true, status: res.status, data };
    } catch (e) {
      return { ok: false, status: 0, error: 'Cannot reach the server. Please check your connection.' };
    }
  },
  get(path) { return this.req('GET', path); },
  post(path, body = {}) { return this.req('POST', path, body); },
  patch(path, body = {}) { return this.req('PATCH', path, body); },
  put(path, body = {}) { return this.req('PUT', path, body); },
  del(path) { return this.req('DELETE', path); },

  async bootstrap() {
    const r = await this.get('/api/bootstrap');
    if (!r.ok) return r;
    const d = r.data;
    SPES.DB.set('me', d.me);
    SPES.DB.set('serverDate', d.serverDate);
    SPES.DB.set('batches', d.batches || []);
    SPES.DB.set('users', d.users || []);
    SPES.DB.set('attendance', d.attendance || []);
    SPES.DB.set('attmanual', d.attmanual || []);
    SPES.DB.set('excuses', d.excuses || []);
    SPES.DB.set('journals', d.journals || []);
    SPES.DB.set('events', d.events || []);
    SPES.DB.set('ann', d.announcements || []);
    SPES.DB.set('notifs', d.notifs || []);
    SPES.DB.set('activity', d.activity || []);
    SPES.DB.set('feedback', d.feedback || []);
    SPES.DB.set('progress', d.progress || {});
    SPES.DB.set('points', d.points || {});
    SPES.DB.set('presence', d.presence || {});
    SPES.DB.set('messages', d.messages || []);
    SPES.DB.set('answerKeyHas', !!d.answerKeyHas);
    return r;
  }
};
