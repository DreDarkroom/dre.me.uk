'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const app = $('#app');
  let CFG = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => new Intl.NumberFormat(CFG?.locale || 'en-GB', { style: 'currency', currency: CFG?.currency || 'GBP' }).format(n / 100);

  // ---- basket (localStorage; prices are never stored, the server re-prices everything)
  const CART_KEY = 'basket.v1';
  const cart = {
    get() { try { const v = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(v) ? v : []; } catch { return []; } },
    set(v) { try { localStorage.setItem(CART_KEY, JSON.stringify(v)); } catch { /* private mode */ } badge(); },
    add(slug, qty = 1) {
      const c = this.get(); const l = c.find((x) => x.slug === slug);
      if (l) l.qty = Math.min(10, l.qty + qty); else c.push({ slug, qty });
      this.set(c);
    },
    setQty(slug, qty) { this.set(this.get().map((l) => (l.slug === slug ? { ...l, qty } : l)).filter((l) => l.qty > 0)); },
    clear() { this.set([]); },
  };
  const badge = () => { $('#count').textContent = cart.get().reduce((s, l) => s + l.qty, 0); };

  async function api(path, opts) {
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || `Error ${res.status}`); e.details = data.details; throw e; }
    return data;
  }
  const post = (path, body) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  // ---- views
  async function home(query) {
    const cat = query.get('cat') || '';
    const { products, categories } = await api('/api/products' + (cat ? `?category=${encodeURIComponent(cat)}` : ''));
    app.innerHTML = `<h1>${esc(CFG.name)}</h1><p class="sub">${esc(CFG.tagline)}</p>
      <div class="filters" role="group" aria-label="Categories">
        <button class="chip" data-cat="" aria-pressed="${!cat}">All</button>
        ${categories.map((c) => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${c === cat}">${esc(c)}</button>`).join('')}
      </div>
      <div class="grid">${products.map((p) => `
        <a class="card" href="#/p/${esc(p.slug)}">
          <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" width="600" height="600">
          <div class="meta"><div class="n">${esc(p.name)}${!p.inStock ? '<span class="tag out">Sold out</span>' : p.stock <= 3 ? '<span class="tag warn">Low stock</span>' : ''}</div>
          <div class="price">${money(p.price)}</div></div></a>`).join('') || '<p>Nothing here yet.</p>'}</div>`;
    app.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { location.hash = b.dataset.cat ? `#/?cat=${encodeURIComponent(b.dataset.cat)}` : '#/'; }));
  }

  async function product(slug) {
    const p = await api('/api/products/' + encodeURIComponent(slug));
    document.title = `${p.name} | ${CFG.name}`;
    app.innerHTML = `<p><a href="#/">&larr; All products</a></p><div class="pdp">
      <img src="${esc(p.image)}" alt="${esc(p.name)}" width="600" height="600">
      <div><h1>${esc(p.name)}</h1><p class="price" id="pp">${money(p.price)}${CFG.pricesIncludeVat ? ' <span class="hint">incl. VAT</span>' : ''}</p>
      <p>${esc(p.description)}</p>
      ${p.inStock ? `<div class="row"><label class="sr" for="q">Quantity</label><input id="q" class="qty" type="number" min="1" max="${Math.min(10, p.stock)}" value="1">
        <button class="btn" id="add">Add to basket</button></div>` : '<p><span class="tag out">Sold out</span></p>'}
      <p class="hint" id="added" role="status"></p></div></div>`;
    $('#add')?.addEventListener('click', () => {
      const q = Math.max(1, Math.min(p.stock, parseInt($('#q').value, 10) || 1));
      cart.add(p.slug, q);
      $('#added').innerHTML = 'Added. <a href="#/cart">View basket</a>';
    });
  }

  async function quoteCart() {
    const lines = cart.get();
    if (!lines.length) return null;
    return post('/api/quote', { items: lines });
  }

  function totalsHtml(q) {
    return `<div class="totals"><div><span>Subtotal</span><span>${money(q.subtotal)}</span></div>
      <div><span>Shipping</span><span>${q.shipping ? money(q.shipping) : 'Free'}</span></div>
      <div><span>incl. VAT</span><span>${money(q.tax)}</span></div>
      <div class="grand"><span>Total</span><span>${money(q.total)}</span></div></div>`;
  }

  async function cartView() {
    app.innerHTML = '<h1>Basket</h1><p>Loading…</p>';
    let q;
    try { q = await quoteCart(); } catch (e) {
      // Stale lines (item removed/out of stock): drop the offenders and retry once.
      if (e.details) { const bad = new Set(e.details.map((d) => d.slug)); cart.set(cart.get().filter((l) => !bad.has(l.slug))); }
      return cartView();
    }
    if (!q) { app.innerHTML = '<h1>Basket</h1><p>Your basket is empty. <a href="#/">Keep browsing</a></p>'; return; }
    const stale = q.issues.length ? `<div class="msg">Some items changed: ${q.issues.map((i) => esc(i.slug) + ' (' + esc(i.problem.replace('_', ' ')) + ')').join(', ')}. <button class="chip" id="fix">Remove them</button></div>` : '';
    app.innerHTML = `<h1>Basket</h1>${stale}<table><thead><tr><th>Item</th><th>Qty</th><th class="r">Price</th></tr></thead><tbody>
      ${q.items.map((i) => `<tr class="line"><td><img src="/img/${esc(i.slug)}.svg" alt="">${esc(i.name)}</td>
        <td><input class="qty" type="number" min="0" max="10" value="${i.qty}" data-slug="${esc(i.slug)}" aria-label="Quantity for ${esc(i.name)}"></td>
        <td class="r">${money(i.line_total)}</td></tr>`).join('')}</tbody></table>
      ${totalsHtml(q)}
      <p class="hint">${q.shipping ? `Free shipping over ${money(CFG.shipping.freeOver)}.` : 'You get free shipping.'}</p>
      <div class="row"><a class="btn ghost" href="#/">Keep shopping</a>${q.items.length && !q.issues.length ? '<a class="btn" href="#/checkout">Checkout</a>' : ''}</div>`;
    app.querySelectorAll('input[data-slug]').forEach((i) => i.addEventListener('change', () => { cart.setQty(i.dataset.slug, Math.max(0, Math.min(10, parseInt(i.value, 10) || 0))); cartView(); }));
    $('#fix')?.addEventListener('click', () => { const bad = new Set(q.issues.map((x) => x.slug)); cart.set(cart.get().filter((l) => !bad.has(l.slug))); cartView(); });
  }

  async function checkout() {
    let q; try { q = await quoteCart(); } catch { return (location.hash = '#/cart'); }
    if (!q || q.issues.length) return (location.hash = '#/cart');
    const f = (id, label, extra = '') => `<div><label for="${id}">${label}</label><input id="${id}" name="${id}" ${extra}></div>`;
    app.innerHTML = `<h1>Checkout</h1><form id="co" novalidate><div class="panel"><div class="form2">
      ${f('name', 'Full name', 'required autocomplete="name"')}${f('email', 'Email', 'type="email" required autocomplete="email"')}
      ${f('line1', 'Address line 1', 'required autocomplete="address-line1"')}${f('line2', 'Address line 2 (optional)', 'autocomplete="address-line2"')}
      ${f('city', 'Town / city', 'required autocomplete="address-level2"')}${f('postcode', 'Postcode', 'required autocomplete="postal-code"')}
      <div><label for="country">Country</label><select id="country">${CFG.shipping.countries.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></div>
      </div></div>${totalsHtml(q)}<div id="err" role="alert"></div>
      <p class="hint">${CFG.provider === 'mock' ? 'Demo mode: no real payment is taken.' : 'You will be redirected to our payment provider.'}</p>
      <div class="row"><a class="btn ghost" href="#/cart">Back</a><button class="btn" id="pay">Pay ${money(q.total)}</button></div></form>`;
    $('#co').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#pay'); btn.disabled = true; $('#err').innerHTML = '';
      const v = (id) => $('#' + id).value;
      try {
        const r = await post('/api/checkout', { items: cart.get(), customer: { name: v('name'), email: v('email'), line1: v('line1'), line2: v('line2'), city: v('city'), postcode: v('postcode'), country: v('country') } });
        cart.clear();
        location.href = r.redirectUrl;
      } catch (err) { btn.disabled = false; $('#err').innerHTML = `<div class="msg">${esc(err.message)}</div>`; }
    });
  }

  async function orderView(ref, query) {
    const token = query.get('token') || '';
    const load = () => api(`/api/orders/${encodeURIComponent(ref)}?token=${encodeURIComponent(token)}`);
    let o; try { o = await load(); } catch (e) { app.innerHTML = `<h1>Order</h1><div class="msg">${esc(e.message)}</div>`; return; }
    // Payment confirmation can lag the redirect (webhook): poll briefly while pending.
    const render = () => {
      const msg = { pending: 'Waiting for payment confirmation…', paid: 'Thank you! Payment received.', fulfilled: 'Your order has been dispatched.', cancelled: 'This order was cancelled.' }[o.status];
      app.innerHTML = `<h1>Order ${esc(o.ref)}</h1><div class="msg ${o.status === 'cancelled' ? '' : 'ok'}"><span class="status">${esc(o.status)}</span> ${esc(msg)}</div>
        <table><tbody>${o.items.map((i) => `<tr><td>${esc(i.name)} &times; ${i.qty}</td><td class="r">${money(i.unit_price * i.qty)}</td></tr>`).join('')}</tbody></table>
        ${totalsHtml(o)}<p class="hint">Confirmation sent to ${esc(o.email)}. Keep this page's link to check your order.</p><a class="btn ghost" href="#/">Back to shop</a>`;
    };
    render();
    for (let i = 0; i < 10 && o.status === 'pending' && location.hash.includes(ref); i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try { o = await load(); render(); } catch { break; }
    }
  }

  // ---- router
  async function route() {
    const [path, qs] = (location.hash.slice(1) || '/').split('?');
    const query = new URLSearchParams(qs || '');
    document.title = CFG.name;
    window.scrollTo(0, 0);
    try {
      let m;
      if (path === '/') await home(query);
      else if ((m = path.match(/^\/p\/([^/]+)$/))) await product(decodeURIComponent(m[1]));
      else if (path === '/cart') await cartView();
      else if (path === '/checkout') await checkout();
      else if ((m = path.match(/^\/order\/([^/]+)$/))) await orderView(decodeURIComponent(m[1]), query);
      else app.innerHTML = '<h1>Not found</h1><p><a href="#/">Back to the shop</a></p>';
    } catch (e) { app.innerHTML = `<h1>Something went wrong</h1><div class="msg">${esc(e.message)}</div><p><a href="#/">Back to the shop</a></p>`; }
  }

  (async () => {
    CFG = await api('/api/config');
    $('#brand').textContent = CFG.name;
    $('#foot').innerHTML = `&copy; ${new Date().getFullYear()} ${esc(CFG.name)} &middot; <a href="mailto:${esc(CFG.supportEmail)}">${esc(CFG.supportEmail)}</a>`;
    badge();
    addEventListener('hashchange', route);
    route();
  })();
})();
