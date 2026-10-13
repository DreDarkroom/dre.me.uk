'use strict';
// Generated placeholder product art so the prototype needs no assets. Real photos: set image_url in admin.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function svg(product) {
  const words = product.name.split(/\s+/).slice(0, 2).join(' ');
  const c = /^#[0-9a-fA-F]{6}$/.test(product.color) ? product.color : '#d1122b';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="${esc(product.name)}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="#111"/></linearGradient></defs>
<rect width="600" height="600" fill="url(#g)"/><circle cx="300" cy="260" r="120" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="6"/>
<text x="300" y="285" font-family="system-ui,sans-serif" font-size="84" font-weight="800" fill="#fff" text-anchor="middle">${esc(product.name.slice(0, 1).toUpperCase())}</text>
<text x="300" y="480" font-family="system-ui,sans-serif" font-size="32" fill="#fff" fill-opacity=".85" text-anchor="middle">${esc(words)}</text></svg>`;
}
module.exports = { svg };
