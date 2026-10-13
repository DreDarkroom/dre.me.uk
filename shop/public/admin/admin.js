'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const app = $('#app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n / 100);
  const H = { 'Content-Type': 'application/json', 'X-Requested-With': 'shop' };

  async function api(path, method = 'GET', body) {
    const res = await fetch(path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { login(); throw new Error('Signed out'); }
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  }

  function login(err = '') {
    $('#logout').hidden = true;
    app.innerHTML = `<h1>Sign in</h1><form id="f" class="panel"><label for="pw">Admin password</label><input id="pw" type="password" autocomplete="current-password" required>
      <div id="err" role="alert">${err ? `<div class="msg">${esc(err)}</div>` : ''}</div><p><button class="btn">Sign in</button></p></form>`;
    $('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await api('/api/admin/login', 'POST', { password: $('#pw').value }); dash(); }
      catch (x) { $('#err').innerHTML = `<div class="msg">${esc(x.message)}</div>`; }
    });
  }

  async function dash(tab = 'orders') {
    $('#logout').hidden = false;
    const s = await api('/api/admin/stats');
    app.innerHTML = `<div class="grid">
      <div class="panel"><div class="hint">Revenue</div><h1>${money(s.revenue)}</h1></div>
      <div class="panel"><div class="hint">Paid orders</div><h1>${s.paid_orders}</h1></div>
      <div class="panel"><div class="hint">To fulfil</div><h1>${s.to_fulfil}</h1></div>
      <div class="panel"><div class="hint">Awaiting payment</div><h1>${s.pending}</h1></div></div>
      ${s.lowStock.length ? `<div class="msg">Low stock: ${s.lowStock.map((p) => `${esc(p.name)} (${p.stock})`).join(', ')}</div>` : ''}
      <div class="filters"><button class="chip" data-tab="orders" aria-pressed="${tab === 'orders'}">Orders</button><button class="chip" data-tab="products" aria-pressed="${tab === 'products'}">Products</button></div><div id="tab"></div>`;
    app.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => dash(b.dataset.tab)));
    tab === 'orders' ? orders() : products();
  }

  async function orders() {
    const { orders } = await api('/api/admin/orders');
    $('#tab').innerHTML = `<table><thead><tr><th>Ref</th><th>Customer</th><th>Items</th><th class="r">Total</th><th>Status</th><th></th></tr></thead><tbody>
      ${orders.map((o) => `<tr><td>${esc(o.ref)}<div class="hint">${esc(o.created_at)}</div></td>
        <td>${esc(o.name)}<div class="hint">${esc(o.email)}<br>${esc([o.address.line1, o.address.line2, o.address.city, o.address.postcode, o.address.country].filter(Boolean).join(', '))}</div></td>
        <td>${o.items.map((i) => `${esc(i.name)} &times; ${i.qty}`).join('<br>')}</td><td class="r">${money(o.total)}</td>
        <td><span class="status">${esc(o.status)}</span></td>
        <td>${o.status === 'paid' ? `<button class="btn" data-ref="${esc(o.ref)}" data-to="fulfilled">Mark dispatched</button> ` : ''}${['paid', 'pending'].includes(o.status) ? `<button class="btn ghost" data-ref="${esc(o.ref)}" data-to="cancelled">Cancel</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6">No orders yet.</td></tr>'}</tbody></table>
      <p class="hint">Cancelling releases stock but does NOT refund: refund in your payment provider's dashboard.</p>`;
    $('#tab').querySelectorAll('button[data-ref]').forEach((b) => b.addEventListener('click', async () => {
      if (b.dataset.to === 'cancelled' && !confirm(`Cancel ${b.dataset.ref}? Stock will be released. This does not refund the customer.`)) return;
      try { await api(`/api/admin/orders/${b.dataset.ref}/status`, 'POST', { status: b.dataset.to }); dash('orders'); } catch (e) { alert(e.message); }
    }));
  }

  async function products() {
    const { products } = await api('/api/admin/products');
    const row = (p) => `<tr data-id="${p.id}"><td><input data-k="name" value="${esc(p.name)}" aria-label="Name"><div class="hint">/${esc(p.slug)}</div></td>
      <td><input data-k="price" type="number" min="0" step="0.01" value="${(p.price / 100).toFixed(2)}" aria-label="Price in pounds"></td>
      <td><input data-k="stock" type="number" min="0" value="${p.stock}" aria-label="Stock"></td>
      <td><input data-k="active" type="checkbox" ${p.active ? 'checked' : ''} aria-label="Active"></td><td><button class="btn" data-save>Save</button></td></tr>`;
    $('#tab').innerHTML = `<table><thead><tr><th>Name</th><th>Price (£)</th><th>Stock</th><th>Live</th><th></th></tr></thead><tbody>${products.map(row).join('')}</tbody></table>
      <h2>New product</h2><form id="np" class="panel form2">
      <div><label for="n-name">Name</label><input id="n-name" required></div><div><label for="n-slug">Slug</label><input id="n-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*"></div>
      <div><label for="n-price">Price (£)</label><input id="n-price" type="number" min="0" step="0.01" required></div><div><label for="n-stock">Stock</label><input id="n-stock" type="number" min="0" value="0" required></div>
      <div><label for="n-cat">Category</label><input id="n-cat" value="General"></div><div><label for="n-img">Image URL (optional, https:// or /path)</label><input id="n-img"></div>
      <div><label for="n-desc">Description</label><textarea id="n-desc" rows="3"></textarea></div><div><br><button class="btn">Create</button></div></form>`;
    $('#tab').querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', async () => {
      const tr = b.closest('tr'); const g = (k) => tr.querySelector(`[data-k=${k}]`);
      try {
        await api(`/api/admin/products/${tr.dataset.id}`, 'POST', { name: g('name').value, price: Math.round(parseFloat(g('price').value) * 100), stock: parseInt(g('stock').value, 10), active: g('active').checked });
        b.textContent = 'Saved'; setTimeout(() => (b.textContent = 'Save'), 1200);
      } catch (e) { alert(e.message); }
    }));
    $('#np').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/api/admin/products', 'POST', { name: $('#n-name').value, slug: $('#n-slug').value, price: Math.round(parseFloat($('#n-price').value) * 100), stock: parseInt($('#n-stock').value, 10), category: $('#n-cat').value, image_url: $('#n-img').value, description: $('#n-desc').value });
        dash('products');
      } catch (x) { alert(x.message); }
    });
  }

  $('#logout').addEventListener('click', async () => { await api('/api/admin/logout', 'POST').catch(() => {}); login(); });
  api('/api/admin/me').then(() => dash()).catch(() => login());
})();
