// Free reminder SMS from Cloud Commerce to shop owners (underscore prefix = not a route).
// Runs once a day (Worker cron). Sent through the platform BulkSMSBD account and NOT taken from
// the shop's SMS balance. Each reminder is sent once per plan period (merchant_notifications).
import { rest } from './_store-lib.js';
import { sendSms, loadSmsConfig, smsConfigured } from './_sms.js';

const DAY = 86400000;

function plan(store, now) {
  // No paid period yet = still on (or just past) the free trial
  const trial = !store.paid_until && Boolean(store.trial_ends_at);
  const end = trial ? store.trial_ends_at : store.paid_until;
  if (!end || store.status === 'suspended' || store.status === 'rejected' || store.status === 'pending') return null;
  const left = (Date.parse(end) - now) / DAY;
  let kind = null;
  if (left <= 0 && left > -3) kind = 'ended';
  else if (left > 0 && left <= 1) kind = 'd1';
  else if (left > 1 && left <= 3) kind = 'd3';
  if (!kind) return null;
  return { kind: `${trial ? 'trial' : 'plan'}_${kind}`, period: end, trial, days: Math.max(1, Math.ceil(left)) };
}

function text(store, p) {
  const shop = `"${String(store.name || store.slug).slice(0, 30)}"`;
  if (p.kind.endsWith('_ended')) {
    return `Cloud Commerce: আপনার দোকান ${shop}-এর ${p.trial ? 'ফ্রি ট্রায়াল' : 'প্ল্যান'} শেষ, ওয়েবসাইট এখন বন্ধ। চালু করতে Admin-এ লগইন করে প্ল্যান নিন।`;
  }
  const bn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
  const when = p.days <= 1 ? 'আগামীকালের মধ্যে' : `${bn(p.days)} দিনের মধ্যে`;
  return `Cloud Commerce: আপনার দোকান ${shop}-এর ${p.trial ? 'ফ্রি ট্রায়াল' : 'প্ল্যান'} ${when} শেষ হবে। দোকান চালু রাখতে প্ল্যান ${p.trial ? 'নিন' : 'রিনিউ করুন'}।`;
}

/** Sends due reminders. Returns a short report. */
export async function runMerchantReminders(cfg, { dryRun = false } = {}) {
  const sms = await loadSmsConfig(cfg);
  if (!smsConfigured(sms) && !dryRun) return { sent: 0, skipped: 'SMS not set up' };
  const now = Date.now();
  const from = new Date(now - 3 * DAY).toISOString();
  const to = new Date(now + 3 * DAY).toISOString();
  const q = (v) => `"${v}"`; // timestamps contain dots, which the filter syntax needs quoted
  const filter = `(and(paid_until.is.null,trial_ends_at.gte.${q(from)},trial_ends_at.lte.${q(to)}),and(paid_until.gte.${q(from)},paid_until.lte.${q(to)}))`;
  const stores = await rest(cfg, `stores?or=${encodeURIComponent(filter)}&select=id,name,slug,status,trial_ends_at,paid_until,owner_phone,phone&limit=500`);
  const report = { checked: (stores || []).length, sent: 0, failed: 0, items: [] };
  for (const store of stores || []) {
    const p = plan(store, now);
    if (!p) continue;
    const phone = String(store.owner_phone || store.phone || '').replace(/\D/g, '').slice(-11);
    if (!/^01[3-9]\d{8}$/.test(phone)) continue;
    const done = await rest(cfg, `merchant_notifications?store_id=eq.${store.id}&kind=eq.${p.kind}&period_end=eq.${encodeURIComponent(p.period)}&select=id&limit=1`);
    if (done?.length) continue;
    const message = text(store, p);
    report.items.push({ store: store.slug, kind: p.kind });
    if (dryRun) continue;
    try {
      await sendSms(sms, phone, message);
      await rest(cfg, 'merchant_notifications', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ store_id: store.id, kind: p.kind, period_end: p.period, channel: 'sms' }),
      });
      report.sent++;
    } catch {
      report.failed++;
    }
  }
  return report;
}
