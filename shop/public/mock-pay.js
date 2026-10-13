'use strict';
const q = new URLSearchParams(location.search);
const ref = q.get('ref') || '', token = q.get('token') || '';
document.getElementById('ref').textContent = ref;
async function go(outcome) {
  const res = await fetch('/api/mock/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, token, outcome }) });
  if (!res.ok) { document.getElementById('err').textContent = (await res.json().catch(() => ({}))).error || 'Failed'; return; }
  location.href = outcome === 'fail' ? '/#/cart' : `/#/order/${encodeURIComponent(ref)}?token=${encodeURIComponent(token)}`;
}
document.getElementById('ok').addEventListener('click', () => go('success'));
document.getElementById('no').addEventListener('click', () => go('fail'));
