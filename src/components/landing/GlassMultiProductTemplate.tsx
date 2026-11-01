import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckoutPopup } from '../ui/CheckoutPopup';
import { ChevronRight, ChevronLeft, Star, ShieldCheck, Zap, Truck, CheckCircle2, ShoppingBag, ShoppingCart, MessageCircle, PhoneCall, CheckCheck } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useCart } from '../../contexts/CartContext';
import { trackViewContent } from '../../lib/fbPixel';
import { trackEvent } from '../../lib/analytics';

export interface GlassMultiConfig {
  themeColor: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroImageUrl: string;
  heroImageUrls?: string[];
  features: { id: string; title: string; subtitle: string; icon: string }[];
  productIds: string[];
  reviewsTitle: string;
  reviews: { id: string; name: string; review: string; rating: number; imageUrl?: string }[];
  buttonText: string;
  stickyHeaderTitle: string;
  stickyHeaderButtonText: string;
  whatsappNumber?: string;
  phoneNumber?: string;
  contactBannerText?: string;
  stockAlertText?: string;
  deliveryChargeText?: string;
  benefitsTitle?: string;
  benefits?: string[];
  actionButtonColor?: string;
  featuresTitle?: string;
  showHeroOrderButton?: boolean;
}

interface Props {
  config: GlassMultiConfig;
}

const ICONS: Record<string, React.FC<any>> = {
  check: CheckCircle2,
  star: Star,
  truck: Truck,
  shield: ShieldCheck,
  zap: Zap,
  bag: ShoppingBag
};

const HeroCarousel = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsPerView = isMobile ? 1 : Math.min(3, images.length || 1);
  const maxIndex = Math.max(0, images.length - itemsPerView);

  useEffect(() => {
    if (!images || maxIndex <= 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [images, maxIndex]);

  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full mx-auto overflow-hidden bg-gray-100 group">
      <div 
        className="flex transition-transform duration-700 ease-in-out h-full"
        style={{ transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)` }}
      >
        {images.map((img, index) => (
          <div 
            key={index} 
            className="flex-shrink-0 h-full" 
            style={{ width: `${100 / itemsPerView}%` }}
          >
            <div className="w-full h-full relative" style={{ aspectRatio: '1/1' }}>
              <img
                src={img}
                className="absolute inset-0 w-full h-full object-cover"
                alt={`Slide ${index}`}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Navigation Arrows */}
      {maxIndex > 0 && (
         <>
           <button 
             onClick={(e) => { e.preventDefault(); setCurrentIndex((p) => p === 0 ? maxIndex : p - 1); }}
             className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/70 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 shadow-md"
           >
             <ChevronLeft className="w-6 h-6" />
           </button>
           <button 
             onClick={(e) => { e.preventDefault(); setCurrentIndex((p) => p >= maxIndex ? 0 : p + 1); }}
             className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/70 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 shadow-md"
           >
             <ChevronRight className="w-6 h-6" />
           </button>
         </>
      )}

      {/* Dots */}
      {maxIndex > 0 && (
        <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-3">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === currentIndex ? 'bg-white scale-125 shadow-[0_0_8px_rgba(0,0,0,0.5)]' : 'bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ReviewCarousel = ({ reviews }: { reviews: any[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsPerView = isMobile ? 1 : Math.min(3, reviews.length || 1);
  const maxIndex = Math.max(0, reviews.length - itemsPerView);

  useEffect(() => {
    if (!reviews || maxIndex <= 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [reviews, maxIndex]);

  if (!reviews || reviews.length === 0) return null;

  return (
    <div className="relative w-full max-w-6xl mx-auto overflow-hidden group pb-8 pt-4 px-2 md:px-0">
      <div 
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)` }}
      >
        {reviews.map((review, index) => (
          <div 
            key={review.id || index} 
            className="flex-shrink-0 px-2" 
            style={{ width: `${100 / itemsPerView}%` }}
          >
            <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
              {review.imageUrl ? (
                <div className="w-full relative bg-gray-50 flex items-center justify-center" style={{ aspectRatio: isMobile ? '3/4' : '4/5' }}>
                   <img src={review.imageUrl} className="absolute inset-0 w-full h-full object-contain p-2" alt="Review screenshot" />
                </div>
              ) : (
                <div className="p-6 flex-1 flex flex-col h-full min-h-[300px]">
                  <div className="flex text-yellow-400 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < (review.rating || 5) ? 'fill-current' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <p className="text-[#1d1d1f] font-medium leading-relaxed mb-4 text-base flex-1">"{review.review}"</p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {review.name?.charAt(0) || 'U'}
                    </div>
                    <span className="font-bold text-sm">{review.name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Navigation Arrows */}
      {maxIndex > 0 && (
         <>
           <button 
             onClick={(e) => { e.preventDefault(); setCurrentIndex((p) => p === 0 ? maxIndex : p - 1); }}
             className="absolute left-0 md:left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 shadow-md border border-gray-200"
           >
             <ChevronLeft className="w-6 h-6" />
           </button>
           <button 
             onClick={(e) => { e.preventDefault(); setCurrentIndex((p) => p >= maxIndex ? 0 : p + 1); }}
             className="absolute right-0 md:right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 shadow-md border border-gray-200"
           >
             <ChevronRight className="w-6 h-6" />
           </button>
         </>
      )}
    </div>
  );
};

export default function GlassMultiProductTemplate({ config }: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const { addToCart, setIsCartOpen } = useCart();

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
        // Order products exactly as they appear in productIds array
        const ordered = config.productIds.map(id => data.find(p => p.id === id)).filter(Boolean);
        setProducts(ordered);
        
        // Fire Facebook Pixel ViewContent for each product on the landing page
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

  const handleOrder = (product: any) => {
    if (product?.id) {
      trackEvent('buy_now', { product_id: product.id });
    }
    setSelectedProduct(product);
    setShowCheckout(true);
  };

  const heroImages = config.heroImageUrls && config.heroImageUrls.length > 0 
    ? config.heroImageUrls 
    : (config.heroImageUrl ? [config.heroImageUrl] : []);

  return (
    <div className="text-[#1d1d1f] bg-[#f5f5f7] min-h-screen relative overflow-hidden" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
      <Helmet>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Helmet>

      {/* Mesh Gradient Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-white/80 to-transparent z-0"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl z-0 pointer-events-none"></div>
      <div className="absolute top-40 -left-40 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl z-0 pointer-events-none"></div>

      <div className="relative z-10">
        {/* 1. Headline */}
        <section className="pt-8 pb-6 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[#16a34a] leading-[1.2]" style={{ color: config.themeColor || '#16a34a' }}>
              {config.heroHeadline}
            </h1>
          </div>
        </section>

        {/* 2. Hero Image Carousel */}
        {heroImages.length > 0 && (
          <section className="w-full pb-8">
             <HeroCarousel images={heroImages} />
          </section>
        )}

        {/* 3. Primary CTA Button */}
        {config.showHeroOrderButton !== false && (
          <section className="px-4 pb-12 max-w-sm mx-auto">
            <button 
              onClick={() => {
                if (products.length === 1) {
                  handleOrder(products[0]);
                } else {
                  const productsSection = document.getElementById('products-section');
                  productsSection?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="w-full text-white py-4 rounded-full font-bold text-lg hover:opacity-90 transition-all shadow-lg animate-pulse flex items-center justify-center gap-2"
              style={{ backgroundColor: config.actionButtonColor || '#dc2626' }}
            >
              <ShoppingCart className="w-5 h-5" />
              {config.buttonText || 'অর্ডার করতে ক্লিক করুন'}
            </button>
          </section>
        )}

        {/* 4. Products Grid */}
        <section id="products-section" className="pb-8 px-4">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="flex justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div></div>
            ) : products.length === 0 ? (
              <p className="text-center text-gray-500">No products selected yet.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map(product => (
                  <div key={product.id} className="bg-white/70 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col hover:-translate-y-1 transition-transform duration-300 overflow-hidden">
                    <div className="relative aspect-square bg-gray-100 border-b border-gray-100">
                      <img 
                        src={product.image || product.images?.[0]} 
                        alt={product.name || product.title}
                        className="w-full h-full object-cover"
                      />
                      {product.discount_price && product.discount_price < product.price && (
                         <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                           Save ৳{product.price - product.discount_price}
                         </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col items-center text-center">
                      <h3 className="text-xl font-bold mb-2 line-clamp-2 leading-snug">{product.name || product.title}</h3>
                      <div className="flex items-center gap-3 mb-6">
                        <span className="text-2xl font-bold tracking-tight text-gray-900">
                          ৳{product.discount_price || product.price}
                        </span>
                        {product.discount_price && product.discount_price < product.price && (
                          <span className="text-sm text-gray-500 line-through">
                            ৳{product.price}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => handleOrder(product)}
                        className="w-full bg-[#16a34a] text-white py-3 rounded-full font-bold text-base hover:opacity-90 transition-all shadow-md"
                        style={{ backgroundColor: config.themeColor || '#16a34a' }}
                      >
                        {config.buttonText || 'অর্ডার করুন'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 5. Contact Banner 1 */}
        {config.contactBannerText && (
          <div className="bg-[#16a34a] text-white text-center py-4 px-4 text-lg md:text-xl font-bold shadow-inner" style={{ backgroundColor: config.themeColor || '#16a34a' }}>
            {config.contactBannerText} {config.phoneNumber}
          </div>
        )}

        {/* 6. Feature List (Bullet Points) */}
        {config.features?.length > 0 && (
          <section className="w-full bg-white mb-8 border-y border-gray-200">
            <div className="max-w-3xl mx-auto px-4 py-2">
              {config.featuresTitle && (
                 <h3 className="text-xl md:text-2xl font-bold text-center my-6 text-red-600">{config.featuresTitle}</h3>
              )}
              <div className="flex flex-col">
                {config.features.map((feat: any, index: number) => (
                  <div key={feat.id || index} className={`flex items-start gap-3 py-3.5 ${index !== config.features.length - 1 ? 'border-b border-gray-200' : ''}`}>
                    <CheckCheck className="w-5 h-5 text-[#16a34a] shrink-0 mt-0.5" strokeWidth={3} />
                    <div className="text-[15px] leading-relaxed">
                      <span className="font-bold text-gray-900">{feat.title}</span>
                      {feat.subtitle && <span className="font-normal text-gray-800 ml-1.5">{feat.subtitle}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 7. Three Action Buttons Stacked */}
        <section className="px-4 pb-12 max-w-sm mx-auto flex flex-col gap-4">
          <button 
            onClick={() => {
              if (products.length === 1) {
                handleOrder(products[0]);
              } else {
                const productsSection = document.getElementById('products-section');
                productsSection?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="w-full text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
            style={{ backgroundColor: config.actionButtonColor || '#dc2626' }}
          >
            <ShoppingCart className="w-5 h-5" />
            {config.buttonText || 'অর্ডার করতে ক্লিক করুন'}
          </button>
          
          {config.phoneNumber && (
            <a 
              href={`tel:${config.phoneNumber}`}
              className="w-full bg-[#16a34a] text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-5 h-5" />
              কল অর্ডার: {config.phoneNumber}
            </a>
          )}
          
          {config.whatsappNumber && (
            <a 
              href={`https://wa.me/${config.whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-[#16a34a] text-white py-4 rounded-xl font-bold text-[17px] hover:bg-green-700 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              হোয়াটসঅ্যাপে অর্ডার করতে ক্লিক করুন
            </a>
          )}
        </section>

        {/* 8. Stock & Pricing Summary */}
        <section className="px-4 pb-8 max-w-3xl mx-auto text-center">
          {config.stockAlertText && (
            <h2 className="text-2xl md:text-3xl font-bold text-[#16a34a] mb-6" style={{ color: config.themeColor || '#16a34a' }}>
              {config.stockAlertText}
            </h2>
          )}
          
          <div className="space-y-4 mb-8">
            {products.map(product => (
              <div key={product.id} className="text-xl font-medium text-gray-800 border-b border-gray-300 pb-2 inline-block">
                {product.name || product.title} <span className="font-bold text-gray-900">৳{product.discount_price || product.price}</span>
              </div>
            ))}
          </div>

          {/* 9. Delivery Charge Info */}
          {config.deliveryChargeText && (
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#16a34a]" style={{ color: config.themeColor || '#16a34a' }}>
              {config.deliveryChargeText}
            </h2>
          )}
        </section>

        {/* 10. Why Buy From Us Banner */}
        {config.benefitsTitle && (
          <div className="bg-[#16a34a] text-white text-center py-4 px-4 text-xl font-bold shadow-inner" style={{ backgroundColor: config.themeColor || '#16a34a' }}>
            {config.benefitsTitle}
          </div>
        )}

        {/* 11. Benefits List */}
        {config.benefits && config.benefits.length > 0 && (
          <section className="py-10 px-4 max-w-3xl mx-auto">
             <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-sm border border-white space-y-4">
              {config.benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#16a34a] shrink-0 mt-0.5" style={{ color: config.themeColor || '#16a34a' }} />
                  <p className="font-semibold text-lg text-gray-800">{benefit}</p>
                </div>
              ))}
             </div>
          </section>
        )}

        {/* 12. Customer Reviews Banner & Section */}
        {config.reviews?.length > 0 && (
          <>
            <div className="bg-[#16a34a] text-white text-center py-4 px-4 text-xl font-bold shadow-inner" style={{ backgroundColor: config.themeColor || '#16a34a' }}>
              {config.reviewsTitle || 'কাস্টমার রিভিউ'}
            </div>
            <section className="w-full bg-gray-50/50 overflow-hidden">
              <ReviewCarousel reviews={config.reviews} />
            </section>
          </>
        )}
        
        {/* Final Contact Banner */}
        {config.contactBannerText && (
          <div className="bg-[#16a34a] text-white text-center py-4 px-4 text-lg md:text-xl font-bold shadow-inner mt-4 mb-8" style={{ backgroundColor: config.themeColor || '#16a34a' }}>
            যেকোনো প্রয়োজনে যোগাযোগ করুন {config.phoneNumber}
          </div>
        )}
      </div>

      {/* Checkout Popup */}
      {selectedProduct && (
        <CheckoutPopup 
          isOpen={showCheckout} 
          onClose={() => setShowCheckout(false)} 
          initialProduct={selectedProduct}
          initialProducts={products}
        />
      )}
    </div>
  );
}
