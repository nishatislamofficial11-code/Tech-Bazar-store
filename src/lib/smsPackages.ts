export interface SmsPackage { price: number; sms: number }

export const DEFAULT_SMS_PACKAGES: SmsPackage[] = [
  { price: 100, sms: 200 },
  { price: 200, sms: 400 },
  { price: 250, sms: 500 },
  { price: 500, sms: 1000 },
];

/** Packages are stored by the super admin in platform_settings.sms_packages as JSON. */
export function parseSmsPackages(raw: string | null | undefined): SmsPackage[] {
  try {
    const list = JSON.parse(raw || '');
    if (Array.isArray(list)) {
      const clean = list
        .map((p) => ({ price: Number(p?.price), sms: Math.floor(Number(p?.sms)) }))
        .filter((p) => p.price > 0 && p.sms > 0)
        .sort((a, b) => a.price - b.price);
      if (clean.length) return clean;
    }
  } catch { /* fall back */ }
  return DEFAULT_SMS_PACKAGES;
}
