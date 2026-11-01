import React, { useState, useRef } from 'react';
import { Printer, X, Download, Copy, Check, FileText, Tag, Settings2, Eye } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { buildCloudinaryUrl } from '../../lib/cloudinary';
import { getPremiumOrderId, cleanShippingAddress } from '../../lib/orderUtils';
import toast from 'react-hot-toast';

export interface PrintableOrder {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  shipping_address: string;
  courier_name?: string;
  courier_consignment_id?: string;
  courier_tracking_code?: string;
  courier_status?: string;
  admin_note?: string;
  order_source?: string;
  profiles?: { email?: string };
  order_items?: Array<{
    id?: string;
    quantity: number;
    price: number;
    variant_options?: any;
    variant_sku?: string;
    product?: {
      name?: string;
      title?: string;
    };
    products?: {
      title?: string;
    };
  }>;
}

interface OrderPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PrintableOrder[];
}

// Code 39 Barcode Table for scannable optical barcodes
const CODE39_MAP: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100',
  '$': '010101000', '/': '010100010', '+': '010001010', '%': '000101010'
};

function BarcodeSVG({ value }: { value: string }) {
  const cleanVal = (value || '').toUpperCase().replace(/[^0-9A-Z\-\.\ \$\/\+\%]/g, '');
  const encodedStr = `*${cleanVal}*`;
  
  // Calculate SVG elements
  const elements: Array<{ x: number; width: number; isBar: boolean }> = [];
  let currentX = 0;
  const narrowWidth = 1.6;
  const wideWidth = 3.6;
  const gapWidth = 1.6;

  for (let i = 0; i < encodedStr.length; i++) {
    const char = encodedStr[i];
    const pattern = CODE39_MAP[char] || CODE39_MAP['-'];
    for (let p = 0; p < 9; p++) {
      const isBar = p % 2 === 0;
      const width = pattern[p] === '1' ? wideWidth : narrowWidth;
      elements.push({ x: currentX, width, isBar });
      currentX += width;
    }
    // Inter-character gap
    elements.push({ x: currentX, width: gapWidth, isBar: false });
    currentX += gapWidth;
  }

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${currentX} 45`}
        className="w-full max-w-[240px] h-[36px]"
        preserveAspectRatio="none"
      >
        {elements.map((el, idx) => (
          el.isBar ? (
            <rect key={idx} x={el.x} y={0} width={el.width} height={45} fill="#000000" />
          ) : null
        ))}
      </svg>
      <span className="text-[11px] font-mono font-black tracking-widest text-slate-800 mt-0.5">
        *{cleanVal}*
      </span>
    </div>
  );
}

export function OrderPrintModal({ isOpen, onClose, orders }: OrderPrintModalProps) {
  const { settings } = useSettings();
  const [printType, setPrintType] = useState<'thermal_80' | 'thermal_50' | 'a4_invoice'>('thermal_80');
  const [showStoreLogo, setShowStoreLogo] = useState(true);
  const [showItemPrices, setShowItemPrices] = useState(true);
  const [customNote, setCustomNote] = useState('প্যাকেট খুলে চেক করে রিসিভ করবেন। কোনো সমস্যা হলে আমাদের হেল্পলাইনে কল করুন।');
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || orders.length === 0) return null;

  // Fully dynamic store name and logo from site settings
  const rawSiteName = settings?.siteName || settings?.site_title || '';
  const storeName = rawSiteName.includes(' - ') 
    ? rawSiteName.split(' - ')[0].trim() 
    : (rawSiteName || 'Niyo Shop');
  const storePhone = settings?.call_order_number || settings?.whatsapp_number || '01XXXXXXXXX';
  const storeLogo = settings?.site_logo 
    ? (settings.site_logo.startsWith('http') ? settings.site_logo : buildCloudinaryUrl(settings.site_logo, 'w_320,h_80,c_limit,f_auto,q_auto')) 
    : '';

  const handlePrint = () => {
    window.print();
  };

  const parseOrderAddress = (order: PrintableOrder) => {
    const addressLines = (order.shipping_address || '').split('\n');
    const nameLine = addressLines.find((l: string) => l.startsWith('Name:'))?.replace('Name:', '').trim() || 'Customer';
    const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || 'N/A';
    const matchAddress = (order.shipping_address || '').match(/Address:([\s\S]*?)(?=\nDelivery Area:|\nDelivery:|\nShipping Charge:|\nOrder Note:|\n\[TID:|$)/);
    const addressLine = matchAddress ? matchAddress[1].trim() : order.shipping_address || 'No address';
    const deliveryArea = addressLines.find((l: string) => l.startsWith('Delivery Area:'))?.replace('Delivery Area:', '').trim() || '';
    const noteLine = addressLines.find((l: string) => l.startsWith('Order Note:'))?.replace('Order Note:', '').trim() || order.admin_note || '';

    return {
      name: nameLine,
      phone: phoneLine,
      address: addressLine,
      deliveryArea,
      orderNote: noteLine
    };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-area-wrapper, #print-area-wrapper * {
            visibility: visible !important;
          }
          #print-area-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .page-break {
            break-after: page !important;
            page-break-after: always !important;
          }
          @page {
            margin: 0;
            size: ${printType === 'thermal_80' ? '80mm auto' : printType === 'thermal_50' ? '50mm auto' : 'A4 portrait'};
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Print Invoice & Thermal Slips</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {orders.length} {orders.length === 1 ? 'Order' : 'Orders'} Selected
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Choose slip format for POS thermal printer or full customer cash memo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Now (প্রিন্ট করুন)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Format Selectors & Options Bar */}
        <div className="p-3 sm:px-6 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Format Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPrintType('thermal_80')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                printType === 'thermal_80'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏷️ 80mm POS Thermal Slip
            </button>
            <button
              type="button"
              onClick={() => setPrintType('thermal_50')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                printType === 'thermal_50'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📦 50mm Mini Sticker
            </button>
            <button
              type="button"
              onClick={() => setPrintType('a4_invoice')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                printType === 'a4_invoice'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📄 A4 Cash Memo / Invoice
            </button>
          </div>

          {/* Quick Options */}
          <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showStoreLogo}
                onChange={(e) => setShowStoreLogo(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-primary focus:ring-primary"
              />
              <span>Logo</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showItemPrices}
                onChange={(e) => setShowItemPrices(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-primary focus:ring-primary"
              />
              <span>Item Prices</span>
            </label>
          </div>
        </div>

        {/* Live Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/80 custom-scrollbar flex justify-center">
          <div id="print-area-wrapper" ref={printContainerRef} className="w-full flex flex-col items-center gap-6">
            {orders.map((order, orderIdx) => {
              const { name, phone, address, deliveryArea, orderNote } = parseOrderAddress(order);
              const premiumId = getPremiumOrderId(order);

              // ---------------------------------------------
              // FORMAT 1: 80mm Thermal Slip (POS Standard)
              // ---------------------------------------------
              if (printType === 'thermal_80') {
                return (
                  <div
                    key={order.id}
                    className={`bg-white text-black p-4 border border-slate-300 shadow-md font-sans w-[80mm] max-w-[80mm] box-border text-[11px] leading-tight ${
                      orderIdx < orders.length - 1 ? 'page-break' : ''
                    }`}
                    style={{ minHeight: '100mm' }}
                  >
                    {/* Header */}
                    <div className="text-center pb-2 border-b-2 border-black">
                      {showStoreLogo && storeLogo && (
                        <img src={storeLogo} alt={storeName} className="h-8 max-h-8 mx-auto mb-1 object-contain filter grayscale" />
                      )}
                      <h2 className="text-sm font-black uppercase tracking-wider">{storeName}</h2>
                      <p className="text-[10px] font-bold">Helpline: {storePhone}</p>
                    </div>

                    {/* Barcode & Order ID */}
                    <div className="py-2 text-center border-b border-dashed border-black">
                      <BarcodeSVG value={premiumId} />
                      <div className="text-[10px] font-bold text-slate-700 mt-0.5">
                        Date: {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Courier Tag (if dispatched) */}
                    {order.courier_name && (
                      <div className="py-1 text-center font-bold text-[10px] border-b border-dashed border-black uppercase tracking-wider bg-slate-100 my-1">
                        Courier: {order.courier_name} {order.courier_consignment_id ? `| CID: ${order.courier_consignment_id}` : ''}
                      </div>
                    )}

                    {/* BIG BOLD COD AMOUNT BOX */}
                    <div className="my-2 border-2 border-black p-2 text-center bg-slate-50">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                        CASH ON DELIVERY (COD) কালেকশন
                      </div>
                      <div className="text-xl font-black tracking-tight my-0.5">
                        ৳{order.total_amount?.toLocaleString() || 0}
                      </div>
                      <div className="text-[9px] font-bold text-slate-600">
                        ক্যাশ অন ডেলিভারিতে সম্পূর্ণ টাকা বুঝিয়া নিন
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div className="py-2 border-b border-dashed border-black space-y-1">
                      <div className="flex items-start justify-between">
                        <span className="font-bold">কাস্টমার নাম:</span>
                        <span className="font-extrabold text-right">{name}</span>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="font-bold">মোবাইল নম্বর:</span>
                        <span className="font-black text-sm tracking-wide text-right">{phone}</span>
                      </div>
                      <div className="pt-0.5">
                        <span className="font-bold block mb-0.5">ডেলিভারি ঠিকানা:</span>
                        <p className="font-semibold text-[10px] leading-snug bg-slate-50 p-1 rounded border border-slate-200">
                          {address}
                          {deliveryArea ? ` (${deliveryArea})` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Order Items Table */}
                    <div className="py-2 border-b border-dashed border-black">
                      <div className="text-[10px] font-black uppercase tracking-wider mb-1 flex justify-between">
                        <span>আইটেম বিবরণ</span>
                        <span>পরিমাণ</span>
                      </div>
                      <div className="space-y-1">
                        {order.order_items && order.order_items.length > 0 ? (
                          order.order_items.map((item, i) => {
                            const pTitle = item.product?.title || item.product?.name || item.products?.title || 'Product';
                            const options = item.variant_options ? Object.values(item.variant_options).filter(Boolean).join(', ') : '';
                            return (
                              <div key={i} className="flex justify-between items-start text-[10px] border-b border-slate-100 pb-0.5">
                                <div className="pr-1 flex-1">
                                  <span className="font-bold">{pTitle}</span>
                                  {options && <span className="block text-[9px] text-slate-600">[{options}]</span>}
                                </div>
                                <div className="text-right flex-shrink-0 font-black">
                                  x{item.quantity} {showItemPrices && `(৳${item.price})`}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-[10px] font-medium text-slate-600">
                            Order items details listed in system. Total: ৳{order.total_amount}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Instructions & Footer Note */}
                    <div className="pt-2 text-center text-[9px] space-y-1">
                      {orderNote && (
                        <p className="font-bold text-slate-800 bg-slate-100 p-1 rounded">
                          নোট: {orderNote}
                        </p>
                      )}
                      <p className="font-bold text-slate-700">
                        {customNote}
                      </p>
                      <p className="text-[8px] text-slate-500 pt-1 border-t border-slate-200">
                        Powered by {storeName} • Thank you for shopping with us!
                      </p>
                    </div>
                  </div>
                );
              }

              // ---------------------------------------------
              // FORMAT 2: 50mm Mini Thermal Sticker
              // ---------------------------------------------
              if (printType === 'thermal_50') {
                return (
                  <div
                    key={order.id}
                    className={`bg-white text-black p-2 border border-slate-300 shadow-md font-sans w-[50mm] max-w-[50mm] box-border text-[9px] leading-tight ${
                      orderIdx < orders.length - 1 ? 'page-break' : ''
                    }`}
                  >
                    <div className="text-center pb-1 border-b border-black">
                      <span className="text-[11px] font-black uppercase tracking-wider block">{storeName}</span>
                      <span className="text-[8px] font-bold">Helpline: {storePhone}</span>
                    </div>

                    <div className="py-1 text-center border-b border-black">
                      <BarcodeSVG value={premiumId} />
                    </div>

                    <div className="my-1 border-2 border-black p-1 text-center bg-slate-50">
                      <div className="text-[8px] font-black uppercase">COD AMOUNT</div>
                      <div className="text-base font-black">৳{order.total_amount}</div>
                    </div>

                    <div className="space-y-0.5 text-[9px] py-1 border-b border-black">
                      <div><span className="font-bold">Name:</span> {name}</div>
                      <div><span className="font-bold">Phone:</span> <span className="font-black text-[10px]">{phone}</span></div>
                      <div><span className="font-bold">Address:</span> {address}</div>
                    </div>

                    <div className="pt-1 text-[8px] text-center font-bold">
                      প্যাকেট চেক করে রিসিভ করুন
                    </div>
                  </div>
                );
              }

              // ---------------------------------------------
              // FORMAT 3: A4 Professional Cash Memo / Invoice
              // ---------------------------------------------
              return (
                <div
                  key={order.id}
                  className={`bg-white text-slate-900 p-8 sm:p-12 border border-slate-200 shadow-xl font-sans w-full max-w-[210mm] box-border ${
                    orderIdx < orders.length - 1 ? 'page-break' : ''
                  }`}
                  style={{ minHeight: '297mm' }}
                >
                  {/* Top Branding & Invoice Title */}
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6 mb-6">
                    <div>
                      {showStoreLogo && storeLogo ? (
                        <img src={storeLogo} alt={storeName} className="h-12 max-h-12 mb-2 object-contain" />
                      ) : (
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">{storeName}</h1>
                      )}
                      <p className="text-xs text-slate-500 font-medium mt-1">Reliable E-Commerce in Bangladesh</p>
                      <p className="text-xs text-slate-600 font-bold mt-0.5">Hotline: {storePhone}</p>
                    </div>

                    <div className="text-right">
                      <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-lg mb-2">
                        INVOICE / চালান
                      </div>
                      <p className="text-sm font-mono font-black text-slate-900">ID: {premiumId}</p>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Date: {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        Status: <span className="font-bold uppercase text-slate-800">{order.status}</span>
                      </p>
                    </div>
                  </div>

                  {/* Customer & Shipping Grid */}
                  <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 text-xs">
                    <div>
                      <h4 className="font-black text-slate-400 uppercase tracking-wider mb-2 text-[10px]">Customer Details (গ্রাহক)</h4>
                      <p className="font-black text-slate-900 text-sm mb-1">{name}</p>
                      <p className="font-mono font-bold text-slate-700 text-xs mb-1">Phone: {phone}</p>
                      <p className="text-slate-500">{order.profiles?.email || 'Guest Checkout'}</p>
                    </div>

                    <div>
                      <h4 className="font-black text-slate-400 uppercase tracking-wider mb-2 text-[10px]">Delivery Information (ডেলিভারি ঠিকানা)</h4>
                      <p className="font-semibold text-slate-800 whitespace-pre-line leading-relaxed">{address}</p>
                      {deliveryArea && <p className="text-slate-500 mt-1 font-medium">Area: {deliveryArea}</p>}
                      {order.courier_name && (
                        <p className="font-bold text-primary mt-1 uppercase">
                          Courier: {order.courier_name} {order.courier_consignment_id ? `(CID: ${order.courier_consignment_id})` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Itemized Table */}
                  <div className="mb-6">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-900 text-slate-900 uppercase font-black tracking-wider text-[11px]">
                          <th className="py-3 px-2 w-10">#</th>
                          <th className="py-3 px-2">Item Description</th>
                          <th className="py-3 px-2 text-center w-20">Quantity</th>
                          <th className="py-3 px-2 text-right w-24">Unit Price</th>
                          <th className="py-3 px-2 text-right w-28">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {order.order_items && order.order_items.length > 0 ? (
                          order.order_items.map((item, idx) => {
                            const pTitle = item.product?.title || item.product?.name || item.products?.title || 'Product';
                            const options = item.variant_options ? Object.values(item.variant_options).filter(Boolean).join(', ') : '';
                            const lineTotal = item.quantity * item.price;
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-3 px-2 font-bold text-slate-400">{idx + 1}</td>
                                <td className="py-3 px-2">
                                  <span className="font-bold text-slate-900 block">{pTitle}</span>
                                  {options && <span className="text-[10px] text-slate-500">Variant: {options}</span>}
                                </td>
                                <td className="py-3 px-2 text-center font-bold">{item.quantity}</td>
                                <td className="py-3 px-2 text-right font-mono font-medium">৳{item.price.toFixed(2)}</td>
                                <td className="py-3 px-2 text-right font-mono font-black text-slate-900">৳{lineTotal.toFixed(2)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-slate-500 font-medium">
                              Order items registered in system database.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Breakdown & COD Banner */}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-6 border-t-2 border-slate-200 pt-6">
                    {/* Left: Notes & Barcode */}
                    <div className="w-full sm:w-1/2 space-y-4">
                      <BarcodeSVG value={premiumId} />
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                        <span className="font-bold text-slate-800 block mb-1">গ্রাহকের জন্য নির্দেশনা:</span>
                        <p className="text-slate-600 leading-relaxed text-[11px]">{customNote}</p>
                      </div>
                    </div>

                    {/* Right: Financial Totals Box */}
                    <div className="w-full sm:w-1/2 space-y-2 text-xs">
                      <div className="flex justify-between py-1 text-slate-600 font-medium">
                        <span>Items Subtotal:</span>
                        <span className="font-mono font-bold">৳{order.total_amount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-600 font-medium">
                        <span>Delivery Charge:</span>
                        <span className="font-mono font-bold">৳0.00</span>
                      </div>
                      <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-black text-slate-900">
                        <span>Total Payable (COD):</span>
                        <span className="font-mono text-lg text-primary">৳{order.total_amount?.toFixed(2)}</span>
                      </div>

                      <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                        <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
                          CASH ON DELIVERY (পণ্য পেয়ে টাকা পরিশোধ)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Signature & Disclaimer Footer */}
                  <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
                    <div>
                      <p className="font-bold text-slate-700">{storeName}</p>
                      <p>Website: {window.location.origin}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-36 border-b border-slate-400 mb-1"></div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Authorized Signature</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
