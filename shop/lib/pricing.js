'use strict';
const { HttpError } = require('./errors');
const { vatIncluded } = require('./money');

const MAX_LINES = 20;
const MAX_QTY = 10;

// Turn untrusted client cart lines [{slug, qty}] into a priced, stock-checked quote.
// Prices ALWAYS come from the database, never from the client.
function quote(db, store, lines) {
  if (!Array.isArray(lines) || !lines.length) throw new HttpError(400, 'Cart is empty');
  if (lines.length > MAX_LINES) throw new HttpError(400, 'Too many lines in cart');

  const merged = new Map();
  for (const l of lines) {
    const qty = l && l.qty;
    if (!l || typeof l.slug !== 'string' || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY)
      throw new HttpError(400, `Each item needs a slug and a quantity between 1 and ${MAX_QTY}`);
    merged.set(l.slug, (merged.get(l.slug) || 0) + qty);
  }

  const items = [];
  const issues = [];
  for (const [slug, qty] of merged) {
    const p = db.prepare('SELECT * FROM products WHERE slug = ? AND active = 1').get(slug);
    if (!p) { issues.push({ slug, problem: 'unavailable' }); continue; }
    if (qty > MAX_QTY) { issues.push({ slug, problem: 'max_qty', max: MAX_QTY }); continue; }
    if (p.stock < qty) { issues.push({ slug, problem: 'insufficient_stock', available: p.stock }); continue; }
    items.push({ product_id: p.id, slug, name: p.name, unit_price: p.price, qty, line_total: p.price * qty });
  }

  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  const ship = store.shipping;
  const shipping = subtotal === 0 || subtotal >= ship.freeOver ? 0 : ship.flatRate;
  const gross = subtotal + shipping;
  const total = store.pricesIncludeVat ? gross : Math.round(gross * (1 + store.vatRate));
  const tax = store.pricesIncludeVat ? vatIncluded(gross, store.vatRate) : total - gross;
  return { items, issues, subtotal, shipping, tax, total, currency: store.currency };
}

module.exports = { quote, MAX_QTY };
