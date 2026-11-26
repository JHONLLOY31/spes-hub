// Game model — reads progress & points from API-synced cache; writes go through /api/games/answer.
SPES.GameModel = {
  CORRECT: 20, WRONG: -1,
  TITLES: ['Office Basics','Document Handling','Filing and Records','Customer Service','Workplace Safety','Email Etiquette','Government Offices','Time Management','Teamwork','Data Privacy','Basic Computer Skills','Spreadsheets','Word Processing','Communication','Professionalism','Problem Solving','Public Service Ethics','Meeting Procedures','Financial Basics','Leadership'],
  QUESTIONS: {
    0: [
      { q: 'What should you do first when you arrive at the office?', o: ['Check your tasks and greet colleagues', 'Browse social media', 'Wait outside', 'Leave your bag and go out'], a: 0 },
      { q: 'A visitor asks for the Office Head, who is away. You should:', o: ['Say nothing', 'Politely explain and offer to take a message', 'Tell them to leave', 'Ignore them'], a: 1 },
      { q: 'The best way to keep your desk is:', o: ['Piled with papers', 'Clean and organized', 'Full of snacks', 'Covered with personal items'], a: 1 },
      { q: 'If you do not understand a task, you should:', o: ['Guess', 'Skip it', 'Ask your supervisor to clarify', 'Ask a stranger'], a: 2 },
      { q: 'Proper office attire for SPES beneficiaries is:', o: ['Beachwear', 'Neat and appropriate clothes', 'Pajamas', 'A costume'], a: 1 },
      { q: 'Office phones should be answered:', o: ['Politely, with a greeting', 'After 10 rings', 'Only if you like the caller', 'Never'], a: 0 },
      { q: 'Printing personal files on office printers is:', o: ['Always fine', 'Not allowed without permission', 'Encouraged', 'Required'], a: 1 },
      { q: 'Before leaving at the end of the day you should:', o: ['Leave the computer and lights on', 'Tidy up, save work, and log out', 'Hide your work', 'Take office supplies home'], a: 1 },
      { q: 'A coworker is busy and you need help. You should:', o: ['Shout', 'Wait for a good moment and ask politely', 'Take their things', 'Complain'], a: 1 },
      { q: 'Being punctual shows:', o: ['Responsibility', 'Nothing', 'Boredom', 'Laziness'], a: 0 }
    ],
    1: [
      { q: 'Before filing a document you should:', o: ['Throw it away', 'Check it is complete and labeled', 'Fold it small', 'Leave it unsigned'], a: 1 },
      { q: 'A confidential document should be:', o: ['Left on a desk', 'Stored securely', 'Posted publicly', 'Shared on social media'], a: 1 },
      { q: 'Photocopying is used to:', o: ['Delete files', 'Make duplicates', 'Send email', 'Sign documents'], a: 1 },
      { q: 'An incoming letter should be:', o: ['Logged with the date received', 'Hidden', 'Burned', 'Ignored'], a: 0 },
      { q: 'A memo is mainly used for:', o: ['Internal communication', 'Advertising', 'Entertainment', 'Social invites only'], a: 0 },
      { q: 'If a document has an error, you should:', o: ['Correct it properly or tell your supervisor', 'Pretend nothing is wrong', 'Tear it up', 'Hide it'], a: 0 },
      { q: 'Documents are best arranged:', o: ['Randomly', 'In a consistent order (date or alphabet)', 'By paper color only', 'By weight'], a: 1 },
      { q: 'Scanning a document creates:', o: ['A digital copy', 'A shredded copy', 'A new law', 'A signature'], a: 0 },
      { q: 'Shredding is for documents that are:', o: ['Sensitive and no longer needed', 'Brand new', 'Still in use', 'Unread'], a: 0 },
      { q: 'Documents should be handled with:', o: ['Care and accuracy', 'Speed only', 'Humor', 'Carelessness'], a: 0 }
    ]
  },
  progress() { return SPES.DB.get('progress', {}); },
  userProgress(id) { return this.progress()[id] || {}; },
  isOpen(i) { return (this.QUESTIONS[i] || []).length === 10; },
  pts() { return SPES.DB.get('points', {}); },
  total(id) { return Math.max(0, this.pts()[id] || 0); },
  award(id, d) { const p = this.pts(); p[id] = Math.max(0, (p[id] || 0) + d); SPES.DB.set('points', p); },
  setTotal(id, total) { const p = this.pts(); p[id] = Math.max(0, total || 0); SPES.DB.set('points', p); },
  room(id, room) { return this.userProgress(id)[room] || { got: [], done: false, correct: 0, wrong: 0 }; },
  save(id, room, r) { const p = this.progress(); p[id] = p[id] || {}; p[id][room] = r; SPES.DB.set('progress', p); },
  // Optimistic local update + server persistence
  add(id, room, key, ok) {
    const r = this.room(id, room);
    if (r.done || (key !== null && r.got.includes(key))) return 0;
    const copy = { got: [...r.got], done: r.done, correct: r.correct, wrong: r.wrong };
    if (key !== null && ok) copy.got.push(key);
    ok ? copy.correct++ : copy.wrong++;
    const d = ok ? this.CORRECT : this.WRONG;
    this.award(id, d);
    if (copy.got.length >= 10) copy.done = true;
    this.save(id, room, copy);
    SPES.API.post('/api/games/answer', { room, key, ok }).then(res => {
      if (res.ok && res.data) {
        this.setTotal(id, res.data.total);
        if (res.data.progress) this.save(id, room, res.data.progress);
      }
    });
    return d;
  },
  completed(id) { return Object.values(this.userProgress(id)).filter(r => r.done).length; },
  hasCertificate(id) { return this.completed(id) === this.TITLES.length; },
  leaderboard(batch) {
    return SPES.UserModel.all().filter(u => u.role === 'beneficiary' && u.batch === batch && u.status !== 'pending')
      .map(u => ({
        name: u.name,
        points: this.total(u.id),
        journalPoints: SPES.JournalModel && SPES.JournalModel.pointsForUser ? SPES.JournalModel.pointsForUser(u.id) : 0,
        rooms: this.completed(u.id)
      })).sort((a, b) => b.points - a.points);
  }
};

// Answer key status (verified on the server via /api/answerkey)
SPES.KeyModel = {
  has() { return !!SPES.DB.get('answerKeyHas', false); },
  locked() { return 0; }
};
