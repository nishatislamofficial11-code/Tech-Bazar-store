import { rawSupabase } from './supabase';
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
  const store = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('store') || localStorage.getItem('current_store_slug') || '';
  const response = await fetch('/api/store-payments', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
    body: JSON.stringify({ action, store, data }),
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('নিরাপদ পেমেন্ট সংযোগ এখনো চালু হয়নি।');
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result as T;
}
export async function readPaymentSettings() {
  const value = await paymentRequest<StorePaymentSettings>('settings');
  if (!Array.isArray(value.methods) || value.methods.some(m => !paymentMethods.includes(m)) || !gatewayNames.includes(value.gateway) || !Number.isFinite(value.fixedAdvance) || value.fixedAdvance < 0) throw new Error('পেমেন্ট সেটিংস সঠিক নয়');
  return value;
}