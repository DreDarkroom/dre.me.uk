'use strict';
// Dev/demo provider: sends the buyer to a fake payment page. Disabled in production by config.
module.exports = (cfg) => ({
  name: 'mock',
  async createCheckout(order) {
    return { url: `${cfg.baseUrl}/mock-pay.html?ref=${order.ref}&token=${order.token}`, providerRef: `mock_${order.ref}` };
  },
});
