import React, { useEffect, useState, lazy, Suspense } from 'react';
import { HeroBanner } from '../components/home/HeroBanner';
import { Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { getCachedData, setCachedData } from '../lib/cache';
import { SEO } from '../components/SEO';
import toast from 'react-hot-toast';

const CategoryGrid = lazy(() => import('../components/home/CategoryGrid').then(m => ({ default: m.CategoryGrid })));
const ProductSection = lazy(() => import('../components/home/ProductSection').then(m => ({ default: m.ProductSection })));
const FeaturesSection = lazy(() => import('../components/home/FeaturesSection').then(m => ({ default: m.FeaturesSection })));


const HomeSectionsFallback = () => (
  <div className="min-h-[1200px] space-y-8 px-4 py-2" aria-hidden="true">
    {/* Category Grid skeleton */}
    <div className="py-2">
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 skeleton-shimmer" />
            <div className="w-12 h-2.5 rounded bg-slate-100 skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
    {/* Flash Sale Product Grid skeleton */}
    <div className="space-y-4">
      <div className="h-7 w-40 rounded-xl bg-slate-100 skeleton-shimmer" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl bg-slate-100 skeleton-shimmer" />
        ))}
      </div>
    </div>
    {/* Best Deals skeleton */}
    <div className="space-y-4 pt-4">
      <div className="h-7 w-36 rounded-xl bg-slate-100 skeleton-shimmer" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl bg-slate-100 skeleton-shimmer" />
        ))}
      </div>
    </div>
  </div>
);

export default function HomePage() {
  const { settings } = useSettings();
  const [flashSaleProducts, setFlashSaleProducts] = useState<any[]>(() => {
    const cached = getCachedData('flash_sale_cache');
    return Array.isArray(cached) ? cached : [];
  });
  const [bestDealProducts, setBestDealProducts] = useState<any[]>(() => {
    const cached = getCachedData('best_deal_cache');
    return Array.isArray(cached) ? cached : [];
  });
  const [loadingProducts, setLoadingProducts] = useState(flashSaleProducts.length === 0 && bestDealProducts.length === 0);

  // Show payment outcome after gateway redirect (?payment=success|failed|cancelled)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('payment');
    if (!outcome) return;
    if (outcome === 'success') toast.success('আপনার পেমেন্ট সফল হয়েছে! অর্ডারটি নিশ্চিত করা হয়েছে।');
    else if (outcome === 'failed') toast.error('পেমেন্ট ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    else if (outcome === 'cancelled') toast.error('পেমেন্ট বাতিল করা হয়েছে।');
    params.delete('payment');
    params.delete('order');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      const [flashResult, bestResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('is_flash_sale', true)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('products')
          .select('*')
          .eq('is_best_deal', true)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const { data: flashData, error: flashError } = flashResult;
      const { data: bestData } = bestResult;
      
      // If error (e.g. column doesn't exist yet), we fallback to getting first N products
      if (flashError && flashError.code === '42703') {
        const { data } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(8);
        if (data) {
          setFlashSaleProducts(data.slice(0, 4));
          setBestDealProducts(data.slice(4, 8));
          setCachedData('flash_sale_cache', data.slice(0, 4), 15);
          setCachedData('best_deal_cache', data.slice(4, 8), 15);
        }
        setLoadingProducts(false);
        return;
      }

      if (flashData) {
        setFlashSaleProducts(flashData);
        setCachedData('flash_sale_cache', flashData, 15);
      }
      
      if (bestData) {
        setBestDealProducts(bestData);
        setCachedData('best_deal_cache', bestData, 15);
      }
      setLoadingProducts(false);
    };
    fetchProducts();
  }, []);

  const placeholderProducts = Array.from({ length: 10 }).map((_, idx) => ({
    id: `placeholder-${idx}`,
    title: 'Loading...',
    image: '',
    price: 0,
    discount: 0,
  }));

  return (
    <main className="max-w-7xl mx-auto pb-4">
      <h1 className="sr-only">Home - {settings?.siteName || 'Online Shop'}</h1>
      <SEO 
        title="Home"
        exactTitle={false}
        ogTitle={settings?.ogTitle}
        ogDescription={settings?.ogDescription}
      />
      <HeroBanner />
      <Suspense fallback={<HomeSectionsFallback />}>
        <CategoryGrid />
        
        <ProductSection 
          badge={<><Zap size={16} fill="currentColor" /> Flash Sale</>}
          products={flashSaleProducts.length > 0 ? flashSaleProducts : (loadingProducts ? placeholderProducts : [])}
          isLoading={loadingProducts && flashSaleProducts.length === 0}
        />
        
        <FeaturesSection />

        <ProductSection 
          title="Best Deals"
          products={bestDealProducts.length > 0 ? bestDealProducts : (loadingProducts ? placeholderProducts : [])}
          isLoading={loadingProducts && bestDealProducts.length === 0}
        />
      </Suspense>
    </main>
  );
}
