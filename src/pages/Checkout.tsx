import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../lib/supabase';
import { MapPin, Phone, User, ChevronDown, CheckCircle, ChevronLeft, Truck, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { SEO } from '../components/SEO';
import { CustomerInvoiceModal, CustomerInvoiceData } from '../components/CustomerInvoiceModal';
import { FileText } from 'lucide-react';
import { sendTelegramOrderNotification } from '../lib/telegramApi';
import { trackPurchase, resolveBdLocation, saveCachedUserData } from '../lib/fbPixel';
import { trackTiktokCompletePayment } from '../lib/ttPixel';
import { Select } from '../components/ui/Select';
import { 
  getDivisions, 
  getDistrictsByDivision, 
  getUpazilasByDistrict, 
  findDistrictById, 
  getDeliveryChargeForDistrict,
  BD_DIVISIONS 
} from '../data/bangladeshData';
import { fetchClientIp, checkIsBlocked, trapBlacklistIp } from '../lib/blacklist';
import { trackEvent } from '../lib/analytics';
import { CheckoutPaymentOptions, useCheckoutPayment } from '../components/CheckoutPaymentOptions';
import { paymentRequest } from '../lib/storePaymentApi';
import { paymentQuote } from '../lib/paymentRules';

export default function Checkout() {
  const { items, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { settings, loading } = useSettings();
  const payment = useCheckoutPayment();
  const navigate = useNavigate();

  const updateAddressFields = (divId: string, distId: string, upa: string, street: string) => {
    const parts: string[] = [];
    if (street.trim()) parts.push(street.trim());
    if (upa.trim()) parts.push(upa.trim());
    if (distId) {
      const d = findDistrictById(distId);
      if (d) parts.push(`${d.nameBn} (${d.name})`);
    }
    if (divId) {
      const dv = BD_DIVISIONS.find(d => d.id === divId);
      if (dv) parts.push(`${dv.nameBn} বিভাগ`);
    }
    setAddress(parts.join(', '));
  };

  const handleDivisionChange = (divId: string) => {
    setSelectedDivision(divId);
    setSelectedDistrict('');
    setSelectedUpazila('');
    updateAddressFields(divId, '', '', streetAddress);
  };

  const handleDistrictChange = (distId: string) => {
    setSelectedDistrict(distId);
    setSelectedUpazila('');
    if (distId) {
      const chargeInfo = getDeliveryChargeForDistrict(distId, settings);
      setDeliveryArea(chargeInfo.area);
    }
    updateAddressFields(selectedDivision, distId, '', streetAddress);
  };

  const handleUpazilaChange = (upa: string) => {
    setSelectedUpazila(upa);
    updateAddressFields(selectedDivision, selectedDistrict, upa, streetAddress);
  };

  const handleStreetChange = (street: string) => {
    setStreetAddress(street);
    updateAddressFields(selectedDivision, selectedDistrict, selectedUpazila, street);
  };

  
  const [address, setAddress] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedUpazila, setSelectedUpazila] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [fullName, setFullName] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string, total: number } | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<CustomerInvoiceData | null>(null);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const [productDelivery, setProductDelivery] = useState<Record<string, { delivery_charge: number | null; is_delivery_free: boolean }>>({});
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [incompleteOrderId, setIncompleteOrderId] = useState<string | null>(null);
  const [clientIp, setClientIp] = useState<string>('Unknown');
  const [blockedInfo, setBlockedInfo] = useState<{ isBlocked: boolean; message?: string } | null>(null);

  React.useEffect(() => {
    fetchClientIp().then(async (ip) => {
      if (ip && ip !== 'Unknown') {
        setClientIp(ip);
        const res = await checkIsBlocked(ip, '');
        if (res.isBlocked) {
          setBlockedInfo({
            isBlocked: true,
            message: 'দুঃখিত! এই ডিভাইস অথবা নেটওয়ার্ক থেকে কোনো অর্ডার গ্রহণ করা সম্ভব নয়।'
          });
        }
      }
    });
  }, []);

  React.useEffect(() => {
    if (phone.trim().length >= 10) {
      checkIsBlocked(clientIp, phone.trim(), true).then(res => {
        if (res.isBlocked) {
          trapBlacklistIp(phone.trim(), clientIp, res.reason);
          setBlockedInfo({
            isBlocked: true,
            message: res.blockedType === 'phone'
              ? 'এই মোবাইল নম্বরটি ব্লকলিস্টে রয়েছে। কোনো নতুন অর্ডার গ্রহণ করা সম্ভব নয়।'
              : 'এই ডিভাইস অথবা নম্বর থেকে কোনো অর্ডার গ্রহণ করা সম্ভব নয়।'
          });
        } else if (!blockedInfo?.isBlocked || blockedInfo?.message?.includes('মোবাইল')) {
          // Recheck IP only
          checkIsBlocked(clientIp, '', false).then(ipRes => {
            if (ipRes.isBlocked) {
              setBlockedInfo({
                isBlocked: true,
                message: 'দুঃখিত! এই ডিভাইস অথবা নেটওয়ার্ক থেকে কোনো অর্ডার গ্রহণ করা সম্ভব নয়।'
              });
            } else {
              setBlockedInfo(null);
            }
          });
        }
      });
    }
  }, [phone, clientIp]);
  const getItemPrice = (product: any) => Number(product.discount_price || product.price || 0);
  const getProductDelivery = (product: any) => productDelivery[product.id] || {
    delivery_charge: product.delivery_charge ?? null,
    is_delivery_free: Boolean(product.is_delivery_free)
  };
  const isFreeDeliveryOrder = items.length > 0 && items.every(item => getProductDelivery(item.product).is_delivery_free);
  const getVariantDeliveryCharge = (product: any) => Number(
    product.selectedVariant?.delivery_charge ?? 0
  );
  const variantDeliveryCharge = items.reduce((total, item) => {
    if (getProductDelivery(item.product).is_delivery_free) return total;
    return total + (getVariantDeliveryCharge(item.product) * item.quantity);
  }, 0);
  const regularDeliveryItems = items.filter(item => !getProductDelivery(item.product).is_delivery_free && getVariantDeliveryCharge(item.product) <= 0);
  const productDeliveryCharge = Math.max(...regularDeliveryItems.map(item => Number(getProductDelivery(item.product).delivery_charge || 0)), 0);
  const hasProductDeliveryCharge = productDeliveryCharge > 0;
  const districtChargeInfo = selectedDistrict 
    ? getDeliveryChargeForDistrict(selectedDistrict, settings)
    : null;

  const isFlatDelivery = settings.delivery_charge_type === 'flat';
  const settingsDeliveryCharge = isFlatDelivery
    ? Number(settings.flat_delivery_charge || 120)
    : districtChargeInfo
      ? districtChargeInfo.charge
      : Number(
          deliveryArea === 'inside_dhaka'
            ? settings.delivery_charge_inside_dhaka || 0
            : settings.delivery_charge_outside_dhaka || 0
        );
  const regularDeliveryCharge = regularDeliveryItems.length > 0
    ? (hasProductDeliveryCharge ? productDeliveryCharge : settingsDeliveryCharge)
    : 0;
  const shippingCharge = isFreeDeliveryOrder ? 0 : regularDeliveryCharge + variantDeliveryCharge;
  const orderTotal = cartTotal + shippingCharge;

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success('Tracking ID copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  React.useEffect(() => {
    if (items.length > 0 && !isCheckingOut && orderStatus === 'idle') {
      trackEvent('checkout', { product_id: items.length === 1 ? items[0].product.id : 'multiple' });
    }
  }, []);

  React.useEffect(() => {
    if (loading) return;
    const isGuestCheckoutAllowed = settings.allow_guest_checkout === 'true';

    if (!isGuestCheckoutAllowed && !user && !successData && orderStatus !== 'success') {
      toast.error('Please sign in to checkout');
      navigate('/signin');
    } else if (items.length === 0 && !successData && orderStatus !== 'success' && !isCheckingOut && orderStatus !== 'processing') {
      navigate('/');
    }
  }, [user, items, navigate, successData, isCheckingOut, orderStatus, settings, loading]);

  React.useEffect(() => {
    if (successData || orderStatus === 'success' || items.length === 0 || isCheckingOut) return;
    if (!phone.trim() && !fullName.trim()) return;

    const saveDraft = async () => {
      try {
        const isBlockedResult = await checkIsBlocked(clientIp, phone.trim());
        if (isBlockedResult.isBlocked) return;

        const payload = {
          customer_name: fullName.trim(),
          customer_phone: phone.trim(),
          customer_address: address.trim() + (clientIp !== 'Unknown' ? `\n[IP:${clientIp}]` : ''),
          order_note: orderNote.trim(),
          cart_items: items,
          total_amount: orderTotal,
          order_source: localStorage.getItem('order_source') || 'organic',
          updated_at: new Date().toISOString()
        };

        if (incompleteOrderId) {
          await supabase
            .from('incomplete_orders')
            .update(payload)
            .eq('id', incompleteOrderId);
        } else {
          const generatedId = crypto.randomUUID();
          setIncompleteOrderId(generatedId);
          await supabase
            .from('incomplete_orders')
            .insert([{ ...payload, id: generatedId }]);
        }
      } catch (error) {
        console.error('Failed to save incomplete order', error);
      }
    };

    const timer = setTimeout(saveDraft, 2000);
    return () => clearTimeout(timer);
  }, [fullName, phone, address, orderNote, items, orderTotal, incompleteOrderId, successData, orderStatus, isCheckingOut]);

  React.useEffect(() => {
    const productIds = Array.from(new Set(items.map(item => item.product.id).filter(Boolean)));
    if (productIds.length === 0) {
      setProductDelivery({});
      return;
    }

    let isActive = true;
    setDeliveryLoading(true);

    const fetchDeliveryCharges = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, delivery_charge, is_delivery_free')
          .in('id', productIds);

        if (!isActive) return;
        if (error) {
          console.error('Error fetching product delivery charges:', error);
          return;
        }

        const deliveryByProduct: Record<string, { delivery_charge: number | null; is_delivery_free: boolean }> = {};
        (data || []).forEach(product => {
          deliveryByProduct[product.id] = {
            delivery_charge: product.delivery_charge === null ? null : Number(product.delivery_charge),
            is_delivery_free: Boolean(product.is_delivery_free)
          };
        });
        setProductDelivery(deliveryByProduct);
      } catch (err) {
        console.error('Error fetching product delivery charges:', err);
      } finally {
        if (isActive) setDeliveryLoading(false);
      }
    };

    fetchDeliveryCharges();

    return () => {
      isActive = false;
    };
  }, [items]);

  const isGuestCheckoutAllowed = settings.allow_guest_checkout === 'true';
  if (!loading && ((!user && !isGuestCheckoutAllowed) || items.length === 0) && !successData && orderStatus !== 'success') return null;

  if (successData) {
    return (
      <div className="min-h-[calc(100vh-100px)] bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <SEO title="Order Confirmed" />
        
        {/* Background Decorative Elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring' as const, bounce: 0.4 }}
          className="max-w-md w-full relative z-10"
        >
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100/60 backdrop-blur-xl relative overflow-hidden text-center">
            
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" as const, damping: 12, stiffness: 100, delay: 0.2 }}
              className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl shadow-emerald-100/50 ring-8 ring-emerald-50 relative"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-emerald-400/20 -z-10"
              />
              <CheckCircle size={48} strokeWidth={2.5} className="text-emerald-500 drop-shadow-md" />
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-emerald-600"
            >
              Success
            </motion.p>

            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-black text-slate-900 tracking-tight mb-3 drop-shadow-sm"
            >
              Order Confirmed!
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-slate-500 font-medium mb-8"
            >
              Your order has been placed successfully. Please keep your Tracking ID for future reference.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4 rounded-[2rem] border border-slate-100 bg-slate-50/50 p-5 text-left shadow-inner"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-200/60">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tracking ID</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl">{successData.id}</span>
                  <button 
                    onClick={() => handleCopy(successData.id)}
                    className="p-2 bg-white shadow-sm hover:shadow active:scale-95 rounded-xl text-primary transition-all"
                    title="Copy Tracking ID"
                  >
                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Amount</span>
                <span className="font-black text-slate-900 text-2xl">৳{successData.total.toLocaleString()}</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-8 flex flex-col gap-3"
            >
              <button 
                onClick={() => navigate(`/track-order?id=${successData.id}`)}
                className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20 active:scale-[0.98]"
              >
                <Truck size={18} />
                Track My Order
              </button>

              <button 
                onClick={() => setInvoiceModalOpen(true)}
                className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-2 border-emerald-300 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
              >
                <FileText size={18} className="text-emerald-600" />
                View / Download Invoice (ইনভয়েস দেখুন ও ডাউনলোড করুন)
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => navigate('/')}
                  className="bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
                >
                  Go to Home
                </button>
                <button 
                  onClick={() => navigate('/shop')}
                  className="bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98]"
                >
                  Shop More
                </button>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full border border-amber-100"
            >
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <p className="text-amber-700 text-xs font-bold">
                You will receive a confirmation call shortly.
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Customer Invoice Modal */}
        <CustomerInvoiceModal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          invoice={invoiceData}
        />
      </div>
    );
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      toast.error('Please fill in all delivery details');
      return;
    }
    let cleanedPhone = phone.trim().replace(/[^\d+]/g, "");
    if (cleanedPhone.startsWith("+88")) {
      cleanedPhone = cleanedPhone.substring(3);
    } else if (cleanedPhone.startsWith("88") && cleanedPhone.length === 13) {
      cleanedPhone = cleanedPhone.substring(2);
    }

    if (!/^01[3-9]\d{8}$/.test(cleanedPhone)) {
      toast.error('Please enter a valid 11-digit mobile number (e.g., 017...)');
      return;
    }
    if (deliveryLoading) {
      toast.error('Please wait while delivery charge is loading');
      return;
    }

    // Check blacklist (IP & Phone)
    let activeIp = clientIp;
    if (!activeIp || activeIp === 'Unknown') {
      activeIp = await fetchClientIp();
      setClientIp(activeIp);
    }

    const blockCheck = await checkIsBlocked(activeIp, cleanedPhone, true);
    if (blockCheck.isBlocked) {
      // Auto-trap this device's IP immediately in database and localStorage
      await trapBlacklistIp(cleanedPhone, activeIp, blockCheck.reason);
      toast.error('দুঃখিত! এই ডিভাইস অথবা ফোন নাম্বার থেকে বর্তমানে কোনো অর্ডার গ্রহণ করা সম্ভব হচ্ছে না।', { duration: 6000 });
      // Instantly trigger full-screen website lockout
      window.dispatchEvent(new CustomEvent('client_blocked', {
        detail: { isBlocked: true, ip: activeIp, phone: cleanedPhone, reason: blockCheck.reason }
      }));
      return;
    }

    setIsCheckingOut(true);
    setOrderStatus('processing');

    try {
      const quote = paymentQuote(payment.method, orderTotal, shippingCharge, payment.config.fixedAdvance);
      if (payment.method !== 'cod' && !payment.config.configured) throw new Error('এই দোকানে অনলাইন পেমেন্ট এখনো চালু হয়নি।');
      // 1. Create Order
      const shortId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const trackingId = `ORD-${shortId}`;
      const deliveryInfo = [
        `Name: ${fullName}`,
        `Phone: ${cleanedPhone}`,
        whatsappNumber.trim() ? `WhatsApp: ${whatsappNumber}` : null,
        `Address: ${address}`,
        isFreeDeliveryOrder ? 'Delivery: Free' : `Delivery Area: ${deliveryArea === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}`,
        `Shipping Charge: ${shippingCharge}`,
        orderNote.trim() ? `Order Note: ${orderNote}` : null,
        `[TID:${trackingId}]`,
        activeIp && activeIp !== 'Unknown' ? `[IP:${activeIp}]` : null
      ].filter(Boolean).join('\n');
      
      const { data: orderParams, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user?.id || null,
          total_amount: orderTotal,
          shipping_address: deliveryInfo,
          status: 'pending',
          order_source: localStorage.getItem('order_source') || 'organic',
          payment_method: payment.method,
          advance_required: quote.required,
          advance_paid: 0,
          payment_status: 'unpaid',
          shipping_charge: shippingCharge
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = items.map(item => ({
        order_id: orderParams.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: getItemPrice(item.product),
        variant_sku: item.product.sku || item.product.selectedVariant?.sku || null,
        variant_options: item.product.selectedVariants || null,
        variant_compare_price: item.product.original_price || item.product.selectedVariant?.compare_price || null,
        variant_cost_price: item.product.selectedVariant?.cost_price || null,
        variant_weight: item.product.weight || item.product.selectedVariant?.weight || null
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Online payment: send the customer to the gateway page
      if (payment.method !== 'cod') {
        const { redirectUrl } = await paymentRequest<{ redirectUrl: string }>('initiate', { orderId: orderParams.id });
        window.location.href = redirectUrl;
        return;
      }

      // Decrement inventory stock for ordered items
      for (const item of items) {
        if (item.product?.id) {
          const currentStock = Number(item.product.stock ?? 100);
          const newStock = Math.max(0, currentStock - item.quantity);
          try {
            await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', item.product.id);
          } catch (stockErr) {
            console.warn('Could not decrement product stock:', stockErr);
          }
        }
      }

      // 3. Send Telegram Notification
      sendTelegramOrderNotification({
        orderId: trackingId,
        customerName: fullName,
        phone: cleanedPhone,
        address: address,
        totalAmount: orderTotal,
        shippingFee: shippingCharge,
        deliveryArea: deliveryArea === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka',
        orderNote: orderNote,
        items: items.map(item => {
          let itemTitle = item.product.title || item.product.name || 'Product';
          if (item.product.selectedVariants) {
            const variantStr = Object.entries(item.product.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ');
            itemTitle += ` (${variantStr})`;
          }
          return {
            title: itemTitle,
            quantity: item.quantity,
            price: getItemPrice(item.product)
          };
        })
      }).catch(e => console.warn('Telegram notification error:', e));

      // 4. Delete incomplete order if it exists
      if (incompleteOrderId) {
        supabase.rpc('delete_incomplete_order', { target_id: incompleteOrderId }).then(({ error }) => {
          if (error) {
            supabase.from('incomplete_orders').delete().eq('id', incompleteOrderId).then();
          }
        });
      }

      toast.success('Order placed successfully!');
      const total = orderTotal;
      clearCart();
      
      const preparedInvoice: CustomerInvoiceData = {
        orderId: trackingId,
        created_at: new Date().toISOString(),
        customerName: fullName,
        phone: cleanedPhone,
        address: address,
        deliveryArea: deliveryArea === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka',
        shippingCharge: shippingCharge,
        totalAmount: orderTotal,
        items: items.map(item => {
          let itemTitle = item.product.title || item.product.name || 'Product';
          let variantStr: string | undefined;
          if (item.product.selectedVariants) {
            variantStr = Object.entries(item.product.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ');
          }
          return {
            title: itemTitle,
            variant: variantStr,
            quantity: item.quantity,
            price: getItemPrice(item.product)
          };
        }),
        status: 'Pending'
      };
      setInvoiceData(preparedInvoice);
      setSuccessData({ id: trackingId, total });
      setOrderStatus('success');
      
      // Fire Pixel Events for Purchase/CompletePayment
      const orderPixelData = {
        id: trackingId,
        total_amount: orderTotal,
        items: items.map(item => ({
          id: item.product.id,
          title: item.product.title || item.product.name,
          price: getItemPrice(item.product),
          quantity: item.quantity
        }))
      };

      const geo = resolveBdLocation(address, deliveryArea);
      const customerData = {
        phone: phone ? phone.trim() : undefined,
        name: fullName ? fullName.trim() : undefined,
        address: address ? address.trim() : undefined,
        city: geo.city,
        state: geo.state,
        country: 'bd'
      };

      saveCachedUserData(customerData);
      trackPurchase(orderPixelData, customerData);

      
    } catch (error: any) {
      console.error('Checkout error:', error);
      setOrderStatus('error');
      toast.error(error.message || 'Failed to place order. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <SEO title="Checkout" />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4"
          >
            <ChevronLeft size={16} className="mr-1" /> Back
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checkout</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left Column - Forms */}
          <div className="flex-1 space-y-8">
            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-8">
              
              {blockedInfo?.isBlocked && (
                <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-5 text-red-800 flex items-start gap-3 shadow-xs">
                  <div className="p-2.5 bg-red-100 rounded-2xl text-red-600 shrink-0 font-bold text-xl">🚫</div>
                  <div>
                    <h3 className="font-bold text-sm text-red-900">অর্ডার গ্রহণ করা সম্ভব হচ্ছে না (Access Restricted)</h3>
                    <p className="text-xs text-red-700 mt-1 leading-relaxed">
                      {blockedInfo.message || 'এই ডিভাইস অথবা নম্বর থেকে কোনো অর্ডার গ্রহণ করা সম্ভব নয়।'}
                    </p>
                  </div>
                </div>
              )}

              {/* Delivery Details - Styled after Reference Design */}
              <div className="bg-[#F6F5FB] rounded-3xl shadow-xs border border-[#ECEBF2] p-6 md:p-8 space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">
                    Personal Info
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name Field */}
                  <div className="md:col-span-2">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                      Full Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full h-11 sm:h-12 px-4 rounded-xl border border-[#E2E1EC] hover:border-slate-300 bg-white text-slate-900 shadow-2xs placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium text-sm"
                      placeholder="আপনার পুরো নাম লিখুন..."
                      required
                    />
                  </div>

                  {/* Phone Number Field */}
                  <div className="md:col-span-2">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                      Phone Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full h-11 sm:h-12 px-4 rounded-xl border border-[#E2E1EC] hover:border-slate-300 bg-white text-slate-900 shadow-2xs placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium text-sm"
                      placeholder="01XXXXXXXXX"
                      required
                    />
                  </div>

                  {/* Address Field */}
                  <div className="md:col-span-2">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                      Address <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={e => handleStreetChange(e.target.value)}
                      className="w-full h-11 sm:h-12 px-4 rounded-xl border border-[#E2E1EC] hover:border-slate-300 bg-white text-slate-900 shadow-2xs placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium text-sm"
                      placeholder="House, road, area... (বাসা, রোড, এলাকা...)"
                      required
                    />
                  </div>

                  {/* Division & District */}
                  <div className="md:col-span-1">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                      Division <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDivision}
                        onChange={(e) => handleDivisionChange(e.target.value)}
                        className="appearance-none w-full h-11 sm:h-12 pl-4 pr-10 rounded-xl border border-[#E2E1EC] hover:border-slate-300 bg-white text-slate-800 shadow-2xs focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium text-sm cursor-pointer"
                        required
                      >
                        <option value="">Select division</option>
                        {getDivisions().map(d => (
                          <option key={d.id} value={d.id}>{d.nameBn} ({d.name})</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                      District <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        disabled={!selectedDivision}
                        className="appearance-none w-full h-11 sm:h-12 pl-4 pr-10 rounded-xl border border-[#E2E1EC] hover:border-slate-300 bg-white text-slate-800 shadow-2xs focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium text-sm cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                        required
                      >
                        <option value="">
                          {selectedDivision ? 'Select district' : 'Select division first'}
                        </option>
                        {getDistrictsByDivision(selectedDivision).map(dist => (
                          <option key={dist.id} value={dist.id}>{dist.nameBn} ({dist.name})</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Area / Upazila */}
                  <div className="md:col-span-2">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                      Area / Upazila <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      {selectedDistrict && getUpazilasByDistrict(selectedDistrict).length > 0 ? (
                        <>
                          <select
                            value={selectedUpazila}
                            onChange={(e) => handleUpazilaChange(e.target.value)}
                            className="appearance-none w-full h-11 sm:h-12 pl-4 pr-10 rounded-xl border border-[#E2E1EC] hover:border-slate-300 bg-white text-slate-800 shadow-2xs focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium text-sm cursor-pointer"
                            required
                          >
                            <option value="">Select area</option>
                            {getUpazilasByDistrict(selectedDistrict).map(upa => (
                              <option key={upa} value={upa}>{upa}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                            <ChevronDown size={18} />
                          </div>
                        </>
                      ) : (
                        <input
                          type="text"
                          value={selectedUpazila}
                          onChange={(e) => handleUpazilaChange(e.target.value)}
                          disabled={!selectedDistrict}
                          placeholder={selectedDistrict ? "Type your area or upazila..." : "Select district first"}
                          className="w-full h-11 sm:h-12 px-4 rounded-xl border border-[#E2E1EC] hover:border-slate-300 bg-white text-slate-800 shadow-2xs focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium text-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                          required
                        />
                      )}
                    </div>
                  </div>

                  {address && (
                    <div className="md:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                      <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-700">পূর্ণ ডেলিভারি ঠিকানা: </span>
                        <span>{address}</span>
                      </div>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Order Note <span className="text-slate-400 font-medium">(Optional)</span></label>
                    <textarea
                      value={orderNote}
                      onChange={e => setOrderNote(e.target.value)}
                      rows={1}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                      placeholder="Any special instruction for this order"
                    />
                  </div>
                </div>
              </div>

            </form>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:w-[400px]">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden sticky top-6">
              <div className="p-6 md:p-8">
                 <h2 className="text-xl font-bold text-slate-800 mb-6 font-display">Order Summary</h2>
                 
                 <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {items.map((item) => (
                      <div key={item.product.cartItemKey || item.product.id} className="flex gap-4 items-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-50 relative">
                          <img 
                            src={item.product.image || item.product.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=2370'} 
                            alt={item.product.title || item.product.name} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute -top-2 -right-2 bg-slate-800 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                            {item.quantity}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="text-sm font-semibold text-slate-800 truncate">{item.product.title || item.product.name}</h4>
                           {item.product.selectedVariants && (
                             <p className="text-xs text-slate-500 mt-0.5">
                               {Object.entries(item.product.selectedVariants).map(([key, value]) => `${key}: ${value}`).join(' / ')}
                               {item.product.sku ? ` / SKU: ${item.product.sku}` : ''}
                             </p>
                           )}
                           <p className="text-sm text-slate-500 mt-0.5">৳{getItemPrice(item.product)} x {item.quantity}</p>
                        </div>
                        <div className="font-bold text-slate-800 text-sm">
                          ৳{getItemPrice(item.product) * item.quantity}
                        </div>
                      </div>
                    ))}
                 </div>

                 <div className="space-y-3 pt-6 border-t border-slate-100 text-sm">
                   <div className="flex justify-between text-slate-500 font-medium">
                     <span>Subtotal</span>
                     <span>৳{cartTotal.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between text-slate-500 font-medium">
                     <span>Shipping</span>
                     {isFreeDeliveryOrder ? (
                       <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Free</span>
                     ) : (
                       <span>৳{shippingCharge.toFixed(2)}</span>
                     )}
                   </div>
                   
                   <CheckoutPaymentOptions payment={payment} total={orderTotal} shipping={shippingCharge} />

                   <div className="flex justify-between text-lg font-black text-slate-900 pt-4 border-t border-slate-100 mt-4">
                     <span>Total</span>
                     <span>৳{orderTotal.toFixed(2)}</span>
                   </div>
                 </div>
              </div>
              
              <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100">
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isCheckingOut || deliveryLoading || Boolean(blockedInfo?.isBlocked)}
                  className={`w-full text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                    blockedInfo?.isBlocked
                      ? 'bg-red-500 cursor-not-allowed opacity-80 shadow-none'
                      : 'bg-primary hover:bg-primary-hover disabled:bg-primary/40 disabled:text-white/70 shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5'
                  }`}
                >
                  {isCheckingOut || deliveryLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : blockedInfo?.isBlocked ? (
                    '🚫 অর্ডার বন্ধ করা হয়েছে'
                  ) : (
                    'Confirm Order'
                  )}
                </button>
                <p className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center gap-1">
                  <CheckCircle size={14} className="text-emerald-500" /> Secure and encrypted checkout
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
