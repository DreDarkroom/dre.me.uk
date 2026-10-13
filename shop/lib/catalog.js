'use strict';
const { HttpError } = require('./errors');

const publicProduct = (p) => ({
  id: p.id, slug: p.slug, name: p.name, description: p.description, category: p.category,
  price: p.price, inStock: p.stock > 0, stock: Math.min(p.stock, 10),
  image: p.image_url || `/img/${p.slug}.svg`,
});

function list(db, { category, q } = {}) {
  let rows = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY id').all();
  if (category) rows = rows.filter((p) => p.category === category);
  if (q) rows = rows.filter((p) => (p.name + ' ' + p.description).toLowerCase().includes(String(q).toLowerCase()));
  return rows.map(publicProduct);
}

function bySlug(db, slug) {
  const p = db.prepare('SELECT * FROM products WHERE slug = ? AND active = 1').get(slug);
  if (!p) throw new HttpError(404, 'Product not found');
  return publicProduct(p);
}

function categories(db) {
  return db.prepare('SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category').all().map((r) => r.category);
}

// Admin-side validation shared by create/update.
function validateProduct(input, partial = false) {
  const out = {};
  const need = (k) => !partial || k in input;
  if (need('name')) {
    const v = String(input.name ?? '').trim();
    if (!v || v.length > 120) throw new HttpError(400, 'Name is required (max 120 chars)');
    out.name = v;
  }
  if (need('slug')) {
    const v = String(input.slug ?? '').trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) || v.length > 80) throw new HttpError(400, 'Slug must be lowercase letters, numbers and hyphens');
    out.slug = v;
  }
  if (need('price')) {
    if (!Number.isInteger(input.price) || input.price < 0 || input.price > 10_000_000) throw new HttpError(400, 'Price must be a whole number of pence');
    out.price = input.price;
  }
  if (need('stock')) {
    if (!Number.isInteger(input.stock) || input.stock < 0 || input.stock > 1_000_000) throw new HttpError(400, 'Stock must be a whole number >= 0');
    out.stock = input.stock;
  }
  if ('description' in input) out.description = String(input.description).slice(0, 4000);
  if ('category' in input) out.category = String(input.category).trim().slice(0, 60) || 'General';
  if ('active' in input) out.active = input.active ? 1 : 0;
  if ('color' in input) {
    if (!/^#[0-9a-fA-F]{6}$/.test(input.color)) throw new HttpError(400, 'Colour must be a #rrggbb hex');
    out.color = input.color;
  }
  if ('image_url' in input) {
    const v = String(input.image_url).trim();
    if (v && !/^(https:\/\/|\/)[^\s"'<>]*$/.test(v)) throw new HttpError(400, 'Image URL must be https:// or a /path');
    out.image_url = v;
  }
  return out;
}

function create(db, input) {
  const v = validateProduct(input);
  const cols = Object.keys(v);
  try {
    const r = db.prepare(`INSERT INTO products (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => v[c]));
    return Number(r.lastInsertRowid);
  } catch (e) {
    if (/UNIQUE/.test(e.message)) throw new HttpError(409, 'Slug already exists');
    throw e;
  }
}

function update(db, id, input) {
  const v = validateProduct(input, true);
  const cols = Object.keys(v);
  if (!cols.length) throw new HttpError(400, 'Nothing to update');
  try {
    const r = db.prepare(`UPDATE products SET ${cols.map((c) => c + ' = ?').join(',')} WHERE id = ?`).run(...cols.map((c) => v[c]), id);
    if (!r.changes) throw new HttpError(404, 'Product not found');
  } catch (e) {
    if (/UNIQUE/.test(e.message)) throw new HttpError(409, 'Slug already exists');
    throw e;
  }
}

module.exports = { list, bySlug, categories, create, update };
