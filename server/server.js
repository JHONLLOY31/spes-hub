// SPES Hub Server — serves the web app and a Supabase-backed JSON API under /api.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  sb, sbAuth, emailFor, sha, hashSecret, verifySecret,
  nowInTz, photoUrl, extractStoragePath, uploadDataUrl, seedDemo
} = require('./supabase');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ljilybiftodjlicnrxta.supabase.co';

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const SECURE = process.env.SECURE_COOKIES === '1' || process.env.RENDER === 'true' || process.env.VERCEL === '1';
const WEEK_SEC = 7 * 24 * 3600;

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const fail = (status, msg) => { throw { status, msg }; };

const SLOTS = {
  AM_IN:  { label: 'Morning Time-In',    open: 420,  close: 720,  lateAfter: 480  }, // opens 7:00 AM; 8:01 AM+ late
  AM_OUT: { label: 'Morning Time-Out',   open: 720,  close: 1440, lateAfter: 720  }, // opens 12:00 PM; 12:01 PM+ late
  PM_IN:  { label: 'Afternoon Time-In',  open: 750,  close: 1020, lateAfter: 780  }, // opens 12:30 PM; 1:01 PM+ late
  PM_OUT: { label: 'Afternoon Time-Out', open: 1020, close: 1440, lateAfter: null }  // opens 5:00 PM onwards
};

function clockLabel(mins) {
  const h = Math.floor(mins / 60);
  return `${h % 12 || 12}:${String(mins % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function isRestDay(dateStr) { const d = new Date(dateStr + 'T00:00:00').getDay(); return d === 0 || d === 6; }
function isWorkFromHome(dateStr) { return new Date(dateStr + 'T00:00:00').getDay() === 5; }

// ---- row mappers (Postgres snake_case -> front-end camelCase) ----
const mapProfile = p => ({
  id: p.id,
  spesId: p.spes_id || null,
  name: p.name,
  gender: p.gender || null,
  username: p.username,
  role: p.role,
  batch: p.batch_code || null,
  status: p.status,
  startDate: p.start_date || null,
  avatar: photoUrl(p.avatar_path),
  avBorder: p.av_border || null,
  note: p.note || null,
  settings: p.settings || {},
  pis: p.pis || null,
  seen: p.seen || p.created_at
});

const mapBatch = b => ({ id: b.id, code: b.code, name: b.name, year: b.year, start: b.start_date });
const mapAttendance = a => ({
  id: a.id, userId: a.user_id, slot: a.slot, date: a.date,
  photo: photoUrl(a.photo_path), submittedAt: a.submitted_at,
  onTime: a.on_time, lateMinutes: a.late_minutes || 0, pointsDeducted: a.points_deducted || 0,
  status: a.status, reviewedBy: a.reviewed_by, reviewedAt: a.reviewed_at
});
const mapManual = m => ({ userId: m.user_id, date: m.date, period: m.period || 'FULL', by: m.marked_by, at: m.marked_at });
const mapExcuse = e => ({
  id: e.id, userId: e.user_id, date: e.date, category: e.category, reason: e.reason,
  photo: photoUrl(e.photo_path), status: e.status, makeupGranted: !!e.makeup_granted,
  reviewedBy: e.reviewed_by, reviewedAt: e.reviewed_at, createdAt: e.created_at
});
const mapJournal = (j, isAdmin = false) => ({
  id: `${j.user_id}_${j.day}`, userId: j.user_id, day: j.day, date: j.date,
  text: j.text, event: j.event, photos: (j.photos || []).map(photoUrl),
  status: j.status, updatedAt: j.updated_at,
  ...(isAdmin ? { pointsAwarded: j.points_awarded || 0, awardedBy: j.awarded_by || null, awardedAt: j.awarded_at || null } : {})
});
const mapEvent = e => ({ id: e.id, title: e.title, date: e.date, type: e.type });
const mapAnn = a => ({ id: a.id, title: a.title, body: a.body, target: a.target, ts: a.created_at });
const mapNotif = n => ({ id: n.id, to: n.target, text: n.text, kind: n.kind, ts: n.created_at });
const mapActivity = a => ({ uid: a.user_id, text: a.text, ts: a.created_at });
const mapFeedback = f => ({ id: f.id, userId: f.user_id, name: f.name, text: f.text, rating: f.rating, ts: f.created_at });
const mapMessage = m => ({
  id: m.id, batch: m.batch_code, from: m.sender_id, to: m.receiver_id,
  body: m.unsent ? '' : m.body, unsent: !!m.unsent,
  editedAt: m.edited_at || null, reactions: m.reactions || {},
  readAt: m.read_at, ts: m.created_at
});

async function pushNotif(target, text, kind = 'info') {
  await sb.from('notifications').insert({ target, text, kind });
}
async function logActivity(userId, text) {
  await sb.from('activity').insert({ user_id: userId, text });
}
async function awardPoints(userId, delta) {
  const { data } = await sb.from('points').select('total').eq('user_id', userId).maybeSingle();
  const next = Math.max(0, (data ? data.total : 0) + delta);
  await sb.from('points').upsert({ user_id: userId, total: next }, { onConflict: 'user_id' });
  return next;
}

// ---- sessions (HttpOnly cookie; only SHA-256 hash stored in public.sessions) ----
function tokenOf(req) {
  const m = /(?:^|;\s*)sid=([a-f0-9]{64})/.exec(req.headers.cookie || '');
  return m && m[1];
}
async function userFor(req) {
  const t = tokenOf(req);
  if (!t) return null;
  const { data: sess } = await sb.from('sessions')
    .select('user_id, expires_at')
    .eq('token_hash', sha(t))
    .maybeSingle();
  if (!sess || new Date(sess.expires_at).getTime() <= Date.now()) return null;
  const { data: prof } = await sb.from('profiles')
    .select('*')
    .eq('id', sess.user_id)
    .eq('status', 'approved')
    .maybeSingle();
  return prof || null;
}
async function startSession(userId) {
  await sb.from('sessions').delete().lt('expires_at', new Date().toISOString());
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + WEEK_SEC * 1000).toISOString();
  await sb.from('sessions').insert({ token_hash: sha(token), user_id: userId, expires_at: expires });
  return `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${WEEK_SEC}${SECURE ? '; Secure' : ''}`;
}

// ---- router ----
const routes = [];
const route = (method, pattern, roles, handler) =>
  routes.push({ method, roles, handler, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$') });

const fails = new Map(); // 5 wrong logins = 10 minute lock

// ---- Health ----
route('GET', '/api/health', undefined, () => [200, { ok: true, time: nowInTz() }]);

// ---- Auth ----
route('GET', '/api/me', undefined, ({ user }) => [200, { user: user ? mapProfile(user) : null }]);

async function preparePis(uid, body) {
  const nowIso = new Date().toISOString();
  let avatarPath = null;
  let pis = body.pis && typeof body.pis === 'object' ? { ...body.pis, submittedAt: nowIso, privacyConsent: true } : null;
  if (typeof body.pisPhoto === 'string' && body.pisPhoto.startsWith('data:image/')) {
    avatarPath = `avatars/${uid}_pis_${Date.now()}.jpg`;
    await uploadDataUrl(avatarPath, body.pisPhoto);
    if (pis) pis.photo = photoUrl(avatarPath);
  }
  const settings = { privacyAcceptedAt: nowIso };
  if (pis) {
    settings.idCard = {
      fullName: str(pis.fullName || body.name, 100),
      nickname: str(pis.nickname, 40),
      address: str(pis.presentAddress || pis.permanentAddress, 200),
      contact: str(pis.mobile, 40),
      emgName: str(pis.emgName, 80),
      emgRel: str(pis.emgRel, 40),
      emgContact: str(pis.emgContact, 40),
      effectivity: '',
      ...(avatarPath ? { photo: photoUrl(avatarPath) } : {})
    };
  }
  return { avatarPath, pis, settings };
}

route('POST', '/api/register', undefined, async ({ body }) => {
  const name = str(body.name, 80);
  const username = str(body.username, 30);
  const gender = body.gender;
  const code = str(body.batch, 40).toUpperCase();
  const password = typeof body.password === 'string' ? body.password : '';
  if (!name || !['Male', 'Female'].includes(gender) || !/^[A-Za-z0-9_.]{3,30}$/.test(username) || password.length < 6 || password.length > 100) {
    fail(400, 'Fill in every field. Username: 3 to 30 letters or numbers. Password: at least 6 characters.');
  }
  const { data: batch } = await sb.from('batches').select('*').eq('code', code).maybeSingle();
  if (!batch) fail(400, 'Batch code not found. Ask your administrator for the code.');

  const { data: existing } = await sb.from('profiles').select('id').ilike('username', username).maybeSingle();
  if (existing) fail(409, 'That username is already taken.');

  // Generate next SPES ID for this batch
  const { data: members } = await sb.from('profiles').select('spes_id').eq('batch_code', batch.code).eq('role', 'beneficiary');
  const maxSeq = (members || []).reduce((m, r) => Math.max(m, Number(String(r.spes_id || '').split('-').pop()) || 0), 0);
  const prefix = ((batch.name || '').match(/B[12]/i) || [batch.code.startsWith('B2-') ? 'B2' : 'B1'])[0].toUpperCase();
  const spesId = `${prefix}-${batch.year}-${String(maxSeq + 1).padStart(4, '0')}`;

  const created = await sb.auth.admin.createUser({
    email: emailFor(username),
    password,
    email_confirm: true
  });
  if (created.error) fail(409, created.error.message || 'Could not create account.');

  const uid = created.data.user.id;
  const { avatarPath, pis, settings } = await preparePis(uid, body);
  const { error: profErr } = await sb.from('profiles').insert({
    id: uid, username, spes_id: spesId, name, gender,
    role: 'beneficiary', batch_code: batch.code, status: 'pending',
    start_date: nowInTz().date,
    avatar_path: avatarPath,
    pis,
    settings
  });
  if (profErr) {
    await sb.auth.admin.deleteUser(uid);
    fail(500, 'Could not save profile: ' + profErr.message);
  }
  await pushNotif('staff', `${name} registered and is waiting for approval`, 'approval');
  return [201, { ok: true, spesId }];
});

route('POST', '/api/login', undefined, async ({ req, body }) => {
  const username = str(body.username, 60);
  const password = typeof body.password === 'string' ? body.password : '';
  const portal = body.portal === 'admin' ? 'admin' : 'user';
  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'unknown').split(',')[0].trim();
  const key = `${ip}|${username.toLowerCase()}`;
  const f = fails.get(key);
  if (f && f.n >= 5 && f.until > Date.now()) fail(429, 'Too many attempts. Please try again in a few minutes.');

  const { data: prof } = await sb.from('profiles').select('*').ilike('username', username).maybeSingle();
  const authRes = prof ? await sbAuth.auth.signInWithPassword({ email: emailFor(prof.username), password }) : { error: { message: 'nope' } };
  if (!prof || authRes.error) {
    if (fails.size > 5000) fails.clear();
    fails.set(key, { n: (f && f.until > Date.now() ? f.n : 0) + 1, until: Date.now() + 600000 });
    fail(401, 'Wrong username or password.');
  }
  if ((prof.role !== 'beneficiary') !== (portal === 'admin')) {
    fail(403, prof.role === 'beneficiary'
      ? 'This is a beneficiary account. Please use the beneficiary login page.'
      : 'This is a staff account. Please use the staff login page.');
  }
  if (prof.status === 'pending') fail(403, 'Your account is waiting for administrator approval.');
  if (prof.status === 'rejected') fail(403, 'Your registration was declined. Please contact the administrator.');

  fails.delete(key);
  const cookie = await startSession(prof.id);
  await logActivity(prof.id, 'Logged in');
  await sb.from('presence').upsert({ user_id: prof.id, last_seen: new Date().toISOString(), online: true }, { onConflict: 'user_id' });
  return [200, { user: mapProfile(prof) }, { 'Set-Cookie': cookie }];
});

route('POST', '/api/logout', undefined, async ({ req, user }) => {
  const t = tokenOf(req);
  if (t) await sb.from('sessions').delete().eq('token_hash', sha(t));
  if (user) await sb.from('presence').upsert({ user_id: user.id, last_seen: new Date().toISOString(), online: false }, { onConflict: 'user_id' });
  return [200, { ok: true }, { 'Set-Cookie': `sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${SECURE ? '; Secure' : ''}` }];
});

route('POST', '/api/forgot', undefined, async ({ body }) => {
  const username = str(body.username, 60);
  const batch = str(body.batch, 40).toUpperCase();
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 6 || password.length > 100) fail(400, 'Password needs at least 6 characters.');
  const { data: prof } = await sb.from('profiles').select('*').ilike('username', username).eq('role', 'beneficiary').maybeSingle();
  if (!prof || prof.batch_code !== batch) fail(400, 'Username and batch code do not match.');
  // Google-linked accounts MUST authenticate with Google first before setting a new password
  const { data: authInfo } = await sb.auth.admin.getUserById(prof.id);
  const u = authInfo && authInfo.user;
  const providers = (u && u.app_metadata && u.app_metadata.providers) || [];
  const isGoogle = providers.includes('google') || (u && u.email && !u.email.endsWith('@spes-hub.local'));
  if (isGoogle) fail(403, 'This account uses Google Sign-In. Please click "Verify with Google" first to authenticate before creating a new password.');
  const upd = await sb.auth.admin.updateUserById(prof.id, { password });
  if (upd.error) fail(500, 'Could not update password.');
  return [200, { ok: true }];
});

// ---- Google OAuth password-reset verification ----
route('POST', '/api/auth/google/verify-reset', undefined, async ({ body }) => {
  const token = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  if (!token) fail(400, 'Missing Google verification token.');
  const { data: authData, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !authData || !authData.user) fail(401, 'Google verification expired or invalid. Please try again.');
  const gUser = authData.user;
  const { data: prof } = await sb.from('profiles').select('id, username, name, role').eq('id', gUser.id).maybeSingle();
  if (!prof) fail(404, 'No SPES Hub account is linked to this Google account yet.');
  if (prof.role !== 'beneficiary') fail(403, 'Staff accounts cannot reset passwords here.');
  return [200, { ok: true, email: gUser.email || '', username: prof.username, name: prof.name }];
});

route('POST', '/api/auth/google/reset-password', undefined, async ({ body }) => {
  const token = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!token) fail(400, 'Google verification expired. Please verify with Google again.');
  if (password.length < 6 || password.length > 100) fail(400, 'New password needs at least 6 characters.');
  const { data: authData, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !authData || !authData.user) fail(401, 'Google verification expired. Please verify with Google again.');
  const gUser = authData.user;
  const { data: prof } = await sb.from('profiles').select('id, role').eq('id', gUser.id).maybeSingle();
  if (!prof || prof.role !== 'beneficiary') fail(404, 'Beneficiary account not found.');
  const upd = await sb.auth.admin.updateUserById(gUser.id, { password });
  if (upd.error) fail(500, 'Could not update password: ' + upd.error.message);
  await logActivity(gUser.id, 'Reset password after Google verification');
  return [200, { ok: true }];
});

// ---- Google OAuth (beneficiary sign-in via Supabase Auth) ----
route('POST', '/api/auth/google/session', undefined, async ({ body }) => {
  const token = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  if (!token) fail(400, 'Missing Google session token.');
  const { data: authData, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !authData || !authData.user) fail(401, 'Google sign-in expired or invalid. Please try again.');
  const gUser = authData.user;

  const { data: prof } = await sb.from('profiles').select('*').eq('id', gUser.id).maybeSingle();
  if (!prof) {
    const meta = gUser.user_metadata || {};
    const suggestedName = str(meta.full_name || meta.name || (gUser.email || '').split('@')[0], 80);
    const baseUser = String((gUser.email || '').split('@')[0] || 'spesuser').replace(/[^A-Za-z0-9_.]/g, '').slice(0, 24) || 'spesuser';
    return [200, { status: 'needs_profile', email: gUser.email || '', suggestedName, suggestedUsername: baseUser }];
  }
  if (prof.role !== 'beneficiary') fail(403, 'This is a staff account. Please use the staff login page.');
  if (prof.status === 'pending') fail(403, 'Your account is waiting for administrator approval.');
  if (prof.status === 'rejected') fail(403, 'Your registration was declined. Contact the administrator to reconsider, or click Continue with Google to choose another Google account.');

  const cookie = await startSession(prof.id);
  await logActivity(prof.id, 'Logged in with Google');
  await sb.from('presence').upsert({ user_id: prof.id, last_seen: new Date().toISOString(), online: true }, { onConflict: 'user_id' });
  return [200, { status: 'logged_in', user: mapProfile(prof) }, { 'Set-Cookie': cookie }];
});

route('POST', '/api/auth/google/complete', undefined, async ({ body }) => {
  const token = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  if (!token) fail(400, 'Google session expired. Please sign in with Google again.');
  const { data: authData, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !authData || !authData.user) fail(401, 'Google session expired. Please sign in with Google again.');
  const gUser = authData.user;

  const { data: already } = await sb.from('profiles').select('id').eq('id', gUser.id).maybeSingle();
  if (already) fail(409, 'Your account is already registered. Please wait for approval or log in.');

  const name = str(body.name, 80);
  const username = str(body.username, 30);
  const gender = body.gender;
  const code = str(body.batch, 40).toUpperCase();
  if (!name || !['Male', 'Female'].includes(gender) || !/^[A-Za-z0-9_.]{3,30}$/.test(username)) {
    fail(400, 'Fill in every field. Username must be 3 to 30 letters, numbers, dots, or underscores.');
  }
  const { data: batch } = await sb.from('batches').select('*').eq('code', code).maybeSingle();
  if (!batch) fail(400, 'Batch code not found. Ask your administrator for the code.');

  const { data: taken } = await sb.from('profiles').select('id').ilike('username', username).maybeSingle();
  if (taken) fail(409, 'That username is already taken. Please choose another.');

  const { data: members } = await sb.from('profiles').select('spes_id').eq('batch_code', batch.code).eq('role', 'beneficiary');
  const maxSeq = (members || []).reduce((m, r) => Math.max(m, Number(String(r.spes_id || '').split('-').pop()) || 0), 0);
  const prefix = ((batch.name || '').match(/B[12]/i) || [batch.code.startsWith('B2-') ? 'B2' : 'B1'])[0].toUpperCase();
  const spesId = `${prefix}-${batch.year}-${String(maxSeq + 1).padStart(4, '0')}`;

  const { avatarPath, pis, settings } = await preparePis(gUser.id, body);
  const { error: profErr } = await sb.from('profiles').insert({
    id: gUser.id, username, spes_id: spesId, name, gender,
    role: 'beneficiary', batch_code: batch.code, status: 'pending',
    start_date: nowInTz().date,
    avatar_path: avatarPath,
    pis,
    settings
  });
  if (profErr) fail(500, 'Could not save profile: ' + profErr.message);

  await pushNotif('staff', `${name} registered via Google and is waiting for approval`, 'approval');
  return [201, { ok: true, spesId }];
});

// ---- Bootstrap (full role-scoped state for the SPA) ----
route('GET', '/api/bootstrap', 'any', async ({ user }) => {
  const staff = user.role !== 'beneficiary';
  const [
    batchesRes, usersRes, attRes, manRes, excRes, jrnRes, evRes, annRes, notifRes, actRes, fbRes, gpRes, ptsRes, presRes, keyRes, msgRes
  ] = await Promise.all([
    sb.from('batches').select('*').order('id', { ascending: false }),
    staff
      ? sb.from('profiles').select('*').order('created_at', { ascending: false })
      : sb.from('profiles').select('id, spes_id, name, gender, username, role, batch_code, status, start_date, avatar_path, av_border, note, settings, seen, created_at')
          .or(`id.eq.${user.id},role.eq.admin,and(role.eq.beneficiary,batch_code.eq.${user.batch_code},status.eq.approved)`),
    staff
      ? sb.from('attendance').select('*').order('submitted_at', { ascending: true })
      : sb.from('attendance').select('*').eq('user_id', user.id).order('submitted_at', { ascending: true }),
    staff
      ? sb.from('attendance_manual').select('*')
      : sb.from('attendance_manual').select('*').eq('user_id', user.id),
    staff
      ? sb.from('attendance_excuses').select('*').order('created_at', { ascending: false })
      : sb.from('attendance_excuses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    staff
      ? sb.from('journals').select('*').order('updated_at', { ascending: false })
      : sb.from('journals').select('*').eq('user_id', user.id),
    sb.from('events').select('*').order('date', { ascending: true }),
    sb.from('announcements').select('*').order('created_at', { ascending: false }).limit(50),
    staff
      ? sb.from('notifications').select('*').in('target', [user.id, 'staff']).order('created_at', { ascending: false }).limit(200)
      : sb.from('notifications').select('*').in('target', [user.id, 'all', 'batch:' + (user.batch_code || '')]).order('created_at', { ascending: false }).limit(200),
    sb.from('activity').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    staff
      ? sb.from('feedback').select('*').order('created_at', { ascending: false }).limit(200)
      : sb.from('feedback').select('*').eq('user_id', user.id),
    staff
      ? sb.from('game_progress').select('*')
      : sb.from('game_progress').select('*'),
    sb.from('points').select('*'),
    sb.from('presence').select('*'),
    user.role === 'head'
      ? sb.from('app_settings').select('value').eq('key', 'answer_key').maybeSingle()
      : Promise.resolve({ data: null }),
    (user.role === 'beneficiary' || user.role === 'admin')
      ? sb.from('messages').select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: true }).limit(500)
      : Promise.resolve({ data: [] })
  ]);

  const progress = {};
  for (const r of (gpRes.data || [])) {
    if (!progress[r.user_id]) progress[r.user_id] = {};
    progress[r.user_id][r.room] = { got: r.got || [], done: r.done, correct: r.correct, wrong: r.wrong };
  }
  const points = {};
  for (const r of (ptsRes.data || [])) points[r.user_id] = r.total;

  const presence = {};
  for (const r of (presRes.data || [])) {
    presence[r.user_id] = {
      t: new Date(r.last_seen).getTime(), on: r.online,
      typingTo: r.typing_to || null, typingAt: r.typing_at ? new Date(r.typing_at).getTime() : 0
    };
  }

  return [200, {
    me: mapProfile(user),
    serverDate: nowInTz().date,
    batches: (batchesRes.data || []).map(mapBatch),
    users: (usersRes.data || []).map(p => p.id === user.id || staff ? mapProfile(p) : {
      id: p.id, name: p.name, role: p.role, batch: p.batch_code, status: p.status,
      avatar: photoUrl(p.avatar_path), avBorder: p.av_border || null, note: p.note || null
    }),
    attendance: (attRes.data || []).map(mapAttendance),
    attmanual: (manRes.data || []).map(mapManual),
    excuses: (excRes.data || []).map(mapExcuse),
    journals: (jrnRes.data || []).map(j => mapJournal(j, staff)),
    events: (evRes.data || []).map(mapEvent),
    announcements: (annRes.data || []).map(mapAnn),
    notifs: (notifRes.data || []).map(mapNotif),
    activity: (actRes.data || []).map(mapActivity),
    feedback: (fbRes.data || []).map(mapFeedback),
    progress,
    points,
    presence,
    messages: (msgRes.data || []).map(mapMessage),
    answerKeyHas: !!(keyRes.data && keyRes.data.value && keyRes.data.value.hash)
  }];
});

// ---- Private Photo Proxy ----
async function servePhoto(req, res, url) {
  const user = await userFor(req);
  if (!user) fail(401, 'Please log in.');
  const p = url.searchParams.get('p') || '';
  if (!p || p.includes('..') || !/^(avatars|attendance|journals|excuses)\/[a-zA-Z0-9._/-]+$/.test(p)) {
    fail(400, 'Invalid photo path.');
  }
  // Beneficiaries can only view their own attendance/journal photos or avatars
  if (user.role === 'beneficiary' && !p.startsWith('avatars/')) {
    const owner = p.split('/')[1];
    if (owner !== user.id) fail(403, 'Forbidden.');
  }
  const { data, error } = await sb.storage.from('photos').download(p);
  if (error || !data) fail(404, 'Photo not found.');
  const buf = Buffer.from(await data.arrayBuffer());
  res.writeHead(200, {
    'Content-Type': data.type || 'image/jpeg',
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(buf);
}

// ---- Batches ----
route('GET', '/api/batches', ['admin', 'head'], async () => {
  const { data } = await sb.from('batches').select('*').order('id', { ascending: false });
  return [200, { batches: (data || []).map(mapBatch) }];
});

route('POST', '/api/batches', ['admin'], async ({ body }) => {
  const name = str(body.name, 60);
  const year = Number(body.year) || Number(nowInTz().date.slice(0, 4));
  const start = str(body.start || body.startDate, 10) || nowInTz().date;
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(start)) fail(400, 'Enter a batch name and a valid start date.');
  const { data: all } = await sb.from('batches').select('code, year');
  const tag = (name.match(/B[12]/i) || [(all || []).some(x => x.year == year && x.code.startsWith('B1-')) ? 'B2' : 'B1'])[0].toUpperCase();
  const code = str(body.code, 40).toUpperCase() || `${tag}-${year}`;
  const { data, error } = await sb.from('batches').insert({ name, code, year, start_date: start }).select().single();
  if (error) fail(409, `A batch with the code ${code} already exists.`);
  return [201, { batch: mapBatch(data) }];
});

// ---- Users & Approvals ----
route('GET', '/api/users', ['admin', 'head'], async ({ url }) => {
  const status = ['pending', 'approved', 'rejected'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : null;
  let q = sb.from('profiles').select('*').eq('role', 'beneficiary').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return [200, { users: (data || []).map(mapProfile) }];
});

route('PATCH', '/api/users/:id/status', ['admin'], async ({ params, body }) => {
  if (!['pending', 'approved', 'rejected'].includes(body.status)) fail(400, 'Status must be pending, approved, or rejected.');
  const { data, error } = await sb.from('profiles')
    .update({ status: body.status })
    .eq('id', params.id)
    .eq('role', 'beneficiary')
    .select()
    .maybeSingle();
  if (error || !data) fail(404, 'Beneficiary not found.');
  if (body.status === 'approved') await pushNotif(data.id, 'Your account was approved. Welcome to SPES Hub!', 'approval');
  return [200, { ok: true, user: mapProfile(data) }];
});

route('DELETE', '/api/users/:id', ['head'], async ({ params }) => {
  const { data: target } = await sb.from('profiles').select('id, name, role').eq('id', params.id).maybeSingle();
  if (!target || target.role !== 'beneficiary') fail(404, 'Beneficiary not found.');
  const del = await sb.auth.admin.deleteUser(target.id);
  if (del.error) fail(500, 'Could not delete user: ' + del.error.message);
  return [200, { ok: true, name: target.name }];
});

// ---- Profile & Settings ----
route('PATCH', '/api/profile', 'any', async ({ user, body }) => {
  const patch = {};
  if (typeof body.name === 'string' && body.name.trim()) patch.name = str(body.name, 80);
  if (['Male', 'Female'].includes(body.gender)) patch.gender = body.gender;
  if (typeof body.avBorder === 'string') patch.av_border = str(body.avBorder, 20);
  if (body.note === null) {
    patch.note = null;
  } else if (body.note && typeof body.note.text === 'string') {
    const t = body.note.text.trim().slice(0, 60);
    if (t) patch.note = { text: t, at: new Date().toISOString() };
  }
  if (body.settings && typeof body.settings === 'object') {
    patch.settings = { ...(user.settings || {}), ...body.settings };
  }
  if (typeof body.avatar === 'string' && body.avatar.startsWith('data:image/')) {
    const storagePath = `avatars/${user.id}_${Date.now()}.jpg`;
    await uploadDataUrl(storagePath, body.avatar);
    patch.avatar_path = storagePath;
  }
  if (typeof body.idPhoto === 'string' && body.idPhoto.startsWith('data:image/')) {
    const storagePath = `avatars/${user.id}_id_${Date.now()}.jpg`;
    await uploadDataUrl(storagePath, body.idPhoto);
    const curSettings = patch.settings || { ...(user.settings || {}) };
    curSettings.idCard = { ...(curSettings.idCard || {}), photo: photoUrl(storagePath) };
    patch.settings = curSettings;
  }
  if (!Object.keys(patch).length) fail(400, 'Nothing to update.');
  const { data, error } = await sb.from('profiles').update(patch).eq('id', user.id).select().single();
  if (error) fail(500, error.message);
  if (patch.avatar_path) await logActivity(user.id, 'Updated profile photo');
  else if (patch.name || patch.gender) await logActivity(user.id, 'Updated profile');
  else if (patch.note) await logActivity(user.id, 'Shared a note');
  return [200, { user: mapProfile(data) }];
});

route('POST', '/api/profile/password', 'any', async ({ user, body }) => {
  const cur = typeof body.cur === 'string' ? body.cur : '';
  const next = typeof body.next === 'string' ? body.next : '';
  if (next.length < 6 || next.length > 100) fail(400, 'New password needs at least 6 characters.');
  const check = await sbAuth.auth.signInWithPassword({ email: emailFor(user.username), password: cur });
  if (check.error) fail(401, 'Your current password is not correct.');
  const upd = await sb.auth.admin.updateUserById(user.id, { password: next });
  if (upd.error) fail(500, 'Could not update password.');
  await logActivity(user.id, 'Changed password');
  return [200, { ok: true }];
});

// ---- Attendance ----
route('POST', '/api/attendance', ['beneficiary'], async ({ user, body }) => {
  const slot = body.slot;
  const now = nowInTz();
  const date = str(body.date, 10) || now.date;
  if (!SLOTS[slot]) fail(400, 'Invalid attendance slot.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(400, 'Invalid date.');
  if (date !== now.date) fail(400, 'Attendance can only be submitted on the current day.');
  if (isRestDay(date)) fail(400, 'Saturday and Sunday are rest days.');
  if (isWorkFromHome(date)) fail(400, 'Friday is work from home. Attendance is not required.');

  const s = SLOTS[slot];
  if (now.mins < s.open) fail(400, `${s.label} opens at ${clockLabel(s.open)}.`);
  if (now.mins >= s.close) fail(400, `${s.label} is closed for today.`);

  const { data: dup } = await sb.from('attendance').select('id').eq('user_id', user.id).eq('date', date).eq('slot', slot).maybeSingle();
  if (dup) fail(409, 'You already submitted this attendance slot.');

  const storagePath = `attendance/${user.id}/${date}_${slot}.jpg`;
  await uploadDataUrl(storagePath, body.photo);

  const lateMinutes = s.lateAfter !== null ? Math.max(0, now.mins - s.lateAfter) : 0;
  const onTime = lateMinutes === 0;
  const { data, error } = await sb.from('attendance').insert({
    user_id: user.id, slot, date, photo_path: storagePath,
    submitted_at: now.iso, on_time: onTime, late_minutes: lateMinutes, points_deducted: 0, status: 'pending'
  }).select().single();
  if (error) fail(500, 'Could not save attendance: ' + error.message);

  const lateNote = lateMinutes > 0 ? ` (Late ${lateMinutes} min)` : '';
  await pushNotif('staff', `${user.name} submitted ${s.label} proof (${date})${lateNote}`, 'attendance');
  await logActivity(user.id, `Submitted ${s.label} proof${lateNote}`);
  return [201, { record: mapAttendance(data) }];
});

route('PATCH', '/api/attendance/:id', ['admin'], async ({ user, params, body }) => {
  if (!['approved', 'rejected'].includes(body.status)) fail(400, 'Invalid status.');
  const { data: cur } = await sb.from('attendance').select('*').eq('id', params.id).maybeSingle();
  if (!cur) fail(404, 'Attendance record not found.');

  let deducted = cur.points_deducted || 0;
  if (body.status === 'approved' && (cur.late_minutes || 0) > 0 && deducted === 0) {
    deducted = cur.late_minutes * 2;
    await awardPoints(cur.user_id, -deducted);
  }

  const { data, error } = await sb.from('attendance')
    .update({ status: body.status, points_deducted: deducted, reviewed_by: user.name, reviewed_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .maybeSingle();
  if (error || !data) fail(404, 'Attendance record not found.');

  const slotLabel = (SLOTS[data.slot] && SLOTS[data.slot].label) || 'Attendance';
  const msg = body.status === 'approved' && deducted > 0
    ? `Your ${slotLabel} was approved (Late by ${data.late_minutes} min · −${deducted} pts deducted).`
    : `Your ${slotLabel} was marked ${body.status}.`;
  await pushNotif(data.user_id, msg, 'attendance');
  return [200, { record: mapAttendance(data) }];
});

route('POST', '/api/attendance/manual', ['admin'], async ({ user, body }) => {
  const userId = str(body.userId, 60);
  const date = str(body.date, 10);
  const period = ['AM', 'PM', 'FULL'].includes(body.period) ? body.period : 'FULL';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(400, 'Pick a valid date.');
  if (date > nowInTz().date) fail(400, 'You cannot mark a future day.');
  if (isRestDay(date)) fail(400, 'Saturday and Sunday are rest days.');

  const { data: exists } = await sb.from('attendance_manual').select('user_id').eq('user_id', userId).eq('date', date).eq('period', period).maybeSingle();
  if (exists) {
    await sb.from('attendance_manual').delete().eq('user_id', userId).eq('date', date).eq('period', period);
    return [200, { added: false, period }];
  }
  const { error } = await sb.from('attendance_manual').insert({ user_id: userId, date, period, marked_by: user.id });
  if (error) fail(500, error.message);
  const label = period === 'AM' ? 'Morning' : period === 'PM' ? 'Afternoon' : 'Full day';
  await pushNotif(userId, `The administrator marked you present (${label}) for ${date}.`, 'attendance');
  return [201, { added: true, period }];
});

// ---- Attendance Excuses + Automatic +1 Make-Up Day ----
route('POST', '/api/attendance/excuse', ['beneficiary'], async ({ user, body }) => {
  const now = nowInTz();
  const date = str(body.date, 10) || now.date;
  const category = str(body.category, 60) || 'Medical / Sick';
  const reason = str(body.reason, 1000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(400, 'Invalid date.');
  if (date > now.date) fail(400, 'You cannot file an excuse for a future date.');
  if (isRestDay(date)) fail(400, 'Saturday and Sunday are rest days.');
  if (isWorkFromHome(date)) fail(400, 'Friday is work from home. No excuse is needed.');
  if (reason.length < 10) fail(400, 'Please explain your excuse in at least 10 characters.');

  const { data: existing } = await sb.from('attendance_excuses').select('id, status').eq('user_id', user.id).eq('date', date).maybeSingle();
  if (existing && existing.status !== 'rejected') fail(409, 'You already filed an excuse for this date.');

  let photoPath = null;
  if (typeof body.photo === 'string' && body.photo.startsWith('data:image/')) {
    photoPath = `excuses/${user.id}/${date}_${Date.now()}.jpg`;
    await uploadDataUrl(photoPath, body.photo);
  }

  const { data, error } = await sb.from('attendance_excuses').upsert({
    user_id: user.id, date, category, reason, photo_path: photoPath,
    status: 'pending', makeup_granted: false, reviewed_by: null, reviewed_at: null,
    created_at: new Date().toISOString()
  }, { onConflict: 'user_id,date' }).select().single();
  if (error) fail(500, 'Could not submit excuse: ' + error.message);

  await pushNotif('staff', `${user.name} filed an excuse for ${date} (${category})`, 'attendance');
  await logActivity(user.id, `Filed excuse for ${date} (${category})`);
  return [201, { excuse: mapExcuse(data) }];
});

route('PATCH', '/api/attendance/excuse/:id', ['admin'], async ({ user, params, body }) => {
  if (!['approved', 'rejected'].includes(body.status)) fail(400, 'Invalid status.');
  const grantMakeup = body.status === 'approved' && body.grantMakeup !== false;
  const { data, error } = await sb.from('attendance_excuses')
    .update({
      status: body.status,
      makeup_granted: grantMakeup,
      reviewed_by: user.name,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .select()
    .maybeSingle();
  if (error || !data) fail(404, 'Excuse request not found.');
  const msg = body.status === 'approved'
    ? (grantMakeup
        ? `Your excuse for ${data.date} was approved! +1 make-up workday has been added to your schedule.`
        : `Your excuse for ${data.date} was approved.`)
    : `Your excuse for ${data.date} was declined.`;
  await pushNotif(data.user_id, msg, 'attendance');
  return [200, { excuse: mapExcuse(data) }];
});

// ---- Journals ----
route('PUT', '/api/journals/:day', ['beneficiary'], async ({ user, params, body }) => {
  const day = Number(params.day);
  if (!Number.isInteger(day) || day < 1 || day > 20) fail(400, 'Invalid journal day.');
  const status = body.status === 'submitted' ? 'submitted' : 'draft';
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 8000) : '';
  const event = str(body.event, 200);
  const date = str(body.date, 10) || nowInTz().date;
  if (status === 'submitted' && text.length < 20) fail(400, 'Describe your tasks in at least 20 characters before submitting.');

  const rawPhotos = Array.isArray(body.photos) ? body.photos.slice(0, 5) : [];
  const storedPaths = [];
  for (let i = 0; i < rawPhotos.length; i++) {
    const item = rawPhotos[i];
    const existingPath = extractStoragePath(item);
    if (existingPath && existingPath.startsWith(`journals/${user.id}/`)) {
      storedPaths.push(existingPath);
    } else if (typeof item === 'string' && item.startsWith('data:image/')) {
      const p = `journals/${user.id}/day${day}_${Date.now()}_${i}.jpg`;
      await uploadDataUrl(p, item);
      storedPaths.push(p);
    }
  }

  const { data, error } = await sb.from('journals').upsert({
    user_id: user.id, day, date, text, event, photos: storedPaths,
    status, updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,day' }).select().single();
  if (error) fail(500, 'Could not save journal: ' + error.message);

  await logActivity(user.id, `${status === 'submitted' ? 'Submitted' : 'Saved a draft of'} journal Day ${day}`);
  if (status === 'submitted') await pushNotif('staff', `${user.name} submitted Journal Day ${day}`, 'journal');
  return [200, { journal: mapJournal(data) }];
});

route('PATCH', '/api/journals/:day/status', ['beneficiary'], async ({ user, params, body }) => {
  const day = Number(params.day);
  if (!['draft', 'submitted'].includes(body.status)) fail(400, 'Invalid status.');
  const { data, error } = await sb.from('journals')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('user_id', user.id).eq('day', day).select().maybeSingle();
  if (error || !data) fail(404, 'Journal not found.');
  return [200, { journal: mapJournal(data) }];
});

// Admin-only: award 20, 40, 60, 80, or 100 journal points (or 0 to clear) — hidden from beneficiaries
route('POST', '/api/journals/:userId/:day/award', ['admin'], async ({ user, params, body }) => {
  const day = Number(params.day);
  const uid = str(params.userId, 60);
  const pts = Number(body.points);
  if (![0, 20, 40, 60, 80, 100].includes(pts)) fail(400, 'Points must be 0, 20, 40, 60, 80, or 100.');
  const { data: cur } = await sb.from('journals').select('*').eq('user_id', uid).eq('day', day).maybeSingle();
  if (!cur) fail(404, 'Journal entry not found.');
  const { data, error } = await sb.from('journals').update({
    points_awarded: pts,
    awarded_by: pts > 0 ? user.name : null,
    awarded_at: pts > 0 ? new Date().toISOString() : null
  }).eq('user_id', uid).eq('day', day).select().single();
  if (error) fail(500, 'Could not update journal points: ' + error.message);
  return [200, { journal: mapJournal(data, true) }];
});

// ---- Games (server-scored) ----
route('POST', '/api/games/answer', ['beneficiary'], async ({ user, body }) => {
  const room = Number(body.room);
  const key = body.key === null || body.key === undefined ? null : Number(body.key);
  const ok = !!body.ok;
  if (!Number.isInteger(room) || room < 0 || room > 19) fail(400, 'Invalid room.');

  const { data: cur } = await sb.from('game_progress').select('*').eq('user_id', user.id).eq('room', room).maybeSingle();
  const r = cur ? { got: [...(cur.got || [])], done: cur.done, correct: cur.correct, wrong: cur.wrong }
                : { got: [], done: false, correct: 0, wrong: 0 };

  if (r.done || (key !== null && r.got.includes(key))) {
    const { data: ptRow } = await sb.from('points').select('total').eq('user_id', user.id).maybeSingle();
    return [200, { delta: 0, total: ptRow ? ptRow.total : 0, progress: r }];
  }

  if (key !== null && ok) r.got.push(key);
  if (ok) r.correct++; else r.wrong++;
  const delta = ok ? 20 : -1;
  const total = await awardPoints(user.id, delta);
  const justFinished = !r.done && r.got.length >= 10;
  if (justFinished) r.done = true;

  await sb.from('game_progress').upsert({
    user_id: user.id, room, got: r.got, done: r.done, correct: r.correct, wrong: r.wrong
  }, { onConflict: 'user_id,room' });

  if (justFinished) await logActivity(user.id, `Completed room ${room + 1}`);
  return [200, { delta, total, progress: r }];
});

// ---- Events & Announcements ----
route('POST', '/api/events', ['admin'], async ({ body }) => {
  const title = str(body.title, 120);
  const date = str(body.date, 10);
  const type = str(body.type, 40) || 'Special event';
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(400, 'Enter a title and valid date.');
  const { data, error } = await sb.from('events').insert({ title, date, type }).select().single();
  if (error) fail(500, error.message);
  await pushNotif('all', `New ${type.toLowerCase()}: ${title} on ${date}`, 'event');
  return [201, { event: mapEvent(data) }];
});

route('DELETE', '/api/events/:id', ['admin'], async ({ params }) => {
  await sb.from('events').delete().eq('id', params.id);
  return [200, { ok: true }];
});

route('POST', '/api/announcements', ['admin'], async ({ body }) => {
  const title = str(body.title, 120);
  const text = str(body.body, 2000);
  const to = body.to === 'all' ? 'all' : 'batch:' + str(body.to, 40);
  const date = str(body.date, 10);
  if (!title || !text) fail(400, 'Enter a title and message.');
  const { data, error } = await sb.from('announcements').insert({ title, body: text, target: to }).select().single();
  if (error) fail(500, error.message);
  await pushNotif(to, `📢 ${title}: ${text}`, 'announce');
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    await sb.from('events').insert({ title, date, type: 'Special event' });
    await pushNotif(to, `New event: ${title} on ${date}`, 'event');
  }
  return [201, { announcement: mapAnn(data) }];
});

// ---- Notifications, Feedback, Presence ----
route('POST', '/api/notifs/seen', 'any', async ({ user }) => {
  const now = new Date().toISOString();
  await sb.from('profiles').update({ seen: now }).eq('id', user.id);
  return [200, { seen: now }];
});

route('DELETE', '/api/notifications/:id', ['admin', 'head'], async ({ params }) => {
  await sb.from('notifications').delete().eq('id', params.id);
  return [200, { ok: true }];
});

route('DELETE', '/api/notifications', ['admin', 'head'], async ({ user }) => {
  await sb.from('notifications').delete().in('target', ['staff', user.id]);
  return [200, { ok: true }];
});

route('POST', '/api/feedback', ['beneficiary'], async ({ user, body }) => {
  const text = str(body.text, 2000);
  const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
  if (!text) fail(400, 'Please enter your feedback.');
  const { data: prev } = await sb.from('feedback').select('id').eq('user_id', user.id).limit(1);
  const first = !prev || prev.length === 0;
  const { data, error } = await sb.from('feedback').insert({ user_id: user.id, name: user.name, text, rating }).select().single();
  if (error) fail(500, error.message);
  let total = null;
  if (first) total = await awardPoints(user.id, 20);
  await pushNotif('staff', `${user.name} sent feedback (${rating}★)`, 'feedback');
  await logActivity(user.id, first ? 'Sent feedback (+20 points)' : 'Sent feedback');
  return [201, { feedback: mapFeedback(data), first, total }];
});

route('POST', '/api/presence', 'any', async ({ user, body }) => {
  const online = body.online !== false;
  await sb.from('presence').upsert({ user_id: user.id, last_seen: new Date().toISOString(), online }, { onConflict: 'user_id' });
  const { data } = await sb.from('presence').select('*');
  const map = {};
  for (const r of (data || [])) map[r.user_id] = { t: new Date(r.last_seen).getTime(), on: r.online };
  return [200, { presence: map }];
});

// ---- Direct Messages (Beneficiary <-> Batchmates & Beneficiary <-> Admin) ----
route('GET', '/api/messages', ['beneficiary', 'admin'], async ({ user }) => {
  const peersQuery = user.role === 'admin'
    ? sb.from('profiles').select('id, spes_id, name, role, batch_code, status, avatar_path, av_border, note').eq('role', 'beneficiary').eq('status', 'approved')
    : sb.from('profiles').select('id, spes_id, name, role, batch_code, status, avatar_path, av_border, note').or(`role.eq.admin,and(role.eq.beneficiary,batch_code.eq.${user.batch_code},status.eq.approved)`);
  const [msgRes, presRes, peersRes] = await Promise.all([
    sb.from('messages').select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: true }).limit(500),
    sb.from('presence').select('*'),
    peersQuery
  ]);
  const presence = {};
  for (const r of (presRes.data || [])) {
    presence[r.user_id] = {
      t: new Date(r.last_seen).getTime(), on: r.online,
      typingTo: r.typing_to || null, typingAt: r.typing_at ? new Date(r.typing_at).getTime() : 0
    };
  }
  const peers = (peersRes.data || []).map(p => ({
    id: p.id, spesId: p.spes_id || null, name: p.name, role: p.role, batch: p.batch_code, status: p.status,
    avatar: photoUrl(p.avatar_path), avBorder: p.av_border || null, note: p.note || null
  }));
  return [200, { messages: (msgRes.data || []).map(mapMessage), presence, peers }];
});

route('POST', '/api/messages', ['beneficiary', 'admin'], async ({ user, body }) => {
  const to = str(body.to, 60);
  const text = str(body.body, 1000);
  if (!to || to === user.id) fail(400, 'Choose someone to message.');
  if (!text) fail(400, 'Message cannot be empty.');
  const { data: peer } = await sb.from('profiles').select('id, role, status, batch_code').eq('id', to).maybeSingle();
  if (!peer || peer.status !== 'approved') fail(404, 'Recipient not found.');
  if (user.role === 'beneficiary') {
    const allowed = peer.role === 'admin' || (peer.role === 'beneficiary' && peer.batch_code === user.batch_code);
    if (!allowed) fail(403, 'You can only message classmates in your own batch or the Administrator.');
  } else if (user.role === 'admin') {
    if (peer.role !== 'beneficiary') fail(403, 'You can only message beneficiaries here.');
  }
  const batchCode = user.role === 'beneficiary' ? user.batch_code : (peer.batch_code || null);
  const { data, error } = await sb.from('messages').insert({
    batch_code: batchCode, sender_id: user.id, receiver_id: to, body: text
  }).select().single();
  if (error) fail(500, 'Could not send message: ' + error.message);
  await sb.from('presence').upsert({ user_id: user.id, last_seen: new Date().toISOString(), online: true, typing_to: null, typing_at: null }, { onConflict: 'user_id' });
  return [201, { message: mapMessage(data) }];
});

route('POST', '/api/messages/read', ['beneficiary', 'admin'], async ({ user, body }) => {
  const from = str(body.from, 60);
  if (!from) fail(400, 'Missing sender.');
  const now = new Date().toISOString();
  await sb.from('messages').update({ read_at: now }).eq('sender_id', from).eq('receiver_id', user.id).is('read_at', null);
  return [200, { ok: true, readAt: now }];
});

route('POST', '/api/messages/typing', ['beneficiary', 'admin'], async ({ user, body }) => {
  const to = body.to ? str(body.to, 60) : null;
  await sb.from('presence').upsert({
    user_id: user.id, last_seen: new Date().toISOString(), online: true,
    typing_to: to, typing_at: to ? new Date().toISOString() : null
  }, { onConflict: 'user_id' });
  return [200, { ok: true }];
});

route('PATCH', '/api/messages/:id', ['beneficiary', 'admin'], async ({ user, params, body }) => {
  const text = str(body.body, 1000);
  if (!text) fail(400, 'Message cannot be empty.');
  const { data: cur } = await sb.from('messages').select('*').eq('id', params.id).maybeSingle();
  if (!cur || cur.sender_id !== user.id) fail(403, 'You can only edit your own messages.');
  if (cur.unsent) fail(400, 'Cannot edit an unsent message.');
  const { data, error } = await sb.from('messages').update({ body: text, edited_at: new Date().toISOString() }).eq('id', params.id).select().single();
  if (error) fail(500, error.message);
  return [200, { message: mapMessage(data) }];
});

route('POST', '/api/messages/:id/unsend', ['beneficiary', 'admin'], async ({ user, params }) => {
  const { data: cur } = await sb.from('messages').select('*').eq('id', params.id).maybeSingle();
  if (!cur || cur.sender_id !== user.id) fail(403, 'You can only unsend your own messages.');
  const { data, error } = await sb.from('messages').update({ unsent: true, body: '', reactions: {} }).eq('id', params.id).select().single();
  if (error) fail(500, error.message);
  return [200, { message: mapMessage(data) }];
});

route('POST', '/api/messages/:id/react', ['beneficiary', 'admin'], async ({ user, params, body }) => {
  const emoji = str(body.emoji, 10);
  const ALLOWED = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  if (!ALLOWED.includes(emoji)) fail(400, 'Invalid reaction.');
  const { data: cur } = await sb.from('messages').select('*').eq('id', params.id).maybeSingle();
  if (!cur || (cur.sender_id !== user.id && cur.receiver_id !== user.id)) fail(403, 'Not allowed.');
  if (cur.unsent) fail(400, 'Cannot react to an unsent message.');
  const reactions = { ...(cur.reactions || {}) };
  if (reactions[user.id] === emoji) delete reactions[user.id];
  else reactions[user.id] = emoji;
  const { data, error } = await sb.from('messages').update({ reactions }).eq('id', params.id).select().single();
  if (error) fail(500, error.message);
  return [200, { message: mapMessage(data) }];
});

// ---- Office Head Answer Key Password ----
const keyFails = new Map();
route('POST', '/api/answerkey', ['head'], async ({ user, body }) => {
  const kf = keyFails.get(user.id);
  if (kf && kf.until > Date.now()) {
    const mins = Math.ceil((kf.until - Date.now()) / 60000);
    fail(429, `Too many wrong tries. Try again in ${mins} minute(s).`);
  }
  const miss = () => {
    const n = (kf ? kf.n : 0) + 1;
    keyFails.set(user.id, n >= 5 ? { n: 0, until: Date.now() + 300000 } : { n, until: 0 });
  };
  const { data: row } = await sb.from('app_settings').select('value').eq('key', 'answer_key').maybeSingle();
  const stored = row && row.value && row.value.hash;
  const action = body.action;

  if (action === 'unlock') {
    if (!stored || !verifySecret(body.pw || '', stored)) { miss(); fail(401, 'Wrong password.'); }
    keyFails.delete(user.id);
    await logActivity(user.id, 'Opened the game answers');
    return [200, { ok: true }];
  }
  const pw = typeof body.pw === 'string' ? body.pw : '';
  if (pw.length < 6) fail(400, 'The password needs at least 6 characters.');
  if (pw !== body.pw2) fail(400, 'The two passwords do not match.');
  if (action === 'set' && stored) fail(409, 'A password is already set.');
  if (action === 'change' && (!stored || !verifySecret(body.cur || '', stored))) { miss(); fail(401, 'The current password is wrong.'); }
  if (action === 'reset') {
    const check = await sbAuth.auth.signInWithPassword({ email: emailFor(user.username), password: body.acct || '' });
    if (check.error) { miss(); fail(401, 'Your administrator account password is wrong.'); }
  }
  await sb.from('app_settings').upsert({
    key: 'answer_key', value: { hash: hashSecret(pw), at: new Date().toISOString() }, updated_at: new Date().toISOString()
  }, { onConflict: 'key' });
  keyFails.delete(user.id);
  await logActivity(user.id, 'Set the game answers password');
  return [200, { ok: true }];
});

// ---- Request handling ----
const readJson = req => {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body || '{}')); }
    catch { return Promise.reject({ status: 400, msg: 'Invalid JSON.' }); }
  }
  return new Promise((ok, bad) => {
    const parts = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > 8e6) { bad({ status: 413, msg: 'Request too large.' }); req.destroy(); } else parts.push(c); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString() || '{}')); } catch { bad({ status: 400, msg: 'Invalid JSON.' }); } });
  });
};
const send = (res, code, obj, headers = {}) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(obj));
};

async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/photos') return servePhoto(req, res, url);
  if (req.method === 'GET' && url.pathname === '/api/auth/google') {
    const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
    const flow = url.searchParams.get('flow') === 'reset' ? '?flow=reset' : '';
    const redirectTo = `${proto}://${req.headers.host}/index.html${flow}`;
    const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&prompt=select_account`;
    res.writeHead(302, { Location: authUrl, 'Cache-Control': 'no-store' });
    return res.end();
  }
  const r = routes.find(x => x.method === req.method && x.re.test(url.pathname));
  if (!r) fail(404, 'Not found.');
  const writes = ['POST', 'PATCH', 'PUT'].includes(req.method);
  if (writes && !/^application\/json/.test(req.headers['content-type'] || '')) fail(415, 'Send JSON (Content-Type: application/json).');
  const user = await userFor(req);
  if (r.roles) {
    if (!user) fail(401, 'Please log in.');
    if (r.roles !== 'any' && !r.roles.includes(user.role)) fail(403, 'You do not have permission to do that.');
  }
  const body = writes ? await readJson(req) : {};
  const [status, data, headers] = await r.handler({ req, res, url, body, user, params: url.pathname.match(r.re).groups || {} });
  send(res, status, data, headers);
}

// ---- Static files ----
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const PUBLIC_FILE = /^\/(index\.html|admin\.html|(css|js|img)\/[\w./-]+)$/;
function serveStatic(req, res, url) {
  if (!['GET', 'HEAD'].includes(req.method)) fail(405, 'Method not allowed.');
  let p; try { p = decodeURIComponent(url.pathname); } catch { fail(400, 'Bad request.'); }
  if (p === '/') p = '/index.html';
  if (p.includes('..') || p.includes('\\') || p.includes('\0') || !PUBLIC_FILE.test(p)) fail(404, 'Not found.');
  const file = path.join(ROOT, p);
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, { error: 'Not found.' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else serveStatic(req, res, url);
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    send(res, status, { error: e.msg || 'Something went wrong on the server.' });
  }
}

const server = http.createServer(handleRequest);
server.handler = handleRequest;

module.exports = server;
if (require.main === module) {
  seedDemo()
    .catch(err => console.error('Seed error:', err))
    .finally(() => {
      server.listen(PORT, HOST, () => console.log(`SPES Hub (Supabase) running: http://${HOST}:${PORT}  (staff login: /admin.html)`));
    });
}
