'use strict';
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { boot, customer, adminCookie } = require('./helpers');
const { vatIncluded } = require('../lib/money');

const stockOf = (t, slug) => t.app.db.prepare('SELECT stock FROM products WHERE slug = ?').get(slug).stock;
const statusOf = (t, ref) => t.app.db.prepare('SELECT status FROM orders WHERE ref = ?').get(ref).status;

describe('storefront + checkout (mock provider)', () => {
  let t;
  before(async () => { t = await boot(); });
  after(() => t.close());

  test('health and catalogue', async () => {
    assert.equal((await t.call('/healthz')).status, 200);
    const r = await t.call('/api/products');
    assert.equal(r.status, 200);
    assert.ok(r.data.products.length >= 5);
    assert.ok(!('active' in r.data.products[0]), 'public view must not leak internal fields');
  });

  test('quote prices from the DB and ignores client-supplied prices', async () => {
    const r = await t.call('/api/quote', { method: 'POST', body: { items: [{ slug: 'logo-tee-black', qty: 2, price: 1 }] } });
    assert.equal(r.status, 200);
    assert.equal(r.data.subtotal, 4400);
    assert.equal(r.data.shipping, 495);
    assert.equal(r.data.total, 4895);
    assert.equal(r.data.tax, vatIncluded(4895, 0.2));
  });

  test('free shipping at the threshold', async () => {
    const r = await t.call('/api/quote', { method: 'POST', body: { items: [{ slug: 'logo-hoodie', qty: 2 }] } });
    assert.equal(r.data.shipping, 0);
    assert.equal(r.data.total, 9000);
  });

  test('rejects bad quantities, unknown items and empty carts', async () => {
    for (const items of [[], [{ slug: 'logo-tee-black', qty: 0 }], [{ slug: 'logo-tee-black', qty: 1.5 }], [{ slug: 'logo-tee-black', qty: 11 }], [{ qty: 1 }]]) {
      assert.equal((await t.call('/api/quote', { method: 'POST', body: { items } })).status, 400);
    }
    const r = await t.call('/api/quote', { method: 'POST', body: { items: [{ slug: 'nope', qty: 1 }] } });
    assert.equal(r.data.issues[0].problem, 'unavailable');
  });

  test('splitting a line cannot bypass the per-line max or stock check', async () => {
    const r = await t.call('/api/checkout', { method: 'POST', body: { items: [{ slug: 'poster-a2', qty: 2 }, { slug: 'poster-a2', qty: 2 }], customer } });
    assert.equal(r.status, 409); // 4 > 3 in stock
  });

  test('sold-out and over-stock items are flagged', async () => {
    const r = await t.call('/api/checkout', { method: 'POST', body: { items: [{ slug: 'limited-print', qty: 1 }], customer } });
    assert.equal(r.status, 409);
    const r2 = await t.call('/api/checkout', { method: 'POST', body: { items: [{ slug: 'poster-a2', qty: 5 }], customer } });
    assert.equal(r2.status, 409);
    assert.equal(r2.data.details[0].available, 3);
  });

  test('happy path: checkout reserves stock, pay marks paid, token protects order', async () => {
    const before = stockOf(t, 'logo-tee-black');
    const c = await t.call('/api/checkout', { method: 'POST', body: { items: [{ slug: 'logo-tee-black', qty: 2 }], customer } });
    assert.equal(c.status, 201);
    const { ref, token, redirectUrl } = c.data;
    assert.match(redirectUrl, /mock-pay\.html/);
    assert.equal(stockOf(t, 'logo-tee-black'), before - 2, 'stock reserved');

    assert.equal((await t.call(`/api/orders/${ref}`)).status, 404, 'no token = no access');
    assert.equal((await t.call(`/api/orders/${ref}?token=wrong`)).status, 404);
    assert.equal((await t.call(`/api/orders/${ref}?token=${token}`)).data.status, 'pending');

    assert.equal((await t.call('/api/mock/pay', { method: 'POST', body: { ref, token, outcome: 'success' } })).status, 200);
    assert.equal((await t.call('/api/mock/pay', { method: 'POST', body: { ref, token, outcome: 'success' } })).status, 200, 'idempotent');
    const o = (await t.call(`/api/orders/${ref}?token=${token}`)).data;
    assert.equal(o.status, 'paid');
    assert.equal(o.address.postcode, 'N1 9GU');
    assert.equal(t.app.db.prepare('SELECT COUNT(*) n FROM outbox WHERE subject LIKE ?').get(`%${ref}%`).n, 1, 'one confirmation email only');
  });

  test('mock pay cannot be used without the order token', async () => {
    const c = await t.call('/api/checkout', { method: 'POST', body: { items: [{ slug: 'enamel-pin', qty: 1 }], customer } });
    const r = await t.call('/api/mock/pay', { method: 'POST', body: { ref: c.data.ref, token: 'guess', outcome: 'success' } });
    assert.equal(r.status, 404);
    assert.equal(statusOf(t, c.data.ref), 'pending');
  });

  test('abandoned payment releases stock', async () => {
    const before = stockOf(t, 'tote-bag');
    const c = await t.call('/api/checkout', { method: 'POST', body: { items: [{ slug: 'tote-bag', qty: 3 }], customer } });
    assert.equal(stockOf(t, 'tote-bag'), before - 3);
    await t.call('/api/mock/pay', { method: 'POST', body: { ref: c.data.ref, token: c.data.token, outcome: 'fail' } });
    assert.equal(stockOf(t, 'tote-bag'), before);
    assert.equal(statusOf(t, c.data.ref), 'cancelled');
  });

  test('stale pending orders are expired and stock returned', async () => {
    const orders = require('../lib/orders');
    const before = stockOf(t, 'sticker-pack');
    const c = await t.call('/api/checkout', { method: 'POST', body: { items: [{ slug: 'sticker-pack', qty: 4 }], customer } });
    t.app.db.prepare("UPDATE orders SET created_at = datetime('now','-2 hours') WHERE ref = ?").run(c.data.ref);
    assert.equal(orders.expireStale(t.app.db, 30), 1);
    assert.equal(stockOf(t, 'sticker-pack'), before);
  });

  test('concurrent checkouts can never oversell', async () => {
    const before = stockOf(t, 'poster-a2'); // 3
    const results = await Promise.all(Array.from({ length: 8 }, () =>
      t.call('/api/checkout', { method: 'POST', body: { items: [{ slug: 'poster-a2', qty: 1 }], customer } })));
    assert.equal(results.filter((r) => r.status === 201).length, before);
    assert.equal(stockOf(t, 'poster-a2'), 0);
  });

  test('customer validation', async () => {
    for (const bad of [{ ...customer, email: 'nope' }, { ...customer, name: '' }, { ...customer, postcode: '' }, { ...customer, country: 'FR' }]) {
      const r = await t.call('/api/checkout', { method: 'POST', body: { items: [{ slug: 'enamel-pin', qty: 1 }], customer: bad } });
      assert.equal(r.status, 400, JSON.stringify(bad));
    }
  });

  test('bad JSON and oversize bodies are rejected cleanly', async () => {
    assert.equal((await t.call('/api/quote', { method: 'POST', raw: '{nope', headers: { 'Content-Type': 'application/json' } })).status, 400);
    assert.equal((await t.call('/api/quote', { method: 'POST', raw: 'x'.repeat(200_000) })).status, 413);
  });

  test('security headers and static path traversal', async () => {
    const r = await t.call('/');
    assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.notEqual((await t.call('/..%2f..%2fpackage.json')).status, 200);
    assert.notEqual((await t.call('/%2e%2e/package.json')).status, 200);
  });

  test('product art is escaped', async () => {
    const h = { cookie: await adminCookie(t.call), 'X-Requested-With': 'shop' };
    const c = await t.call('/api/admin/products', { method: 'POST', headers: h, body: { name: '<script>alert(1)</script>', slug: 'xss', price: 100, stock: 1 } });
    assert.equal(c.status, 201);
    assert.ok(!(await t.call('/img/xss.svg')).data.includes('<script>'));
  });
});

describe('admin', () => {
  test('requires login; wrong password rejected; rate limited', async () => {
    const t = await boot();
    try {
      assert.equal((await t.call('/api/admin/orders')).status, 401);
      for (let i = 0; i < 5; i++) assert.equal((await t.call('/api/admin/login', { method: 'POST', body: { password: 'bad' } })).status, 401);
      assert.equal((await t.call('/api/admin/login', { method: 'POST', body: { password: 'test-password-123' } })).status, 429);
    } finally { t.close(); }
  });

  test('cookie is HttpOnly + SameSite=Strict; writes need CSRF header; logout kills session', async () => {
    const t = await boot();
    try {
      const r = await t.call('/api/admin/login', { method: 'POST', body: { password: 'test-password-123' } });
      const sc = r.headers.get('set-cookie');
      assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Strict/);
      const cookie = sc.split(';')[0];
      assert.equal((await t.call('/api/admin/orders', { headers: { cookie } })).status, 200);
      assert.equal((await t.call('/api/admin/products', { method: 'POST', headers: { cookie }, body: { name: 'A', slug: 'a', price: 1, stock: 1 } })).status, 403);
      await t.call('/api/admin/logout', { method: 'POST', headers: { cookie, 'X-Requested-With': 'shop' } });
      assert.equal((await t.call('/api/admin/orders', { headers: { cookie } })).status, 401);
    } finally { t.close(); }
  });

  test('order lifecycle: paid -> fulfilled; cancel releases stock; bad transitions blocked', async () => {
    const t = await boot();
    try {
      const h = { cookie: await adminCookie(t.call), 'X-Requested-With': 'shop' };
      const mk = async (qty) => {
        const c = await t.call('/api/checkout', { method: 'POST', body: { items: [{ slug: 'dad-cap', qty }], customer } });
        await t.call('/api/mock/pay', { method: 'POST', body: { ref: c.data.ref, token: c.data.token } });
        return c.data.ref;
      };
      const stock0 = stockOf(t, 'dad-cap');
      const a = await mk(2);
      assert.equal((await t.call(`/api/admin/orders/${a}/status`, { method: 'POST', headers: h, body: { status: 'fulfilled' } })).data.status, 'fulfilled');
      assert.equal((await t.call(`/api/admin/orders/${a}/status`, { method: 'POST', headers: h, body: { status: 'cancelled' } })).status, 409);
      const b = await mk(3);
      assert.equal((await t.call(`/api/admin/orders/${b}/status`, { method: 'POST', headers: h, body: { status: 'cancelled' } })).status, 200);
      assert.equal(stockOf(t, 'dad-cap'), stock0 - 2);
      assert.equal((await t.call('/api/admin/stats', { headers: h })).data.paid_orders, 1);
    } finally { t.close(); }
  });

  test('product validation and edit', async () => {
    const t = await boot();
    try {
      const h = { cookie: await adminCookie(t.call), 'X-Requested-With': 'shop' };
      const bad = [{ name: 'x', slug: 'Bad Slug', price: 1, stock: 1 }, { name: 'x', slug: 'ok', price: 1.5, stock: 1 }, { name: 'x', slug: 'ok', price: -1, stock: 1 },
        { name: 'x', slug: 'ok', price: 1, stock: 1, image_url: 'javascript:alert(1)' }, { name: 'x', slug: 'ok', price: 1, stock: 1, color: 'red' }];
      for (const b of bad) assert.equal((await t.call('/api/admin/products', { method: 'POST', headers: h, body: b })).status, 400, JSON.stringify(b));
      assert.equal((await t.call('/api/admin/products', { method: 'POST', headers: h, body: { name: 'x', slug: 'logo-hoodie', price: 1, stock: 1 } })).status, 409);
      assert.equal((await t.call('/api/admin/products/1', { method: 'POST', headers: h, body: { price: 999, active: false } })).status, 200);
      assert.equal((await t.call('/api/products/logo-tee-black')).status, 404, 'deactivated product hidden');
    } finally { t.close(); }
  });
});

describe('production config guard', () => {
  const { load } = require('../lib/config');
  test('demo seeding is off in production unless asked', () => {
    const prod = { NODE_ENV: 'production', PAYMENT_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'sk', STRIPE_WEBHOOK_SECRET: 'wh', BASE_URL: 'https://x.test', ADMIN_PASSWORD: 'long-enough-password' };
    assert.equal(load(prod).seedDemo, false);
    assert.equal(load({ ...prod, SEED_DEMO: 'true' }).seedDemo, true);
    assert.equal(load({}).seedDemo, true);
  });
  test('refuses to boot insecurely', () => {
    assert.throws(() => load({ NODE_ENV: 'production', PAYMENT_PROVIDER: 'mock', BASE_URL: 'http://x.test', ADMIN_PASSWORD: 'short' }), /Refusing to start/);
    assert.throws(() => load({ NODE_ENV: 'production', PAYMENT_PROVIDER: 'stripe', BASE_URL: 'https://x.test', ADMIN_PASSWORD: 'long-enough-password' }), /STRIPE_SECRET_KEY/);
    assert.doesNotThrow(() => load({ NODE_ENV: 'production', PAYMENT_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'sk', STRIPE_WEBHOOK_SECRET: 'wh', BASE_URL: 'https://x.test', ADMIN_PASSWORD: 'long-enough-password' }));
  });
});

describe('stripe webhook (signature, idempotency, amount check)', () => {
  let t; const secret = 'whsec_test';
  before(async () => { t = await boot({ PAYMENT_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: secret }); });
  after(() => t.close());

  const sign = (payload, ts = Math.floor(Date.now() / 1000)) => `t=${ts},v1=${crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex')}`;
  const hook = (event, sig) => { const raw = JSON.stringify(event); return t.call('/api/webhooks/stripe', { method: 'POST', raw, headers: { 'Content-Type': 'application/json', 'stripe-signature': sig ?? sign(raw) } }); };
  const pendingOrder = (qty = 1) => require('../lib/orders').create(t.app.db, t.cfg.store, 'stripe', { items: [{ slug: 'tote-bag', qty }], customer });
  const completed = (id, ref, amount) => ({ id, type: 'checkout.session.completed', data: { object: { id: 'cs_1', payment_status: 'paid', amount_total: amount, metadata: { order_ref: ref } } } });

  test('rejects bad / missing / stale signatures', async () => {
    const o = pendingOrder();
    const ev = completed('evt_a', o.ref, o.total);
    assert.equal((await hook(ev, 't=1,v1=deadbeef')).status, 400);
    assert.equal((await hook(ev, '')).status, 400);
    assert.equal((await hook(ev, sign(JSON.stringify(ev), Math.floor(Date.now() / 1000) - 3600))).status, 400, 'replay window');
    assert.equal(statusOf(t, o.ref), 'pending');
  });

  test('valid event marks paid exactly once, duplicates ignored', async () => {
    const o = pendingOrder();
    assert.equal((await hook(completed('evt_b', o.ref, o.total))).status, 200);
    assert.equal(statusOf(t, o.ref), 'paid');
    assert.equal((await hook(completed('evt_b', o.ref, o.total))).data.duplicate, true);
    assert.equal(t.app.db.prepare('SELECT COUNT(*) n FROM outbox WHERE subject LIKE ?').get(`%${o.ref}%`).n, 1);
  });

  test('amount mismatch is refused and order stays pending', async () => {
    const o = pendingOrder();
    assert.equal((await hook(completed('evt_c', o.ref, 1))).status, 409);
    assert.equal(statusOf(t, o.ref), 'pending');
  });

  test('expired session releases stock', async () => {
    const before = stockOf(t, 'tote-bag');
    const o = pendingOrder(2);
    await hook({ id: 'evt_d', type: 'checkout.session.expired', data: { object: { metadata: { order_ref: o.ref } } } });
    assert.equal(stockOf(t, 'tote-bag'), before);
  });

  test('mock endpoint is off when provider is stripe', async () => {
    assert.equal((await t.call('/api/mock/pay', { method: 'POST', body: { ref: 'x', token: 'y' } })).status, 404);
  });
});
