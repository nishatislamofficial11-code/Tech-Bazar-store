import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import toast from 'react-hot-toast';
import { trackAddToCart, trackInitiateCheckout } from '../../lib/fbPixel';
import { CheckoutPopup } from './CheckoutPopup';
import { buildCloudinaryUrl } from '../../lib/cloudinary';
import { trackEvent } from '../../lib/analytics';
import { useSettings } from '../../contexts/SettingsContext';

interface ProductCardProps {
  product: {
    id: string;
    slug?: string;
    title: string;
    image: string;
    price: number;
    originalPrice?: number;
    original_price?: number;
    discount: number;
    rating?: number;
    reviews?: number;
    category?: { name: string } | string;
    is_delivery_free?: boolean;
  };
  showRating?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, showRating = false }) => {
  const [isCheckoutPopupOpen, setIsCheckoutPopupOpen] = React.useState(false);
  const op = product.original_price || product.originalPrice || 0;
  const { addToCart, setIsCartOpen } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const productUrl = `/product/${product.slug || product.id}`;

  const cardStyle = settings?.theme_card_style || 'modern-elevated';
  const buttonStyle = settings?.theme_button_style || 'solid';
  const radius = settings?.theme_radius || '16px';
  const accentColor = settings?.theme_secondary_color || '#10b981';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackEvent('add_to_cart', { product_id: product.id });
    addToCart({ ...product, price: product.price }, 1);
    trackAddToCart(product, 1);
    toast.success('Added to cart!');
  };

  const handleOrderNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackEvent('buy_now', { product_id: product.id });
    trackAddToCart(product, 1);
    setIsCheckoutPopupOpen(true);
  };

  const cardClasses = cardStyle === 'minimal-border'
    ? "group bg-white overflow-hidden border-2 border-slate-200/90 hover:border-primary flex flex-col h-full shadow-none transition-all duration-300 hover:-translate-y-0.5 relative"
    : cardStyle === 'floating-glass'
      ? "group bg-white/95 backdrop-blur-md overflow-hidden border border-slate-200/70 flex flex-col h-full shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-2 relative"
      : cardStyle === 'compact-retail'
        ? "group bg-white overflow-hidden border border-slate-200 flex flex-col h-full shadow-xs hover:shadow-md transition-all duration-200 relative"
        : "group bg-white overflow-hidden border border-slate-100/80 flex flex-col h-full shadow-sm shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_14px_35px_rgba(0,0,0,0.07)] hover:border-slate-200/80 relative";

  const btnClasses = buttonStyle === 'pill'
    ? "w-full rounded-full bg-primary px-3 py-2.5 sm:py-3 text-[13px] sm:text-[14px] font-bold text-white shadow-md shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/35 active:scale-[0.98] flex items-center justify-center gap-2"
    : buttonStyle === 'gradient'
      ? "w-full bg-gradient-to-r from-primary via-primary/95 to-primary/80 px-3 py-2.5 sm:py-3 text-[13px] sm:text-[14px] font-bold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2"
      : buttonStyle === 'outline'
        ? "w-full border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-white px-3 py-2.5 sm:py-3 text-[13px] sm:text-[14px] font-bold transition-all duration-300 hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
        : "w-full bg-primary px-3 py-2.5 sm:py-3 text-[13px] sm:text-[14px] font-bold text-white shadow-md shadow-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2";

  const btnRadius = buttonStyle === 'pill' ? '9999px' : `calc(${radius} * 0.75)`;

  return (
    <div 
      className={cardClasses}
      style={{ borderRadius: radius }}
    >
      <div 
        className="relative aspect-[4/4] w-full bg-slate-50 isolate overflow-hidden"
        style={{ borderTopLeftRadius: radius, borderTopRightRadius: radius }}
      >
        <Link to={productUrl} className="absolute inset-0">
          <img
            src={buildCloudinaryUrl(product.image, 'w_400,h_400,c_fill,f_auto,q_auto')}
            alt={product.title}
            loading="lazy"
            decoding="async"
            width={400}
            height={400}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04] mix-blend-multiply"
          />
        </Link>

        {product.discount > 0 && (
          <div 
            className="absolute top-2 left-2 z-10 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-sm tracking-wide"
            style={{ backgroundColor: accentColor || '#ef4444' }}
          >
            -{product.discount}%
          </div>
        )}

        {product.is_delivery_free && (
          <div className="absolute top-2 right-2 z-10 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-black text-white shadow-sm tracking-wide">
            Free Delivery
          </div>
        )}

        {/* Add to cart icon button */}
        <button
          onClick={handleAddToCart}
          className="absolute bottom-2 right-2 z-20 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 backdrop-blur-sm border border-white rounded-full flex items-center justify-center shadow-lg text-primary hover:bg-primary hover:text-white transition-all duration-300 active:scale-90 hover:scale-105"
          aria-label="Add to cart"
        >
          <ShoppingCart size={18} strokeWidth={2.5} />
        </button>
      </div>

      <Link to={productUrl} className="p-3 sm:p-4 flex flex-col flex-1 bg-white">
        <h3 className="text-[13px] sm:text-[14px] font-semibold text-slate-800 leading-[1.4] line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {product.title}
        </h3>

        <div className="mt-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-primary font-black text-[15px] sm:text-base tracking-tight">
              ৳{product.price.toLocaleString('en-IN')}
            </span>
            {op > product.price && (
              <span className="text-slate-500 text-[11px] sm:text-[12px] font-medium line-through decoration-slate-300">
                ৳{op.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {showRating && product.rating > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 font-semibold text-[11px] sm:text-xs text-slate-600">
              <span className="text-amber-400">★</span>
              <span>{product.rating}</span>
              <span className="text-slate-500 font-medium">({product.reviews || 0})</span>
            </div>
          )}

          {showRating && product.category && (
            <div className="text-[11px] sm:text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wider">
              {typeof product.category === 'string' ? product.category : product.category.name}
            </div>
          )}
        </div>
      </Link>

      <div className="px-3 pb-3 sm:px-4 sm:pb-4 bg-white">
        <button
          onClick={handleOrderNow}
          className={btnClasses}
          style={{ borderRadius: btnRadius }}
        >
          অর্ডার করুন
        </button>
      </div>

      {isCheckoutPopupOpen && (
        <CheckoutPopup
          isOpen={isCheckoutPopupOpen}
          onClose={() => setIsCheckoutPopupOpen(false)}
          initialProduct={product}
          initialQuantity={1}
        />
      )}
    </div>
  );
};
