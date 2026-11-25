// One journal per beneficiary per work day (1-20). status: 'draft' or 'submitted'.
SPES.JournalModel = {
  all() { return SPES.DB.get('journals', []); },
  forUser(id) { return this.all().filter(j => j.userId === id); },
  get(userId, day) { return this.all().find(j => j.userId === userId && j.day === day); },
  save(userId, day, date, f, status) {
    if (status === 'submitted' && f.text.trim().length < 20) return { error: 'Describe your tasks in at least 20 characters before submitting.' };
    const old = this.get(userId, day);
    const j = { id: old ? old.id : SPES.DB.id(), userId, day, date, text: f.text.trim(), event: (f.event || '').trim(), photos: f.photos, status, updatedAt: new Date().toISOString() };
    return SPES.DB.set('journals', [...this.all().filter(x => !(x.userId === userId && x.day === day)), j]) ? { j } : { error: 'Could not save.' };
  },
  setStatus(userId, day, status) {
    SPES.DB.set('journals', this.all().map(j => j.userId === userId && j.day === day ? { ...j, status } : j));
  }
};
