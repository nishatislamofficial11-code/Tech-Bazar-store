import { onRequest as storePayments } from './functions/api/store-payments.js';
import { onRequest as paymentCallback } from './functions/api/payment-callback.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const context = { request, env, params: {}, waitUntil: (p) => ctx.waitUntil(p) };
    if (url.pathname === '/api/store-payments') return storePayments(context);
    if (url.pathname === '/api/payment-callback') return paymentCallback(context);
    return env.ASSETS.fetch(request);
  },
};
