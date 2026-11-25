// Supabase client, password hashing (for answer key), storage helpers, and first-run seeding.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Load server/.env automatically if env vars are not already set
const envPath = path.join(__dirname, '.env');
if (!process.env.SUPABASE_URL && fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ljilybiftodjlicnrxta.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_2GKqY_cNgSya-zrsjL_u9g_DLTydGNY';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const TZ_NAME = process.env.TZ_NAME || 'Asia/Manila';

if (!SUPABASE_SECRET_KEY) {
  throw new Error('Missing SUPABASE_SECRET_KEY in environment variables');
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
// Service/secret client (bypasses RLS; used strictly server-side after role checks)
const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, opts);
// Publishable client (used only for verifying user passwords via signInWithPassword)
const sbAuth = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, opts);

const emailFor = username => `${String(username || '').trim().toLowerCase()}@spes-hub.local`;

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const hashSecret = pw => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
};
const verifySecret = (pw, stored) => {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, salt, hex] = stored.split('$');
  const a = crypto.scryptSync(String(pw), salt, 64);
  const b = Buffer.from(hex, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Manila-local date (yyyy-mm-dd) and minutes since midnight
function nowInTz() {
  const d = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ_NAME, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d).map(p => [p.type, p.value])
  );
  const h = Number(parts.hour) % 24;
  const m = Number(parts.minute);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    mins: h * 60 + m,
    iso: d.toISOString()
  };
}

// Convert a storage path into a server-proxied URL, or pass through already-proxied paths
const photoUrl = p => (p ? `/api/photos?p=${encodeURIComponent(p)}` : null);
const extractStoragePath = val => {
  if (!val || typeof val !== 'string') return null;
  const m = /^\/api\/photos\?p=(.+)$/.exec(val);
  return m ? decodeURIComponent(m[1]) : null;
};

// Upload a base64 data URL (image/jpeg, image/png, image/webp) to the private 'photos' bucket.
async function uploadDataUrl(storagePath, dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw { status: 400, msg: 'Invalid image format. Use JPEG, PNG, or WebP.' };
  const mime = m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 3 * 1024 * 1024) throw { status: 413, msg: 'Image is too large (max 3 MB).' };
  const { error } = await sb.storage.from('photos').upload(storagePath, buf, {
    contentType: mime, upsert: true
  });
  if (error) throw { status: 500, msg: 'Could not upload photo: ' + error.message };
  return storagePath;
}

// First-run seeding: create demo admin, office head, and demo batch if profiles table is empty.
async function seedDemo() {
  const { data: existing, error } = await sb.from('profiles').select('id').limit(1);
  if (error) {
    console.error('Supabase profiles check failed:', error.message);
    return;
  }
  if (existing && existing.length > 0) return;

  const today = nowInTz().date;
  const year = Number(today.slice(0, 4));
  await sb.from('batches').upsert(
    { code: 'SPES-2026-DEMO', name: 'Batch 2026', year, start_date: today },
    { onConflict: 'code' }
  );

  const staff = [
    { name: 'Administrator', username: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123', role: 'admin' },
    { name: 'Office Head', username: 'head', password: process.env.HEAD_PASSWORD || 'head123', role: 'head' }
  ];

  for (const s of staff) {
    const email = emailFor(s.username);
    let userId;
    const created = await sb.auth.admin.createUser({ email, password: s.password, email_confirm: true });
    if (created.error) {
      // Auth user may already exist from an earlier run; find it
      const list = await sb.auth.admin.listUsers({ perPage: 200 });
      const found = (list.data && list.data.users || []).find(u => u.email === email);
      if (!found) { console.error('Seed user failed:', s.username, created.error.message); continue; }
      userId = found.id;
    } else {
      userId = created.data.user.id;
    }
    await sb.from('profiles').upsert({
      id: userId, username: s.username, name: s.name, role: s.role, status: 'approved'
    }, { onConflict: 'id' });
  }
  console.log('Seeded demo accounts in Supabase: admin / admin123 and head / head123 (change passwords after login)');
}

module.exports = {
  sb, sbAuth, emailFor, sha, hashSecret, verifySecret,
  nowInTz, photoUrl, extractStoragePath, uploadDataUrl, seedDemo
};
