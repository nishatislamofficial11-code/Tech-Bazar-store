import { useEffect, useState } from 'react';
import { defaultPaymentSettings, readPaymentSettings } from '../lib/storePaymentApi';
import { paymentQuote, paymentLabels, type PaymentMethod } from '../lib/paymentRules';
export function useCheckoutPayment() {
  const [config, setConfig] = useState(defaultPaymentSettings);
  const [method, setMethod] = useState<PaymentMethod>('cod');
  useEffect(() => { let active = true; readPaymentSettings().then(value => { if (active) { setConfig(value); const available = value.methods.filter(m => m === 'cod' || value.configured); setMethod(available[0] || 'cod'); } }).catch(() => {}); return () => { active = false; }; }, []);
  return { config, method, setMethod };
}
export function CheckoutPaymentOptions({ payment, total, shipping }: { payment: ReturnType<typeof useCheckoutPayment>; total: number; shipping: number }) {
  const quote = paymentQuote(payment.method, total, shipping, payment.config.fixedAdvance);
  return <fieldset className="space-y-3 text-payment-text"><legend className="mb-2 text-sm font-bold">পেমেন্ট পদ্ধতি</legend>
    {payment.config.methods.filter(m => m === 'cod' || payment.config.configured).map(method => <label key={method} className="flex items-center gap-3 rounded-lg border border-payment-border p-3 text-sm"><input type="radio" name="store-payment-method" value={method} checked={payment.method === method} onChange={() => payment.setMethod(method)} />{paymentLabels[method]}</label>)}
    <div className="flex flex-wrap justify-between gap-2 text-xs"><span>এখন দিতে হবে: ৳{quote.required.toFixed(2)}</span><span>পরিশোধের পরে বাকি: ৳{quote.remaining.toFixed(2)}</span></div>
  </fieldset>;
}