import type { ButtonHTMLAttributes } from 'react';
export function PaymentButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-lg border border-payment-border bg-primary px-4 py-2 text-sm font-semibold text-payment-on-primary disabled:opacity-50 ${className}`} />;
}