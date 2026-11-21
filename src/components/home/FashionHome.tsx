// Fashion theme home page: banner slider, feature cards, photo categories, product carousels,
// middle banner, all products with "Load More", customer reviews. Empty sections are hidden.
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ChevronLeft, ChevronRight, HelpCircle, Star, ShieldCheck, Truck, RefreshCcw, Headset, Banknote, Package,
  Clock, CreditCard, Zap, Award, CheckCircle2, Gift, Heart, Lock, MapPin, Percent, PhoneCall, ShoppingBag, Sparkles,
  ThumbsUp, BadgePercent, ShieldAlert, Globe, Smile, Flame, CircleDollarSign, Layers, Box, Send, Wallet, BadgeCheck,
  RotateCcw, MessageSquare,
} from 'lucide-react';

// Same icon names the Features admin page offers
const FEATURE_ICONS: Record<string, React.ComponentType<any>> = {
  ShieldCheck, Truck, RefreshCcw, Headset, Banknote, Package, Star, Clock, CreditCard, Zap, Award, CheckCircle2, Gift,
  Heart, Lock, MapPin, Percent, PhoneCall, ShoppingBag, Sparkles, ThumbsUp, BadgePercent, ShieldAlert, Globe, Smile,
  Flame, CircleDollarSign, Layers, Box, Send, Wallet, BadgeCheck, RotateCcw, HelpCircle, MessageSquare,
};
import { supabase } from '../../lib/supabase';
import { buildCloudinaryUrl } from '../../lib/cloudinary';
import { getCachedData, setCachedData } from '../../lib/cache';
import { isBot } from '../../lib/isBot';
import { FashionProductCard } from '../ui/FashionProductCard';
import { useBanners, useFeaturedCategories, useStoreFeatures, categoryPath, HomeBanner } from './useHomeData';

const PAGE = 8;
type Ratings = Record<string, { avg: number; count: number }>;

function withRating(list: any[], ratings: Ratings) {
  return list.map((p) => (ratings[p.id] ? { ...p, rating: ratings[p.id].avg, reviews: ratings[p.id].count } : p));
}

function useCachedList(key: string, load: () => PromiseLike<{ data: any[] | null }>) {
  const [rows, setRows] = useState<any[]>(() => {
    const c = getCachedData(key);
    return Array.isArray(c) ? c : [];
  });
  const [loading, setLoading] = useState(rows.length === 0);
  useEffect(() => {
    Promise.resolve(load()).then(({ data }) => {
      if (data) { setRows(data); setCachedData(key, data, 15); }
    }).finally(() => setLoading(false));
  }, []);
  return { rows, loading };
}

function Heading({ title, subtitle, onPrev, onNext, viewAll }: { title: string; subtitle?: string; onPrev?: () => void; onNext?: () => void; viewAll?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-5 sm:mb-7">
      <div className="min-w-0">
        <h2 className="text-[26px] sm:text-[32px] font-extrabold text-slate-900 leading-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-[15px] sm:text-base text-slate-500">{subtitle}</p>}
      </div>
      {onPrev && onNext ? (
        <div className="flex gap-3 shrink-0">
          <button onClick={onPrev} aria-label="Previous" className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-slate-300 flex items-center justify-center text-slate-900 hover:border-primary hover:text-primary"><ChevronLeft size={22} /></button>
          <button onClick={onNext} aria-label="Next" className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-slate-300 flex items-center justify-center text-slate-900 hover:border-primary hover:text-primary"><ChevronRight size={22} /></button>
        </div>
      ) : viewAll ? (
        <Link to={viewAll} className="shrink-0 inline-flex items-center gap-1.5 text-base sm:text-lg font-medium text-primary hover:gap-2.5 transition-all">View All <ArrowRight size={20} /></Link>
      ) : null}
    </div>
  );
}

const AUTO_SLIDE_MS = 2500;

/** Horizontal row with ◀ ▶ buttons. Slides by itself one card at a time; pauses while the visitor is using it. */
function Carousel({ title, subtitle, items, render, itemClass }: { title: string; subtitle?: string; items: any[]; render: (x: any) => React.ReactNode; itemClass: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const pausedUntil = useRef(0);
  const pause = () => { pausedUntil.current = Date.now() + 5000; };
  const step = () => {
    const el = ref.current;
    const card = el?.firstElementChild as HTMLElement | null;
    return card ? card.offsetWidth + 20 : (el?.clientWidth || 0) * 0.8;
  };
  const move = (dir: number) => {
    pause();
    ref.current?.scrollBy({ left: dir * step(), behavior: 'smooth' });
  };

  useEffect(() => {
    if (items.length < 2 || isBot()) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el || Date.now() < pausedUntil.current || el.scrollWidth <= el.clientWidth + 4) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return; // only while on screen
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: step(), behavior: 'smooth' });
    }, AUTO_SLIDE_MS);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  return (
    <section className="mt-12 sm:mt-16 px-4 sm:px-6">
      <Heading title={title} subtitle={subtitle} onPrev={() => move(-1)} onNext={() => move(1)} />
      <div ref={ref} onTouchStart={pause} onPointerDown={pause} onWheel={pause} onMouseEnter={pause}
        className="flex items-start gap-5 overflow-x-auto snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 hide-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 pb-2">
        {items.map((x, i) => <div key={x.id || i} className={`snap-start shrink-0 ${itemClass}`}>{render(x)}</div>)}
      </div>
    </section>
  );
}

function BannerSlider({ banners, className = '' }: { banners: HomeBanner[]; className?: string }) {
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);
  useEffect(() => {
    if (banners.length < 2 || isBot()) return;
    const t = setInterval(() => setI((n) => (n + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);
  if (!banners.length) return null;
  return (
    <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl aspect-[15/7] bg-slate-100 ${className}`}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const d = touch.current - e.changedTouches[0].clientX;
        if (Math.abs(d) > 40) setI((n) => (n + (d > 0 ? 1 : -1) + banners.length) % banners.length);
        touch.current = null;
      }}>
      <div className="absolute inset-0 flex transition-transform duration-500" style={{ transform: `translateX(-${i * 100}%)` }}>
        {banners.map((b, k) => {
          const img = <img src={buildCloudinaryUrl(b.image_url, 'w_1400,f_auto,q_auto')} alt="" className="w-full h-full object-cover" loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : 'auto'} />;
          return <div key={b.id || k} className="w-full h-full shrink-0">{b.link_url ? <a href={b.link_url} className="block w-full h-full">{img}</a> : img}</div>;
        })}
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
          {banners.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`Banner ${k + 1}`} className={`h-2 rounded-full transition-all ${k === i ? 'w-6 bg-white' : 'w-2 bg-white/60'}`} />)}
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string) {
  const d = Math.max(0, (Date.now() - Date.parse(iso)) / 86400000);
  if (d < 1) return 'today';
  if (d < 30) return `${Math.floor(d)} days ago`;
  if (d < 365) return `${Math.floor(d / 30)} months ago`;
  return `${Math.floor(d / 365)} years ago`;
}

export default function FashionHome() {
  const { rows: banners } = useBanners();
  const { rows: categories, loading: catLoading } = useFeaturedCategories();
  const { rows: features } = useStoreFeatures();
  const heroBanners = banners.filter((b: any) => (b.placement || 'hero') === 'hero');
  const middleBanners = banners.filter((b: any) => b.placement === 'middle');

  const latest = useCachedList('fashion_latest_cache', () => supabase.from('products').select('*').order('created_at', { ascending: false }).limit(10));
  const best = useCachedList('fashion_best_cache', () => supabase.from('products').select('*').eq('is_best_deal', true).order('created_at', { ascending: false }).limit(10));
  const reviews = useCachedList('fashion_reviews_cache', () => supabase.from('reviews').select('id, product_id, name, rating, content, created_at').eq('status', 'approved').order('created_at', { ascending: false }).limit(500));

  // All products, a page at a time
  const [all, setAll] = useState<any[]>([]);
  const [allDone, setAllDone] = useState(false);
  const [allBusy, setAllBusy] = useState(false);
  const loadMore = async () => {
    setAllBusy(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false }).range(all.length, all.length + PAGE - 1);
    setAll((list) => [...list, ...(data || [])]);
    if (!data || data.length < PAGE) setAllDone(true);
    setAllBusy(false);
  };
  useEffect(() => { loadMore(); }, []);

  const ratings: Ratings = {};
  for (const r of reviews.rows) {
    if (!r.product_id || !r.rating) continue;
    const cur = ratings[r.product_id] || { avg: 0, count: 0 };
    cur.avg = (cur.avg * cur.count + r.rating) / (cur.count + 1);
    cur.count += 1;
    ratings[r.product_id] = cur;
  }
  const card = (p: any) => <FashionProductCard product={p} />;
  const shownReviews = reviews.rows.filter((r) => r.content?.trim()).slice(0, 10);

  return (
    <div className="pb-8">
      {heroBanners.length > 0 && <div className="px-4 sm:px-6 pt-5 sm:pt-8"><BannerSlider banners={heroBanners} /></div>}

      {features.length > 0 && (
        <section className="px-4 sm:px-6 mt-6 sm:mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {features.slice(0, 4).map((f, i) => {
            const Icon = FEATURE_ICONS[f.icon] || HelpCircle;
            return (
              <div key={i} className="flex items-center gap-4 rounded-2xl bg-slate-50 px-4 py-5 sm:px-6 sm:py-7">
                <Icon className="shrink-0 text-primary w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.8} />
                <div className="min-w-0">
                  <p className="font-bold text-[16px] sm:text-lg text-slate-900 leading-tight">{f.title}</p>
                  {f.desc && <p className="mt-0.5 text-[14px] sm:text-base text-slate-500 leading-snug">{f.desc}</p>}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {(catLoading || categories.length > 0) && (
        <section className="px-4 sm:px-6 mt-12 sm:mt-16">
          <Heading title="Categories" viewAll="/shop" />
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 sm:gap-6">
            {(catLoading && !categories.length ? Array.from({ length: 6 }) : categories.slice(0, 6)).map((c: any, i) => c ? (
              <Link key={c.id} to={categoryPath(c.name)} className="group text-center">
                <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100">
                  {c.image_url
                    ? <img src={buildCloudinaryUrl(c.image_url, 'w_400,h_400,c_fill,f_auto,q_auto')} alt={c.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl font-black text-primary/50">{String(c.name).charAt(0)}</div>}
                </div>
                <p className="mt-3 text-base sm:text-lg text-slate-900 truncate">{c.name}</p>
              </Link>
            ) : <div key={i} className="aspect-square rounded-2xl skeleton-shimmer" />)}
          </div>
        </section>
      )}

      <Carousel title="New Arrivals" subtitle="This week's new products" items={withRating(latest.rows, ratings)} render={card} itemClass="w-[44%] sm:w-[30%] lg:w-[22%]" />

      {middleBanners.length > 0 && <div className="px-4 sm:px-6 mt-12 sm:mt-16"><BannerSlider banners={middleBanners} className="shadow-lg shadow-slate-200" /></div>}

      <Carousel title="Best Sellers" subtitle="Top selling items" items={withRating(best.rows, ratings)} render={card} itemClass="w-[44%] sm:w-[30%] lg:w-[22%]" />

      {all.length > 0 && (
        <section className="px-4 sm:px-6 mt-12 sm:mt-16">
          <Heading title="All Products" subtitle="Explore our entire collection" viewAll="/shop" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
            {withRating(all, ratings).map((p) => <div key={p.id}>{card(p)}</div>)}
          </div>
          {!allDone && (
            <div className="mt-10 flex justify-center">
              <button onClick={loadMore} disabled={allBusy} className="rounded-full border-2 border-slate-200 px-14 py-3.5 text-lg font-semibold text-slate-900 hover:border-primary hover:text-primary disabled:opacity-50">
                {allBusy ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </section>
      )}

      <Carousel title="Customer Reviews" subtitle="What our customers are saying" items={shownReviews} itemClass="w-[80%] sm:w-[45%] lg:w-[32%]"
        render={(r: any) => (
          <div className="h-full rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-7">
            <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={22} className={n <= r.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'} />)}</div>
            <p className="mt-4 text-[17px] leading-relaxed text-slate-800 line-clamp-4">"{r.content}"</p>
            <div className="mt-5 flex items-center gap-3">
              <span className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">{String(r.name || '?').trim().charAt(0).toUpperCase()}</span>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{r.name || 'Customer'}</p>
                <p className="text-sm text-slate-500">{timeAgo(r.created_at)} · <span className="text-emerald-600">Verified</span></p>
              </div>
            </div>
          </div>
        )} />
    </div>
  );
}
