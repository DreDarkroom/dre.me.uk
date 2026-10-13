'use strict';
// All money is integer minor units (pence). Never floats.
const fmt = (minor, currency = 'GBP', locale = 'en-GB') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100);

// VAT contained within a VAT-inclusive amount.
const vatIncluded = (gross, rate) => Math.round(gross - gross / (1 + rate));

module.exports = { fmt, vatIncluded };
