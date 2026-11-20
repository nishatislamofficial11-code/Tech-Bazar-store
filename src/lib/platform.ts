// Cloud Commerce platform: merchant sign-up, own-store lookup and subscription state.
import { rawSupabase } from './supabase';

export interface MyStore {
  id: string;
  name: string;
  slug: string;
  status: 'pending' | 'trial' | 'active' | 'expired' | 'suspended' | 'rejected';
  is_active: boolean;
  trial_ends_at: string | null;
  paid_until: string | null;
  open: boolean;
  plan_name: string | null;
  plan_price: string | null;
}

export interface PendingStore {
  name: string;
  slug: string;
  phone: string;
  business_type?: string;
}

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,39}$/;

// Turns a store name into a link suggestion (English letters only; Bangla names need a typed link)
export function suggestSlug(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.slice(-11);
}
export const PHONE_RE = /^01[3-9]\d{8}$/;

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const { data, error } = await rawSupabase.rpc('store_slug_available', { p_slug: slug });
  if (error) throw error;
  return data === true;
}

export async function createMyStore(p: PendingStore & { ownerName: string }) {
  const { data, error } = await rawSupabase.rpc('merchant_create_store', {
    p_store_name: p.name, p_slug: p.slug, p_owner_name: p.ownerName, p_phone: p.phone,
    p_business_type: p.business_type || null,
  });
  if (error) throw new Error(error.message);
  return data as { store_id: string; slug: string; status: string };
}

export async function getMyStore(): Promise<MyStore | null> {
  const { data, error } = await rawSupabase.rpc('my_store');
  if (error) throw error;
  return (data as MyStore) || null;
}

export async function isSuperAdmin(): Promise<boolean> {
  const { data } = await rawSupabase.rpc('is_super_admin');
  return data === true;
}

// Full page load so the whole app (data client, cache) switches to this store
export function openStoreAdmin(slug: string) {
  window.location.assign(`/admin?store=${encodeURIComponent(slug)}`);
}

export function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

const BN = '০১২৩৪৫৬৭৮৯';
export const bn = (v: string | number) => String(v).replace(/\d/g, (d) => BN[+d]);
export const bnDate = (iso: string) =>
  new Date(iso).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
