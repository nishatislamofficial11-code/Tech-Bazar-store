import { supabase } from './supabase';
import { currentStoreSlug } from './currentStore';

/**
 * Asks the server to SMS the customer about an order ('placed' or 'shipped').
 * Fire-and-forget: the shop decides in Admin → Customer SMS whether these are sent, and each is sent once.
 */
export async function notifyOrderSms(orderId: string, kind: 'placed' | 'shipped', token?: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/order-sms', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ store: currentStoreSlug, action: kind, order_id: orderId, token }),
    });
  } catch { /* SMS is a nice-to-have; never block the order */ }
}
