import { supabase } from './supabase';
import { paymentRequest } from './storePaymentApi';
import { currentStoreSlug } from './currentStore';
import { notifyOrderSms } from './orderSms';

export async function createCheckoutOrder(order: Record<string, unknown>, items: Record<string, unknown>[], draftId: string | null) {
  const { data, error } = await supabase.rpc('create_checkout_order', {
    order_data: order, items_data: items, draft_id: draftId,
  });
  if (error) throw error;
  if (!data?.id || !data?.checkout_token) throw new Error('অর্ডার তৈরি হয়নি');
  // Cash-on-delivery orders are complete now; paid orders get their SMS only after payment
  if (!(Number(data.advance_required) > 0)) notifyOrderSms(data.id, 'placed', data.checkout_token);
  return data as { id: string; checkout_token: string; advance_required: number; total_amount: number };
}

export interface PendingPurchase {
  pixel: { id: string; total_amount: number; items: { id: string; title?: string; price: number; quantity: number }[] };
  customer: Record<string, string | undefined>;
}

export interface PendingPayment {
  token: string;
  items: { key: string; quantity: number }[];
  purchase?: PendingPurchase;
}

const pendingKey = (orderId: string) => `pending_payment:${orderId}`;

export function rememberPayment(order: { id: string; checkout_token: string }, items: { product: any; quantity: number }[], purchase?: PendingPurchase) {
  const record: PendingPayment = {
    token: order.checkout_token,
    items: items.map(item => ({ key: item.product.cartItemKey || item.product.id, quantity: item.quantity })),
    purchase,
  };
  try { localStorage.setItem(pendingKey(order.id), JSON.stringify(record)); } catch { /* storage full or blocked */ }
}

export function readPendingPayment(orderId: string): PendingPayment | null {
  try {
    const raw = localStorage.getItem(pendingKey(orderId));
    return raw ? JSON.parse(raw) as PendingPayment : null;
  } catch {
    return null;
  }
}

export function forgetPendingPayment(orderId: string) {
  try { localStorage.removeItem(pendingKey(orderId)); } catch { /* ignore */ }
}

// Sends the customer to the gateway. If the gateway page can't be opened, the order is
// already saved, so we take them to the result page where they can try paying again.
export async function startOnlinePayment(order: { id: string; checkout_token: string }) {
  try {
    const { redirectUrl } = await paymentRequest<{ redirectUrl: string }>('initiate', { orderId: order.id, token: order.checkout_token });
    if (!/^https:\/\//i.test(redirectUrl)) throw new Error('পেমেন্ট পেজের ঠিকানা সঠিক নয়');
    window.location.assign(redirectUrl);
  } catch (error) {
    const qs = new URLSearchParams({ payment: 'failed', order: order.id });
    if (currentStoreSlug) qs.set('store', currentStoreSlug);
    if (error instanceof Error) qs.set('reason', error.message.slice(0, 200));
    window.location.assign(`/?${qs.toString()}`);
  }
}
