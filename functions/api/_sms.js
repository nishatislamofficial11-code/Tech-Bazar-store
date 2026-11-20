// Bulk SMS sender for OTP messages, using BulkSMSBD (bulksmsbd.net).
// Secrets live in Cloudflare (Settings → Variables and Secrets), never in the code:
//   SMS_API_KEY   – BulkSMSBD API key
//   SMS_SENDER_ID – BulkSMSBD sender ID

const BULKSMSBD_URL = 'https://bulksmsbd.net/api/smsapi';

export function smsConfigured(env) {
  return Boolean(env.SMS_API_KEY && env.SMS_SENDER_ID);
}

// BulkSMSBD wants numbers as 8801XXXXXXXXX
const toIntl = (phone) => `88${String(phone).replace(/\D/g, '').slice(-11)}`;

export async function sendSms(env, phone, message) {
  if (!smsConfigured(env)) throw Object.assign(new Error('SMS সার্ভিস এখনো সেটআপ হয়নি'), { status: 503 });
  const res = await fetch(BULKSMSBD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      api_key: env.SMS_API_KEY,
      senderid: env.SMS_SENDER_ID,
      number: toIntl(phone),
      message,
      type: 'text',
    }),
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
