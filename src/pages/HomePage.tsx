import React, { useEffect, useState, lazy, Suspense } from 'react';
import { HeroBanner } from '../components/home/HeroBanner';
import { Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { getCachedData, setCachedData } from '../lib/cache';
import { SEO } from '../components/SEO';
import toast from 'react-hot-toast';
import { useCart } from '../contexts/CartContext';
import { readPendingPayment, forgetPendingPayment, startOnlinePayment } from '../lib/checkoutOrder';
import { trackPurchase, saveCachedUserData } from '../lib/fbPixel';

const CategoryGrid = lazy(() => import('../components/home/CategoryGrid').then(m => ({ default: m.CategoryGrid })));
const ProductSection = lazy(() => import('../components/home/ProductSection').then(m => ({ default: m.ProductSection })));
const FeaturesSection = lazy(() => import('../components/home/FeaturesSection').then(m => ({ default: m.FeaturesSection })));
// Other home page designs (Admin → Customize → Home Page). Every other page stays the same.
const BoutiqueHome = lazy(() => import('../components/home/themes/BoutiqueHome'));
const BoldHome = lazy(() => import('../components/home/themes/BoldHome'));
export const HOME_DESIGNS = ['default', 'boutique', 'bold'] as const;


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
  const { removeFromCart, updateQuantity } = useCart();
  const [flashSaleProducts, setFlashSaleProducts] = useState<any[]>(() => {
    const cached = getCachedData('flash_sale_cache');
    return Array.isArray(cached) ? cached : [];
  });
  const [bestDealProducts, setBestDealProducts] = useState<any[]>(() => {
    const cached = getCachedData('best_deal_cache');
    return Array.isArray(cached) ? cached : [];
  });
  const [loadingProducts, setLoadingProducts] = useState(flashSaleProducts.length === 0 && bestDealProducts.length === 0);
  const design = (HOME_DESIGNS as readonly string[]).includes(settings?.active_theme || '') ? settings.active_theme! : 'default';
  const [latestProducts, setLatestProducts] = useState<any[]>(() => {
    const cached = getCachedData('latest_products_cache');
    return Array.isArray(cached) ? cached : [];
  });

  // The newer designs also show the latest products
  useEffect(() => {
    if (design === 'default') return;
    supabase.from('products').select('*').order('created_at', { ascending: false }).limit(8).then(({ data }) => {
      if (data) {
        setLatestProducts(data);
        setCachedData('latest_products_cache', data, 15);
      }
    });
  }, [design]);

  // Show payment outcome after gateway redirect (?payment=success|failed|cancelled)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('payment');
    if (!outcome) return;
    const id = params.get('order') || '';
    const reason = params.get('reason') || '';
    const pending = id ? readPendingPayment(id) : null;

    if (outcome === 'success' && id && pending) {
      void (async () => {
        try {
          const { data, error } = await supabase.rpc('checkout_order_status', { target_order: id, token: pending.token });
          if (error || !data || !['paid', 'partial'].includes(data.payment_status)) throw new Error('Payment not verified');
          const cart = JSON.parse(localStorage.getItem('shopping_cart') || '[]');
          for (const purchased of pending.items || []) {
            const item = cart.find((entry: any) => (entry.product.cartItemKey || entry.product.id) === purchased.key);
            if (!item) continue;
            if (item.quantity > purchased.quantity) updateQuantity(purchased.key, item.quantity - purchased.quantity);
            else removeFromCart(purchased.key);
          }
          if (pending.purchase) {
            saveCachedUserData(pending.purchase.customer);
            trackPurchase(pending.purchase.pixel, pending.purchase.customer);
          }
          forgetPendingPayment(id);
          toast.success('আপনার পেমেন্ট যাচাই হয়েছে! অর্ডার নিশ্চিত হয়েছে।');
        } catch { toast.error('পেমেন্ট নিশ্চিত করা যায়নি; অর্ডারের অবস্থা দেখুন।'); }
      })();
    } else if ((outcome === 'failed' || outcome === 'cancelled') && id && pending) {
      const title = outcome === 'cancelled' ? 'পেমেন্ট বাতিল করা হয়েছে।' : 'পেমেন্ট সম্পন্ন হয়নি।';
      toast((t) => (
        <div className="space-y-2 text-sm">
          <p className="font-semibold">{title}</p>
          {reason && <p className="opacity-70">{reason}</p>}
          <p>আপনার অর্ডার সংরক্ষিত আছে। আবার পেমেন্ট করতে পারেন।</p>
          <div className="flex gap-2">
            <button type="button" className="rounded-md bg-primary px-3 py-1.5 font-semibold text-white"
              onClick={() => { toast.dismiss(t.id); toast.loading('পেমেন্ট পেজ খোলা হচ্ছে…'); void startOnlinePayment({ id, checkout_token: pending.token }); }}>
              আবার পেমেন্ট করুন
            </button>
            <button type="button" className="rounded-md border px-3 py-1.5" onClick={() => toast.dismiss(t.id)}>পরে</button>
          </div>
        </div>
      ), { duration: 60000 });
    } else if (outcome === 'failed') toast.error(reason || 'পেমেন্ট ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    else if (outcome === 'cancelled') toast.error('পেমেন্ট বাতিল করা হয়েছে।');

    params.delete('payment');
    params.delete('order');
    params.delete('reason');
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
      {design !== 'default' ? (
        <Suspense fallback={<HomeSectionsFallback />}>
          {(() => {
            const Design = design === 'bold' ? BoldHome : BoutiqueHome;
            return (
              <Design
                products={{ latest: latestProducts, flash: flashSaleProducts, best: bestDealProducts, loading: loadingProducts && latestProducts.length === 0 }}
                hero={{
                  title: settings?.home_hero_title?.trim() || 'নতুন কালেকশন এসে গেছে',
                  text: settings?.home_hero_text?.trim() ?? 'সেরা মানের পণ্য, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।',
                  button: settings?.home_hero_button?.trim() || 'এখনই কিনুন',
                  image: settings?.home_hero_image?.trim() || '',
                }}
              />
            );
          })()}
        </Suspense>
      ) : (<>
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
      </>)}
    </main>
  );
}
