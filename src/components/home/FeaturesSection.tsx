import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, Truck, RefreshCcw, Headset, HelpCircle,
  Banknote, Package, Star, Clock, CreditCard, Zap,
  Award, CheckCircle2, Gift, Heart, Lock, MapPin,
  Percent, PhoneCall, ShoppingBag, Sparkles, ThumbsUp,
  BadgePercent, ShieldAlert, Globe, Smile, Flame,
  CircleDollarSign, Layers, Box, Send, Wallet, BadgeCheck,
  RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const FeaturesSection = () => {
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoreFeatures();
  }, []);

  const fetchStoreFeatures = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('value').eq('key', 'store_features').single();
      
      if (!error && data && data.value) {
        let parsed = JSON.parse(data.value);
        parsed = parsed.filter((item: any) => item.enabled);
        setFeatures(parsed);
      } else {
        // Fallback
        setFeatures([
          { icon: 'ShieldCheck', title: '100% Authentic', desc: 'Verified sellers only' },
          { icon: 'Truck', title: 'Fast Delivery', desc: 'Across Bangladesh' },
          { icon: 'RefreshCcw', title: 'Easy Returns', desc: '7-day return policy' },
          { icon: 'Headset', title: '24/7 Support', desc: 'Always here to help' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching features:', err);
    } finally {
      setLoading(false);
    }
  };

  const iconMap: Record<string, React.ComponentType<any>> = {
    ShieldCheck, Truck, RefreshCcw, Headset, Banknote, Package,
    Star, Clock, CreditCard, Zap, Award, CheckCircle2, Gift,
    Heart, Lock, MapPin, Percent, PhoneCall, ShoppingBag,
    Sparkles, ThumbsUp, BadgePercent, ShieldAlert, Globe,
    Smile, Flame, CircleDollarSign, Layers, Box, Send, Wallet,
    BadgeCheck, RotateCcw, HelpCircle
  };

  const placeholderItems = Array.from({ length: 4 });
  const visibleFeatures = loading ? placeholderItems : features;

  if (!loading && features.length === 0) return null;

  return (
    <div className="px-4 py-8 sm:py-12 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {visibleFeatures.map((feature: any, idx) => {
          const Icon = iconMap[feature?.icon] || HelpCircle;
          const isLoading = loading;
          return (
            <div key={idx} className={`bg-white p-4 sm:p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100/50 flex flex-col items-center sm:items-start lg:flex-row lg:items-center gap-3 sm:gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] group ${isLoading ? 'animate-pulse' : ''}`}>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                <Icon size={22} className="sm:w-6 sm:h-6" strokeWidth={2} />
              </div>
              <div className="text-center sm:text-left">
                <h4 className={`font-bold text-[13px] sm:text-[15px] mb-1 ${isLoading ? 'bg-slate-100 rounded w-20 h-4 text-transparent' : 'text-slate-800'}`}>{isLoading ? 'loading' : feature.title}</h4>
                <p className={`text-[11.5px] sm:text-[13px] leading-snug ${isLoading ? 'bg-slate-100 rounded w-24 h-3 text-transparent' : 'text-slate-500 font-medium'}`}>{isLoading ? 'loading' : feature.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
