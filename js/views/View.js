// Views only build HTML strings. They never read or write data themselves.
SPES.View = {
  esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  when(iso) { return new Date(iso).toLocaleString(); },
  mount(html) { document.getElementById('app').innerHTML = html; },
  GOOGLE_G: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h5.9a5 5 0 01-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.1-4.5H2.3v2.8A11 11 0 0012 23z"/><path fill="#FBBC05" d="M5.9 14.1a6.6 6.6 0 010-4.2V7.1H2.3a11 11 0 000 9.8l3.6-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.3 1.7l3.2-3.2A11 11 0 002.3 7.1l3.6 2.8C6.700 7.300 9.100 5.400 12 5.400z"/></svg>',
  // Animated login background: drifting grid + rising yellow and white sparks (pure CSS)
  bgfx() { return '<div class="bg-fx" aria-hidden="true">' + Array.from({ length: 16 }, (_, i) => `<i style="--x:${(i * 37 + 8) % 96};--s:${5 + (i * 7) % 11}px;--d:${9 + (i * 5) % 10}s;--l:-${(i * 1.7).toFixed(1)}s"></i>`).join('') + '</div>'; },
  msg(m) { return m ? `<div class="msg ${m.ok ? 'ok' : m.info ? 'info' : ''}" role="alert">${this.esc(m.text)}</div>` : ''; },

  ICONS: { back: 'M15 18l-6-6 6-6', calendar: 'M7 3v4M17 3v4M4 8h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z', badges: 'M12 15a6 6 0 100-12 6 6 0 000 12zM8.5 14L7 22l5-3 5 3-1.5-8', dashboard: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z', attendance: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z', journal: 'M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4zM8 9h8M8 13h6', games: 'M7 7h10a4 4 0 014 4v2a4 4 0 01-4 4H7a4 4 0 01-4-4v-2a4 4 0 014-4zM8 10v4M6 12h4M15 11h.01M18 13h.01', board: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3', review: 'M5 12l5 5 9-10', admin: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z' },
  icon(k) { return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${this.ICONS[k] || this.ICONS.journal}"/></svg>`; },
  back(act, label, t) { return `<button type="button" class="back" data-act="${act}" ${t ? `data-t="${t}" data-m="${t}"` : ''}>${this.icon('back')}${label}</button>`; },

  sexPicker(val = '') {
    const cls = val === 'Male' ? 'is-m' : val === 'Female' ? 'is-f' : '';
    return `<span class="field-lbl">Gender</span>
      <div class="gdd" data-gdd>
        <input type="hidden" name="gender" value="${val}">
        <button type="button" class="gdd-btn ${cls}" data-gdd-toggle aria-expanded="false">
          <span class="gdd-txt">${val || 'Select gender'}</span>
          <svg class="ic gdd-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="gdd-menu" role="listbox">
          <button type="button" class="gdd-opt is-m ${val === 'Male' ? 'on' : ''}" data-gdd-pick="Male">Male</button>
          <button type="button" class="gdd-opt is-f ${val === 'Female' ? 'on' : ''}" data-gdd-pick="Female">Female</button>
        </div>
      </div>`;
  },

  lamp(on) {
    return `<div class="lamp-beam" aria-hidden="true"></div>
      <button type="button" class="lamp-rig" data-act="lamp" aria-pressed="${!!on}" title="${on ? 'Pull cord to turn lamp OFF (Dark mode)' : 'Pull cord to turn lamp ON (Light mode)'}">
        <span class="lamp-wire"></span>
        <span class="lamp-cap"></span>
        <span class="lamp-shade"></span>
        <span class="lamp-bulb"></span>
        <span class="lamp-cord"><i></i><b></b></span>
        <span class="lamp-hint">${on ? 'Lamp ON · Light' : 'Pull lamp · Dark'}</span>
      </button>`;
  },

  auth(mode, m, as, gData, gReset, lampOn, unverifiedEmail) {
    if (mode === 'forgot') return this.forgot(m, gReset, lampOn);
    if (mode === 'google_setup') return this.googleSetup(gData || {}, m, lampOn);
    const reg = mode === 'register', adm = as === 'admin';
    return `<div class="auth ${lampOn ? 'lamp-on' : ''}">${this.bgfx()}${this.lamp(lampOn)}<section class="hero"><img src="img/logo.png" alt="SPES logo" style="width:120px;margin-bottom:1rem"><b>SPES<i>Hub</i></b><p>${adm ? 'Review attendance proofs, manage batches and keep track of every SPES beneficiary.' : 'Attendance, work journals and learning games for SPES beneficiaries of the Davao Oriental Provincial Capitol.'}</p></section>
      <form class="panel" data-form="${mode}" ${reg ? 'novalidate' : ''}>
        ${reg ? this.back('mode', 'Back to log in', 'login') : ''}
        <h2>${reg ? 'Create your account' : adm ? 'Staff sign in' : 'Welcome back'}</h2>
        ${reg ? '' : `<span class="portal-tag">${adm ? 'Administrator and Office Head' : 'Beneficiary login'}</span>`}
        ${this.msg(m)}
        ${!reg && !adm && unverifiedEmail ? `<button type="button" class="btn alt" style="width:100%;margin:.2rem 0 .8rem" data-act="resend_verify" data-email="${this.esc(unverifiedEmail)}">Resend verification email</button>` : ''}
        ${reg ? `<label>Full name</label><input name="name" required><small class="ferr" data-ferr="name"></small>${this.sexPicker()}<small class="ferr" data-ferr="gender"></small><label>Email address</label><input name="email" type="email" required autocomplete="email" placeholder="you@gmail.com"><small class="ferr" data-ferr="email"></small>` : ''}
        <label>${reg || adm ? 'Username' : 'Username or Email'}</label><input name="username" required autocomplete="username">${reg ? '<small class="ferr" data-ferr="username"></small>' : ''}
        <label>Password</label><input name="password" type="password" required autocomplete="${reg ? 'new-password' : 'current-password'}">${reg ? '<small class="ferr" data-ferr="password"></small>' : ''}
        ${reg ? '<label>Batch code</label><input name="batch" required placeholder="e.g. B1-2026"><small class="ferr" data-ferr="batch"></small><small class="muted">We will send a verification link to your email after registration.</small>' : ''}
        <div class="form-err" data-form-err hidden role="alert"></div>
        ${reg || adm ? '' : '<p style="margin:.6rem 0 0;text-align:right"><button type="button" class="link" data-act="mode" data-m="forgot">Forgot password?</button></p>'}<button class="btn" type="submit" style="width:100%">${reg ? 'Create account' : 'Log in as ' + (adm ? 'Admin' : 'User')}</button>
        ${adm ? '' : `<div class="or"><span>or</span></div><button type="button" class="gbtn" data-act="google">${this.GOOGLE_G}${reg ? 'Sign up with Google' : 'Continue with Google'}</button>`}
        ${reg || adm ? '' : '<p class="muted">New beneficiary? <button type="button" class="link" data-act="mode" data-m="register">Register</button></p>'}
      </form></div>`;
  },

  shell(user, tabs, tab, body) {
    return `<div class="layout"><aside class="side"><div class="brand"><img src="img/logo.png" alt="SPES logo"><span>SPES<i>Hub</i></span><small>Learn · Earn · Grow</small></div>
      <nav>${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-act="tab" data-t="${k}">${this.icon(k)}${l}</button>`).join('')}</nav>
      <div class="me">${this.esc(user.name)}<br><button class="link" style="color:var(--y)" data-act="askout">Log out</button></div></aside>
      <main class="content">${body}</main></div>`;
  },

  dashboard(name, stats, links, badges) {
    return `${this.banner(name, 'Here is your overview for today.')}
      <div class="stats">${stats.map((s, i) => `<div class="stat ${i === 0 ? 'hl' : ''}"><span>${s[0]}</span><b>${s[1]}</b></div>`).join('')}</div>
      <div class="row">${links.map(([t, l]) => `<button class="btn" data-act="tab" data-t="${t}">${l}</button>`).join('')}</div>
      ${badges && badges.length ? `<h3 style="margin-top:1.5rem">Your badges</h3><div class="row">${badges.map(b => `<span class="tag gold">${b}</span>`).join('')}</div>` : ''}`;
  },

  forgot(m, gReset, lampOn) {
    if (gReset) {
      return `<div class="auth ${lampOn ? 'lamp-on' : ''}">${this.bgfx()}${this.lamp(lampOn)}<section class="hero"><img src="img/logo.png" alt="SPES logo" style="width:120px;margin-bottom:1rem"><b>SPES<i>Hub</i></b><p>Your account is verified. You can now create a new password.</p></section>
        <form class="panel" data-form="google_reset">${this.back('mode', 'Back to log in', 'login')}<h2>Create new password</h2>
          <span class="portal-tag">Verified: ${this.esc(gReset.email || gReset.username)}</span>
          ${this.msg(m)}
          <label>New password</label><input name="password" type="password" required minlength="6" autocomplete="new-password">
          <label>Confirm new password</label><input name="password2" type="password" required minlength="6" autocomplete="new-password">
          <button class="btn" type="submit" style="width:100%">Save new password</button></form></div>`;
    }
    return `<div class="auth ${lampOn ? 'lamp-on' : ''}">${this.bgfx()}${this.lamp(lampOn)}<section class="hero"><img src="img/logo.png" alt="SPES logo" style="width:120px;margin-bottom:1rem"><b>SPES<i>Hub</i></b><p>Authenticate via your registered email or Google account before creating a new password.</p></section>
      <form class="panel" data-form="forgot_email">${this.back('mode', 'Back to log in', 'login')}<h2>Forgot password</h2>${this.msg(m)}
        <p class="muted" style="margin:.2rem 0 .7rem">Enter your registered email address or username and we'll send you an authenticated reset link:</p>
        <label>Email address or Username</label><input name="identifier" required placeholder="you@gmail.com or username">
        <button class="btn" type="submit" style="width:100%">Send verification email</button>
        <div class="or"><span>or verify with Google</span></div>
        <button type="button" class="gbtn" data-act="google_reset_start">${this.GOOGLE_G}Verify with Google</button></form></div>`;
  },
  privacyConsentModal() {
    const shield = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>';
    return `<div class="modal" role="dialog" aria-modal="true"><div class="mbox privacy-box">
      <div class="mic">${shield}</div>
      <h2>Data Privacy &amp; Documentation Consent</h2>
      <p class="muted">Before completing your SPES Hub registration, please review and approve how your information is used:</p>
      <ul class="privacy-list">
        <li><b>Personal information:</b> Your full name, gender, SPES ID, batch code, username, and profile photo will be stored and visible to authorized SPES Administrators and Office Heads.</li>
        <li><b>Personal documentation:</b> Your daily attendance proof photos, daily work journals, and supporting documentation photos will be reviewed by SPES staff for program verification.</li>
        <li><b>Data protection:</b> Your records are used strictly for the SPES program of the Davao Oriental Provincial Capitol and are never sold or shared with outsiders.</li>
      </ul>
      <label class="privacy-chk"><input type="checkbox" id="privacyAgreeChk"><span>I understand and approve that SPES Hub Administrators and Office Heads may view my personal information and personal documentation.</span></label>
      <div class="row" style="justify-content:center;margin-top:.8rem">
        <button type="button" class="btn alt" data-act="privacy_cancel">Cancel</button>
        <button type="button" class="btn" id="privacyAgreeBtn" data-act="privacy_agree" disabled>I Agree &amp; Continue</button>
      </div>
    </div></div>`;
  },
  googleSetup(g, m, lampOn) {
    return `<div class="auth ${lampOn ? 'lamp-on' : ''}">${this.bgfx()}${this.lamp(lampOn)}<section class="hero"><img src="img/logo.png" alt="SPES logo" style="width:120px;margin-bottom:1rem"><b>SPES<i>Hub</i></b><p>Finish setting up your SPES beneficiary profile so the administrator can approve your account.</p></section>
      <form class="panel" data-form="google_complete" novalidate>${this.back('mode', 'Back to log in', 'login')}<h2>Complete your profile</h2>
        <span class="portal-tag">Google: ${this.esc(g.email || '')}</span>
        ${this.msg(m)}
        <label>Full name</label><input name="name" required value="${this.esc(g.suggestedName || '')}"><small class="ferr" data-ferr="name"></small>
        <label>Username</label><input name="username" required value="${this.esc(g.suggestedUsername || '')}" pattern="[A-Za-z0-9_.]{3,30}"><small class="ferr" data-ferr="username"></small>
        ${this.sexPicker()}<small class="ferr" data-ferr="gender"></small>
        <label>Batch code</label><input name="batch" required placeholder="e.g. SPES-2026-DEMO"><small class="ferr" data-ferr="batch"></small>
        <small class="muted">Your SPES ID will be generated after registration.</small>
        <div class="form-err" data-form-err hidden role="alert"></div>
        <button class="btn" type="submit" style="width:100%">Finish registration</button></form></div>`;
  },
  logoutModal() {
    return `<div class="modal" role="dialog" aria-modal="true"><div class="mbox"><h2>Log out?</h2><p class="muted">You will need to sign in again to continue.</p>
      <div class="row" style="justify-content:center"><button class="btn alt" data-act="cancelout">Stay</button><button class="btn" data-act="logout">Yes, log out</button></div></div></div>`;
  },
  banner(name, blurb) {
    return `<section class="banner"><div><h1>${SPES.I18n.t('welcome')}, ${this.esc(name)}!</h1><p>${blurb || '<strong>What is SPES?</strong> The Special Program for Employment of Students gives qualified students temporary work and hands-on experience in government offices while they continue their education.'}</p><p class="quote">“Small steps lead to big achievements.”</p></div></section>`;
  },
  badges(list, sm) {
    return `<div class="badges ${sm ? 'sm' : ''}">${list.map(b => `<div class="bd ${b.got ? '' : 'off'}"><span>${this.icon(b.ic)}</span>${b.name}</div>`).join('')}</div>`;
  },
  dayPicker(days, sel, act) {
    return `<div class="days">${days.map(d => `<button class="day ${d.state} ${d.makeup ? 'mk' : ''} ${d.n === sel ? 'sel' : ''} ${d.today ? 'today' : ''} ${d.future ? 'lock' : ''}" data-act="${act}" data-n="${d.n}" ${d.future ? 'disabled' : ''}><b>${d.n}</b><span>${d.makeup && d.label === 'Not submitted' ? 'Make-up' : d.label}</span></button>`).join('')}</div>`;
  },

  userDash(d) {
    const A = d.att;
    return `${this.banner(d.name)}
      <div class="stats">${d.stats.map((s, i) => `<div class="stat ${i === 0 ? 'hl' : ''}"><span>${s[0]}</span><b>${s[1]}</b></div>`).join('')}</div>
      <div class="dgrid">
        <section class="card"><div class="ch"><h3>Attendance summary</h3><button class="link" data-act="tab" data-t="attendance">View details</button></div>
          <div class="row"><div class="donut" style="--p:${A.pct}"><b>${A.pct}%</b><small>Approved</small></div>
          <ul class="legend"><li><i style="background:var(--k)"></i>Approved <b>${A.ok}</b></li><li><i style="background:var(--y)"></i>Pending <b>${A.pend}</b></li><li><i style="background:var(--bad)"></i>Rejected <b>${A.rej}</b></li></ul></div></section>
        <section class="card promo"><h3>Your learning journey</h3><p>Explore 20 game rooms and earn more points.</p>
          <div class="rooms">${d.rooms.map(r => `<button class="rm ${r.cls}" ${r.open ? `data-act="open" data-room="${r.i}"` : 'disabled'} title="${this.esc(r.t)}">${r.i + 1}</button>`).join('')}</div>
          <button class="btn" data-act="tab" data-t="games">Play now</button></section>
        <section class="card"><div class="ch"><h3>Achievements & badges</h3><button class="link" data-act="tab" data-t="badges">View all</button></div>${this.badges(d.badges, 1)}</section>
        <section class="card"><div class="ch"><h3>Recent activities</h3></div>${d.recent.map(r => `<div class="act"><span>${this.esc(r[0])}</span><small>${r[1]}</small></div>`).join('') || '<p class="muted">No activity yet.</p>'}</section>
        <section class="card"><div class="ch"><h3>Batch leaderboard</h3><button class="link" data-act="tab" data-t="board">View all</button></div>${d.board.map((r, i) => `<div class="act ${r.me ? 'me2' : ''}"><span>${i + 1}. ${this.esc(r.name)}</span><b>${r.points} pts</b></div>`).join('') || '<p class="muted">No scores yet.</p>'}</section>
        <section class="card"><div class="ch"><h3>Upcoming events</h3><button class="link" data-act="tab" data-t="calendar">Calendar</button></div>${d.events.map(e => `<div class="act"><span>${this.esc(e.title)}</span><small>${e.date}</small></div>`).join('') || '<p class="muted">No upcoming events.</p>'}</section>
        <section class="card track" style="grid-column:1/-1"><h3>${d.done === 20 ? 'All rooms complete!' : "You're on track!"}</h3><p>Complete all 20 game rooms to earn your certificate.</p><div class="bar"><i style="width:${d.done * 5}%"></i></div><small>${d.done} / 20 rooms</small></section>
      </div>`;
  },

  attendance(slots, days, sel, recs, canSubmit, m) {
    const d = days[sel - 1], st = recs.length ? 'Present' : d.today ? 'Pending' : d.future ? 'Locked' : 'Absent';
    return `<h1>Attendance</h1><p class="muted">Choose a work day. Attendance closes at 12:00 midnight, so photos can only be submitted during the current day.</p>${this.dayPicker(days, sel, 'attday')}${this.msg(m)}
      <div class="row"><h2 style="margin:0">Day ${sel}</h2><span class="tag ${recs.length ? 'ok' : ''}">${st}</span></div>
      <div class="grid" style="margin-top:1rem">${Object.entries(slots).map(([k, s]) => {
        const r = recs.find(a => a.slot === k);
        return `<div class="card tile"><h3>${s.label}</h3><p class="muted">${s.rule}</p>` + (r
          ? `<span class="tag ok">Present</span> <span class="tag ${r.onTime ? '' : 'bad'}">${r.onTime ? 'On schedule' : 'Outside schedule'}</span> ${r.status === 'pending' ? '' : `<span class="tag">${r.status}</span>`}
             <p class="muted">Time stamp: ${this.when(r.submittedAt)}</p><img class="thumb" src="${r.photo}" alt="${s.label} photo">`
          : canSubmit ? `<form data-form="attend" data-slot="${k}"><input type="file" name="photo" class="pick" accept="image/*" capture="environment" required><div class="pv"></div>
              <div class="row"><button class="btn">Submit</button><button type="reset" class="btn alt">Cancel</button></div></form>`
          : `<span class="tag">${d.future ? 'Locked' : 'Absent'}</span>`) + '</div>';
      }).join('')}</div>`;
  },

  pics(list, lock) {
    return list.map((p, k) => `<div class="pic"><img src="${p}" alt="Journal photo">${lock ? '' : `<button type="button" class="x" data-act="rmpic" data-k="${k}" aria-label="Remove image">✕</button>`}</div>`).join('') + `<span class="muted">${list.length} / 5 images</span>`;
  },
  journal(days, sel, entry, events, pics, m) {
    const d = days[sel - 1], st = entry ? entry.status : 'none', lock = st === 'submitted';
    return `<h1>Daily journal</h1><p class="muted">Every day is open, so you can write or edit any journal anytime. Save a draft, submit it, or unsubmit to edit again.</p>${this.dayPicker(days, sel, 'jday')}${this.msg(m)}
      <form class="card" data-form="journal" data-day="${sel}">
        <div class="row"><h2 style="margin:0">Day ${sel}</h2><span class="tag ${lock ? 'ok' : st === 'draft' ? 'gold' : ''}">${st === 'none' ? 'Not started' : st}</span></div>
        ${events.length ? `<p>${events.map(e => `<span class="tag gold">${this.esc(e.type)}: ${this.esc(e.title)}</span>`).join(' ')}</p>` : ''}
        <label>Special event / activity</label><input name="event" value="${this.esc(entry ? entry.event || '' : (events[0] ? events[0].title : ''))}" ${lock ? 'disabled' : ''} placeholder="e.g. Orientation, filing documents">
        <label>What did you do today?</label><textarea name="text" rows="6" ${lock ? 'disabled' : ''} placeholder="Describe your tasks in full...">${this.esc(entry ? entry.text || '' : '')}</textarea>
        <label>Supporting pictures (maximum 5)</label><div class="picgrid" id="jpics">${this.pics(pics, lock)}</div>
        ${lock ? '' : '<input type="file" class="jpick" accept="image/*" multiple>'}
        <div class="row">${lock ? `<button type="button" class="btn alt" data-act="unsubmit" data-day="${sel}">Unsubmit to edit</button>`
          : '<button class="btn alt" name="do" value="draft">Save draft</button><button class="btn" name="do" value="submitted">Submit</button>'}</div>
      </form>`;
  },
  entries(list, names, isAdmin = false) {
    if (!list.length) return '<p class="muted">No submitted journals yet.</p>';
    return list.map(j => {
      const pts = Number(j.pointsAwarded) || 0;
      const choices = [20, 40, 60, 80, 100];
      const awardBar = isAdmin
        ? `<div class="row" style="margin-top:.75rem;justify-content:space-between;border-top:1px solid var(--line);padding-top:.65rem;gap:.5rem">
            <span class="tag ${pts > 0 ? 'ok' : ''}">${pts > 0 ? `★ +${pts} Journal Points (Admin only)` : 'Not scored yet (Admin only)'}</span>
            <div class="row" style="gap:.35rem">
              ${choices.map(p => `<button type="button" class="btn ${pts === p ? '' : 'alt'}" style="margin:0;padding:.38rem .75rem;font-size:.85rem" data-act="awardjournal" data-uid="${j.userId}" data-day="${j.day}" data-pts="${p}">+${p}</button>`).join('')}
              ${pts > 0 ? `<button type="button" class="btn bad" style="margin:0;padding:.38rem .7rem;font-size:.82rem" data-act="awardjournal" data-uid="${j.userId}" data-day="${j.day}" data-pts="0">Clear</button>` : ''}
            </div>
          </div>`
        : '';
      return `<div class="card"><strong>Day ${j.day} · ${j.date}</strong> ${names ? '· ' + this.esc(names[j.userId] || '') : ''} ${j.event ? `<span class="tag gold">${this.esc(j.event)}</span>` : ''}
        <p>${this.esc(j.text).replace(/\n/g, '<br>')}</p>
        <div class="grid">${j.photos.map(p => `<img class="thumb" src="${p}" alt="Journal photo">`).join('')}</div>${awardBar}</div>`;
    }).join('');
  },

  calendar(y, mo, events, marks, admin, m) {
    const pad = n => String(n).padStart(2, '0'), pre = `${y}-${pad(mo + 1)}-`, first = new Date(y, mo, 1).getDay(), n = new Date(y, mo + 1, 0).getDate(), today = SPES.AttendanceModel.day();
    let cells = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="dow">${d}</div>`).join('') + '<div class="cd off"></div>'.repeat(first);
    for (let i = 1; i <= n; i++) {
      const ds = pre + pad(i);
      cells += `<div class="cd ${ds === today ? 'now' : ''}"><b>${i}</b>${marks[ds] ? '<span class="pres">Present</span>' : ''}${events.filter(e => e.date === ds).map(e => `<i class="ev" title="${this.esc(e.title)}">${this.esc(e.title)}</i>`).join('')}</div>`;
    }
    return `<h1>Calendar</h1>${this.msg(m)}
      <div class="row" style="justify-content:space-between;margin-bottom:.8rem"><button class="back" style="margin:0" data-act="calnav" data-d="-1">${this.icon('back')}Prev</button>
        <h2 style="margin:0">${new Date(y, mo).toLocaleString('en', { month: 'long', year: 'numeric' })}</h2>
        <button class="back nx" style="margin:0" data-act="calnav" data-d="1">Next${this.icon('back')}</button></div>
      <div class="cal">${cells}</div>
      ${admin ? `<form class="card row" data-form="event" style="margin-top:1rem"><div><label>Title</label><input name="title" required></div><div><label>Date</label><input name="date" type="date" required></div>
        <div><label>Type</label><select name="type"><option>Special event</option><option>Activity</option></select></div><button class="btn">Add to calendar</button></form>` : ''}
      <h3 style="margin-top:1rem">Events this month</h3>
      ${events.map(e => `<div class="card row"><span class="tag gold">${e.type}</span><strong>${this.esc(e.title)}</strong><span class="muted">${e.date}</span>${admin ? `<button class="link" style="margin-left:auto" data-act="delevent" data-id="${e.id}">Remove</button>` : ''}</div>`).join('') || '<p class="muted">No events this month.</p>'}`;
  },

  games(titles, isOpen, progress, total, badges, cert) {
    const done = Object.keys(progress).length;
    return `<div class="card row"><div><div class="score">${total}</div><span class="muted">total points · ${done} of ${titles.length} rooms done</span></div>
        <div style="margin-left:auto">${badges.map(b => `<span class="tag gold">${b}</span>`).join(' ') || '<span class="muted">No badges yet</span>'}</div>
        ${cert ? '<button class="btn" data-act="cert">View certificate</button>' : ''}</div>
      <p class="muted">Each correct answer gives +20 points; each wrong answer deducts 1. Only your first attempt in a room counts.</p>
      <div class="grid">${titles.map((t, i) => {
        const p = progress[i];
        return `<div class="card room ${isOpen(i) ? '' : 'locked'}"><h3>Room ${i + 1}</h3><p>${t}</p>` +
          (p ? `<span class="tag ok">Done: ${p.score} pts</span> <button class="link" data-act="open" data-room="${i}">Replay</button>`
             : isOpen(i) ? `<button class="btn" data-act="open" data-room="${i}">Play</button>` : '<span class="tag">Coming soon</span>') + '</div>';
      }).join('')}</div>`;
  },

  question(room, title, i, q, fb) {
    return `${this.back('quit', 'Rooms')}<div class="card"><p class="muted">Room ${room + 1}: ${title} · Question ${i + 1} of 10</p><h2>${this.esc(q.q)}</h2>
      ${q.o.map((o, k) => {
        const cls = fb ? (k === q.a ? 'right' : k === fb.pick ? 'wrong' : '') : '';
        return `<button class="opt ${cls}" ${fb ? 'disabled' : ''} data-act="answer" data-i="${k}">${this.esc(o)}</button>`;
      }).join('')}
      ${fb ? `<p><strong>${fb.pick === q.a ? '+20 points' : '-1 point'}</strong></p><button class="btn" data-act="next">${i === 9 ? 'Finish room' : 'Next question'}</button>` : ''}</div>`;
  },

  result(res, title) {
    return `${this.back('tab', 'Rooms', 'games')}<div class="card"><h2>${title} finished</h2><div class="score">${res.score} pts</div><p>${res.correct} of 10 correct.
      ${res.first ? '' : 'This was a replay, so your total did not change.'}</p><button class="btn" data-act="tab" data-t="games">Back to rooms</button></div>`;
  },

  certificate(name) {
    return `<div class="noprint">${this.back('tab', 'Games', 'games')}</div><div class="cert"><h1>Certificate of Completion</h1><p>This certifies that</p><h2>${this.esc(name)}</h2>
      <p>completed all 20 SPES Hub learning rooms.</p><p class="muted">Davao Oriental Provincial Capitol · ${new Date().toLocaleDateString()}</p></div>
      <p class="noprint"><button class="btn" onclick="window.print()">Print</button> <button class="btn alt" data-act="tab" data-t="games">Back</button></p>`;
  },

  leaderboard(rows, batches, current, canPick, me, showJournal = false) {
    const scoreOf = r => showJournal ? (r.points + (r.journalPoints || 0)) : r.points;
    const sorted = rows.slice().sort((a, b) => scoreOf(b) - scoreOf(a));
    const top = [sorted[1], sorted[0], sorted[2]], cls = ['p2', 'p1', 'p3'], medal = ['🥈', '🥇', '🥉'], rank = [2, 1, 3];
    return `<h1>Leaderboard</h1>
      ${canPick ? `<label>Batch</label><select data-act="board">${batches.map(b => `<option value="${b.code}" ${b.code === current ? 'selected' : ''}>${this.esc(b.name)} (${b.code})</option>`).join('')}</select>` : `<p class="muted">Batch ${current}</p>`}
      ${showJournal ? '<p class="muted">Office Head view: shows <b>Game Points</b> and <b>Journal Points</b> separately (Admin &amp; beneficiaries see Game Points only).</p>' : ''}
      <div class="podium">${top.map((r, i) => r ? `<div class="pod ${cls[i]}"><span class="md">${medal[i]}</span><b>${this.esc(r.name)}</b><small>${scoreOf(r)} pts${showJournal ? ` (${r.points}G + ${r.journalPoints || 0}J)` : ''}</small><div class="blk">${rank[i]}</div></div>` : '<div class="pod"></div>').join('')}</div>
      ${showJournal ? `<div class="card"><div class="tablewrap"><table class="stack"><tr><th>Rank</th><th>Beneficiary</th><th>Rooms</th><th>Game Points</th><th>Journal Points</th><th>Combined Total</th></tr>${sorted.map((r, i) => `<tr><td data-label="Rank">#${i + 1}</td><td data-label="Beneficiary"><b>${this.esc(r.name)}</b></td><td data-label="Rooms">${r.rooms}/20</td><td data-label="Game Points">${r.points} pts</td><td data-label="Journal Points"><span class="tag ${(r.journalPoints || 0) > 0 ? 'gold' : ''}">${r.journalPoints || 0} pts</span></td><td data-label="Combined Total"><b>${scoreOf(r)} pts</b></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No beneficiaries yet.</td></tr>'}</table></div></div>`
      : `<div class="card">${sorted.slice(3).map((r, i) => `<div class="act ${r.name === me ? 'me2' : ''}"><span>${i + 4}. ${this.esc(r.name)}</span><span>${r.rooms}/20 rooms · <b>${r.points} pts</b></span></div>`).join('') || '<p class="muted">Other beneficiaries will appear here.</p>'}</div>`}`;
  },

  review(rows, m, excuses = []) {
    const excHtml = `<div class="card"><h3>Excuse requests (${excuses.filter(e => e.status === 'pending').length} pending)</h3>
      <p class="muted">Approving an excuse marks the day Excused and can grant <b>+1 make-up workday</b> so the beneficiary can still complete 20 paid days.</p>
      <div class="tablewrap"><table class="stack">
        <tr><th>Beneficiary</th><th>Date &amp; Category</th><th>Reason &amp; Proof</th><th>Status / Action</th></tr>
        ${excuses.map(ex => `<tr>
          <td data-label="Beneficiary"><b>${this.esc(ex.name)}</b></td>
          <td data-label="Date &amp; Category">${this.esc(ex.date)}<br><span class="tag">${this.esc(ex.category)}</span></td>
          <td data-label="Reason &amp; Proof">${this.esc(ex.reason)}${ex.photo ? `<br><a href="${ex.photo}" target="_blank" rel="noopener"><img src="${ex.photo}" alt="Excuse proof" width="70" style="margin-top:.35rem;border-radius:8px"></a>` : ''}</td>
          <td data-label="Status">${ex.status === 'pending'
            ? `<label class="mk-chk"><input type="checkbox" id="mk_${ex.id}" checked> Grant +1 make-up day</label>
               <div class="row" style="margin-top:.35rem"><button class="btn" style="margin:0" data-act="reviewexcuse" data-id="${ex.id}" data-st="approved">Approve</button>
               <button class="btn bad" style="margin:0" data-act="reviewexcuse" data-id="${ex.id}" data-st="rejected">Reject</button></div>`
            : `<span class="tag ${ex.status === 'approved' ? 'exc' : 'bad'}">${ex.status === 'approved' ? (ex.makeupGranted ? 'Excused (+1 make-up)' : 'Excused') : 'Rejected'}</span>`}</td>
        </tr>`).join('') || '<tr><td colspan="4" class="muted">No excuse requests yet.</td></tr>'}
      </table></div></div>`;
    return `<h2>Attendance review</h2>${this.msg(m)}${excHtml}<div class="card"><h3>Photo proof submissions</h3><div class="tablewrap"><table class="stack">
      <tr><th>Beneficiary</th><th>Slot</th><th>Submitted</th><th>Photo</th><th>Status</th></tr>
      ${rows.map(r => `<tr><td data-label="Beneficiary">${this.esc(r.name)}</td><td data-label="Slot">${r.label}</td><td data-label="Submitted">${this.when(r.submittedAt)}<br>
        <span class="tag ${r.onTime ? 'ok' : 'bad'}">${r.onTime ? 'On time' : (r.lateMinutes ? `Late ${r.lateMinutes} min (−${r.pointsDeducted || r.lateMinutes * 2} pts${r.status === 'pending' ? ' on approve' : ''})` : 'Late')}</span></td>
        <td data-label="Photo">${r.photo ? `<a href="${r.photo}" target="_blank" rel="noopener"><img src="${r.photo}" alt="" width="70"></a>` : '<span class="muted">Marked present, no photo yet</span>'}</td>
        <td data-label="Status">${r.status === 'pending'
          ? `<button class="btn" style="margin:0" data-act="review" data-id="${r.id}" data-st="approved">Approve</button> <button class="btn bad" style="margin:0" data-act="review" data-id="${r.id}" data-st="rejected">Reject</button>`
          : `<span class="tag ${r.status === 'approved' ? 'ok' : 'bad'}">${r.status}</span>`}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No submissions yet.</td></tr>'}</table></div></div>`;
  },

  adminMember(u) { const A = SPES.AttendanceModel, G = SPES.GameModel, J = SPES.JournalModel; const at = A.forUser(u.id), approved = at.filter(x => x.status === 'approved').length, pending = at.filter(x => x.status === 'pending').length, journals = J.forUser(u.id).filter(x => x.status === 'submitted').length, pts = G.total(u.id), jpts = J.pointsForUser(u.id); return `<article class="card classroom-user" data-search="${this.esc((u.name+' '+(u.spesId||'')).toLowerCase())}"><div class="ch"><div class="mwho"><span class="avw">${this.av(u)}<i class="dot" data-presence="${u.id}"></i></span><div><b>${this.esc(u.name)}</b><div class="muted">${this.esc(u.spesId || 'SPES ID pending')} · ${this.esc(u.gender || 'Not specified')}</div><small class="muted">Day 1: ${SPES.UserModel.startDate(u)}</small><br><small class="muted" data-pres-text="${u.id}"></small>${this.noteLive(u) ? `<div class="mnote">${this.esc(this.noteLive(u).text)}</div>` : ''}</div></div><span class="tag">${u.status}</span></div><div class="stats compact"><div class="stat"><span>Approved slots</span><b>${approved}</b></div><div class="stat"><span>Journals</span><b>${journals}</b></div><div class="stat"><span>Game points</span><b>${pts}</b></div><div class="stat hl"><span>Journal pts (Admin)</span><b>${jpts}</b></div></div><details class="record-details"><summary>View attendance, journal entries and scores</summary><h4>Attendance submissions</h4>${at.length ? at.map(a => `<div class="act"><span>${A.SLOTS[a.slot]?.label || 'Attendance'} · ${a.date}</span><span class="tag ${a.status === 'approved' ? 'ok' : a.status === 'rejected' ? 'bad' : 'gold'}">${a.status}</span>${a.photo ? `<a href="${a.photo}" target="_blank" rel="noopener">View photo</a>` : ''}</div>`).join('') : '<p class="muted">No attendance records yet.</p>'}<h4>Daily journals</h4>${J.forUser(u.id).map(j => `<div class="act"><span>Day ${j.day} · ${j.date}<small>${this.esc(j.text)}</small></span><span class="tag">${j.status}${j.pointsAwarded ? ' · +' + j.pointsAwarded + ' pts' : ''}</span></div>${j.photos.map(photo => `<a href="${photo}" target="_blank" rel="noopener"><img class="thumb" src="${photo}" alt="Journal proof"></a>`).join('')}`).join('') || '<p class="muted">No journal entries yet.</p>'}<p><b>Game points: ${pts}</b> · <b>Journal points: ${jpts}</b> · <b>Combined: ${pts + jpts} pts</b> · ${G.completed(u.id)} / 20 rooms</p></details><div class="row"><button class="btn alt" data-act="tab" data-t="review">Review photos</button></div></article>`; },
  // Admin: one "room" per batch. The list shows the rooms; opening one shows its beneficiaries with a name / SPES ID search.
  onlineInner(members) {
    const on = members.filter(u => SPES.PresenceModel.online(u.id));
    return on.length ? `<p class="muted" style="margin:.2rem 0 .6rem">${on.length} of ${members.length} online</p><div class="chips">${on.map(u => `<span class="chip"><span class="avw">${this.av(u)}<i class="dot on"></i></span>${this.esc(u.name)}</span>`).join('')}</div>` : '<p class="muted" style="margin:.2rem 0 0">Nobody from this room is online right now.</p>';
  },
  admin(batches, users, m, room, o) {
    const A = SPES.AttendanceModel, ben = users.filter(u => u.role === 'beneficiary'), cur = room && batches.find(b => b.code === room);
    const pending = list => list.reduce((n, u) => n + A.forUser(u.id).filter(x => x.status === 'pending').length, 0);
    if (cur) {
      const members = ben.filter(u => u.batch === cur.code), date = (o && o.date) || A.day(), q = (o && o.q) || '', rest = A.isRestDay(date);
      const present = members.filter(u => A.dayStatus(u.id, date, false)[1] === 'full').length;
      return `${this.back('room', 'All batch rooms', '')}${this.msg(m)}<div class="roomhead"><div><h1>${this.esc(cur.name)}</h1><span class="tag gold">${this.esc(cur.code)}</span></div><div class="roomstats"><div class="stat"><span>Beneficiaries</span><b>${members.length}</b></div><div class="stat"><span>Present on ${date}</span><b>${present}</b></div><div class="stat"><span>To review</span><b>${pending(members)}</b></div></div></div>
        <label for="classSearch">Search this room by name or SPES ID</label><input id="classSearch" type="search" value="${this.esc(q)}" placeholder="Type a name or SPES ID, for example 0003" autocomplete="off">
        <p id="noMatch" class="muted" hidden>No one in this room matches your search.</p>
        <section class="card online"><h3><i class="dot on"></i> Online now</h3><div id="onlinePanel">${this.onlineInner(members)}</div></section>
        <section class="card"><div class="ch"><h3 style="margin:0">Attendance list</h3><div><label for="attDate" class="sr">Date</label><input id="attDate" type="date" value="${date}" max="${A.day()}"></div></div>
          <p class="muted">Mark a beneficiary present directly for <b>Morning (AM)</b> and/or <b>Afternoon (PM)</b> without a photo. It counts right away and notifies the beneficiary.</p>
          <div class="tablewrap"><table class="stack"><tr><th>Name</th><th>SPES ID</th><th>Status</th><th>Morning / Afternoon</th></tr>${members.map(u => { const [label0, st0] = A.dayStatus(u.id, date, date >= A.day()), manFull = A.isManual(u.id, date, 'FULL'), manAM = manFull || A.isManual(u.id, date, 'AM'), manPM = manFull || A.isManual(u.id, date, 'PM'), start = SPES.UserModel.startDate(u), before = date < start, label = before ? 'Not started' : label0, st = before ? '' : st0; return `<tr class="attrow" data-search="${this.esc((u.name + ' ' + (u.spesId || '')).toLowerCase())}"><td data-label="Name">${this.esc(u.name)}</td><td data-label="SPES ID">${this.esc(u.spesId || '-')}</td><td data-label="Status"><span class="tag ${st === 'full' ? 'ok' : st === 'exc' ? 'exc' : st === 'abs' ? 'bad' : 'gold'}">${label}</span>${manAM || manPM ? ' <small class="muted">set by admin</small>' : ''}</td><td data-label="Morning / Afternoon">${rest ? '<span class="muted">Rest day</span>' : before ? `<span class="muted">Before Day 1 (${start})</span>` : `<div class="row" style="gap:.4rem"><button class="btn ${manAM ? 'alt' : ''}" style="margin:0;padding:.4rem .75rem;font-size:.84rem" data-act="markpresent" data-id="${u.id}" data-date="${date}" data-period="AM">${manAM ? '✓ Morning' : 'Mark Morning'}</button><button class="btn ${manPM ? 'alt' : ''}" style="margin:0;padding:.4rem .75rem;font-size:.84rem" data-act="markpresent" data-id="${u.id}" data-date="${date}" data-period="PM">${manPM ? '✓ Afternoon' : 'Mark Afternoon'}</button></div>`}</td></tr>`; }).join('') || '<tr><td colspan="4" class="muted">No beneficiaries yet.</td></tr>'}</table></div></section>
        <h2>Beneficiaries</h2>
        <div class="grid roomgrid">${members.map(u => this.adminMember(u)).join('') || '<p class="muted">No beneficiaries have registered in this room yet.</p>'}</div>`;
    }
    return `<h1>Batch rooms</h1><p class="muted">Open a room to see its beneficiaries, search them by name or SPES ID, and review their attendance, journals and scores.</p>${this.msg(m)}
      <form class="card row" data-form="batch"><div><label>Batch name</label><input name="name" required placeholder="B1 or B2 - 2026"></div><div><label>Year</label><input name="year" type="number" value="${new Date().getFullYear()}" required></div><div><label>Batch start date</label><input name="start" type="date" value="${SPES.AttendanceModel.day()}" required></div><button class="btn">Create batch</button></form>
      <div class="rooms2">${batches.map(b => { const members = ben.filter(u => u.batch === b.code), p = pending(members), on = members.filter(u => SPES.PresenceModel.online(u.id)).length; return `<button type="button" class="brm" data-act="room" data-code="${this.esc(b.code)}"><span class="brm-code">${this.esc(b.code)}</span><b>${this.esc(b.name)}</b><span class="muted">${members.length} beneficiaries</span>${on ? `<span class="tag ok"><i class="dot on"></i> ${on} online</span>` : ''}${p ? `<em class="tag gold">${p} to review</em>` : ''}<span class="brm-go">Open room ${this.icon('back')}</span></button>`; }).join('') || '<p class="muted">No batches yet. Create the first one above.</p>'}</div>`;
  }
};
