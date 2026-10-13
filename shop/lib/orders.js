'use strict';
const crypto = require('node:crypto');
const { tx } = require('./db');
const { HttpError } = require('./errors');
const { quote } = require('./pricing');

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const newRef = () => 'ORD-' + crypto.randomBytes(5).toString('hex').toUpperCase();
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

function validateCustomer(c, store) {
  if (!c || typeof c !== 'object') throw new HttpError(400, 'Customer details required');
  const s = (v, max) => String(v ?? '').trim().slice(0, max);
  const out = {
    name: s(c.name, 100), email: s(c.email, 254).toLowerCase(),
    line1: s(c.line1, 120), line2: s(c.line2, 120), city: s(c.city, 80),
    postcode: s(c.postcode, 12).toUpperCase(), country: s(c.country || 'GB', 2).toUpperCase(),
  };
  if (!out.name) throw new HttpError(400, 'Name is required');
  if (!EMAIL.test(out.email)) throw new HttpError(400, 'A valid email is required');
  if (!out.line1 || !out.city || !out.postcode) throw new HttpError(400, 'Full delivery address is required');
  if (!store.shipping.countries.includes(out.country)) throw new HttpError(400, `We only ship to: ${store.shipping.countries.join(', ')}`);
  return out;
}

// Creates a pending order and reserves stock atomically.
function create(db, store, provider, { items, customer }) {
  const cust = validateCustomer(customer, store);
  const order = tx(db, () => {
    const q = quote(db, store, items);
    if (q.issues.length) throw new HttpError(409, 'Some items are no longer available', q.issues);
    const ref = newRef();
    const token = crypto.randomBytes(24).toString('hex');
    const { name, email, ...addr } = cust;
    const r = db.prepare(`INSERT INTO orders (ref, token_hash, status, email, name, address, subtotal, shipping, tax, total, currency, provider)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(ref, sha(token), email, name, JSON.stringify(addr), q.subtotal, q.shipping, q.tax, q.total, q.currency, provider);
    const id = Number(r.lastInsertRowid);
    for (const i of q.items) {
      db.prepare('INSERT INTO order_items (order_id, product_id, name, unit_price, qty) VALUES (?,?,?,?,?)').run(id, i.product_id, i.name, i.unit_price, i.qty);
      // Guarded decrement: cannot oversell even under concurrent requests.
      const u = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?').run(i.qty, i.product_id, i.qty);
      if (!u.changes) throw new HttpError(409, 'Stock changed while ordering, please retry');
    }
    return { id, ref, token, ...q };
  });
  return order;
}

function getRaw(db, ref) {
  const o = db.prepare('SELECT * FROM orders WHERE ref = ?').get(ref);
  if (!o) throw new HttpError(404, 'Order not found');
  return o;
}

function items(db, orderId) {
  return db.prepare('SELECT name, unit_price, qty FROM order_items WHERE order_id = ?').all(orderId);
}

function view(db, o) {
  return {
    ref: o.ref, status: o.status, email: o.email, name: o.name, address: JSON.parse(o.address),
    subtotal: o.subtotal, shipping: o.shipping, tax: o.tax, total: o.total, currency: o.currency,
    created_at: o.created_at, paid_at: o.paid_at, items: items(db, o.id),
  };
}

// Customer-facing lookup: requires the unguessable token issued at checkout.
function publicLookup(db, ref, token) {
  const o = getRaw(db, ref);
  const a = Buffer.from(sha(String(token || '')));
  const b = Buffer.from(o.token_hash);
  if (!crypto.timingSafeEqual(a, b)) throw new HttpError(404, 'Order not found');
  return view(db, o);
}

function email(db, to, subject, body) {
  db.prepare('INSERT INTO outbox (to_addr, subject, body) VALUES (?,?,?)').run(to, subject, body);
}

// Idempotent: safe to call repeatedly (webhook retries). Verifies the amount paid.
function markPaid(db, ref, { amount, providerRef } = {}) {
  return tx(db, () => {
    const o = getRaw(db, ref);
    if (o.status === 'paid' || o.status === 'fulfilled') return { order: o, changed: false };
    if (amount !== undefined && amount !== o.total) throw new HttpError(409, `Amount mismatch for ${ref}: paid ${amount}, expected ${o.total}`);
    // A cancelled order whose stock was released can still be paid late; re-take stock if possible.
    if (o.status === 'cancelled') {
      for (const i of db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?').all(o.id)) {
        const u = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?').run(i.qty, i.product_id, i.qty);
        if (!u.changes) throw new HttpError(409, `Order ${ref} paid after expiry and stock is gone: refund required`);
      }
    }
    db.prepare(`UPDATE orders SET status='paid', paid_at=datetime('now'), updated_at=datetime('now'), provider_ref=COALESCE(?, provider_ref) WHERE id=?`).run(providerRef ?? null, o.id);
    email(db, o.email, `Order ${o.ref} confirmed`, `Thanks ${o.name}! We received your payment of ${(o.total / 100).toFixed(2)} ${o.currency}.`);
    return { order: getRaw(db, ref), changed: true };
  });
}

// Cancels a PENDING order and releases reserved stock.
function cancelPending(db, ref) {
  return tx(db, () => {
    const o = getRaw(db, ref);
    if (o.status !== 'pending') return false;
    for (const i of db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?').all(o.id))
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(i.qty, i.product_id);
    db.prepare(`UPDATE orders SET status='cancelled', updated_at=datetime('now') WHERE id=?`).run(o.id);
    return true;
  });
}

function expireStale(db, minutes) {
  const stale = db.prepare(`SELECT ref FROM orders WHERE status='pending' AND created_at < datetime('now', ?)`).all(`-${Math.floor(minutes)} minutes`);
  return stale.filter((r) => cancelPending(db, r.ref)).length;
}

const TRANSITIONS = { paid: ['fulfilled', 'cancelled'], fulfilled: [], pending: ['cancelled'], cancelled: [] };

// Admin status change. Cancelling a paid order releases stock; refunds are done in the payment provider dashboard.
function adminSetStatus(db, ref, status) {
  return tx(db, () => {
    const o = getRaw(db, ref);
    if (!(TRANSITIONS[o.status] || []).includes(status)) throw new HttpError(409, `Cannot go from ${o.status} to ${status}`);
    if (status === 'cancelled') {
      for (const i of db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?').all(o.id))
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(i.qty, i.product_id);
    }
    db.prepare(`UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, o.id);
    if (status === 'fulfilled') email(db, o.email, `Order ${o.ref} dispatched`, `Hi ${o.name}, your order is on its way.`);
    return view(db, getRaw(db, ref));
  });
}

function adminList(db, status) {
  const rows = status
    ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY id DESC LIMIT 200').all(status)
    : db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200').all();
  return rows.map((o) => view(db, o));
}

function stats(db) {
  const r = db.prepare(`SELECT
    COALESCE(SUM(CASE WHEN status IN ('paid','fulfilled') THEN total END),0) AS revenue,
    COUNT(CASE WHEN status IN ('paid','fulfilled') THEN 1 END) AS paid_orders,
    COUNT(CASE WHEN status='paid' THEN 1 END) AS to_fulfil,
    COUNT(CASE WHEN status='pending' THEN 1 END) AS pending FROM orders`).get();
  const low = db.prepare('SELECT name, stock FROM products WHERE active=1 AND stock <= 3 ORDER BY stock').all();
  return { ...r, lowStock: low };
}

module.exports = { create, getRaw, view, publicLookup, markPaid, cancelPending, expireStale, adminSetStatus, adminList, stats };
