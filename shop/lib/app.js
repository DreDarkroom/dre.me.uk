'use strict';
const crypto = require('node:crypto');
const path = require('node:path');
const http = require('node:http');
const { open } = require('./db');
const { HttpError } = require('./errors');
const { json, send, readBody, parseCookies, serveStatic, Router } = require('./http');
const catalog = require('./catalog');
const orders = require('./orders');
const { quote } = require('./pricing');
const auth = require('./auth');
const { seedIfEmpty } = require('./seed');
const { svg } = require('./image');
const makeProvider = require('./payments');

function createApp(cfg, { db = open(cfg.dbPath), log = console } = {}) {
  if (cfg.seedDemo) seedIfEmpty(db);
  const provider = makeProvider(cfg);
  const store = cfg.store;
  const router = new Router();
  const publicDir = path.join(cfg.root, 'public');

  let adminPassword = cfg.adminPassword;
  if (!adminPassword) {
    adminPassword = crypto.randomBytes(9).toString('base64url');
    log.warn(`[admin] ADMIN_PASSWORD not set. Temporary dev password: ${adminPassword}`);
  }
  const verify = auth.makeVerifier(adminPassword);
  const loginLimit = auth.limiter(5, 15 * 60 * 1000);
  const checkoutLimit = auth.limiter(30, 60 * 1000);
  const cookieFlags = `HttpOnly; SameSite=Strict; Path=/${cfg.production ? '; Secure' : ''}`;

  const ip = (req) => req.socket.remoteAddress || 'unknown';
  const requireAdmin = (ctx) => {
    if (!auth.validSession(db, parseCookies(ctx.req.headers.cookie).sid)) throw new HttpError(401, 'Not signed in');
    // CSRF defence in depth: SameSite=Strict cookie + required custom header on writes.
    if (ctx.req.method !== 'GET' && ctx.req.headers['x-requested-with'] !== 'shop') throw new HttpError(403, 'Missing CSRF header');
  };
  const body = (ctx) => {
    if (!ctx.body || typeof ctx.body !== 'object' || Array.isArray(ctx.body)) throw new HttpError(400, 'JSON object body required');
    return ctx.body;
  };
  const get = (p, h) => router.add('GET', p, h);
  const post = (p, h) => router.add('POST', p, h);

  // ---- ops
  get('/healthz', (c) => json(c.res, 200, { ok: true }));
  get('/readyz', (c) => { db.prepare('SELECT 1').get(); json(c.res, 200, { ok: true, provider: provider.name }); });

  // ---- storefront
  get('/api/config', (c) => json(c.res, 200, {
    name: store.name, tagline: store.tagline, currency: store.currency, locale: store.locale,
    shipping: store.shipping, pricesIncludeVat: store.pricesIncludeVat, vatRate: store.vatRate,
    supportEmail: store.supportEmail, provider: provider.name,
  }));
  get('/theme.css', (c) => {
    const t = store.theme;
    const safe = (v) => (/^#[0-9a-fA-F]{3,8}$/.test(v) ? v : '#888');
    send(c.res, 200, `:root{--bg:${safe(t.bg)};--panel:${safe(t.panel)};--text:${safe(t.text)};--dim:${safe(t.dim)};--accent:${safe(t.accent)};--accent-text:${safe(t.accentText)}}`,
      { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-cache' });
  });
  get('/api/products', (c) => json(c.res, 200, { products: catalog.list(db, c.query), categories: catalog.categories(db) }));
  get('/api/products/:slug', (c) => json(c.res, 200, catalog.bySlug(db, c.params.slug)));
  get('/img/:file', (c) => {
    const slug = c.params.file.replace(/\.svg$/, '');
    const p = db.prepare('SELECT name, color FROM products WHERE slug = ?').get(slug);
    if (!p) throw new HttpError(404, 'Not found');
    send(c.res, 200, svg(p), { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' });
  });
  post('/api/quote', (c) => {
    const q = quote(db, store, body(c).items);
    json(c.res, 200, { ...q, items: q.items.map(({ product_id, ...i }) => i) });
  });
  post('/api/checkout', async (c) => {
    if (checkoutLimit.blocked(ip(c.req))) throw new HttpError(429, 'Too many requests');
    checkoutLimit.fail(ip(c.req));
    const b = body(c);
    const order = orders.create(db, store, provider.name, { items: b.items, customer: b.customer });
    try {
      const pay = await provider.createCheckout({ ...order, email: String(b.customer.email).trim().toLowerCase() });
      db.prepare('UPDATE orders SET provider_ref = ? WHERE ref = ?').run(pay.providerRef, order.ref);
      json(c.res, 201, { ref: order.ref, token: order.token, total: order.total, redirectUrl: pay.url });
    } catch (e) {
      orders.cancelPending(db, order.ref); // release the stock we reserved
      log.error('[checkout] payment provider failed:', e.message);
      throw new HttpError(502, 'Payment provider unavailable, please try again');
    }
  });
  get('/api/orders/:ref', (c) => json(c.res, 200, orders.publicLookup(db, c.params.ref, c.query.token)));

  // ---- payments
  post('/api/webhooks/stripe', (c) => {
    if (provider.name !== 'stripe') throw new HttpError(404, 'Not found');
    const event = provider.verifyWebhook(c.raw, c.req.headers['stripe-signature']);
    if (!event) throw new HttpError(400, 'Bad signature');
    const seen = db.prepare('INSERT OR IGNORE INTO webhook_events (id) VALUES (?)').run(event.id);
    if (!seen.changes) return json(c.res, 200, { received: true, duplicate: true });
    const obj = event.data?.object || {};
    const ref = obj.metadata?.order_ref || obj.client_reference_id;
    try {
      if (event.type === 'checkout.session.completed' && obj.payment_status === 'paid' && ref)
        orders.markPaid(db, ref, { amount: obj.amount_total, providerRef: obj.id });
      else if (event.type === 'checkout.session.expired' && ref) orders.cancelPending(db, ref);
    } catch (e) {
      // Let Stripe retry on genuine failures; keep mismatches visible in logs.
      db.prepare('DELETE FROM webhook_events WHERE id = ?').run(event.id);
      log.error('[webhook]', e.message);
      throw e;
    }
    json(c.res, 200, { received: true });
  });
  post('/api/mock/pay', (c) => {
    if (provider.name !== 'mock') throw new HttpError(404, 'Not found');
    const b = body(c);
    const o = orders.publicLookup(db, String(b.ref), b.token); // proves possession of the order token
    if (b.outcome === 'fail') orders.cancelPending(db, o.ref);
    else orders.markPaid(db, o.ref, { amount: o.total });
    json(c.res, 200, { ok: true });
  });

  // ---- admin
  post('/api/admin/login', (c) => {
    const key = ip(c.req);
    if (loginLimit.blocked(key)) throw new HttpError(429, 'Too many attempts, try again later');
    if (!verify(body(c).password ?? '')) { loginLimit.fail(key); throw new HttpError(401, 'Wrong password'); }
    loginLimit.reset(key);
    const sid = auth.createSession(db);
    json(c.res, 200, { ok: true }, { 'Set-Cookie': `sid=${sid}; Max-Age=${auth.TTL_MS / 1000}; ${cookieFlags}` });
  });
  post('/api/admin/logout', (c) => {
    auth.destroySession(db, parseCookies(c.req.headers.cookie).sid);
    json(c.res, 200, { ok: true }, { 'Set-Cookie': `sid=; Max-Age=0; ${cookieFlags}` });
  });
  get('/api/admin/me', (c) => { requireAdmin(c); json(c.res, 200, { ok: true }); });
  get('/api/admin/stats', (c) => { requireAdmin(c); json(c.res, 200, orders.stats(db)); });
  get('/api/admin/orders', (c) => { requireAdmin(c); json(c.res, 200, { orders: orders.adminList(db, c.query.status) }); });
  post('/api/admin/orders/:ref/status', (c) => { requireAdmin(c); json(c.res, 200, orders.adminSetStatus(db, c.params.ref, body(c).status)); });
  get('/api/admin/products', (c) => { requireAdmin(c); json(c.res, 200, { products: db.prepare('SELECT * FROM products ORDER BY id').all() }); });
  post('/api/admin/products', (c) => { requireAdmin(c); json(c.res, 201, { id: catalog.create(db, body(c)) }); });
  post('/api/admin/products/:id', (c) => { requireAdmin(c); catalog.update(db, Number(c.params.id), body(c)); json(c.res, 200, { ok: true }); });

  // ---- request pipeline
  async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    try {
      const m = router.match(req.method === 'HEAD' ? 'GET' : req.method, url.pathname);
      if (m) {
        const ctx = { req, res, params: m.params, query: Object.fromEntries(url.searchParams), raw: '', body: null };
        if (req.method === 'POST') {
          ctx.raw = await readBody(req);
          if (url.pathname !== '/api/webhooks/stripe' && ctx.raw) {
            try { ctx.body = JSON.parse(ctx.raw); } catch { throw new HttpError(400, 'Invalid JSON'); }
          }
        }
        return await m.handler(ctx);
      }
      if (req.method === 'GET' || req.method === 'HEAD') {
        if (url.pathname.startsWith('/api/')) throw new HttpError(404, 'Not found');
        return serveStatic(publicDir, req, res);
      }
      throw new HttpError(405, 'Method not allowed');
    } catch (e) {
      if (e instanceof HttpError) return json(res, e.status, { error: e.message, details: e.details });
      log.error(`[error] ${req.method} ${url.pathname}`, e);
      return json(res, 500, { error: 'Internal error' });
    }
  }

  const server = http.createServer((req, res) => {
    const t0 = Date.now();
    res.on('finish', () => log.info?.(`${req.method} ${req.url.split('?')[0]} ${res.statusCode} ${Date.now() - t0}ms`));
    handle(req, res);
  });

  const sweeper = setInterval(() => {
    try { const n = orders.expireStale(db, store.pendingOrderMinutes); if (n) log.info?.(`[sweeper] expired ${n} stale orders`); }
    catch (e) { log.error('[sweeper]', e.message); }
  }, 60_000);
  sweeper.unref();

  return { server, db, close: () => { clearInterval(sweeper); server.close(); } };
}

module.exports = { createApp };
