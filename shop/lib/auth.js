'use strict';
const crypto = require('node:crypto');

const TTL_MS = 8 * 3600 * 1000;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// The admin password is compared in constant time against a hash derived with scrypt.
function makeVerifier(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return (attempt) => {
    const h = crypto.scryptSync(String(attempt), salt, 32);
    return crypto.timingSafeEqual(h, hash);
  };
}

function createSession(db) {
  const id = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (id_hash, expires_at) VALUES (?, ?)').run(sha(id), Date.now() + TTL_MS);
  return id;
}

function validSession(db, id) {
  if (!id) return false;
  const row = db.prepare('SELECT expires_at FROM sessions WHERE id_hash = ?').get(sha(id));
  if (!row) return false;
  if (row.expires_at < Date.now()) { destroySession(db, id); return false; }
  return true;
}

function destroySession(db, id) {
  if (id) db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(sha(id));
}

// Tiny in-memory limiter: max N failures per key per window.
function limiter(max, windowMs) {
  const hits = new Map();
  return {
    blocked(key) {
      const now = Date.now();
      const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
      hits.set(key, arr);
      return arr.length >= max;
    },
    fail(key) { (hits.get(key) || hits.set(key, []).get(key)).push(Date.now()); },
    reset(key) { hits.delete(key); },
  };
}

module.exports = { makeVerifier, createSession, validSession, destroySession, limiter, TTL_MS };
