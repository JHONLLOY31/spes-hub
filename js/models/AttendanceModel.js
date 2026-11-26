SPES.AttendanceModel = {
  // open/close are minutes after midnight. A slot is locked until it opens.
  SLOTS: {
    AM_IN:  { label: 'Morning Time-In',    rule: 'Opens 7:00 AM · Late 8:01 AM+ (−2 pts/min)', open: 420,  close: 720,  lateAfter: 480  },
    AM_OUT: { label: 'Morning Time-Out',   rule: 'Opens 12:00 PM · Late 12:01 PM+ (−2 pts/min)', open: 720,  close: 1440, lateAfter: 720  },
    PM_IN:  { label: 'Afternoon Time-In',  rule: 'Opens 12:30 PM · Late 1:01 PM+ (−2 pts/min)', open: 750,  close: 1020, lateAfter: 780  },
    PM_OUT: { label: 'Afternoon Time-Out', rule: 'Opens 5:00 PM onwards', open: 1020, close: 1440, lateAfter: null }
  },
  clock(mins) { const h = Math.floor(mins / 60); return `${h % 12 || 12}:${String(mins % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; },
  windowState(slot, now = new Date()) { const s = this.SLOTS[slot], mins = now.getHours() * 60 + now.getMinutes(); return { open: mins >= s.open && mins < s.close, state: mins < s.open ? 'early' : mins >= s.close ? 'closed' : 'open', opensAt: this.clock(s.open) }; },
  day(d = new Date()) { return d.toLocaleDateString('en-CA'); },
  all() { const rows = SPES.DB.get('attendance', []); let changed = false; rows.forEach(a => { if (a.status === 'verified') { a.status = 'approved'; changed = true; } }); if (changed) SPES.DB.set('attendance', rows); return rows; },
  forUser(id) { return this.all().filter(a => a.userId === id); },
  today(id) { return this.forUser(id).filter(a => a.date === this.day()); },
  isWorkFromHome(date) { return new Date(date + 'T00:00:00').getDay() === 5; },
  manual() { return SPES.DB.get('attmanual', []); },
  isManual(userId, date, period) {
    const rows = this.manual().filter(x => x.userId === userId && x.date === date);
    if (!period) return rows.length > 0;
    return rows.some(x => (x.period || 'FULL') === period);
  },
  excuses() { return SPES.DB.get('excuses', []); },
  excusesForUser(userId) { return this.excuses().filter(x => x.userId === userId); },
  excuseOn(userId, date) { return this.excuses().find(x => x.userId === userId && x.date === date) || null; },
  makeupCount(userId) { return this.excuses().filter(x => x.userId === userId && x.status === 'approved' && x.makeupGranted).length; },
  // Admin marks a day as present without a photo (toggle). Returns { added } or { error }.
  markPresent(userId, date, by) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return { error: 'Pick a valid date.' };
    if (date > this.day()) return { error: 'You cannot mark a future day.' };
    if (this.isRestDay(date)) return { error: 'Saturday and Sunday are rest days.' };
    const rows = this.manual();
    if (this.isManual(userId, date)) { SPES.DB.set('attmanual', rows.filter(x => !(x.userId === userId && x.date === date))); return { added: false }; }
    SPES.DB.set('attmanual', [...rows, { id: SPES.DB.id(), userId, date, by, at: new Date().toISOString() }]); return { added: true };
  },
  isRestDay(date) { const d = new Date(date + 'T00:00:00').getDay(); return d === 0 || d === 6; },
  submit(userId, slot, photo, date) {
    date = date || this.day();
    if (this.isRestDay(date)) return { error: 'Saturday and Sunday are rest days.' };
    if (this.isWorkFromHome(date)) return { error: 'Friday is work from home. Attendance is not required.' };
    if (!this.SLOTS[slot]) return { error: 'Invalid attendance slot.' };
    if (this.forUser(userId).some(a => a.date === date && a.slot === slot)) return { error: 'You already submitted this attendance slot.' };
    if (date === this.day()) { const w = this.windowState(slot); if (!w.open) return { error: w.state === 'early' ? `${this.SLOTS[slot].label} opens at ${w.opensAt}.` : `${this.SLOTS[slot].label} is closed for today.` }; }
    const now = new Date(), s = this.SLOTS[slot], mins = now.getHours() * 60 + now.getMinutes();
    const onTime = s.before ? mins < s.h * 60 : mins >= s.h * 60;
    const rec = { id: SPES.DB.id(), userId, slot, photo, date, submittedAt: now.toISOString(), onTime, status: 'pending', reviewedBy: null };
    return SPES.DB.set('attendance', [...this.all(), rec]) ? { rec } : { error: 'Could not save. Try a smaller image.' };
  },
  dayStatus(userId, date, open) {
    if (this.isRestDay(date)) return ['Rest day', ''];
    if (this.isWorkFromHome(date)) return ['Work from home', ''];
    const ex = this.excuseOn(userId, date);
    if (ex && ex.status === 'approved') return ['Excused', 'exc'];
    if (ex && ex.status === 'pending') return ['Excuse pending', 'part'];
    const manFull = this.isManual(userId, date, 'FULL');
    const manAM = manFull || this.isManual(userId, date, 'AM');
    const manPM = manFull || this.isManual(userId, date, 'PM');
    if (manAM && manPM) return ['Present', 'full'];
    const r = this.forUser(userId).filter(a => a.date === date && this.SLOTS[a.slot]);
    const approved = r.filter(a => a.status === 'approved').map(a => a.slot);
    const am = manAM || (approved.includes('AM_IN') && approved.includes('AM_OUT'));
    const pm = manPM || (approved.includes('PM_IN') && approved.includes('PM_OUT'));
    if (am && pm) return ['Present', 'full'];
    if (r.some(a => a.status === 'pending')) return ['Pending review', 'part'];
    if (am) return ['Half day (AM)', 'part'];
    if (pm) return ['Half day (PM)', 'part'];
    if (r.some(a => a.status === 'rejected')) return ['Needs correction', 'abs'];
    if (approved.length) return ['Pending', 'part'];
    return open ? ['Not submitted', ''] : ['Absent', 'abs'];
  },
  review(id, status, by) {
    if (!['approved', 'rejected'].includes(status)) return;
    SPES.DB.set('attendance', this.all().map(a => a.id === id ? { ...a, status, reviewedBy: by, reviewedAt: new Date().toISOString() } : a));
  }
};
