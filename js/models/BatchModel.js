SPES.BatchModel = {
  DAYS: 20,
  SKIP_WEEKENDS: true, // Saturday and Sunday are rest days; Friday remains a counted WFH workday
  all() { return SPES.DB.get('batches', []); },
  find(code) { return this.all().find(b => b.code === String(code || '').trim().toUpperCase()); },
  create(name, year, code, start) {
    const tag = (String(name).match(/B[12]/i) || [this.all().some(x => x.year == year && x.code.startsWith('B1-')) ? 'B2' : 'B1'])[0].toUpperCase();
    const c = code || `${tag}-${year}`;
    SPES.DB.set('batches', [...this.all(), { code: c, name, year, start: start || SPES.AttendanceModel.day() }]);
    return c;
  },
  start(code) {
    const b = this.find(code);
    if (!b) return SPES.AttendanceModel.day();
    if (!b.start) { b.start = SPES.AttendanceModel.day(); SPES.DB.set('batches', this.all().map(x => x.code === b.code ? b : x)); }
    return b.start;
  },
  // The 20 work-day dates (yyyy-mm-dd) of a batch, starting from its Day 1 date.
  workDates(code) { return this.workDatesFrom(this.start(code)); },
  // The 20 work days counted from any start date (weekends are skipped).
  workDatesFrom(start) {
    const out = [], d = new Date(start + 'T00:00:00');
    while (out.length < this.DAYS) {
      const w = d.getDay();
      if (!(this.SKIP_WEEKENDS && (w === 0 || w === 6))) out.push(d.toLocaleDateString('en-CA'));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
};
