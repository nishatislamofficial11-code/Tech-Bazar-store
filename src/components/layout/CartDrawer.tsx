import React, { useState } from 'react';
import { ShoppingBag, X, Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import toast from 'react-hot-toast';
import { CheckoutPopup } from '../ui/CheckoutPopup';
import { motion, AnimatePresence } from 'motion/react';
import { trackInitiateCheckout } from '../../lib/fbPixel';
import { trackEvent } from '../../lib/analytics';

export const CartDrawer = () => {
  const { isCartOpen, setIsCartOpen, items, removeFromCart, updateQuantity, cartTotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCheckoutPopupOpen, setIsCheckoutPopupOpen] = useState(false);

  const { settings, loading } = useSettings();
  const getItemPrice = (product: any) => Number(product.discount_price || product.price || 0);

  const handleCheckoutClick = () => {
    const isGuestCheckoutAllowed = settings.allow_guest_checkout === 'true';

    if (!user && !isGuestCheckoutAllowed && !loading) {
      toast.error('Please login to place an order');
      setIsCartOpen(false);
      navigate('/signin');
      return;
    }
    
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsCartOpen(false);
    const trackingItems = items.map(item => ({
      id: item.product.id,
      title: item.product.title || item.product.name,
      price: getItemPrice(item.product),
      quantity: item.quantity
    }));
    
    // Server-side tracking is handled within trackInitiateCheckout
    trackInitiateCheckout(trackingItems, cartTotal);
    
    // Custom analytics
    trackEvent('checkout', { product_id: items.length === 1 ? items[0].product.id : 'multiple' });

    setIsCheckoutPopupOpen(true);
  };

  return (
    <>
      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Drawer */}
          <div 
            className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transition-transform duration-300 ease-out"
            style={{ transform: 'translateX(0)' }}
          >
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white z-10 shrink-0">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="text-primary" size={24} />
                Your Cart
              </h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                aria-label="Close cart"
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 custom-scrollbar">
              {items.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4"
                >
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                    <ShoppingBag size={40} className="text-slate-300" />
                  </div>
                  <p className="text-lg font-medium text-slate-600">Your cart is empty</p>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="text-primary font-semibold hover:underline"
                  >
                    Continue Shopping
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, x: 20 }}
                        layout
                        key={item.product.cartItemKey || item.product.id} 
                        className="flex gap-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100/60 transition-shadow hover:shadow-md"
                      >
                        <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-50">
                          <img 
                            src={item.product.image || item.product.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=2370'} 
                            alt={item.product.title || item.product.name} 
                            loading="lazy"
                            decoding="async"
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div className="flex justify-between items-start gap-2">
                             <h3 className="font-semibold text-slate-800 leading-tight line-clamp-2 text-sm">
                               {item.product.title || item.product.name}
                             </h3>
                             <button 
                               onClick={() => removeFromCart(item.product.cartItemKey || item.product.id)}
                               aria-label="Remove item"
                               className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors p-1.5 rounded-lg shrink-0"
                             >
                               <Trash2 size={16} />
                             </button>
                          </div>
                          {item.product.selectedVariants && (
                            <p className="text-xs text-slate-500 mt-1">
                              {Object.entries(item.product.selectedVariants).map(([key, value]) => `${key}: ${value}`).join(' / ')}
                              {item.product.sku ? ` / SKU: ${item.product.sku}` : ''}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <p className="font-bold text-primary">
                              ৳{getItemPrice(item.product) * item.quantity}
                            </p>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
                               <button 
                                 onClick={() => updateQuantity(item.product.cartItemKey || item.product.id, item.quantity - 1)}
                                 aria-label="Decrease quantity"
                                 className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-800 hover:shadow-sm rounded transition-all"
                               >
                                 <Minus size={14} />
                               </button>
                               <span className="text-sm font-bold w-6 text-center text-slate-700">{item.quantity}</span>
                               <button 
                                 onClick={() => updateQuantity(item.product.cartItemKey || item.product.id, item.quantity + 1)}
                                 aria-label="Increase quantity"
                                 className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-800 hover:shadow-sm rounded transition-all"
                               >
                                 <Plus size={14} />
                               </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-5 border-t border-slate-100 bg-white shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center mb-5">
                  <span className="text-slate-500 font-medium tracking-wide text-sm uppercase">Total Amount</span>
                  <span className="text-2xl font-black text-slate-900">৳{cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={handleCheckoutClick}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-black/10 hover:shadow-black/20 transform hover:-translate-y-0.5"
                >
                  Proceed to Checkout <ArrowRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <CheckoutPopup
        isOpen={isCheckoutPopupOpen}
        onClose={() => setIsCheckoutPopupOpen(false)}
      />
    </>
  );
};
