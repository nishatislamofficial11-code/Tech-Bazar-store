import { supabase } from './supabase';

export async function createCheckoutOrder(order: Record<string, unknown>, items: Record<string, unknown>[], draftId: string | null) {
  const { data, error } = await supabase.rpc('create_checkout_order', {
    order_data: order, items_data: items, draft_id: draftId,
  });
  if (error) throw error;
  if (!data?.id || !data?.checkout_token) throw new Error('অর্ডার তৈরি হয়নি');
  return data as { id: string; checkout_token: string; advance_required: number; total_amount: number };
}

export function rememberPayment(order: { id: string; checkout_token: string }, items: { product: any; quantity: number }[]) {
  localStorage.setItem(`pending_payment:${order.id}`, JSON.stringify({ token: order.checkout_token,
    items: items.map(item => ({ key: item.product.cartItemKey || item.product.id, quantity: item.quantity })) }));
}