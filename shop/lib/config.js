'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// Minimal .env loader (no dependency). Real environment variables win.
function loadEnvFile() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

function load(overrides = {}) {
  loadEnvFile();
  const env = { ...process.env, ...overrides };
  const store = JSON.parse(fs.readFileSync(path.join(ROOT, 'store.config.json'), 'utf8'));
  const production = env.NODE_ENV === 'production';
  const cfg = {
    root: ROOT,
    production,
    port: Number(env.PORT || 3000),
    baseUrl: (env.BASE_URL || `http://localhost:${env.PORT || 3000}`).replace(/\/$/, ''),
    dbPath: env.DATABASE_PATH || path.join(ROOT, 'data', 'shop.db'),
    adminPassword: env.ADMIN_PASSWORD || '',
    // Demo catalogue is seeded into an empty DB in dev only, unless SEED_DEMO=true is set explicitly.
    seedDemo: env.SEED_DEMO ? env.SEED_DEMO === 'true' : !production,
    provider: env.PAYMENT_PROVIDER || 'mock',
    stripeSecret: env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    store,
  };
  if (production) {
    const problems = [];
    if (cfg.adminPassword.length < 12) problems.push('ADMIN_PASSWORD must be set (12+ chars)');
    if (!/^https:\/\//.test(cfg.baseUrl)) problems.push('BASE_URL must be https in production');
    if (cfg.provider === 'mock') problems.push('PAYMENT_PROVIDER=mock is not allowed in production');
    if (cfg.provider === 'stripe' && (!cfg.stripeSecret || !cfg.stripeWebhookSecret))
      problems.push('STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required');
    if (problems.length) throw new Error('Refusing to start:\n - ' + problems.join('\n - '));
  }
  return cfg;
}

module.exports = { load };
