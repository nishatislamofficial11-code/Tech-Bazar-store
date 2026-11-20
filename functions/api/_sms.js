// Bulk SMS sender for OTP messages.
// The provider's request format is filled in once we know which Bangladeshi SMS company is used.
// Secrets live in Cloudflare (Settings → Variables and Secrets), never in the code:
//   SMS_API_KEY   – the provider's API key
//   SMS_SENDER_ID – approved sender ID / masking name (if the provider needs one)

export function smsConfigured(env) {
  return Boolean(env.SMS_API_KEY);
}

export async function sendSms(env, phone, message) {
  if (!smsConfigured(env)) throw Object.assign(new Error('SMS সার্ভিস এখনো সেটআপ হয়নি'), { status: 503 });
  // TODO(provider): replace with the provider's documented API call.
  throw Object.assign(new Error('SMS পাঠানোর ব্যবস্থা এখনো যুক্ত হয়নি'), { status: 503 });
}
