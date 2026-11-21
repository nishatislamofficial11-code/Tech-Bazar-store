import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Truck, RefreshCcw, Headset, HelpCircle, Banknote, Package, Star, Clock, CreditCard, Zap,
  Award, CheckCircle2, Gift, Heart, Lock, MapPin, Percent, PhoneCall, ShoppingBag, Sparkles, ThumbsUp,
  BadgePercent, ShieldAlert, Globe, Smile, Flame, CircleDollarSign, Layers, Box, Send, Wallet, BadgeCheck,
  RotateCcw, ArrowRight,
} from 'lucide-react';
import { ProductCard } from '../../ui/ProductCard';

export const featureIcons: Record<string, React.ComponentType<any>> = {
  ShieldCheck, Truck, RefreshCcw, Headset, Banknote, Package, Star, Clock, CreditCard, Zap, Award, CheckCircle2,
  Gift, Heart, Lock, MapPin, Percent, PhoneCall, ShoppingBag, Sparkles, ThumbsUp, BadgePercent, ShieldAlert,
  Globe, Smile, Flame, CircleDollarSign, Layers, Box, Send, Wallet, BadgeCheck, RotateCcw, HelpCircle,
};

/** Products the home designs show; filled by HomePage. */
export interface HomeProducts {
  latest: any[];
  flash: any[];
  best: any[];
  loading: boolean;
}

export interface HeroText {
  title: string;
  text: string;
  button: string;
  image: string;
}

export function SectionHeader({ title, subtitle, to = '/shop', light = false }: { title: string; subtitle?: string; to?: string; light?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4 sm:mb-6">
      <div className="min-w-0">
        <h2 className={`text-[22px] sm:text-3xl font-extrabold tracking-tight leading-tight ${light ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
        {subtitle && <p className={`mt-1 text-[13px] sm:text-sm ${light ? 'text-white/70' : 'text-slate-500'}`}>{subtitle}</p>}
      </div>
      <Link to={to} className={`shrink-0 inline-flex items-center gap-1 text-sm sm:text-base font-semibold ${light ? 'text-white' : 'text-primary'} hover:gap-2 transition-all`}>
        View All <ArrowRight size={16} />
      </Link>
    </div>
  );
}

const CardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden h-full">
    <div className="skeleton-shimmer aspect-square w-full" />
    <div className="p-3 space-y-2">
      <div className="skeleton-shimmer h-3.5 rounded w-11/12" />
      <div className="skeleton-shimmer h-4 rounded w-1/2" />
    </div>
  </div>
);

export function ProductGrid({ products, loading, max = 10 }: { products: any[]; loading: boolean; max?: number }) {
  if (!loading && products.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
      {loading && products.length === 0
        ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        : products.slice(0, max).map((p) => (
            <div key={p.id} className="h-full"><ProductCard product={p} /></div>
          ))}
    </div>
  );
}

export function ProductRow({ products, loading }: { products: any[]; loading: boolean }) {
  if (!loading && products.length === 0) return null;
  const items = loading && products.length === 0 ? Array.from({ length: 4 }) : products.slice(0, 12);
  return (
    <div className="flex gap-3 sm:gap-5 overflow-x-auto snap-x hide-scrollbar -mx-4 px-4 pb-2">
      {items.map((p: any, i) => (
        <div key={p?.id || i} className="snap-start shrink-0 w-[46%] sm:w-[31%] md:w-[23%] lg:w-[19%]">
          {p ? <ProductCard product={p} /> : <CardSkeleton />}
        </div>
      ))}
    </div>
  );
}
