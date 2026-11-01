export const paymentMethods = ['cod', 'delivery_advance', 'fixed_advance', 'full'] as const;
export type PaymentMethod = typeof paymentMethods[number];
export const gatewayNames = ['sslcommerz', 'eps', 'aamarpay'] as const;
export type GatewayName = typeof gatewayNames[number];
export const paymentLabels: Record<PaymentMethod, string> = {
  cod: 'ক্যাশ অন ডেলিভারি', delivery_advance: 'ডেলিভারি চার্জ অগ্রিম',
  fixed_advance: 'নির্দিষ্ট অগ্রিম', full: 'ফুল পেমেন্ট',
};
export function money(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new Error('টাকার পরিমাণ সঠিক নয়');
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
export function paymentQuote(method: PaymentMethod, total: number, delivery: number, fixed = 0) {
  const bill = money(total), shipping = money(delivery), advance = money(fixed);
  if (shipping > bill) throw new Error('ডেলিভারি চার্জ মোট বিলের বেশি');
  const required = method === 'cod' ? 0 : method === 'delivery_advance' ? shipping : method === 'full' ? bill : Math.min(advance, bill);
  return { total: bill, required, remaining: money(bill - required) };
}
export interface PaymentRecord {
  total_amount?: number; payment_method?: PaymentMethod; advance_required?: number;
  advance_paid?: number; cash_paid?: number; payment_status?: string;
  payment_gateway?: string; payment_transaction_id?: string; payment_paid_at?: string;
  shipping_charge?: number;
}
export function remainingBalance(order: PaymentRecord): number {
  return money(Math.max(0, money(Number(order.total_amount || 0)) - money(Number(order.advance_paid || 0)) - money(Number(order.cash_paid || 0))));
}
export function validateSettlement(payment: { transaction: string; amount: number; currency: string; store: string }, verified: { transaction: string; amount: number; currency: string; store: string; successful: boolean }): boolean {
  return verified.successful && payment.transaction === verified.transaction && payment.store === verified.store && payment.currency === verified.currency && money(payment.amount) === money(verified.amount);
}