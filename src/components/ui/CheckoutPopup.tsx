import React, { useState, useEffect, useId, useRef } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { supabase } from '../../lib/supabase';
import { CustomerInvoiceModal, CustomerInvoiceData } from '../CustomerInvoiceModal';
import { MapPin, Phone, User, ChevronDown, CheckCircle, X, Trash2, Plus, Minus, Truck, Copy, Check, ShieldCheck, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { trackInitiateCheckout, trackPurchase, trackAddToCart, saveCachedUserData, resolveBdLocation } from '../../lib/fbPixel';
import { trackTiktokInitiateCheckout, trackTiktokCompletePayment } from '../../lib/ttPixel';
import { sendTelegramOrderNotification } from '../../lib/telegramApi';
import { trackEvent } from '../../lib/analytics';
import { CheckoutPaymentOptions, useCheckoutPayment } from '../CheckoutPaymentOptions';
import { paymentRequest } from '../../lib/storePaymentApi';
import { paymentQuote } from '../../lib/paymentRules';
import { createCheckoutOrder, rememberPayment } from '../../lib/checkoutOrder';
import { fetchClientIp, checkIsBlocked, trapBlacklistIp } from '../../lib/blacklist';
import { 
  getDivisions, 
  getDistrictsByDivision, 
  getUpazilasByDistrict, 
  findDistrictById, 
  getDeliveryChargeForDistrict,
  BD_DIVISIONS 
} from '../../data/bangladeshData';

interface CheckoutPopupProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
  productId?: string;
  initialProduct?: any;
  initialProducts?: any[];
  initialQuantity?: number;
}

export function CheckoutPopup({ 
  isOpen, 
  onClose, 
  product, 
  productId, 
  initialProduct, 
  initialProducts, 
  initialQuantity = 1 
}: CheckoutPopupProps) {
  const { items, cartTotal, clearCart, removeFromCart, updateQuantity } = useCart();
  const { user } = useAuth();
  const { settings, loading } = useSettings();
  const payment = useCheckoutPayment();
  const navigate = useNavigate();
  const formId = useId();

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

  
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const effectiveProduct = initialProduct || product;

  // Local state for single product checkout (when not using cart)
  const [localItems, setLocalItems] = useState<any[]>([]);
  const [usingLocalItems, setUsingLocalItems] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  
  const [address, setAddress] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedUpazila, setSelectedUpazila] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [fullName, setFullName] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>('outside_dhaka');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string, total: number } | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<CustomerInvoiceData | null>(null);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [productDelivery, setProductDelivery] = useState<Record<string, { delivery_charge: number | null; is_delivery_free: boolean }>>({});
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [incompleteOrderId, setIncompleteOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [clientIp, setClientIp] = useState<string>('Unknown');
  const [blockedInfo, setBlockedInfo] = useState<{ isBlocked: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && phone.trim().length >= 10) {
      checkIsBlocked(clientIp, phone.trim(), true).then(res => {
        if (res.isBlocked) {
          trapBlacklistIp(phone.trim(), clientIp, res.reason);
          setBlockedInfo({
            isBlocked: true,
            message: res.blockedType === 'phone'
              ? 'এই মোবাইল নম্বরটি ব্লকলিস্টে রয়েছে। কোনো নতুন অর্ডার গ্রহণ করা সম্ভব নয়।'
              : 'এই ডিভাইস অথবা নম্বর থেকে কোনো অর্ডার গ্রহণ করা সম্ভব নয়।'
          });
        } else {
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
  }, [phone, clientIp, isOpen]);

  // Convert Bengali digits (০-৯) to English digits (0-9)
  const banglaToEnglishDigits = (str: string) => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return str.replace(/[০-৯]/g, d => String(banglaDigits.indexOf(d)));
  };

  // Comprehensive Phone Normalizer (supports +880, 880, hyphens, spaces, Bangla digits)
  const normalizePhoneNumber = (input: string): string => {
    if (!input) return '';
    let val = banglaToEnglishDigits(input);
    // Strip spaces, hyphens, parentheses, dots, slashes, underscores
    val = val.replace(/[\s\-\.\(\)\/\_]/g, '');

    // Strip international country codes if present (+880, +88, 880, 8801, 881, 00880)
    if (val.startsWith('+8801')) {
      val = '01' + val.slice(5);
    } else if (val.startsWith('+880')) {
      val = '0' + val.slice(4);
    } else if (val.startsWith('+881')) {
      val = '01' + val.slice(4);
    } else if (val.startsWith('+88')) {
      val = val.slice(3);
    } else if (val.startsWith('+')) {
      val = val.slice(1);
    } else if (val.startsWith('008801')) {
      val = '01' + val.slice(6);
    } else if (val.startsWith('00880')) {
      val = '0' + val.slice(5);
    } else if (val.startsWith('8801')) {
      val = '01' + val.slice(4);
    } else if (val.startsWith('880')) {
      val = '0' + val.slice(3);
    } else if (val.startsWith('881')) {
      val = '01' + val.slice(3);
    }

    // Keep only digits and cap at 11 characters
    val = val.replace(/\D/g, '');
    return val.slice(0, 11);
  };

  // Live Phone Change Handler
  const handlePhoneChange = (val: string) => {
    const normalized = normalizePhoneNumber(val);
    setPhone(normalized);
  };

  // Direct Clipboard Paste Handler (handles any full text like "+88 01934-546789")
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const normalized = normalizePhoneNumber(pastedText);
    setPhone(normalized);
  };

  // Real-time Phone Validation State
  const phoneValidation = (() => {
    if (!phone) {
      return {
        status: 'idle',
        message: '১১ ডিজিটের নম্বর দিন',
        badgeClass: 'text-slate-500 bg-slate-100',
        inputBorder: 'border-slate-200 focus:border-primary',
        iconColor: 'text-slate-400'
      };
    }

    // If user types '8' or '88'
    if (phone === '8' || phone === '88') {
      return {
        status: 'typing',
        message: '01... দিয়ে নম্বর লিখুন',
        badgeClass: 'text-amber-700 bg-amber-100 font-bold',
        inputBorder: 'border-amber-400 bg-amber-50/15 focus:border-amber-500 ring-1 ring-amber-400',
        iconColor: 'text-amber-500'
      };
    }

    // 1st digit check
    if (phone[0] !== '0') {
      return {
        status: 'error',
        message: 'নম্বর 0 দিয়ে শুরু হতে হবে',
        badgeClass: 'text-red-700 bg-red-100 font-bold',
        inputBorder: 'border-red-400 bg-red-50/20 focus:border-red-500 ring-1 ring-red-400',
        iconColor: 'text-red-500'
      };
    }

    // 2nd digit check
    if (phone.length >= 2 && phone[1] !== '1') {
      return {
        status: 'error',
        message: 'নম্বর 01 দিয়ে শুরু হতে হবে',
        badgeClass: 'text-red-700 bg-red-100 font-bold',
        inputBorder: 'border-red-400 bg-red-50/20 focus:border-red-500 ring-1 ring-red-400',
        iconColor: 'text-red-500'
      };
    }

    // 3rd digit check (Valid BD operators: 013, 014, 015, 016, 017, 018, 019)
    if (phone.length >= 3 && !/[3-9]/.test(phone[2])) {
      return {
        status: 'error',
        message: `ভুল নম্বর! 01${phone[2]} কোনো অপারেটর নেই`,
        badgeClass: 'text-red-700 bg-red-100 font-bold',
        inputBorder: 'border-red-400 bg-red-50/20 focus:border-red-500 ring-1 ring-red-400',
        iconColor: 'text-red-500'
      };
    }

    // Incomplete number (3 to 10 digits)
    if (phone.length < 11) {
      const remaining = 11 - phone.length;
      return {
        status: 'typing',
        message: `আরও ${remaining} টি ডিজিট প্রয়োজন (${phone.length}/১১)`,
        badgeClass: 'text-amber-700 bg-amber-100 font-bold',
        inputBorder: 'border-amber-400 bg-amber-50/15 focus:border-amber-500 ring-1 ring-amber-400',
        iconColor: 'text-amber-500'
      };
    }

    // Exactly 11 digits
    if (phone.length === 11) {
      if (/^01[3-9]\d{8}$/.test(phone)) {
        return {
          status: 'valid',
          message: 'সঠিক নম্বর (১১/১১)',
          badgeClass: 'text-emerald-700 bg-emerald-100 font-bold',
          inputBorder: 'border-emerald-500 bg-emerald-50/20 focus:border-emerald-600 ring-1 ring-emerald-500',
          iconColor: 'text-emerald-500'
        };
      } else {
        return {
          status: 'error',
          message: 'ভুল মোবাইল নম্বর!',
          badgeClass: 'text-red-700 bg-red-100 font-bold',
          inputBorder: 'border-red-400 bg-red-50/20 focus:border-red-500 ring-1 ring-red-400',
          iconColor: 'text-red-500'
        };
      }
    }

    return {
      status: 'error',
      message: 'সর্বোচ্চ ১১ ডিজিট হতে হবে',
      badgeClass: 'text-red-700 bg-red-100 font-bold',
      inputBorder: 'border-red-400 bg-red-50/20 focus:border-red-500 ring-1 ring-red-400',
      iconColor: 'text-red-500'
    };
  })();

  const handleCopyTrackingId = async () => {
    if (!successData?.id) {
      return;
    }

    await navigator.clipboard.writeText(successData.id);
    setCopied(true);
    toast.success('Tracking ID কপি করা হয়েছে!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTrackOrder = () => {
    if (!successData?.id) {
      return;
    }

    handleClose();
    navigate(`/track-order?id=${encodeURIComponent(successData.id)}`);
  };

  // Lock body scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const checkoutProduct = effectiveProduct?.id 
        || (initialProducts && initialProducts.length === 1 ? initialProducts[0].id : null)
        || (usingLocalItems && localItems.length > 0 ? localItems[0].product.id : (items.length === 1 ? items[0].product.id : 'multiple'));
      trackEvent('checkout', { product_id: checkoutProduct });
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !successData) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, successData, isCheckingOut]);

  const initializedSessionRef = useRef<string | null>(null);

  // Initialize local items if initialProduct or productId is provided
  useEffect(() => {
    if (isOpen && !successData) {
      const sessionId = effectiveProduct?.id || productId || (initialProducts && initialProducts[0]?.id) || 'local';
      if (initializedSessionRef.current !== sessionId) {
        initializedSessionRef.current = sessionId;
        if (initialProducts && initialProducts.length > 0) {
          const items = initialProducts.map(p => ({
            product: {
              ...p,
              cartItemKey: `${p.id}:${p.selectedVariant?.sku || p.sku || JSON.stringify(p.selectedVariants || {})}`
            },
            quantity: initialQuantity
          }));
          setLocalItems(items);
          setUsingLocalItems(true);
          if (effectiveProduct) {
            setSelectedProductIds(new Set([effectiveProduct.id]));
          } else {
            setSelectedProductIds(new Set(initialProducts.map(p => p.id)));
          }
        } else if (effectiveProduct) {
          const item = {
            product: {
              ...effectiveProduct,
              cartItemKey: `${effectiveProduct.id}:${effectiveProduct.selectedVariant?.sku || effectiveProduct.sku || JSON.stringify(effectiveProduct.selectedVariants || {})}`
            },
            quantity: initialQuantity
          };
          setLocalItems([item]);
          setUsingLocalItems(true);
          setSelectedProductIds(new Set([effectiveProduct.id]));
        } else if (productId) {
          // Fetch product by productId if product object not passed directly
          supabase.from('products').select('*').eq('id', productId).single().then(({ data }) => {
            if (data) {
              const item = {
                product: {
                  ...data,
                  cartItemKey: `${data.id}:${data.sku || ''}`
                },
                quantity: initialQuantity
              };
              setLocalItems([item]);
              setUsingLocalItems(true);
              setSelectedProductIds(new Set([data.id]));
            }
          });
        }
      }
    } else if (!isOpen) {
      initializedSessionRef.current = null;
      // Reset on close
      setTimeout(() => {
        setLocalItems([]);
        setUsingLocalItems(false);
        setSelectedProductIds(new Set());
        setSuccessData(null);
        setOrderStatus('idle');
      }, 300);
    }
  }, [isOpen, effectiveProduct?.id, productId, initialProducts, initialQuantity, successData]);

  const hasTrackedCheckoutRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasTrackedCheckoutRef.current = false;
    }
  }, [isOpen]);

  const handleFormInteractionForTracking = () => {
    if (isOpen && !hasTrackedCheckoutRef.current) {
      if (!usingLocalItems && items.length > 0) {
        // Already tracked by CartDrawer to avoid mismatched duplicate Event IDs
        hasTrackedCheckoutRef.current = true;
        return;
      }
      const currentItems = usingLocalItems ? localItems : items;
      const checkoutItems = currentItems.filter(item => selectedProductIds.has(item.product.id) || !usingLocalItems);
      
      if (checkoutItems.length > 0) {
        // Fire virtual AddToCart for direct "Order Now" purchases so TikTok & Meta conversion funnels stay complete
        if (usingLocalItems) {
          checkoutItems.forEach(item => {
            trackAddToCart({
              id: item.product.id,
              title: item.product.title || item.product.name,
              price: Number(item.product.discount_price || item.product.price || 0),
              category: typeof item.product.category === 'string' ? item.product.category : item.product.category?.name
            }, item.quantity);
          });
        }

        const totalValue = checkoutItems.reduce((sum, item) => sum + Number(item.product.discount_price || item.product.price || 0) * item.quantity, 0);
        const geo = resolveBdLocation(address, deliveryArea);
        const customerData = {
          phone: phone ? phone.trim() : undefined,
          name: fullName ? fullName.trim() : undefined,
          address: address ? address.trim() : undefined,
          city: geo.city,
          state: geo.state,
          country: 'bd'
        };

        if (phone && phone.trim().length >= 11) {
          saveCachedUserData(customerData);
        }

        trackInitiateCheckout(
          checkoutItems.map(item => ({
            id: item.product.id,
            title: item.product.title || item.product.name,
            price: Number(item.product.discount_price || item.product.price || 0),
            quantity: item.quantity
          })),
          totalValue,
          customerData
        );
        hasTrackedCheckoutRef.current = true;
      }
    }
  };

  // Fetch product delivery charges
  useEffect(() => {
    const currentItems = usingLocalItems ? localItems : items;
    const productIds = Array.from(new Set(currentItems.map(item => item.product.id).filter(Boolean)));
    
    if (productIds.length === 0 || !isOpen) {
      setProductDelivery({});
      return;
    }

    let isActive = true;
    setDeliveryLoading(true);

    const fetchCharges = async () => {
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
        console.error('Delivery fetch error:', err);
      } finally {
        if (isActive) setDeliveryLoading(false);
      }
    };

    fetchCharges();

    return () => {
      isActive = false;
    };
  }, [usingLocalItems ? localItems : items, isOpen]);

  const displayItems = usingLocalItems ? localItems : items;
  const currentItems = usingLocalItems 
    ? localItems.filter(item => selectedProductIds.has(item.product.id))
    : items;
  
  const getItemPrice = (product: any) => Number(product.discount_price || product.price || 0);
  const getProductDelivery = (product: any) => productDelivery[product.id] || {
    delivery_charge: product.delivery_charge ?? null,
    is_delivery_free: Boolean(product.is_delivery_free)
  };
  
  const isFreeDeliveryOrder = currentItems.length > 0 && currentItems.every(item => getProductDelivery(item.product).is_delivery_free);
  
  const getVariantDeliveryCharge = (product: any) => Number(
    product.selectedVariant?.delivery_charge ?? 0
  );
  
  const variantDeliveryCharge = currentItems.reduce((total, item) => {
    if (getProductDelivery(item.product).is_delivery_free) return total;
    return total + (getVariantDeliveryCharge(item.product) * item.quantity);
  }, 0);
  
  const regularDeliveryItems = currentItems.filter(item => 
    !getProductDelivery(item.product).is_delivery_free && 
    getVariantDeliveryCharge(item.product) <= 0
  );
  
  const productDeliveryCharge = Math.max(
    ...regularDeliveryItems.map(item => Number(getProductDelivery(item.product).delivery_charge || 0)), 
    0
  );
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
            ? settings.delivery_charge_inside_dhaka || 80
            : settings.delivery_charge_outside_dhaka || 150
        );
  
  const outsideDhakaDeliveryCharge = Number(settings.delivery_charge_outside_dhaka || 150);
  const insideDhakaDeliveryCharge = Number(settings.delivery_charge_inside_dhaka || 80);
  
  const regularDeliveryCharge = regularDeliveryItems.length > 0
    ? (hasProductDeliveryCharge ? productDeliveryCharge : settingsDeliveryCharge)
    : 0;
  
  const shippingCharge = isFreeDeliveryOrder ? 0 : regularDeliveryCharge + variantDeliveryCharge;
  const localCartTotal = currentItems.reduce((sum, item) => sum + getItemPrice(item.product) * item.quantity, 0);
  const orderTotal = localCartTotal + shippingCharge;

  useEffect(() => {
    if (successData || orderStatus === 'success' || currentItems.length === 0 || isCheckingOut || !isOpen) return;
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
          cart_items: currentItems,
          total_amount: orderTotal,
          order_source: localStorage.getItem('order_source') || 'organic',
          updated_at: new Date().toISOString()
        };

        if (incompleteOrderId) {
          const { error } = await supabase
            .from('incomplete_orders')
            .update(payload)
            .eq('id', incompleteOrderId);
            
          if (error) console.error('Supabase update error:', error);
        } else {
          const generatedId = crypto.randomUUID();
          setIncompleteOrderId(generatedId);
          const { error } = await supabase
            .from('incomplete_orders')
            .insert([{ ...payload, id: generatedId }]);
            
          if (error) console.error('Supabase insert error:', error);
        }
      } catch (error) {
        console.error('Failed to save incomplete order catch:', error);
      }
    };

    const timer = setTimeout(saveDraft, 2000);
    return () => clearTimeout(timer);
  }, [fullName, phone, address, orderNote, currentItems, orderTotal, incompleteOrderId, successData, orderStatus, isCheckingOut, isOpen]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      toast.error('দয়া করে নাম, মোবাইল নম্বর এবং ঠিকানা পূরণ করুন');
      return;
    }
    let cleanedPhone = normalizePhoneNumber(phone);

    if (!/^01[3-9]\d{8}$/.test(cleanedPhone)) {
      toast.error('দয়া করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017...)');
      return;
    }
    if (deliveryLoading) {
      toast.error('দয়া করে অপেক্ষা করুন, ডেলিভারি চার্জ লোড হচ্ছে');
      return;
    }
    if (currentItems.length === 0) {
      toast.error('কার্টে কোনো পণ্য নেই');
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
      handleClose();
      // Instantly trigger full-screen website lockout
      window.dispatchEvent(new CustomEvent('client_blocked', {
        detail: { isBlocked: true, ip: activeIp, phone: cleanedPhone, reason: blockCheck.reason }
      }));
      return;
    }

    setIsCheckingOut(true);
    setOrderStatus('processing');

    try {
      const shortId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const quote = paymentQuote(payment.method, orderTotal, shippingCharge, payment.config.fixedAdvance);
      if (quote.required > 0 && !payment.config.configured) throw new Error('এই দোকানে অনলাইন পেমেন্ট এখনো চালু হয়নি।');
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
      
      const orderItems = currentItems.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price: getItemPrice(item.product),
        variant_sku: item.product.sku || item.product.selectedVariant?.sku || null,
        variant_options: item.product.selectedVariants || null,
        variant_compare_price: item.product.original_price || item.product.selectedVariant?.compare_price || null,
        variant_cost_price: item.product.selectedVariant?.cost_price || null,
        variant_weight: item.product.weight || item.product.selectedVariant?.weight || null
      }));

      const orderParams = await createCheckoutOrder({
        total_amount: orderTotal, shipping_charge: shippingCharge, shipping_address: deliveryInfo,
        delivery_area: deliveryArea, payment_method: payment.method, customer_name: fullName,
        customer_phone: cleanedPhone, customer_address: address, order_note: orderNote,
        order_source: localStorage.getItem('order_source') || 'organic',
      }, orderItems, incompleteOrderId);
      setIncompleteOrderId(null);

      if (orderParams.advance_required > 0) {
        rememberPayment(orderParams, usingLocalItems ? [] : currentItems);
        const { redirectUrl } = await paymentRequest<{ redirectUrl: string }>('initiate', { orderId: orderParams.id, token: orderParams.checkout_token });
        window.location.assign(redirectUrl);
        return;
      }

      // Send Telegram Order Notification
      sendTelegramOrderNotification({
        orderId: trackingId,
        customerName: fullName,
        phone: cleanedPhone,
        address: address,
        totalAmount: orderTotal,
        shippingFee: shippingCharge,
        deliveryArea: deliveryArea === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka',
        orderNote: orderNote,
        items: currentItems.map(item => {
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

      // Delete incomplete order if it exists
      if (incompleteOrderId) {
        supabase.rpc('delete_incomplete_order', { target_id: incompleteOrderId }).then(({ error }) => {
          if (error) {
            supabase.from('incomplete_orders').delete().eq('id', incompleteOrderId).then();
          }
        });
      }

      const preparedInvoice: CustomerInvoiceData = {
        orderId: trackingId,
        created_at: new Date().toISOString(),
        customerName: fullName ? fullName.trim() : 'Valued Customer',
        phone: cleanedPhone || (phone ? phone.trim() : 'N/A'),
        address: address ? address.trim() : 'N/A',
        deliveryArea: deliveryArea === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka',
        shippingCharge: shippingCharge,
        totalAmount: orderTotal,
        items: currentItems.map(item => {
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

      toast.success('অর্ডার সফলভাবে সম্পন্ন হয়েছে!');
      const total = orderTotal;

      if (usingLocalItems) {
        setLocalItems([]);
        setUsingLocalItems(false);
      } else {
        clearCart();
      }
      
      setSuccessData({ id: trackingId, total });
      setOrderStatus('success');
      
      // Fire Pixel Events for Purchase/CompletePayment (Single execution)
      const orderPixelData = {
        id: trackingId,
        total_amount: orderTotal,
        items: currentItems.map(item => ({
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
      toast.error(error.message || 'অর্ডার করতে ব্যর্থ। আবার চেষ্টা করুন।');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Remove item from local items
  const removeLocalItem = (productId: string) => {
    setLocalItems(prev => prev.filter(item => (item.product.cartItemKey || item.product.id) !== productId));
  };

  // Update quantity for local items
  const updateLocalQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setLocalItems(prev =>
      prev.map(item =>
        (item.product.cartItemKey || item.product.id) === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleClose = () => {
    if (!isCheckingOut) {
      onCloseRef.current();
    }
  };

  if (loading) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ display: isOpen || successData ? 'block' : 'none' }}
      />
      
      {/* Popup Container - Mobile: full screen app view, Desktop: centered modal */}
      <div
        className={`fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none p-0 sm:p-4 ${
          isOpen || successData ? '' : 'hidden'
        }`}
      >
        <div
          className={`relative w-full h-[100dvh] h-full sm:h-auto sm:max-h-[92vh] sm:w-[460px] sm:max-w-[calc(100vw-32px)] rounded-none sm:rounded-[24px] bg-[#FAFAFC] shadow-2xl flex flex-col pointer-events-auto overflow-hidden transition-transform duration-300 ease-out ${
            isOpen || successData ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {/* Header */}
          <div className="shrink-0 px-3.5 py-2.5 sm:px-5 sm:py-3 border-b border-[#ECEBF2] bg-white relative">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {!successData && !isCheckingOut && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="sm:hidden w-8 h-8 flex items-center justify-center -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors shrink-0 cursor-pointer"
                    title="ফিরে যান"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="font-extrabold text-slate-800 text-sm sm:text-base tracking-tight">
                      {successData ? 'অর্ডার কনফার্মেশন' : 'অর্ডার কনফার্ম করুন'}
                    </h2>
                    {!successData && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        ক্যাশ অন ডেলিভারি
                      </span>
                    )}
                  </div>
                  {!successData && (
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                      নিচে নাম, মোবাইল নম্বর ও ঠিকানা দিয়ে অর্ডার করুন
                    </p>
                  )}
                </div>
              </div>

              {!successData && !isCheckingOut && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors shrink-0 cursor-pointer"
                  title="বন্ধ করুন"
                  aria-label="বন্ধ করুন"
                >
                  <X size={19} />
                </button>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-2.5">
            {successData ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, type: 'spring' as const, bounce: 0.3 }}
                className="mx-auto max-w-[360px] py-1 text-center"
              >
                <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-gradient-to-b from-emerald-50/70 via-white to-white p-5 shadow-xl shadow-emerald-500/10">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' as const, damping: 12, stiffness: 100, delay: 0.1 }}
                    className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                  >
                    <CheckCircle size={36} strokeWidth={2.5} />
                  </motion.div>

                  <h3 className="mb-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                    ধন্যবাদ! আপনার অর্ডার সফল হয়েছে
                  </h3>
                  <p className="mx-auto mb-4 max-w-xs text-xs sm:text-sm font-medium leading-relaxed text-slate-500">
                    আমাদের প্রতিনিধি শীঘ্রই আপনাকে কল করে অর্ডারটি নিশ্চিত করবে।
                  </p>

                  <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-left mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">ট্র্যাকিং আইডি:</span>
                      <button
                        type="button"
                        onClick={handleCopyTrackingId}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono text-xs font-bold text-slate-800 hover:border-primary transition-all active:scale-95 cursor-pointer"
                      >
                        <span>{successData.id}</span>
                        {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                      <span className="text-xs font-bold text-slate-500">সর্বমোট প্রদেয় মূল্য:</span>
                      <span className="text-base font-black text-slate-900">৳{successData.total.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInvoiceModalOpen(true)}
                    className="w-full mb-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-2 border-emerald-300 px-3 py-2.5 text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <FileText size={15} className="text-emerald-600" />
                    View / Download Invoice (ইনভয়েস দেখুন ও ডাউনলোড করুন)
                  </button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleCopyTrackingId}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
                    >
                      {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                      আইডি কপি করুন
                    </button>
                    <button
                      type="button"
                      onClick={handleTrackOrder}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary-hover transition-all active:scale-95 cursor-pointer"
                    >
                      <Truck size={15} />
                      অর্ডার ট্র্যাক করুন
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <form id={formId} onSubmit={handleCheckout} className="space-y-2.5" onChange={handleFormInteractionForTracking}>
                {blockedInfo?.isBlocked && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3 text-red-800 flex items-start gap-2.5 shadow-2xs mb-2">
                    <div className="text-red-600 font-bold text-base shrink-0">🚫</div>
                    <div>
                      <h4 className="font-bold text-xs text-red-900">অর্ডার গ্রহণ করা সম্ভব হচ্ছে না</h4>
                      <p className="text-[11px] text-red-700 mt-0.5 leading-snug">
                        {blockedInfo.message || 'এই ডিভাইস অথবা নেটওয়ার্ক থেকে কোনো অর্ডার গ্রহণ করা সম্ভব নয়।'}
                      </p>
                    </div>
                  </div>
                )}
                {/* Product List */}
                <div className="space-y-1.5">
                  {displayItems.map((item) => {
                    const isSelected = usingLocalItems && initialProducts && initialProducts.length > 0
                      ? selectedProductIds.has(item.product.id) 
                      : true;
                    const itemKey = item.product.cartItemKey || item.product.id;
                    return (
                      <div 
                        key={itemKey} 
                        className={`flex items-center gap-2.5 rounded-xl p-2 border transition-all ${
                          isSelected 
                            ? 'bg-slate-50/90 border-slate-200/80 shadow-2xs' 
                            : 'bg-white border-slate-200 opacity-50'
                        }`}
                      >
                        {usingLocalItems && initialProducts && initialProducts.length > 1 && (
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSet = new Set(selectedProductIds);
                              if (e.target.checked) {
                                newSet.add(item.product.id);
                              } else {
                                newSet.delete(item.product.id);
                              }
                              setSelectedProductIds(newSet);
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                          />
                        )}
                        
                        {/* Product Image */}
                        <div className={`w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-lg overflow-hidden shrink-0 border border-slate-100 relative ${!isSelected && 'grayscale'}`}>
                          <img
                            src={item.product.image || item.product.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=2370'}
                            alt={item.product.title || item.product.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute -top-0.5 -right-0.5 bg-slate-900 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                            {item.quantity}
                          </div>
                        </div>

                        {/* Title & Price */}
                        <div className="flex-1 min-w-0 pr-1">
                          <h4 className="text-xs sm:text-[13px] font-bold text-slate-800 truncate leading-tight">
                            {item.product.title || item.product.name}
                          </h4>
                          {item.product.selectedVariants && (
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {Object.entries(item.product.selectedVariants).map(([key, value]) => `${key}: ${value}`).join(' / ')}
                            </p>
                          )}
                          <p className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5">
                            ৳{getItemPrice(item.product)}
                          </p>
                        </div>

                        {/* Quantity Controls & Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => usingLocalItems ? updateLocalQuantity(itemKey, item.quantity - 1) : updateQuantity(itemKey, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95 cursor-pointer"
                              title="কমান"
                              aria-label="কমান"
                            >
                              <Minus size={11} strokeWidth={2.5} />
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-slate-800 select-none">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => usingLocalItems ? updateLocalQuantity(itemKey, item.quantity + 1) : updateQuantity(itemKey, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors active:scale-95 cursor-pointer"
                              title="বাড়ান"
                              aria-label="বাড়ান"
                            >
                              <Plus size={11} strokeWidth={2.5} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => usingLocalItems ? removeLocalItem(itemKey) : removeFromCart(itemKey)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="মুছে ফেলুন"
                            aria-label="মুছে ফেলুন"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {currentItems.length === 0 && (
                    <p className="text-center text-slate-500 py-3 text-xs">কার্টে কোনো পণ্য নেই</p>
                  )}
                </div>

                {/* Personal Info Card - Exact Match with Reference Design */}
                <div className="bg-[#F6F5FB] rounded-2xl border border-[#ECEBF2] shadow-xs p-4 sm:p-5 space-y-4">
                  {/* Section Header */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Personal Info
                    </h3>
                  </div>

                  {/* Full Name Field */}
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                      Full Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full h-12 px-3.5 text-xs sm:text-sm bg-white border border-[#E2E1EC] hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium shadow-2xs"
                      placeholder="আপনার পুরো নাম লিখুন..."
                      required
                    />
                  </div>

                  {/* Mobile Phone Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs sm:text-[13px] font-semibold text-slate-800">
                        Phone Number <span className="text-red-500 font-bold">*</span>
                      </label>
                      {phone && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full transition-all flex items-center gap-1 ${phoneValidation.badgeClass}`}>
                          {phoneValidation.status === 'valid' && <Check size={11} strokeWidth={3} />}
                          {phoneValidation.status === 'error' && <X size={11} strokeWidth={3} />}
                          <span>{phoneValidation.message}</span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => handlePhoneChange(e.target.value)}
                        onPaste={handlePaste}
                        maxLength={25}
                        className={`w-full h-12 px-3.5 pr-10 text-xs sm:text-sm bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium shadow-2xs ${phoneValidation.inputBorder || 'border-[#E2E1EC]'}`}
                        placeholder="01XXXXXXXXX"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {phoneValidation.status === 'valid' && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                        {phoneValidation.status === 'error' && (
                          <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xs">
                            <X size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address Field */}
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                      Address <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={e => handleStreetChange(e.target.value)}
                      className="w-full h-12 px-3.5 text-xs sm:text-sm bg-white border border-[#E2E1EC] hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium shadow-2xs"
                      placeholder="House, road, area..."
                      required
                    />
                  </div>

                  {/* Division Selection */}
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                      Division <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDivision}
                        onChange={(e) => handleDivisionChange(e.target.value)}
                        className="appearance-none w-full h-12 pl-3.5 pr-10 text-xs sm:text-sm bg-white border border-[#E2E1EC] hover:border-slate-300 rounded-xl text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium cursor-pointer shadow-2xs"
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

                  {/* District Selection */}
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                      District <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        disabled={!selectedDivision}
                        className="appearance-none w-full h-12 pl-3.5 pr-10 text-xs sm:text-sm bg-white border border-[#E2E1EC] hover:border-slate-300 rounded-xl text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed shadow-2xs"
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

                  {/* Area / Upazila Selection */}
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                      Area / Upazila <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      {selectedDistrict && getUpazilasByDistrict(selectedDistrict).length > 0 ? (
                        <>
                          <select
                            value={selectedUpazila}
                            onChange={(e) => handleUpazilaChange(e.target.value)}
                            className="appearance-none w-full h-12 pl-3.5 pr-10 text-xs sm:text-sm bg-white border border-[#E2E1EC] hover:border-slate-300 rounded-xl text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium cursor-pointer shadow-2xs"
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
                          className="w-full h-12 px-3.5 text-xs sm:text-sm bg-white border border-[#E2E1EC] hover:border-slate-300 rounded-xl text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed shadow-2xs"
                          required
                        />
                      )}
                    </div>
                  </div>

                  {/* Assembled Address Preview Pill */}
                  {address && (
                    <div className="p-3 rounded-xl bg-white border border-[#E2E1EC] text-[11px] sm:text-xs text-slate-600 flex items-start gap-2 shadow-2xs">
                      <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1 leading-snug">
                        <span className="font-bold text-slate-700">পূর্ণ ডেলিভারি ঠিকানা: </span>
                        <span>{address}</span>
                      </div>
                    </div>
                  )}

                  {/* Order Note (Optional) */}
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Order Note</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Optional / ঐচ্ছিক)</span>
                    </label>
                    <input
                      type="text"
                      value={orderNote}
                      onChange={e => setOrderNote(e.target.value)}
                      className="w-full h-12 px-3.5 text-xs sm:text-sm bg-white border border-[#E2E1EC] hover:border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium shadow-2xs"
                      placeholder="কোনো বিশেষ নির্দেশনা থাকলে লিখুন (কালার/সাইজ)..."
                    />
                  </div>

                  {/* Delivery Area Selection (fallback when no district chosen yet) */}
                  {!selectedDistrict && !isFreeDeliveryOrder && !hasProductDeliveryCharge && !isFlatDelivery && regularDeliveryItems.length > 0 && (
                    <div className="pt-1">
                      <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
                        Delivery Area:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDeliveryArea('outside_dhaka')}
                          className={`py-2 px-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            deliveryArea === 'outside_dhaka'
                              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="min-w-0 pr-1">
                            <p className="text-[11px] font-bold leading-tight">ঢাকার বাইরে</p>
                            <p className="text-xs font-extrabold mt-0.5">৳{outsideDhakaDeliveryCharge}</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${
                            deliveryArea === 'outside_dhaka' ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {deliveryArea === 'outside_dhaka' && <Check size={10} strokeWidth={3} />}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeliveryArea('inside_dhaka')}
                          className={`py-2 px-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            deliveryArea === 'inside_dhaka'
                              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="min-w-0 pr-1">
                            <p className="text-[11px] font-bold leading-tight">ঢাকার ভিতরে</p>
                            <p className="text-xs font-extrabold mt-0.5">৳{insideDhakaDeliveryCharge}</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${
                            deliveryArea === 'inside_dhaka' ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {deliveryArea === 'inside_dhaka' && <Check size={10} strokeWidth={3} />}
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Card - Separate Distinct Card Matching Reference Design */}
                <div className="bg-[#F6F5FB] rounded-2xl border border-[#ECEBF2] shadow-xs p-4 sm:p-5 space-y-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Payment
                    </h3>
                  </div>

                  <CheckoutPaymentOptions payment={payment} total={orderTotal} shipping={shippingCharge} />
                </div>
              </form>
            )}
          </div>

          {/* Sticky Footer */}
          {!successData && (
            <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-3 space-y-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
              {/* Summary Bar */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] sm:text-xs">
                  <span>পণ্য: <strong className="text-slate-800 font-bold">৳{localCartTotal}</strong></span>
                  <span>+</span>
                  <span>ডেলিভারি: <strong className="text-slate-800 font-bold">{isFreeDeliveryOrder ? 'ফ্রি' : `৳${shippingCharge}`}</strong></span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[11px] font-medium text-slate-500">সর্বমোট:</span>
                  <span className="text-base sm:text-lg font-black text-slate-950">৳{orderTotal}</span>
                </div>
              </div>
              
              {/* Confirm Button */}
              <button
                type="submit"
                form={formId}
                disabled={isCheckingOut || deliveryLoading || currentItems.length === 0 || Boolean(blockedInfo?.isBlocked)}
                className={`w-full relative overflow-hidden text-white py-3 sm:py-3.5 rounded-xl font-extrabold text-sm sm:text-[15px] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] cursor-pointer ${
                  blockedInfo?.isBlocked
                    ? 'bg-red-500 cursor-not-allowed opacity-80 shadow-none'
                    : 'bg-primary hover:bg-primary-hover disabled:bg-primary/50 shadow-primary/25'
                }`}
              >
                {isCheckingOut || deliveryLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>অর্ডার প্রসেস হচ্ছে...</span>
                  </div>
                ) : blockedInfo?.isBlocked ? (
                  <span>🚫 অর্ডার বন্ধ করা হয়েছে</span>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>অর্ডার কনফার্ম করুন • ৳{orderTotal}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 text-center">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span>কোনো অগ্রিম পেমেন্ট নেই • পণ্য দেখে মূল্য পরিশোধ করুন</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Customer Invoice Modal */}
      <CustomerInvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        invoice={invoiceData}
      />
    </>,
    document.body
  );
}
