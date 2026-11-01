import React, { useRef } from 'react';
import { X, Printer, Download, CheckCircle, FileText } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { PaymentSummary } from './PaymentSummary';
import type { PaymentRecord } from '../lib/paymentRules';

export interface CustomerInvoiceItem {
  title: string;
  variant?: string;
  quantity: number;
  price: number;
}

export interface CustomerInvoiceData extends PaymentRecord {
  orderId: string;
  created_at?: string;
  customerName: string;
  phone: string;
  address: string;
  deliveryArea?: string;
  shippingCharge: number;
  totalAmount: number;
  items: CustomerInvoiceItem[];
  status?: string;
}

interface CustomerInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: CustomerInvoiceData | null;
}

// Simple Barcode generator for tracking ID
function BarcodeSVG({ value }: { value: string }) {
  const bars = Array.from(value).map((char, index) => {
    const width = ((char.charCodeAt(0) * (index + 1)) % 3) + 1.5;
    return (
      <rect
        key={index}
        x={index * 9}
        y="0"
        width={width}
        height="36"
        fill="#1e293b"
      />
    );
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={Math.max(140, value.length * 9 + 10)} height="36" className="overflow-visible">
        {bars}
      </svg>
      <span className="font-mono text-[10px] tracking-widest text-slate-500 mt-1 uppercase font-bold">
        *{value}*
      </span>
    </div>
  );
}

export function CustomerInvoiceModal({ isOpen, onClose, invoice }: CustomerInvoiceModalProps) {
  const { settings } = useSettings();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const storeName = settings?.siteName || 'PowerHub BD';
  const storeLogo = settings?.site_logo;
  const storePhone = settings?.whatsapp_number || settings?.call_order_number || 'Support Available';
  const orderDate = invoice.created_at ? new Date(invoice.created_at) : new Date();

  const subtotal = invoice.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Print Specific CSS to ensure clean A4 / single page output */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #customer-printable-invoice, #customer-printable-invoice * {
            visibility: visible;
          }
          #customer-printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header & Actions (Hidden on Print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Order Invoice / ক্যাশ মেমো</h3>
              <p className="text-xs text-slate-500">ID: {invoice.orderId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 active:scale-95"
            >
              <Printer size={15} />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 sm:p-10 max-h-[80vh] overflow-y-auto" id="customer-printable-invoice" ref={printRef}>
          {/* Invoice Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6 mb-6">
            <div>
              {storeLogo ? (
                <img src={storeLogo} alt={storeName} className="h-10 sm:h-12 max-h-12 mb-2 object-contain" />
              ) : (
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{storeName}</h1>
              )}
              <p className="text-xs text-slate-500 font-medium">Customer Cash Memo & Invoice</p>
              <p className="text-xs text-slate-700 font-bold mt-0.5">Hotline: {storePhone}</p>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg mb-2">
                INVOICE
              </div>
              <p className="text-sm font-mono font-black text-slate-900">{invoice.orderId}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
              <p className="text-xs text-emerald-600 font-bold uppercase mt-0.5">
                {invoice.status || 'Confirmed'}
              </p>
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-6 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Billed To (গ্রাহকের নাম ও ফোন):
              </span>
              <p className="font-black text-slate-900 text-sm">{invoice.customerName}</p>
              <p className="font-mono font-bold text-slate-700 mt-0.5">{invoice.phone}</p>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Delivery Address (ডেলিভারি ঠিকানা):
              </span>
              <p className="text-slate-800 font-semibold whitespace-pre-line leading-relaxed">
                {invoice.address}
              </p>
              {invoice.deliveryArea && (
                <p className="text-slate-500 text-[11px] mt-1 font-medium">Area: {invoice.deliveryArea}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">Item Details</th>
                  <th className="py-2.5 px-3 text-center w-16">Qty</th>
                  <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
                  <th className="py-2.5 px-3 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">{item.title}</span>
                      {item.variant && (
                        <span className="text-[11px] text-primary font-medium block mt-0.5">
                          {item.variant}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-600">
                      ৳{item.price.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                      ৳{(item.price * item.quantity).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary & Footer */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 border-t border-slate-200 pt-5">
            <div className="w-full sm:w-auto text-center sm:text-left">
              <BarcodeSVG value={invoice.orderId} />
              <p className="text-[11px] text-slate-500 mt-2">
                Thank you for shopping with <strong className="text-slate-800">{storeName}</strong>!
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Subtotal (সাবটোটাল):</span>
                <span className="font-mono">৳{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Delivery Charge (ডেলিভারি ফি):</span>
                <span className="font-mono">৳{invoice.shippingCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-sm font-black text-slate-900">
                <span>Total Payable:</span>
                <span className="text-primary font-mono text-base">৳{invoice.totalAmount.toLocaleString()}</span>
              </div>
              <PaymentSummary order={{ ...invoice, total_amount: invoice.totalAmount }} />
            </div>
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="no-print bg-slate-50 px-6 py-3 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 font-medium">
            💡 আপনি উপরের <strong>"Print / Download PDF"</strong> বাটনে ক্লিক করে ইনভয়েসটি সেভ অথবা প্রিন্ট করতে পারেন।
          </p>
        </div>
      </div>
    </div>
  );
}
