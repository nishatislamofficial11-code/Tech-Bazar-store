import { onRequest as storePayments } from './functions/api/store-payments.js';
import { onRequest as paymentCallback } from './functions/api/payment-callback.js';
import { onRequest as telegramNotify } from './functions/api/telegram.js';
import { onRequest as telegramAdmin } from './functions/api/telegram-admin.js';

const routes = {
  '/api/store-payments': storePayments,
  '/api/payment-callback': paymentCallback,
  '/api/telegram': telegramNotify,
  '/api/telegram-admin': telegramAdmin,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const handler = routes[url.pathname.replace(/\/+/g, '/')];
    if (handler) {
      const context = { request, env, params: {}, waitUntil: (p) => ctx.waitUntil(p) };
      return handler(context);
    }
    return env.ASSETS.fetch(request);
  },
};
