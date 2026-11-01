import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckoutPopup } from '../ui/CheckoutPopup';
import { Helmet } from 'react-helmet-async';
import { trackViewContent } from '../../lib/fbPixel';
import { trackEvent } from '../../lib/analytics';
import { CheckSquare, ShoppingCart, CheckCircle2, Truck, ShieldCheck, Clock, ChevronLeft, ChevronRight, Star } from 'lucide-react';

export interface UltimateSalesReview {
  id: string;
  name: string;
  text: string;
  image?: string;
}

export interface UltimateSalesConfig {
  productTitle: string;
  regularPrice: string;
  discountPrice: string;
  deliveryText: string;
  
  heroImageUrls: string[];
  imageBadgeText?: string;
  secondImageUrl: string;
  
  buttonText: string;
  buttonColor: string;
  accentColor: string;
  backgroundColor: string;
  
  featuresTitle: string;
  features: string[];
  
  reviewsTitle?: string;
  reviews?: UltimateSalesReview[];
  
  showStickyButton: boolean;
  
  whatsappNumber: string;
  phoneNumber: string;
  contactFooterText: string;
  
  productIds: string[];
  
  urgencyText: string;
}

interface Props {
  config: UltimateSalesConfig;
}

const HeroCarousel = ({ images, badgeText }: { images: string[], badgeText?: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= images.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [images]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev >= images.length - 1 ? 0 : prev + 1));
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? images.length - 1 : prev - 1));
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full mx-auto overflow-hidden rounded-xl border-[3px] border-white shadow-lg bg-white group">
      
      {/* Top-Class Trust Badge - Top Left Corner */}
      {badgeText && (
        <div className="absolute top-0 left-0 z-30 bg-gradient-to-br from-slate-900 to-black text-white font-black text-[11px] md:text-sm px-3 md:px-5 py-1.5 md:py-2 rounded-br-2xl shadow-[4px_4px_15px_rgba(0,0,0,0.4)] flex items-center gap-1.5 md:gap-2 border-b-[3px] border-r-[3px] border-[#eab308] overflow-hidden rounded-tl-lg">
           {/* Shimmer effect for premium feel */}
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shine-slide" style={{ animationDuration: '3s' }}></div>
           
           <ShieldCheck className="w-3.5 h-3.5 md:w-5 md:h-5 text-[#eab308] drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
           <span className="tracking-wider relative z-10 text-[#fefce8] drop-shadow-md whitespace-nowrap">{badgeText}</span>
        </div>
      )}

      <div 
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((img, index) => (
          <div key={index} className="flex-shrink-0 w-full relative" style={{ aspectRatio: '1/1' }}>
            <img
              src={img}
              className="absolute inset-0 w-full h-full object-cover"
              alt={`Slide ${index}`}
            />
          </div>
        ))}
      </div>
      
      {images.length > 1 && (
        <>
          <button 
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 text-gray-800 p-2 rounded-full shadow-md hover:bg-white hover:scale-110 transition-all z-20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 text-gray-800 p-2 rounded-full shadow-md hover:bg-white hover:scale-110 transition-all z-20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`w-2.5 h-2.5 rounded-full transition-all shadow-sm cursor-pointer ${
                  idx === currentIndex ? 'bg-red-600 scale-125' : 'bg-white/80 border border-gray-300'
                }`}
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ReviewsCarousel = ({ reviews, title, accentColor }: { reviews: UltimateSalesReview[], title?: string, accentColor?: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!reviews || reviews.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= reviews.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [reviews]);

  if (!reviews || reviews.length === 0) return null;

  return (
    <div className="w-full bg-white/60 py-6 border-b border-[#d2bfae]/30">
      {title && (
        <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-[#5c3a21] px-4">{title}</h2>
      )}
      <div className="relative overflow-hidden w-full">
        <div 
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {reviews.map((review, index) => {
            const hasTextContent = !!(review.text || review.name);
            return (
              <div key={review.id || index} className="flex-shrink-0 w-full flex flex-col items-center text-center px-4">
                
                {hasTextContent && (
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-[#eab308] text-[#eab308]" />
                    ))}
                  </div>
                )}

                {review.text && (
                  <p className="text-gray-800 italic mb-4 font-medium md:text-lg text-[15px] leading-relaxed max-w-sm px-2">
                    "{review.text}"
                  </p>
                )}

                {review.image && (
                  <div className="w-full flex justify-center mb-4">
                    <img 
                      src={review.image} 
                      alt={review.name || "Customer Review"} 
                      className="w-full max-w-[95%] sm:max-w-sm mx-auto h-auto object-contain rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border-2 border-white" 
                      style={{ maxHeight: '70vh' }}
                    />
                  </div>
                )}

                {review.name && (
                  <h4 className="font-bold text-[#5c3a21] text-lg mt-1">- {review.name}</h4>
                )}

                {hasTextContent && (
                  <div className="flex items-center gap-1.5 text-green-700 text-xs font-bold mt-2 bg-green-100/80 px-2.5 py-1 rounded-full border border-green-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Buyer
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Navigation dots */}
        {reviews.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {reviews.map((_, idx) => (
              <div
                key={idx}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer shadow-sm ${
                  idx === currentIndex ? 'scale-125 w-5' : 'bg-[#d2bfae]'
                }`}
                style={{ backgroundColor: idx === currentIndex ? (accentColor || '#e8ba35') : undefined }}
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function UltimateSalesTemplate({ config }: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      if (!config.productIds || config.productIds.length === 0) {
        setLoading(false);
        return;
      }
      
      const { data } = await supabase
        .from('products')
        .select('*')
        .in('id', config.productIds);
        
      if (data) {
        const ordered = config.productIds.map(id => data.find(p => p.id === id)).filter(Boolean);
        setProducts(ordered);
        
        ordered.forEach(p => trackViewContent({
          id: p.id,
          title: p.title || p.name,
          price: Number(p.discount_price || p.price || 0),
          category: p.category
        }));
      }
      setLoading(false);
    }
    fetchProducts();
  }, [config.productIds]);

  const handleOrder = () => {
    if (products.length > 0) {
      trackEvent('buy_now', { product_id: products[0].id });
      setSelectedProduct(products[0]);
    } else {
      setSelectedProduct({ id: 'dummy', name: config.productTitle, price: config.discountPrice });
    }
    setShowCheckout(true);
  };

  const heroImages = config.heroImageUrls && config.heroImageUrls.length > 0 ? config.heroImageUrls : [];

  return (
    <div 
      className="text-[#333] min-h-screen relative pb-24 md:py-8 md:bg-transparent" 
      style={{ backgroundColor: config.backgroundColor || '#f9f4ea', fontFamily: "'Hind Siliguri', sans-serif" }}
    >
      <Helmet>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          /* Hide the global layout elements for this template only */
          .global-header, .global-footer, .global-whatsapp, .global-bottom-nav, .global-announcement {
            display: none !important;
          }
          .global-layout-wrapper {
            padding-bottom: 0 !important;
          }

          /* Premium Button Animations */
          @keyframes shimmer {
            0% { transform: translateX(-150%) skewX(-20deg); }
            100% { transform: translateX(200%) skewX(-20deg); }
          }
          @keyframes premium-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4); }
            50% { transform: scale(1.02); box-shadow: 0 10px 25px rgba(220, 38, 38, 0.6); }
          }
          .animate-premium-btn {
            animation: premium-pulse 2s infinite ease-in-out;
            position: relative;
            overflow: hidden;
          }
          .animate-premium-btn::after {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 30%; height: 100%;
            background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
            animation: shimmer 3s infinite;
          }

          /* Top-Class Badge Animations */
          @keyframes floating-badge {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }
          
          @keyframes shine-slide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-shine-slide {
            animation: shine-slide 3s infinite linear;
          }
          
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-shimmer {
            animation: shimmer 2.5s infinite linear;
          }
          
          @keyframes whatsapp-typing {
            0%, 15% { max-width: 0; opacity: 0; }
            25%, 75% { max-width: 250px; opacity: 1; }
            85%, 100% { max-width: 0; opacity: 0; }
          }
          .animate-whatsapp-typing {
            animation: whatsapp-typing 6s ease-out infinite;
          }
          
          @keyframes bounce-horizontal {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(5px); }
          }
          .animate-bounce-horizontal {
            animation: bounce-horizontal 1.5s infinite ease-in-out;
          }
          @keyframes epic-slash {
            0%, 30% { transform: scale(0) rotate(15deg); opacity: 0; }
            40% { transform: scale(1.2) rotate(-15deg); opacity: 1; }
            50%, 100% { transform: scale(1) rotate(-8deg); opacity: 1; }
          }
          .animate-epic-slash {
            position: absolute;
            top: 50%;
            left: -10%;
            width: 120%;
            height: 4px;
            background-color: #ef4444;
            transform-origin: center;
            animation: epic-slash 3s forwards;
            box-shadow: 0 0 10px rgba(239,68,68,0.5);
            z-index: 10;
            border-radius: 4px;
          }
          
          @keyframes price-break {
             0%, 40% { transform: translate(0,0) rotate(0); filter: blur(0); }
             45% { transform: translate(-2px, 2px) rotate(-2deg); filter: blur(1px); color: #9ca3af; }
             50%, 100% { transform: translate(0,0) rotate(0); filter: blur(0); color: #9ca3af; }
          }
          .animate-price-break {
             animation: price-break 3s forwards;
             display: inline-block;
          }
          
          @keyframes pill-strike-shake {
             0%, 35% { transform: scale(1); }
             40% { transform: scale(1.02) rotate(1deg); box-shadow: 0 10px 40px rgba(220,38,38,0.2); }
             45% { transform: scale(0.98) rotate(-1deg); }
             50%, 100% { transform: scale(1) rotate(0); }
          }
          .animate-pill-strike-shake {
             animation: pill-strike-shake 3s forwards;
          }
          
          /* Text Shimmer Animation */
          @keyframes text-shimmer {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-text-shimmer {
            background-size: 200% auto;
            animation: text-shimmer 3s linear infinite;
          }
          
          @keyframes draw-slash {
            0%, 15% { width: 0%; opacity: 0; }
            20% { opacity: 1; width: 0%; }
            35%, 80% { width: 120%; opacity: 1; }
            90%, 100% { width: 120%; opacity: 0; }
          }
          .animate-draw-slash {
            animation: draw-slash 3s cubic-bezier(0.25, 1, 0.5, 1) infinite;
          }
        `}</style>
      </Helmet>

      {/* Main Container - App-like constraint for desktop */}
      <div className="max-w-xl mx-auto bg-white md:shadow-[0_20px_60px_rgba(0,0,0,0.12)] min-h-screen md:min-h-[auto] relative flex flex-col md:rounded-2xl border-x md:border border-gray-200 overflow-hidden">
        
        {/* Urgency Top Bar - Now inside the constrained container */}
        {config.urgencyText && (
          <div className="bg-red-600 text-white text-center text-sm md:text-base py-2.5 font-bold flex items-center justify-center gap-2 px-4 shadow-sm relative z-50 w-full">
            <Clock className="w-4 h-4 animate-pulse" />
            {config.urgencyText}
          </div>
        )}

        {/* Header Section */}
        <section className="pt-4 pb-2 px-3 text-center flex flex-col items-center bg-[#fdfbf7]">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-[#3e1f0f] via-[#dc2626] to-[#3e1f0f] bg-clip-text text-transparent animate-text-shimmer leading-tight tracking-tight drop-shadow-sm mb-2 px-2">
            {config.productTitle}
          </h1>
          
          <div className="flex flex-col items-center justify-center gap-1.5 mb-1 w-full">
            {/* Regular Price - Highly Visible & Animated */}
            <div className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-50 to-orange-50 px-4 md:px-8 py-1.5 md:py-2.5 rounded-full border-2 border-red-200 shadow-[0_4px_15px_rgba(220,38,38,0.15)] relative mb-1.5 w-full max-w-[95%] sm:max-w-max">
              <span className="text-red-600 font-bold text-sm md:text-lg uppercase tracking-wider">রেগুলার মূল্য</span>
              
              <span className="relative font-black text-2xl md:text-4xl text-slate-800 mx-1.5 inline-flex items-center">
                <span className="relative z-10">{config.regularPrice}</span>
                {/* Animated Diagonal Strike-through */}
                <span className="absolute top-1/2 left-[-10%] h-[3px] md:h-[4px] bg-red-600 -rotate-[8deg] z-20 rounded-full animate-draw-slash drop-shadow-sm"></span>
              </span>
              
              <span className="text-red-600 font-bold text-sm md:text-lg">টাকা</span>
            </div>
            
            {/* Discount Price - Unified Mega Pill (One Line) */}
            <div className="inline-flex items-center justify-between gap-1 bg-gradient-to-r from-[#fcd34d] to-[#f59e0b] p-1 rounded-full shadow-[0_8px_20px_rgba(245,158,11,0.4)] border-2 border-white w-full max-w-[98%] sm:max-w-[95%] md:max-w-max animate-heartbeat">
               <span className="text-[12px] min-[360px]:text-[14px] md:text-xl text-[#5c3a21] font-black pl-2 md:pl-4 pr-0.5 tracking-tighter sm:tracking-tight whitespace-nowrap drop-shadow-sm">
                 বর্তমান ডিসকাউন্ট মূল্য
               </span>
               <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-800 text-white px-3 sm:px-4 md:px-6 py-1 md:py-1.5 rounded-full font-black text-lg min-[360px]:text-xl md:text-3xl shadow-lg relative overflow-hidden border-2 border-red-200/60 flex-shrink-0">
                 <span 
                   className="absolute inset-0 animate-shine-slide" 
                   style={{ backgroundImage: 'linear-gradient(120deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)' }}
                 ></span>
                 <span className="relative z-10 drop-shadow-md">{config.discountPrice} টাকা</span>
               </div>
            </div>
          </div>

          {/* Free Delivery - Golden Floating Pill */}
          {config.deliveryText && (
            <div className="inline-flex items-center justify-center mt-1.5 bg-gradient-to-r from-[#e8ba35] via-[#fcd34d] to-[#e8ba35] px-5 py-1.5 rounded-full shadow-[0_0_15px_rgba(232,186,53,0.5)] animate-floating border-2 border-white relative overflow-hidden">
               <span 
                 className="absolute inset-0 animate-shine-slide" 
                 style={{ backgroundImage: 'linear-gradient(120deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)', animationDuration: '2.5s' }}
               ></span>
               <span className="text-[#5c3a21] font-black text-base md:text-lg relative z-10 drop-shadow-sm flex items-center gap-2">
                 <Truck className="w-5 h-5 animate-bounce-horizontal" />
                 {config.deliveryText}
               </span>
            </div>
          )}
        </section>

        {/* Hero Carousel */}
        <section className="px-4 py-4">
          <HeroCarousel 
             images={heroImages} 
             badgeText={config.imageBadgeText !== undefined ? config.imageBadgeText : "100% Original"} 
          />
        </section>

        {/* Primary CTA */}
        <section className="px-4 py-2 flex justify-center">
          <button 
            onClick={handleOrder}
            className="w-full max-w-sm text-white py-3.5 rounded-xl font-bold text-xl md:text-2xl transition-all flex items-center justify-center gap-3 animate-premium-btn border-b-4 border-black/20"
            style={{ backgroundImage: `linear-gradient(to right, ${config.buttonColor || '#dc2626'}, #b91c1c)` }}
          >
            <ShoppingCart className="w-6 h-6" />
            {config.buttonText || 'অর্ডার করতে চাই'}
          </button>
        </section>

        {/* Features Header */}
        {config.featuresTitle && (
          <div 
            className="w-full text-center py-4 px-4 text-xl md:text-2xl font-bold text-[#5c3a21] shadow-sm mt-6 border-y border-[#d6a848]/50"
            style={{ backgroundColor: config.accentColor || '#e8ba35' }}
          >
            {config.featuresTitle}
          </div>
        )}

        {/* Features List */}
        {config.features && config.features.length > 0 && (
          <section className="px-5 py-6 bg-white/60">
            <div className="space-y-4">
              {config.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 border-b border-[#d2bfae]/30 pb-3">
                  <div className="text-[#5c3a21] rounded p-0.5 mt-0.5 shrink-0" style={{ backgroundColor: config.accentColor || '#e8ba35' }}>
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-[#5c3a21] text-[15px] md:text-lg leading-snug">{feature}</p>
                </div>
              ))}
            </div>
          </section>
        )}

          {/* Customer Reviews Auto-Sliding Carousel */}
          {config.reviews && config.reviews.length > 0 && (
            <ReviewsCarousel 
              reviews={config.reviews} 
              title={config.reviewsTitle || "কাস্টমার রিভিউ"} 
              accentColor={config.accentColor} 
            />
          )}

        {/* Repeated CTA Block */}
        <section className="px-4 py-6 text-center border-y border-white bg-white/40">
          {/* Discount Price - Unified Mega Pill (One Line) */}
          <div className="inline-flex items-center justify-between gap-1 sm:gap-2 bg-gradient-to-r from-[#fcd34d] to-[#f59e0b] p-1 sm:p-1.5 rounded-full shadow-[0_8px_20px_rgba(245,158,11,0.4)] border-2 border-white my-3 animate-heartbeat w-full max-w-[98%] sm:max-w-[95%] md:max-w-max mx-auto">
             <span className="text-[12px] min-[360px]:text-[14px] md:text-2xl text-[#5c3a21] font-black pl-2 md:pl-5 pr-0.5 sm:pr-1 tracking-tighter sm:tracking-tight md:tracking-wide whitespace-nowrap drop-shadow-sm">
               বর্তমান ডিসকাউন্ট মূল্য
             </span>
             <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-800 text-white px-3 sm:px-4 md:px-8 py-1 sm:py-1.5 md:py-2.5 rounded-full font-black text-lg min-[360px]:text-xl md:text-4xl shadow-lg relative overflow-hidden border-2 border-red-200/60 flex-shrink-0">
               <span 
                 className="absolute inset-0 animate-shine-slide" 
                 style={{ backgroundImage: 'linear-gradient(120deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)' }}
               ></span>
               <span className="relative z-10 drop-shadow-md">{config.discountPrice} টাকা</span>
             </div>
          </div>
          <button 
            onClick={handleOrder}
            className="w-full max-w-sm mx-auto text-white py-3.5 rounded-xl font-bold text-xl transition-all flex items-center justify-center gap-3 animate-premium-btn border-b-4 border-black/20"
            style={{ backgroundImage: `linear-gradient(to right, ${config.buttonColor || '#dc2626'}, #b91c1c)` }}
          >
            <ShoppingCart className="w-6 h-6" />
            {config.buttonText || 'অর্ডার করতে চাই'}
          </button>
        </section>

        {/* Second Image (Optional) */}
        {config.secondImageUrl && (
          <section className="px-4 py-6">
            <div className="rounded-xl overflow-hidden shadow-lg border-2 border-white">
              <img src={config.secondImageUrl} alt="Product Demo" className="w-full h-auto" />
            </div>
          </section>
        )}

        {/* Final CTA Block */}
        {config.secondImageUrl && (
           <section className="px-4 py-4 text-center">
          {/* Discount Price - Unified Mega Pill (One Line) */}
          <div className="inline-flex items-center justify-between gap-1 sm:gap-2 bg-gradient-to-r from-[#fcd34d] to-[#f59e0b] p-1 sm:p-1.5 rounded-full shadow-[0_8px_20px_rgba(245,158,11,0.4)] border-2 border-white my-3 animate-heartbeat w-full max-w-[98%] sm:max-w-[95%] md:max-w-max mx-auto">
             <span className="text-[12px] min-[360px]:text-[14px] md:text-2xl text-[#5c3a21] font-black pl-2 md:pl-5 pr-0.5 sm:pr-1 tracking-tighter sm:tracking-tight md:tracking-wide whitespace-nowrap drop-shadow-sm">
               বর্তমান ডিসকাউন্ট মূল্য
             </span>
             <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-800 text-white px-3 sm:px-4 md:px-8 py-1 sm:py-1.5 md:py-2.5 rounded-full font-black text-lg min-[360px]:text-xl md:text-4xl shadow-lg relative overflow-hidden border-2 border-red-200/60 flex-shrink-0">
               <span 
                 className="absolute inset-0 animate-shine-slide" 
                 style={{ backgroundImage: 'linear-gradient(120deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)' }}
               ></span>
               <span className="relative z-10 drop-shadow-md">{config.discountPrice} টাকা</span>
             </div>
          </div>
            <button 
              onClick={handleOrder}
              className="w-full max-w-sm mx-auto text-white py-3.5 rounded-xl font-bold text-xl transition-all flex items-center justify-center gap-3 animate-premium-btn border-b-4 border-black/20"
              style={{ backgroundImage: `linear-gradient(to right, ${config.buttonColor || '#dc2626'}, #b91c1c)` }}
            >
              <ShoppingCart className="w-6 h-6" />
              {config.buttonText || 'অর্ডার করতে চাই'}
            </button>
          </section>
        )}

        {/* Trust Badges */}
        <section className="py-6 flex justify-center gap-4 px-4 bg-white/60">
          <div className="flex flex-col items-center text-center max-w-[100px]">
             <div className="bg-green-50 p-2.5 rounded-full mb-1 text-green-700 shadow-sm border border-green-100">
               <ShieldCheck className="w-6 h-6" />
             </div>
             <span className="text-[11px] font-bold text-[#5c3a21]">১০০% অরিজিনাল</span>
          </div>
          <div className="flex flex-col items-center text-center max-w-[100px]">
             <div className="bg-blue-50 p-2.5 rounded-full mb-1 text-blue-700 shadow-sm border border-blue-100">
               <Truck className="w-6 h-6" />
             </div>
             <span className="text-[11px] font-bold text-[#5c3a21]">ফাস্ট ডেলিভারি</span>
          </div>
          <div className="flex flex-col items-center text-center max-w-[100px]">
             <div className="bg-purple-50 p-2.5 rounded-full mb-1 text-purple-700 shadow-sm border border-purple-100">
               <CheckCircle2 className="w-6 h-6" />
             </div>
             <span className="text-[11px] font-bold text-[#5c3a21]">ক্যাশ অন ডেলিভারি</span>
          </div>
        </section>

        {/* Footer Contact */}
        {config.contactFooterText && (
          <section 
            className="text-center py-6 px-4 border-t-2 border-[#d6a848]/50 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]"
            style={{ backgroundColor: config.accentColor || '#e8ba35' }}
          >
            <h2 className="text-xl md:text-2xl font-extrabold text-[#5c3a21]">
              {config.contactFooterText}
              {config.phoneNumber && (
                <div className="mt-2 text-2xl md:text-3xl tracking-wide">{config.phoneNumber}</div>
              )}
            </h2>
          </section>
        )}

      </div>

      {/* Sticky Mobile CTA */}
      {config.showStickyButton && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-40 md:hidden animate-fade-in-up shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
           <button 
            onClick={handleOrder}
            className="w-full text-white py-3.5 rounded-xl font-bold text-xl flex items-center justify-center gap-2 animate-premium-btn border-b-4 border-black/20"
            style={{ backgroundImage: `linear-gradient(to right, ${config.buttonColor || '#dc2626'}, #b91c1c)` }}
          >
            <ShoppingCart className="w-6 h-6" />
            {config.buttonText || 'অর্ডার করতে চাই'}
          </button>
        </div>
      )}

      {/* Checkout Popup */}
      {showCheckout && (
        <CheckoutPopup 
          isOpen={showCheckout} 
          onClose={() => setShowCheckout(false)} 
          initialProduct={selectedProduct}
          initialProducts={products}
        />
      )}

      {/* Global Floating WhatsApp with Slide-out Text */}
      {config.whatsappNumber && (
        <div className="fixed inset-x-0 md:inset-auto md:right-8 bottom-[35%] md:bottom-8 mx-auto max-w-xl md:max-w-none z-[60] pointer-events-none">
          <a 
            href={`https://wa.me/${config.whatsappNumber}`}
            target="_blank"
            rel="noreferrer"
            className="absolute right-4 md:right-0 flex items-center group animate-floating pointer-events-auto"
            title="Order via WhatsApp"
          >
            {/* Animated Text Bubble Wrapper (Typing/Growing Effect) */}
            <div className="absolute right-[100%] top-1/2 -translate-y-1/2 z-10 pointer-events-none flex items-center justify-end">
              <div className="animate-whatsapp-typing overflow-hidden py-4 -my-4 flex items-center justify-end opacity-0">
                {/* Text Bubble */}
                <div className="bg-white text-[#111] font-bold text-sm md:text-base px-4 py-2.5 rounded-l-full rounded-r-md shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-200 flex items-center relative pointer-events-auto whitespace-nowrap min-w-max mr-2 md:mr-3">
                   {/* Shimmer effect container */}
                   <div className="absolute inset-0 w-full h-full rounded-l-full rounded-r-md overflow-hidden pointer-events-none">
                     <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-[#25D366]/20 to-transparent -translate-x-full animate-shine-slide" style={{ animationDuration: '2.5s' }}></span>
                   </div>
                   
                   <span className="relative z-10 whitespace-nowrap drop-shadow-sm">WhatsApp অর্ডার করুন</span>
                   
                   {/* Pointer arrow pointing to WhatsApp icon */}
                   <div className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-[10px] h-[10px] bg-white rotate-45 border-r border-t border-gray-200 z-0"></div>
                </div>
              </div>
            </div>

            {/* WhatsApp Icon */}
            <div className="bg-[#25D366] text-white p-3 md:p-4 rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.6)] flex items-center justify-center relative transition-transform duration-300 group-hover:scale-110 z-20">
              {/* Ping effect behind the icon */}
              <span className="absolute inset-0 w-full h-full rounded-full border-[3px] border-[#25D366] animate-ping opacity-75"></span>
              <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-9 md:h-9 fill-current relative z-10" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
          </a>
        </div>
      )}
    </div>
  );
}
