import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Package, Search, Clock, CheckCircle, Truck, PackageOpen, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

import { getPremiumOrderId } from '../lib/orderUtils';
import { SEO } from '../components/SEO';
import { CustomerInvoiceModal, CustomerInvoiceData } from '../components/CustomerInvoiceModal';
import { FileText, Printer } from 'lucide-react';

export default function TrackOrder() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('id') || '');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success('Tracking ID copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setOrderId(id);
      trackOrderById(id);
    }
  }, [searchParams]);

  const trackOrderById = async (id: string) => {
    if (!id.trim()) return;

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const cleanId = id.trim();
      const { data: orderData, error: rpcError } = await supabase.rpc('track_order_public', { tracking_code: cleanId });
      if (rpcError) throw rpcError;

      if (!orderData) {
        setError('অর্ডারটি খুঁজে পাওয়া যায়নি। অনুগ্রহ করে সঠিক ট্র্যাকিং আইডি দিন।');
      } else {
        setOrder(orderData);
      }
    } catch (err: any) {
      console.error(err);
      setError('An error occurred while tracking the order.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    setSearchParams({ id: orderId });
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending':
      case 'hold':
        return 1;
      case 'call_verified':
      case 'processing':
        return 2;
      case 'shipped':
        return 3;
      case 'delivered':
        return 4;
      case 'cancelled':
        return 0;
      default:
        return 1;
    }
  };


  // Parse order details for invoice
  const getInvoiceData = (): CustomerInvoiceData | null => {
    if (!order) return null;
    const addressStr = order.shipping_address || '';
    
    // Extract Name, Phone, Address from address text
    const nameMatch = addressStr.match(/Name:\s*([^\n]+)/i);
    const phoneMatch = addressStr.match(/Phone:\s*([^\n]+)/i);
    const addrMatch = addressStr.match(/Address:\s*([^\n]+)/i);
    const areaMatch = addressStr.match(/Delivery Area:\s*([^\n]+)/i);
    const shipMatch = addressStr.match(/Shipping Charge:\s*(\d+)/i);
    
    const customerName = nameMatch ? nameMatch[1].trim() : 'Valued Customer';
    const phone = phoneMatch ? phoneMatch[1].trim() : 'N/A';
    const address = addrMatch ? addrMatch[1].trim() : addressStr;
    const deliveryArea = areaMatch ? areaMatch[1].trim() : undefined;
    const shippingCharge = shipMatch ? Number(shipMatch[1]) : 0;

    const items = (order.order_items || []).map((item: any) => {
      let title = item.product?.title || item.product?.name || item.products?.title || 'Product';
      let variantStr: string | undefined;
      if (item.variant_options && typeof item.variant_options === 'object') {
        variantStr = Object.entries(item.variant_options).map(([k, v]) => `${k}: ${v}`).join(', ');
      }
      return {
        title,
        variant: variantStr,
        quantity: item.quantity,
        price: item.price
      };
    });

    return {
      orderId: getPremiumOrderId(order),
      created_at: order.created_at,
      customerName,
      phone,
      address,
      deliveryArea,
      shippingCharge,
      totalAmount: order.total_amount,
      items,
      status: order.status
    };
  };

  return (
    <div className="min-h-[80vh] bg-[#f7f8fa] py-12 px-4 font-sans">
      <SEO title="Track Your Order" />
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12 text-center mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 opacity-50"></div>
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4 flex items-center justify-center gap-3">
              <Package className="text-primary" size={36} />
              Track Your Order
            </h1>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Enter your premium order ID below to check the real-time status of your delivery.
            </p>

            <form onSubmit={handleTrack} className="max-w-lg mx-auto relative">
              <input
                type="text"
                placeholder="e.g. b8c9d789-..."
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full h-14 pl-6 pr-32 rounded-full border-2 border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-primary focus:ring-0 outline-none transition-all font-medium text-lg placeholder:text-slate-400"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-6 bg-primary hover:bg-primary-hover disabled:opacity-70 text-white rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Search size={18} strokeWidth={2.5} />
                    <span>Track</span>
                  </>
                )}
              </button>
            </form>
            
            {error && (
              <div className="mt-6 text-red-500 font-medium bg-red-50 px-4 py-3 rounded-xl inline-block">
                {error}
              </div>
            )}
          </div>
        </div>

        {order && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-100">
              <div>
                <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-1">Order Details</p>
                <div className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="font-mono text-primary">{getPremiumOrderId(order)}</span>
                  <button 
                    onClick={() => handleCopy(getPremiumOrderId(order))}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-primary transition-colors"
                    title="Copy Tracking ID"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-slate-500 mb-1">Placed on</p>
                  <p className="font-bold text-slate-800">{new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <button
                  onClick={() => setInvoiceModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  title="View / Download Invoice"
                >
                  <FileText size={15} className="text-emerald-600" />
                  <span>Invoice (ইনভয়েস)</span>
                </button>
              </div>
            </div>

            {order.status === 'cancelled' ? (
              <div className="p-6 bg-red-50 rounded-2xl flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                  <PackageOpen size={32} />
                </div>
                <h3 className="text-xl font-bold text-red-700 mb-2">Order Cancelled</h3>
                <p className="text-red-500 max-w-sm">This order has been cancelled and will not be delivered.</p>
              </div>
            ) : (
              <div className="py-8 relative">
                {/* Progress Bar Background */}
                <div className="absolute left-[39px] sm:left-1/2 sm:top-[45px] top-[45px] bottom-[45px] sm:bottom-auto w-1 sm:w-full h-full sm:h-1 bg-slate-100 sm:-translate-x-1/2 rounded-full z-0"></div>
                
                {/* Progress Bar Fill */}
                {getStatusStep(order.status) > 1 && (
                  <div 
                    className="absolute left-[39px] sm:left-[10%] sm:top-[45px] top-[45px] w-1 sm:w-auto h-full sm:h-1 bg-primary rounded-full z-0 transition-all duration-1000"
                    style={{ 
                      height: window.innerWidth < 640 ? `${((getStatusStep(order.status) - 1) / 3) * 100}%` : '4px',
                      width: window.innerWidth >= 640 ? `${((getStatusStep(order.status) - 1) / 3) * 80}%` : '4px',
                    }}
                  ></div>
                )}

                <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-8 sm:gap-0">
                  {/* Step 1: Pending */}
                  <div className={`flex flex-row sm:flex-col items-center gap-4 sm:gap-3 ${getStatusStep(order.status) >= 1 ? 'text-primary' : 'text-slate-400'}`}>
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 flex items-center justify-center bg-white transition-all duration-500 ${getStatusStep(order.status) >= 1 ? 'border-primary shadow-lg shadow-primary/20' : 'border-slate-200'}`}>
                      <Clock size={32} strokeWidth={getStatusStep(order.status) >= 1 ? 2.5 : 2} />
                    </div>
                    <div className="text-left sm:text-center w-full sm:w-32">
                      <p className="font-bold whitespace-nowrap text-lg sm:text-base text-slate-800">Order Placed</p>
                      <p className="text-sm mt-0.5 text-slate-500">We have received your order</p>
                    </div>
                  </div>

                  {/* Step 2: Processing */}
                  <div className={`flex flex-row sm:flex-col items-center gap-4 sm:gap-3 ${getStatusStep(order.status) >= 2 ? 'text-primary' : 'text-slate-400'}`}>
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 flex items-center justify-center bg-white transition-all duration-500 ${getStatusStep(order.status) >= 2 ? 'border-primary shadow-lg shadow-primary/20' : 'border-slate-200'}`}>
                      <Package size={32} strokeWidth={getStatusStep(order.status) >= 2 ? 2.5 : 2} />
                    </div>
                    <div className="text-left sm:text-center w-full sm:w-32">
                      <p className="font-bold whitespace-nowrap text-lg sm:text-base text-slate-800">Processing</p>
                      <p className="text-sm mt-0.5 text-slate-500">Order is being prepared</p>
                    </div>
                  </div>

                  {/* Step 3: Shipped */}
                  <div className={`flex flex-row sm:flex-col items-center gap-4 sm:gap-3 ${getStatusStep(order.status) >= 3 ? 'text-primary' : 'text-slate-400'}`}>
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 flex items-center justify-center bg-white transition-all duration-500 ${getStatusStep(order.status) >= 3 ? 'border-primary shadow-lg shadow-primary/20' : 'border-slate-200'}`}>
                      <Truck size={32} strokeWidth={getStatusStep(order.status) >= 3 ? 2.5 : 2} />
                    </div>
                    <div className="text-left sm:text-center w-full sm:w-32">
                      <p className="font-bold whitespace-nowrap text-lg sm:text-base text-slate-800">Shipped</p>
                      <p className="text-sm mt-0.5 text-slate-500">Handed to delivery partner</p>
                    </div>
                  </div>

                  {/* Step 4: Delivered */}
                  <div className={`flex flex-row sm:flex-col items-center gap-4 sm:gap-3 ${getStatusStep(order.status) >= 4 ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 flex items-center justify-center bg-white transition-all duration-500 ${getStatusStep(order.status) >= 4 ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-slate-200'}`}>
                      <CheckCircle size={32} strokeWidth={getStatusStep(order.status) >= 4 ? 2.5 : 2} />
                    </div>
                    <div className="text-left sm:text-center w-full sm:w-32">
                      <p className="font-bold whitespace-nowrap text-lg sm:text-base text-slate-800">Delivered</p>
                      <p className="text-sm mt-0.5 text-slate-500">Package has arrived</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 bg-slate-50 rounded-2xl p-6">
              <h3 className="font-bold text-slate-800 mb-4 uppercase tracking-wider text-sm">Items in your order</h3>
              <div className="space-y-4">
                {order.order_items.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-4 items-center bg-white p-3 rounded-xl border border-slate-100">
                    <img 
                      src={item.product?.image || item.product?.images?.[0] || 'https://via.placeholder.com/150'} 
                      className="w-16 h-16 object-cover rounded-lg bg-slate-100" 
                      alt={item.product?.title || item.product?.name} 
                    />
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 line-clamp-1">{item.product?.title || item.product?.name}</p>
                      {item.variant_options && typeof item.variant_options === 'object' && (
                        <p className="text-[11px] font-bold text-primary bg-primary/10 inline-block px-1.5 py-0.5 rounded my-0.5">
                          {Object.entries(item.variant_options).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                        </p>
                      )}
                      <p className="text-slate-500 text-sm">Qty: {item.quantity}</p>
                    </div>
                    <div className="font-bold text-slate-800">
                      ৳{(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center text-lg font-black text-slate-900">
                <span>Total Amount:</span>
                <span className="text-primary">৳{order.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
        {/* Customer Invoice Modal */}
        <CustomerInvoiceModal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          invoice={getInvoiceData()}
        />
      </div>
    </div>
  );
}
