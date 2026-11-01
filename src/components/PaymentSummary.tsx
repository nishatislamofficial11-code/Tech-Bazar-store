import { paymentLabels, remainingBalance, type PaymentRecord } from '../lib/paymentRules';
export function PaymentSummary({ order }: { order: PaymentRecord }) {
  return <dl className="space-y-2 text-xs text-payment-text">
    <div className="flex justify-between gap-3"><dt>পেমেন্ট পদ্ধতি</dt><dd>{paymentLabels[order.payment_method || 'cod']}</dd></div>
    <div className="flex justify-between gap-3"><dt>প্রয়োজনীয় অগ্রিম</dt><dd>৳{Number(order.advance_required || 0).toFixed(2)}</dd></div>
    <div className="flex justify-between gap-3"><dt>অগ্রিম পাওয়া গেছে</dt><dd>৳{Number(order.advance_paid || 0).toFixed(2)}</dd></div>
    {Number(order.cash_paid || 0) > 0 && <div className="flex justify-between gap-3"><dt>হাতে আদায়</dt><dd>৳{Number(order.cash_paid).toFixed(2)}</dd></div>}
    <div className="flex justify-between gap-3 border-t border-payment-border pt-2 font-bold"><dt>বাকি টাকা</dt><dd>৳{remainingBalance(order).toFixed(2)}</dd></div>
    {order.payment_status && <div className="flex justify-between gap-3"><dt>পেমেন্টের অবস্থা</dt><dd>{order.payment_status}</dd></div>}
    {order.payment_gateway && <div className="flex justify-between gap-3"><dt>গেটওয়ে</dt><dd>{order.payment_gateway}</dd></div>}
    {order.payment_transaction_id && <div className="flex flex-wrap justify-between gap-2"><dt>লেনদেন</dt><dd className="break-all">{order.payment_transaction_id}</dd></div>}
    {order.payment_paid_at && <div className="flex flex-wrap justify-between gap-2"><dt>পেমেন্টের সময়</dt><dd>{new Date(order.payment_paid_at).toLocaleString('bn-BD')}</dd></div>}
  </dl>;
}