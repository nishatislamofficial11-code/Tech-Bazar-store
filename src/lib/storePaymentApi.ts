import { rawSupabase } from './supabase';
import { currentStoreSlug } from './currentStore';
import { paymentMethods, gatewayNames, type PaymentMethod, type GatewayName } from './paymentRules';

export interface StorePaymentSettings {
  methods: PaymentMethod[];
  fixedAdvance: number;
  gateway: GatewayName;
  environment: 'sandbox' | 'live';
  configured: boolean;
}
export const defaultPaymentSettings: StorePaymentSettings = {
  methods: ['cod'], fixedAdvance: 0, gateway: 'sslcommerz', environment: 'sandbox', configured: false,
};
export async function paymentRequest<T>(action: string, data?: unknown): Promise<T> {
  const { data: { session } } = await rawSupabase.auth.getSession();
  let response: Response;
  try {
    response = await fetch('/api/store-payments', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ action, store: currentStoreSlug, data }),
    });
  } catch {
    throw new Error('ইন্টারনেট সংযোগে সমস্যা, আবার চেষ্টা করুন।');
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`পেমেন্ট সার্ভার পাওয়া যায়নি (HTTP ${response.status})। সাইটের সার্ভার সেটআপ দেখুন।`);
  }
  const result = await response.json().catch(() => null);
  if (!result) throw new Error('পেমেন্ট সার্ভারের উত্তর বোঝা যায়নি।');
  if (result.error || !response.ok) throw new Error(result.error || `পেমেন্ট সার্ভারে সমস্যা (HTTP ${response.status})`);
  return result as T;
}
export async function readPaymentSettings() {
  const value = await paymentRequest<StorePaymentSettings>('settings');
  if (!Array.isArray(value.methods) || value.methods.some(m => !paymentMethods.includes(m)) || !gatewayNames.includes(value.gateway) || !Number.isFinite(value.fixedAdvance) || value.fixedAdvance < 0) throw new Error('পেমেন্ট সেটিংস সঠিক নয়');
  return value;
}