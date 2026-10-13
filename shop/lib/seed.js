'use strict';
// Demo catalogue. Replace with your own: edit this list, or use the admin UI / POST /api/admin/products.
const DEMO = [
  ['logo-tee-black', 'Logo Tee (Black)', 'Heavyweight organic cotton tee. Unisex fit.', 'Apparel', 2200, 40, '#d1122b'],
  ['logo-hoodie', 'Logo Hoodie', 'Brushed-back fleece, embroidered chest logo.', 'Apparel', 4500, 25, '#1d4ed8'],
  ['dad-cap', 'Dad Cap', 'Washed cotton, adjustable strap.', 'Apparel', 1800, 60, '#15803d'],
  ['tote-bag', 'Canvas Tote', 'Fits a dozen records. Screen-printed.', 'Accessories', 1200, 80, '#b45309'],
  ['enamel-pin', 'Enamel Pin', 'Hard enamel, butterfly clasp.', 'Accessories', 600, 150, '#7e22ce'],
  ['sticker-pack', 'Sticker Pack (5)', 'Weatherproof vinyl stickers.', 'Accessories', 500, 200, '#0e7490'],
  ['poster-a2', 'A2 Gig Poster', 'Two-colour risograph print, numbered.', 'Prints', 1800, 3, '#be123c'],
  ['limited-print', 'Limited Print (sold out)', 'Edition of 50. Gone but not forgotten.', 'Prints', 3500, 0, '#475569'],
];

function seedIfEmpty(db) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM products').get();
  if (n > 0) return 0;
  const ins = db.prepare('INSERT INTO products (slug,name,description,category,price,stock,color) VALUES (?,?,?,?,?,?,?)');
  for (const p of DEMO) ins.run(...p);
  return DEMO.length;
}
module.exports = { seedIfEmpty };
