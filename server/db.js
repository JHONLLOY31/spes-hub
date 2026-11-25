// DATABASE. One SQLite file (data/spes.db). node:sqlite is built into Node 22.13+, so nothing to install.
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const file = process.env.SPES_DB || path.join(__dirname, '..', 'data', 'spes.db');
fs.mkdirSync(path.dirname(file), { recursive: true });
const db = new DatabaseSync(file);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE,
  year INTEGER, start_date TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, spes_id TEXT UNIQUE, name TEXT NOT NULL, gender TEXT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','head','beneficiary')),
  batch_id INTEGER REFERENCES batches(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL);
`);

// PASSWORDS: scrypt (built into Node) with a random salt per user. Plain passwords are never stored.
const hashPassword = pw => { const salt = crypto.randomBytes(16).toString('hex'); return `scrypt$${salt}$${crypto.scryptSync(pw, salt, 64).toString('hex')}`; };
const verifyPassword = (pw, stored) => {
  const [, salt, hex] = stored.split('$'), a = crypto.scryptSync(pw, salt, 64), b = Buffer.from(hex, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// FIRST RUN: create the two demo staff accounts and one demo batch. Change these passwords before real use!
if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) {
  const add = db.prepare("INSERT INTO users (name, username, password_hash, role, status) VALUES (?, ?, ?, ?, 'approved')");
  add.run('Administrator', 'admin', hashPassword('admin123'), 'admin');
  add.run('Office Head', 'head', hashPassword('head123'), 'head');
  db.prepare('INSERT INTO batches (name, code, year, start_date) VALUES (?, ?, ?, ?)').run('Batch 2026', 'SPES-2026-DEMO', 2026, new Date().toISOString().slice(0, 10));
  console.log('Created demo accounts: admin / admin123 and head / head123  (change them!)');
}

module.exports = { db, hashPassword, verifyPassword };
