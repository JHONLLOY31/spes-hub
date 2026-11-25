SPES.EventModel = {
  all() { return SPES.DB.get('events', []); },
  seed() {}, // no sample events: only the Admin adds events
  add(title, date, type) { SPES.DB.set('events', [...this.all(), { id: SPES.DB.id(), title, date, type }]); },
  remove(id) { SPES.DB.set('events', this.all().filter(e => e.id !== id)); },
  on(date) { return this.all().filter(e => e.date === date); },
  inMonth(y, m) {
    const pre = `${y}-${String(m + 1).padStart(2, '0')}`;
    return this.all().filter(e => e.date.startsWith(pre)).sort((a, b) => a.date.localeCompare(b.date));
  }
};
