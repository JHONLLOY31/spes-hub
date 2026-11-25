// End-to-end API test against Supabase. Cleans up its own test beneficiary when done.
const test = require('node:test');
const assert = require('node:assert');
const { seedDemo } = require('../server/supabase');
const server = require('../server/server');

let base, adminCookie, userCookie, testUserId;
const uname = 'testben_' + Date.now().toString(36);
// Tiny valid 1x1 PNG data URL
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test.before(async () => {
  await seedDemo();
  await new Promise(r => server.listen(0, '127.0.0.1', () => { base = 'http://127.0.0.1:' + server.address().port; r(); }));
});

test.after(async () => {
  if (testUserId && adminCookie) {
    await call('DELETE', `/api/users/${testUserId}`, null, adminCookie);
  }
  server.closeAllConnections();
  server.close();
});

const call = async (method, p, body, cookie, type = 'application/json') => {
  const r = await fetch(base + p, {
    method,
    headers: {
      ...(body !== null && body !== undefined ? { 'Content-Type': type } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body !== null && body !== undefined ? (type === 'application/json' ? JSON.stringify(body) : body) : undefined
  });
  const sc = r.headers.get('set-cookie');
  return { status: r.status, json: await r.json().catch(() => null), cookie: sc && sc.split(';')[0], raw: sc };
};

test('health and static security checks', async () => {
  const h = await call('GET', '/api/health');
  assert.equal(h.status, 200);
  assert.equal(h.json.ok, true);
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/admin.html')).status, 200);
  assert.equal((await fetch(base + '/server/.env')).status, 404);
  assert.equal((await fetch(base + '/server/server.js')).status, 404);
});

test('register beneficiary -> pending -> admin approves -> login -> bootstrap', async () => {
  const reg = await call('POST', '/api/register', {
    name: 'Test Beneficiary', gender: 'Male', username: uname, password: 'secret123', batch: 'SPES-2026-DEMO'
  });
  assert.equal(reg.status, 201, JSON.stringify(reg.json));
  assert.ok(reg.json.spesId);

  // Pending user cannot log in yet
  const blocked = await call('POST', '/api/login', { username: uname, password: 'secret123', portal: 'user' });
  assert.equal(blocked.status, 403);
  assert.match(blocked.json.error, /waiting/);

  // Admin logs in on staff portal
  const adm = await call('POST', '/api/login', { username: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123', portal: 'admin' });
  assert.equal(adm.status, 200, JSON.stringify(adm.json));
  assert.match(adm.raw, /HttpOnly/);
  adminCookie = adm.cookie;

  // Find pending user and approve
  const pending = await call('GET', '/api/users?status=pending', null, adminCookie);
  const found = pending.json.users.find(u => u.username === uname);
  assert.ok(found, 'Newly registered beneficiary should appear in pending list');
  testUserId = found.id;

  const appr = await call('PATCH', `/api/users/${testUserId}/status`, { status: 'approved' }, adminCookie);
  assert.equal(appr.status, 200);

  // Approved beneficiary logs in and fetches bootstrap
  const login = await call('POST', '/api/login', { username: uname, password: 'secret123', portal: 'user' });
  assert.equal(login.status, 200);
  userCookie = login.cookie;

  const boot = await call('GET', '/api/bootstrap', null, userCookie);
  assert.equal(boot.status, 200);
  assert.equal(boot.json.me.username, uname);
  assert.ok(boot.json.batches.length >= 1);
});

test('journal with photo upload to private bucket + games scoring + feedback', async () => {
  // Save journal with a photo
  const j = await call('PUT', '/api/journals/1', {
    date: '2026-11-24',
    text: 'Assisted with document filing and encoding records at the capitol.',
    event: 'Orientation',
    photos: [TINY_PNG],
    status: 'submitted'
  }, userCookie);
  assert.equal(j.status, 200, JSON.stringify(j.json));
  assert.equal(j.json.journal.photos.length, 1);

  // Photo proxy serves the uploaded photo to the owner
  const photoRes = await fetch(base + j.json.journal.photos[0], { headers: { Cookie: userCookie } });
  assert.equal(photoRes.status, 200);

  // Server-side game scoring (+20 points)
  const g = await call('POST', '/api/games/answer', { room: 0, key: 0, ok: true }, userCookie);
  assert.equal(g.status, 200);
  assert.equal(g.json.delta, 20);
  assert.equal(g.json.total, 20);

  // Feedback (+20 first-time bonus)
  const fb = await call('POST', '/api/feedback', { text: 'Great system!', rating: 5 }, userCookie);
  assert.equal(fb.status, 201);
  assert.equal(fb.json.first, true);
  assert.equal(fb.json.total, 40);
});
