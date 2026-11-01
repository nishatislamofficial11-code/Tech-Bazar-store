import React, { useState, useEffect } from 'react';
import { CheckCircle2, Phone, Star, Truck } from 'lucide-react';
import { CheckoutPopup } from '../ui/CheckoutPopup';
import { supabase } from '../../lib/supabase';
import { trackEvent } from '../../lib/analytics';

export interface ClassicSalesConfig {
  themeColor: string;
  themeSecondaryColor: string;
  buttonColor: string;

  topBannerText: string;
  subheadline: string;
  ctaText: string;
  
  problemsTitle: string;
  problems: string[];
  problemImages: string[];
  
  productIntroTitle: string;
  productIntroSubtitle: string;
  productBenefits: string[];
  productImageUrl: string;
  
  reviewsTitle: string;
  reviews: { id: string; name: string; review: string }[];
  
  featuresTitle: string;
  features: { id: string; title: string; imageUrl: string }[];
  
  instructionsTitle: string;
  instructions: string[];
  instructionImageUrl: string;
  
  packageTitle: string;
  packages: { id: string; title: string; originalPrice: number; price: number; description: string }[];
  
  helplineText: string;
  helplineNumber: string;
}

interface Props {
  config: ClassicSalesConfig;
  productId: string | null;
}

export default function ClassicSalesTemplate({ config, productId }: Props) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);

  useEffect(() => {
    if (productId) {
      supabase.from('products').select('*').eq('id', productId).single().then(({ data }) => {
        if (data) setProductData(data);
      });
    }
  }, [productId]);

  // Set default package on load
  useEffect(() => {
    if (config.packages?.length > 0 && !selectedPackage) {
      setSelectedPackage(config.packages[0]);
    }
  }, [config.packages, selectedPackage]);

  // Generate dynamic product object with package price for the checkout
  const getCheckoutProduct = () => {
    if (!productData) return null;
    if (!selectedPackage) return productData;
    
    // Create a modified product object with the package price and title
    return {
      ...productData,
      title: `${productData.name || productData.title} - ${selectedPackage.title}`,
      price: selectedPackage.price,
      original_price: selectedPackage.originalPrice,
      discount_price: selectedPackage.price,
    };
  };

  const handleCtaClick = () => {
    if (productId) {
      trackEvent('buy_now', { product_id: productId });
    }
    const checkoutSection = document.getElementById('checkout-section');
    if (checkoutSection) {
      checkoutSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowCheckout(true);
    }
  };

  const PrimaryButton = ({ className = '' }: { className?: string }) => (
    <div className={`text-center my-8 ${className}`}>
      <button 
        onClick={handleCtaClick}
        style={{ backgroundColor: config.buttonColor || '#990000' }}
        className="text-white px-8 py-3 rounded-lg font-bold text-xl md:text-2xl hover:opacity-90 transition-all shadow-lg shadow-black/20 flex flex-col items-center justify-center mx-auto w-11/12 md:w-auto animate-pulse"
      >
        <span>{config.ctaText || 'অর্ডার করতে ক্লিক করুন'}</span>
      </button>
    </div>
  );

  return (
    <div className="font-sans text-gray-900 bg-white min-h-screen pb-20 md:pb-0">
      {/* Top Banner */}
      <div 
        style={{ backgroundColor: config.themeColor || '#013b5a' }} 
        className="text-white text-center py-4 px-4 shadow-md sticky top-0 z-40"
      >
        <h1 className="text-lg md:text-2xl font-bold leading-snug">
          {config.topBannerText}
        </h1>
      </div>

      <div className="max-w-4xl mx-auto pb-12">
        <p className="text-center font-bold text-gray-700 mt-4 px-4 text-sm md:text-base">
          {config.subheadline}
        </p>

        <PrimaryButton />

        {/* Problems Section */}
        {config.problems?.length > 0 && (
          <div className="px-4 my-8">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-6" style={{ color: config.themeColor }}>
              {config.problemsTitle}
            </h2>
            <div className="grid md:grid-cols-2 gap-8 items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <ul className="space-y-4">
                {config.problems.map((prob, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" style={{ color: config.themeColor }} />
                    <span className="text-gray-800 font-medium leading-relaxed">{prob}</span>
                  </li>
                ))}
              </ul>
              {config.problemImages?.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {config.problemImages.map((img, idx) => (
                    <img key={idx} src={img} alt={`Problem ${idx+1}`} className="w-full h-32 md:h-40 object-cover rounded-xl shadow-sm border border-white" />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product Intro */}
        <div 
          style={{ backgroundColor: config.themeSecondaryColor || '#3e8499' }}
          className="my-10 p-6 md:p-10 text-white shadow-inner"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-sm font-semibold opacity-90 mb-2 uppercase tracking-wide">Introducing the</p>
              <h2 className="text-2xl md:text-4xl font-black mb-4 leading-tight">{config.productIntroTitle}</h2>
              <p className="text-white/90 font-medium mb-6 leading-relaxed">
                {config.productIntroSubtitle}
              </p>
              {config.productImageUrl && (
                 <div className="md:hidden mb-6">
                    <img src={config.productImageUrl} alt="Product" className="w-full max-w-xs mx-auto rounded-2xl shadow-2xl rotate-2 hover:rotate-0 transition-transform" />
                 </div>
              )}
              <ul className="space-y-3">
                {config.productBenefits?.map((ben, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-green-400" />
                    <span className="font-semibold text-sm md:text-base">{ben}</span>
                  </li>
                ))}
              </ul>
            </div>
            {config.productImageUrl && (
              <div className="hidden md:block">
                <img src={config.productImageUrl} alt="Product" className="w-full rounded-2xl shadow-2xl rotate-2 hover:rotate-0 transition-transform" />
              </div>
            )}
          </div>
        </div>

        <PrimaryButton />

        {/* Reviews Section */}
        {config.reviews?.length > 0 && (
          <div className="px-4 my-12">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-8" style={{ color: config.themeColor }}>
              {config.reviewsTitle || 'সম্মানিত গ্রাহক কি বলছেন...'}
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {config.reviews.map(review => (
                <div key={review.id} className="bg-white rounded-xl shadow-md border border-gray-100 p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-400/10 rounded-bl-full"></div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-800 uppercase">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{review.name}</h4>
                      <p className="text-xs text-green-600 font-medium">Verified Buyer</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed italic">"{review.review}"</p>
                  <div className="flex text-yellow-400 mt-3">
                    {'★★★★★'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <PrimaryButton />

        {/* Features / How it works */}
        {config.features?.length > 0 && (
          <div className="px-4 my-12 bg-gray-50 py-10 rounded-3xl border border-gray-100">
            {config.featuresTitle && (
              <h2 className="text-xl md:text-2xl font-bold text-center mb-8" style={{ color: config.themeColor }}>
                {config.featuresTitle}
              </h2>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {config.features.map((feat) => (
                <div key={feat.id} className="bg-white p-3 rounded-2xl shadow-sm text-center border border-gray-100 hover:shadow-md transition-shadow">
                  {feat.imageUrl && (
                    <img src={feat.imageUrl} alt={feat.title} className="w-full h-32 object-cover rounded-xl mb-3 bg-gray-50" />
                  )}
                  <h4 className="font-bold text-gray-800 text-sm leading-tight">{feat.title}</h4>
                </div>
              ))}
            </div>
          </div>
        )}

        <PrimaryButton />

        {/* Instructions */}
        {config.instructions?.length > 0 && (
          <div className="px-4 my-12 border-t border-b border-gray-100 py-10">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-xl md:text-2xl font-bold mb-6 text-white text-center py-2 rounded-lg" style={{ backgroundColor: config.themeColor }}>
                  {config.instructionsTitle}
                </h2>
                <ul className="space-y-4">
                  {config.instructions.map((inst, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-bold text-white text-xs mt-0.5" style={{ backgroundColor: config.themeColor }}>
                        {idx + 1}
                      </div>
                      <span className="text-gray-700 font-medium leading-relaxed">{inst}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {config.instructionImageUrl && (
                <div>
                  <img src={config.instructionImageUrl} alt="Instructions" className="w-full rounded-2xl shadow-lg border border-gray-200 bg-gray-50" />
                </div>
              )}
            </div>
          </div>
        )}

        <PrimaryButton />

        {/* Package Selection & Checkout trigger */}
        <div id="checkout-section" className="px-4 my-12 pt-8 scroll-mt-24">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-8 text-gray-900 border-b-2 pb-4 inline-block mx-auto border-gray-200">
            {config.packageTitle || 'কোন প্যাকেজ আপনার জন্য বেস্ট?'}
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
            {config.packages?.map((pkg) => (
              <div 
                key={pkg.id} 
                onClick={() => setSelectedPackage(pkg)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                  selectedPackage?.id === pkg.id 
                    ? 'border-blue-500 bg-blue-50 shadow-md transform scale-[1.02]' 
                    : 'border-gray-200 hover:border-blue-300 bg-white'
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedPackage?.id === pkg.id ? 'border-blue-500' : 'border-gray-300 bg-white'}`}>
                   {selectedPackage?.id === pkg.id && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{pkg.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500 line-through">৳{pkg.originalPrice}</span>
                    <span className="font-bold text-lg text-red-600">৳{pkg.price}</span>
                  </div>
                  {pkg.description && <p className="text-xs text-gray-600 mt-1">{pkg.description}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center my-8">
             <button 
               onClick={() => {
                 if (productId) {
                   trackEvent('buy_now', { product_id: productId });
                 }
                 setShowCheckout(true);
               }}
               style={{ backgroundColor: config.buttonColor || '#990000' }}
               className="text-white px-10 py-4 rounded-xl font-black text-xl hover:opacity-90 transition-all shadow-xl active:scale-95 animate-bounce"
             >
               অর্ডার কনফার্ম করতে ক্লিক করুন
             </button>
          </div>

          {/* Trust Badges */}
          <div className="flex justify-center gap-6 mt-8 flex-wrap opacity-80">
             <div className="flex flex-col items-center gap-2">
               <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <CheckCircle2 size={32} />
               </div>
               <span className="text-xs font-bold text-gray-600">Cash on Delivery</span>
             </div>
             <div className="flex flex-col items-center gap-2">
               <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <Star size={32} />
               </div>
               <span className="text-xs font-bold text-gray-600">Special Offer</span>
             </div>
             <div className="flex flex-col items-center gap-2">
               <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <Truck size={32} />
               </div>
               <span className="text-xs font-bold text-gray-600">Fast Delivery</span>
             </div>
          </div>

          <div className="text-center mt-12 mb-8">
             <p className="font-bold text-blue-800 mb-4">{config.helplineText}</p>
             {config.helplineNumber && (
               <a href={`tel:${config.helplineNumber}`} className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-blue-700">
                  <Phone size={20} />
                  {config.helplineNumber}
               </a>
             )}
          </div>
        </div>
      </div>

      {/* Embedded/Popup Checkout Form */}
      {productId && productData && (
        <CheckoutPopup 
          isOpen={showCheckout} 
          onClose={() => setShowCheckout(false)} 
          initialProduct={getCheckoutProduct()} 
        />
      )}

      {/* Footer text */}
      <div style={{ backgroundColor: config.buttonColor || '#990000' }} className="text-white text-center py-4 text-xs font-medium px-4 mt-8">
        N.B: কথা বা অর্ডার সম্পর্কে জানতে হেল্পলাইন নাম্বার এ কল করুন, আপনি আমাদের {config.helplineNumber} নাম্বারে কল করতে পারেন
      </div>
      
      {/* Mobile Sticky Button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40">
        <button 
          onClick={handleCtaClick}
          style={{ backgroundColor: config.buttonColor || '#990000' }}
          className="w-full text-white py-3 rounded-xl font-bold text-lg active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg"
        >
          {config.ctaText || 'অর্ডার করতে ক্লিক করুন'}
        </button>
      </div>
    </div>
  );
}
