import React, { useState, useEffect } from 'react';
import { Truck, Star, Headset, Shield, Zap, Check, ChevronDown, CheckCircle2, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { CheckoutPopup } from '../ui/CheckoutPopup';
import { trackEvent } from '../../lib/analytics';

interface PremiumTemplateConfig {
  themeColor: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroImageUrl: string;
  heroVideoUrl: string;
  buttonText: string;
  showCountdown: boolean;
  countdownMinutes: number;
  deliveryCharge: string;
  guaranteeText: string;
  benefits: { id: string; title: string; description: string; icon: string }[];
  faqs: { id: string; question: string; answer: string }[];
  testimonials: { id: string; name: string; review: string; rating: number }[];
}

interface Props {
  config: PremiumTemplateConfig;
  productId: string | null;
}

const ICONS: Record<string, React.FC<any>> = {
  check: CheckCircle2,
  star: Star,
  truck: Truck,
  headset: Headset,
  shield: Shield,
  zap: Zap,
};

export default function PremiumTemplate({ config, productId }: Props) {
  const [timeLeft, setTimeLeft] = useState(config.countdownMinutes * 60);
  const [showCheckout, setShowCheckout] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    // Inject Theme Color CSS Variables
    document.documentElement.style.setProperty('--premium-color', config.themeColor);
    document.documentElement.style.setProperty('--premium-hover', `${config.themeColor}dd`);
  }, [config.themeColor]);

  useEffect(() => {
    if (!config.showCountdown) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [config.showCountdown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const ytId = config.heroVideoUrl ? getYouTubeId(config.heroVideoUrl) : null;

  return (
    <div className="font-sans text-gray-900 bg-gray-50 min-h-screen pb-20 md:pb-0">
      <style dangerouslySetInnerHTML={{__html: `
        .bg-premium { background-color: var(--premium-color); }
        .text-premium { color: var(--premium-color); }
        .border-premium { border-color: var(--premium-color); }
        .hover-bg-premium:hover { background-color: var(--premium-hover); }
        .premium-gradient { background: linear-gradient(135deg, var(--premium-color) 0%, #0f172a 100%); }
        .glass-header { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); }
      `}} />

      {/* Sticky Header */}
      <div className="fixed top-0 left-0 right-0 z-40 glass-header border-b border-gray-100 shadow-sm transition-all duration-300">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex flex-col">
            {config.showCountdown && (
              <span className="text-xs font-bold text-red-600 flex items-center gap-1 animate-pulse">
                ⏳ Offer Ends In: <span className="bg-red-100 px-1 rounded">{formatTime(timeLeft)}</span>
              </span>
            )}
            <span className="font-extrabold text-lg text-gray-900 tracking-tight leading-tight">LIMITED OFFER</span>
          </div>
          <button 
            onClick={() => {
              if (productId) trackEvent('buy_now', { product_id: productId });
              setShowCheckout(true);
            }}
            className="bg-premium text-white px-5 py-2 rounded-full font-bold text-sm hover-bg-premium shadow-lg shadow-premium/30 transition-transform active:scale-95"
          >
            Order Now
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 relative overflow-hidden bg-white">
        <div className="absolute top-0 left-0 right-0 h-[400px] premium-gradient opacity-[0.03] rounded-b-[4rem] transform -skew-y-2 origin-top-left"></div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center relative z-10">
          <div className="space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider mb-2">
              <Zap className="w-3.5 h-3.5" /> Best Seller
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.1] tracking-tight">
              {config.heroHeadline}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
              {config.heroSubheadline}
            </p>
            <div className="pt-2">
              <button 
                onClick={() => setShowCheckout(true)}
                className="w-full md:w-auto bg-premium text-white px-8 py-4 rounded-xl font-bold text-lg hover-bg-premium shadow-xl shadow-premium/20 transition-all flex items-center justify-center gap-2 group active:scale-95"
              >
                {config.buttonText}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-4 text-sm font-medium text-gray-500">
                <Shield className="w-4 h-4 text-emerald-500" />
                {config.guaranteeText}
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-premium opacity-10 blur-3xl rounded-full transform scale-90"></div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white border border-gray-100 ring-1 ring-black/5">
              {ytId ? (
                <div className="aspect-video">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1`} 
                    title="Product Video" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                </div>
              ) : config.heroImageUrl ? (
                <img 
                  src={config.heroImageUrl} 
                  alt="Product" 
                  className="w-full h-auto object-cover"
                />
              ) : (
                <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-400">
                  <ImageIcon className="w-16 h-16 opacity-20" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-gray-50 border-y border-gray-200">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center gap-6 md:gap-12">
          <div className="flex items-center gap-2 text-gray-700 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-premium" />
            <span>100% Original</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 font-semibold">
            <Truck className="w-5 h-5 text-premium" />
            <span>Fast Delivery</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 font-semibold">
            <Star className="w-5 h-5 text-premium" />
            <span>Top Rated</span>
          </div>
        </div>
      </section>

      {/* Benefits */}
      {config.benefits?.length > 0 && (
        <section className="py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Why Choose This?</h2>
              <p className="text-gray-500 text-lg">See the features that make our product stand out.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {config.benefits.map((benefit) => {
                const Icon = ICONS[benefit.icon] || Check;
                return (
                  <div key={benefit.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow hover:border-premium/30 group">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-premium mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {config.testimonials?.length > 0 && (
        <section className="py-20 px-4 bg-gray-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-premium opacity-20 blur-[100px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-premium opacity-20 blur-[100px] rounded-full"></div>
          
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">What Our Customers Say</h2>
              <div className="flex items-center justify-center gap-1 text-amber-400">
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <span className="text-white ml-2 font-medium">4.9/5 Average Rating</span>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {config.testimonials.map((t) => (
                <div key={t.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-1 text-amber-400 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < t.rating ? 'fill-current' : 'text-gray-600'}`} />
                    ))}
                  </div>
                  <p className="text-gray-200 mb-6 italic">"{t.review}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-premium flex items-center justify-center font-bold text-white uppercase">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{t.name}</h4>
                      <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Verified Buyer
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {config.faqs?.length > 0 && (
        <section className="py-20 px-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4">
              {config.faqs.map((faq) => {
                const isOpen = openFaq === faq.id;
                return (
                  <div key={faq.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-premium/50 transition-colors">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
                    >
                      <span className="font-bold text-gray-900">{faq.question}</span>
                      <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                      <div className="px-6 pb-4 text-gray-600">
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-20 px-4 premium-gradient text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6">Don't Miss Out!</h2>
          <p className="text-lg md:text-xl text-white/80 mb-8">{config.deliveryCharge}</p>
          <button 
            onClick={() => {
              if (productId) trackEvent('buy_now', { product_id: productId });
              setShowCheckout(true);
            }}
            className="w-full md:w-auto bg-white text-gray-900 px-10 py-5 rounded-xl font-black text-xl hover:bg-gray-100 shadow-2xl transition-transform active:scale-95 uppercase tracking-wide"
          >
            {config.buttonText}
          </button>
        </div>
      </section>

      {/* Mobile Fixed Bottom CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40">
        <button 
          onClick={() => {
            if (productId) trackEvent('buy_now', { product_id: productId });
            setShowCheckout(true);
          }}
          className="w-full bg-premium text-white py-3 rounded-xl font-bold text-lg hover-bg-premium active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          {config.buttonText}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Checkout Popup */}
      {productId && (
        <CheckoutPopup 
          isOpen={showCheckout} 
          onClose={() => setShowCheckout(false)} 
          productId={productId} 
        />
      )}
    </div>
  );
}
