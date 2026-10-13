'use strict';
const { load } = require('../lib/config');
const { createApp } = require('../lib/app');
const { open } = require('../lib/db');

const quiet = { info() {}, warn() {}, error() {} };

async function boot(overrides = {}) {
  const cfg = load({ DATABASE_PATH: ':memory:', ADMIN_PASSWORD: 'test-password-123', PAYMENT_PROVIDER: 'mock', ...overrides });
  const app = createApp(cfg, { db: open(':memory:'), log: quiet });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const call = async (path, { method = 'GET', body, headers = {}, raw } = {}) => {
    const res = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data, headers: res.headers };
  };
  return { app, cfg, call, close: () => app.close() };
}

const customer = { name: 'Ada Lovelace', email: 'ada@example.com', line1: '1 Analytical St', city: 'London', postcode: 'n1 9gu', country: 'GB' };

async function adminCookie(call) {
  const r = await call('/api/admin/login', { method: 'POST', body: { password: 'test-password-123' } });
  return r.headers.get('set-cookie').split(';')[0];
}

module.exports = { boot, customer, adminCookie };
