SPES.I18n = {
  lang: 'en',
  LANGS: { en: 'English', fil: 'Filipino', ceb: 'Bisaya (Cebuano)' },
  D: {
    en: { dashboard: 'Dashboard', attendance: 'Attendance', journal: 'Daily Journal', calendar: 'Calendar', games: 'Learning Games', board: 'Leaderboard', badges: 'Badges', notifs: 'Notifications', profile: 'Profile', settings: 'Settings', approvals: 'Approvals', review: 'Attendance review', journals: 'Journals', admin: 'Batches & users', answers: 'Game answers', announce: 'Announcements', feedback: 'Feedback', welcome: 'Welcome back', logout: 'Log out' },
    fil: { dashboard: 'Dashboard', attendance: 'Pagpasok', journal: 'Pang-araw-araw na Journal', calendar: 'Kalendaryo', games: 'Mga Laro', board: 'Leaderboard', badges: 'Mga Badge', notifs: 'Mga Abiso', profile: 'Profile', settings: 'Mga Setting', approvals: 'Mga Pag-apruba', review: 'Pagsusuri ng Attendance', journals: 'Mga Journal', admin: 'Mga Batch at User', answers: 'Mga Sagot sa Laro', announce: 'Mga Anunsyo', feedback: 'Puna', welcome: 'Maligayang pagbabalik', logout: 'Mag-log out' },
    ceb: { dashboard: 'Dashboard', attendance: 'Attendance', journal: 'Adlaw-adlaw nga Journal', calendar: 'Kalendaryo', games: 'Mga Dula', board: 'Leaderboard', badges: 'Mga Badge', notifs: 'Mga Pahibalo', profile: 'Profile', settings: 'Mga Setting', approvals: 'Mga Aprobar', review: 'Review sa Attendance', journals: 'Mga Journal', admin: 'Mga Batch ug User', answers: 'Mga Tubag sa Dula', announce: 'Mga Anunsyo', feedback: 'Feedback', welcome: 'Maayong pagbalik', logout: 'Log out' }
  },
  t(k) { return (this.D[this.lang] || {})[k] || this.D.en[k] || k; }
};
