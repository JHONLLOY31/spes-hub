// User model — reads from the API-synced in-memory cache.
SPES.UserModel = {
  all() { return SPES.DB.get('users', []); },
  byId(id) {
    const me = this.session();
    if (me && me.id === id) return me;
    return this.all().find(u => u.id === id) || null;
  },
  seed() {},
  startDate(u) { return u.startDate || SPES.BatchModel.start(u.batch); },
  workDates(u) { return SPES.BatchModel.workDatesFrom(this.startDate(u)); },
  session() { return SPES.DB.get('me', null); },
  setSession(u) { SPES.DB.set('me', u || null); },
  updateLocal(id, patch) {
    const me = this.session();
    if (me && me.id === id) SPES.DB.set('me', { ...me, ...patch });
    SPES.DB.set('users', this.all().map(u => u.id === id ? { ...u, ...patch } : u));
  }
};
