'use strict';
const crypto = require('node:crypto');

// Stripe Checkout (hosted page) over plain HTTPS: no SDK needed.
// NOTE: written to Stripe's documented API but not yet exercised against a live/test account.
module.exports = (cfg) => ({
  name: 'stripe',
  async createCheckout(order) {
    const p = new URLSearchParams();
    p.set('mode', 'payment');
    p.set('client_reference_id', order.ref);
    p.set('metadata[order_ref]', order.ref);
    p.set('customer_email', order.email);
    p.set('success_url', `${cfg.baseUrl}/#/order/${order.ref}?token=${order.token}`);
    p.set('cancel_url', `${cfg.baseUrl}/#/cart`);
    p.set('expires_at', String(Math.floor(Date.now() / 1000) + 1800));
    let n = 0;
    const line = (name, amount, qty) => {
      p.set(`line_items[${n}][quantity]`, String(qty));
      p.set(`line_items[${n}][price_data][currency]`, order.currency.toLowerCase());
      p.set(`line_items[${n}][price_data][unit_amount]`, String(amount));
      p.set(`line_items[${n}][price_data][product_data][name]`, name);
      n++;
    };
    for (const i of order.items) line(i.name, i.unit_price, i.qty);
    if (order.shipping) line('Shipping', order.shipping, 1);
    // If prices exclude VAT, Stripe must still charge our computed total.
    if (!cfg.store.pricesIncludeVat && order.tax) line('VAT', order.tax, 1);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `order-${order.ref}`,
      },
      body: p,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Stripe error: ${data.error?.message || res.status}`);
    return { url: data.url, providerRef: data.id };
  },

  // Verifies the `Stripe-Signature` header per https://docs.stripe.com/webhooks#verify-manually
  verifyWebhook(raw, header, now = Date.now()) {
    const parts = Object.fromEntries(String(header || '').split(',').map((kv) => kv.split('=')));
    const t = parts.t;
    const sigs = String(header || '').split(',').filter((kv) => kv.startsWith('v1=')).map((kv) => kv.slice(3));
    if (!t || !sigs.length) return null;
    if (Math.abs(now / 1000 - Number(t)) > 300) return null;
    const expected = crypto.createHmac('sha256', cfg.stripeWebhookSecret).update(`${t}.${raw}`).digest('hex');
    const ok = sigs.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
    return ok ? JSON.parse(raw) : null;
  },
});
