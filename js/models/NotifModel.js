// Notifications, activity history, feedback, and online presence (API-backed).
SPES.NotifModel = {
  all() { return SPES.DB.get('notifs', []); },
  for(u) {
    const staff = u.role !== 'beneficiary';
    return this.all().filter(n => n.to === u.id || (staff ? n.to === 'staff' : (n.to === 'all' || n.to === 'batch:' + u.batch)));
  },
  unread(u) { return this.for(u).filter(n => n.ts > (u.seen || '')).length; },
  markSeen(u) {
    const now = new Date().toISOString();
    SPES.UserModel.updateLocal(u.id, { seen: now });
    SPES.API.post('/api/notifs/seen', {});
  }
};

SPES.ActivityModel = {
  log() {}, // logged server-side automatically
  for(uid) { return SPES.DB.get('activity', []).filter(a => a.uid === uid).slice(0, 30); }
};

SPES.FeedbackModel = {
  all() { return SPES.DB.get('feedback', []); }
};

SPES.PresenceModel = {
  TTL: 45000,
  all() { return SPES.DB.get('presence', {}); },
  online(id) { const e = this.all()[id]; return !!(e && e.on && Date.now() - e.t < this.TTL); },
  label(id) {
    if (this.online(id)) return 'Online now';
    const e = this.all()[id]; if (!e) return 'Offline';
    const m = Math.max(1, Math.round((Date.now() - e.t) / 60000));
    return 'Last seen ' + (m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : new Date(e.t).toLocaleDateString());
  }
};
