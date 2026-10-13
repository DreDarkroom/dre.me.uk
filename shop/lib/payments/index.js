'use strict';
module.exports = (cfg) => {
  if (cfg.provider === 'stripe') return require('./stripe')(cfg);
  if (cfg.provider === 'mock') return require('./mock')(cfg);
  throw new Error(`Unknown PAYMENT_PROVIDER "${cfg.provider}"`);
};
