// Cloudflare Worker entry. Routes the server endpoints that live in functions/ so they work
// the same as on Cloudflare Pages; everything else is served from the built site (dist).
import { onRequest as storePayments } from './functions/api/store-payments.js';
import { onRequest as paymentCallback } from './functions/api/payment-callback.js';
import { onRequest as telegramNotify } from './functions/api/telegram.js';
import { onRequest as telegramAdmin } from './functions/api/telegram-admin.js';
import { onRequest as track } from './functions/api/track.js';
import { onRequest as otp } from './functions/api/otp.js';
import { onRequest as aiChat } from './functions/api/ai-chat.js';
import { onRequest as aiWidget } from './functions/api/ai-widget.js';
import { onRequest as aiModels } from './functions/api/ai-models.js';
import { onRequest as orderSms } from './functions/api/order-sms.js';
import { onRequest as middleware } from './functions/_middleware.js';
import { serverConfig } from './functions/api/_store-lib.js';
import { runMerchantReminders } from './functions/api/_reminders.js';

const routes = {
  '/api/store-payments': storePayments,
  '/api/payment-callback': paymentCallback,
  '/api/telegram': telegramNotify,
  '/api/telegram-admin': telegramAdmin,
  '/api/track': track,
  '/api/otp': otp,
  '/api/ai-chat': aiChat,
  '/api/ai-widget': aiWidget,
  '/api/ai-models': aiModels,
  '/api/order-sms': orderSms,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+/g, '/');
    const context = { request, env, params: {}, waitUntil: (p) => ctx.waitUntil(p) };

    const handler = routes[path];
    if (handler) return handler(context);

    // The Pages middleware handles feed, sitemap, robots, courier and blacklist endpoints,
    // and adds per-store SEO tags to HTML pages. If it ever fails, serve the page as is.
    try {
      return await middleware({ ...context, next: () => env.ASSETS.fetch(request) });
    } catch {
      return env.ASSETS.fetch(request);
    }
  },

  // Daily job (see "triggers" in wrangler.jsonc): free reminder SMS to shop owners whose trial/plan is ending
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runMerchantReminders(serverConfig(env)).catch(() => null));
  },
};
