// "Bold" home design: dark hero over a photo, category chips, scrolling offer row, dark trust strip.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, HelpCircle } from 'lucide-react';
import { buildCloudinaryUrl } from '../../../lib/cloudinary';
import { HeroBanner } from '../HeroBanner';
import { useBanners, useFeaturedCategories, useStoreFeatures, categoryPath } from '../useHomeData';
import { featureIcons, HomeProducts, HeroText, ProductGrid, ProductRow, SectionHeader } from './shared';

export default function BoldHome({ products, hero }: { products: HomeProducts; hero: HeroText }) {
  const { rows: banners } = useBanners();
  const { rows: categories } = useFeaturedCategories();
  const { rows: features } = useStoreFeatures();
  const heroImage = hero.image || products.latest[0]?.image || banners[0]?.image_url || '';
  const offers = products.flash.length ? products.flash : products.best;

  return (
    <div className="pb-6">
      {/* Hero */}
      <section className="px-4 pt-4 sm:pt-8">
        <div className="relative overflow-hidden rounded-[28px] bg-slate-950 min-h-[260px] sm:min-h-[380px] flex items-end">
          {heroImage && (
            <img src={buildCloudinaryUrl(heroImage, 'w_1200,f_auto,q_auto')} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-70" fetchPriority="high" />
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div aria-hidden className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-primary/40 blur-3xl" />
          <div className="relative p-5 sm:p-10 md:p-14 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">
              <Flame size={13} /> Trending
            </span>
            <h1 className="mt-3 text-[28px] leading-[1.1] sm:text-5xl md:text-6xl font-black text-white tracking-tight">{hero.title}</h1>
            {hero.text && <p className="mt-2 sm:mt-4 text-[13px] sm:text-lg text-white/80 leading-snug line-clamp-3">{hero.text}</p>}
            <Link to="/shop" className="mt-4 sm:mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 sm:px-7 sm:py-3.5 text-sm sm:text-base font-bold text-slate-900 hover:gap-3 transition-all">
              {hero.button} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Category chips */}
      {categories.length > 0 && (
        <section className="mt-5 sm:mt-8">
          <div className="flex gap-2.5 overflow-x-auto hide-scrollbar px-4 pb-1">
            {categories.map((c) => (
              <Link key={c.id} to={categoryPath(c.name)} className="shrink-0 flex items-center gap-2 rounded-full bg-white border border-slate-200 pl-1.5 pr-4 py-1.5 shadow-sm hover:border-primary hover:text-primary transition-colors">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-sm font-black text-primary">
                  {c.image_url ? <img src={buildCloudinaryUrl(c.image_url, 'w_80,h_80,c_fill,f_auto,q_auto')} alt="" className="w-full h-full object-cover" loading="lazy" /> : String(c.name).charAt(0)}
                </span>
                <span className="text-[13px] sm:text-sm font-bold text-slate-800 whitespace-nowrap">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Offer row */}
      {(products.loading || offers.length > 0) && (
        <section className="px-4 mt-7 sm:mt-10">
          <SectionHeader title="🔥 Hot Offers" subtitle="এখনই সবচেয়ে বেশি বিক্রি হচ্ছে" />
          <ProductRow products={offers} loading={products.loading} />
        </section>
      )}

      {/* Store banners */}
      {banners.length > 0 && <div className="mt-2"><HeroBanner /></div>}

      {/* Trust strip */}
      {features.length > 0 && (
        <section className="px-4 mt-4">
          <div className="rounded-[24px] bg-slate-950 text-white p-4 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.slice(0, 4).map((f, i) => {
              const Icon = featureIcons[f.icon] || HelpCircle;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="shrink-0 w-10 h-10 rounded-xl bg-primary flex items-center justify-center"><Icon size={20} /></span>
                  <div className="min-w-0">
                    <p className="font-bold text-[13px] sm:text-sm leading-tight">{f.title}</p>
                    <p className="text-[11.5px] sm:text-xs text-white/60 leading-snug">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Grids */}
      <section className="px-4 mt-8 sm:mt-12">
        <SectionHeader title="New Arrivals" />
        <ProductGrid products={products.latest} loading={products.loading} max={8} />
      </section>
      {products.flash.length > 0 && products.best.length > 0 && (
        <section className="px-4 mt-8 sm:mt-12">
          <SectionHeader title="Best Deals" />
          <ProductGrid products={products.best} loading={false} />
        </section>
      )}
    </div>
  );
}
