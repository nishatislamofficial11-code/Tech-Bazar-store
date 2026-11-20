// Bulk SMS sender for OTP messages, using BulkSMSBD (bulksmsbd.net).
// The API key and sender ID are entered by the super admin (platform_settings keys
// private_sms_api_key / private_sms_sender_id, readable only by the super admin and the server).
import { rest } from './_store-lib.js';

const BULKSMSBD_URL = 'https://bulksmsbd.net/api/smsapi';

export async function loadSmsConfig(cfg) {
  const rows = await rest(cfg, 'platform_settings?key=in.(private_sms_api_key,private_sms_sender_id)&select=key,value');
  const map = Object.fromEntries((rows || []).map((r) => [r.key, String(r.value || '').trim()]));
  return { apiKey: map.private_sms_api_key || '', senderId: map.private_sms_sender_id || '' };
}

export const smsConfigured = (sms) => Boolean(sms?.apiKey && sms?.senderId);

// BulkSMSBD wants numbers as 8801XXXXXXXXX
const toIntl = (phone) => `88${String(phone).replace(/\D/g, '').slice(-11)}`;

export async function sendSms(sms, phone, message) {
  if (!smsConfigured(sms)) throw Object.assign(new Error('SMS সার্ভিস এখনো সেটআপ হয়নি'), { status: 503 });
  const res = await fetch(BULKSMSBD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ api_key: sms.apiKey, senderid: sms.senderId, number: toIntl(phone), message, type: 'text' }),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON reply */ }
  // 202 = "SMS Submitted Successfully"
  if (!res.ok || Number(data?.response_code) !== 202) {
    const reason = data?.error_message || data?.success_message || `HTTP ${res.status}`;
    throw Object.assign(new Error(`SMS পাঠানো যায়নি (${reason})`), { status: 502 });
  }
  return data;
}
