// "Boutique" home design: soft split hero, trust cards, photo category tiles, product grids.
import React from 'react';
import { Link } from 'react-router-dom';
import { buildCloudinaryUrl } from '../../../lib/cloudinary';
import { useBanners, useFeaturedCategories, useStoreFeatures, categoryPath } from '../useHomeData';
import { featureIcons, HomeProducts, HeroText, ProductGrid, SectionHeader } from './shared';
import { HelpCircle } from 'lucide-react';

export default function BoutiqueHome({ products, hero }: { products: HomeProducts; hero: HeroText }) {
  const { rows: banners } = useBanners();
  const { rows: categories, loading: catLoading } = useFeaturedCategories();
  const { rows: features } = useStoreFeatures();
  const heroImage = hero.image || banners[0]?.image_url || products.latest[0]?.image || '';

  return (
    <div className="pb-6">
      {/* Hero */}
      <section className="px-4 pt-4 sm:pt-8">
        <div className="relative overflow-hidden rounded-[28px] bg-primary/[0.06] border border-primary/10">
          <div aria-hidden className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-primary/15" />
          <div aria-hidden className="absolute right-1/3 -bottom-12 w-44 h-44 rounded-full bg-secondary/15" />
          <div aria-hidden className="absolute left-1/2 top-0 w-16 h-10 bg-primary/10 [clip-path:polygon(0_0,100%_0,50%_100%)]" />
          <div className="relative grid grid-cols-[1.15fr_1fr] items-center gap-3 sm:gap-8 p-5 sm:p-10 md:p-14">
            <div className="min-w-0">
              <h1 className="font-serif text-[22px] leading-[1.15] sm:text-4xl md:text-5xl font-bold text-slate-900">{hero.title}</h1>
              {hero.text && <p className="mt-2 sm:mt-4 text-[11.5px] sm:text-base md:text-lg text-slate-600 leading-snug sm:leading-relaxed line-clamp-4">{hero.text}</p>}
              <Link to="/shop" className="mt-3 sm:mt-6 inline-flex items-center rounded-full bg-primary px-4 py-2 sm:px-7 sm:py-3 text-[11.5px] sm:text-base font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover transition-colors">
                {hero.button}
              </Link>
            </div>
            <div className="relative aspect-[4/5] w-full">
              <div className="absolute inset-0 rounded-t-[999px] rounded-b-[36px] overflow-hidden bg-white shadow-xl shadow-primary/10 ring-4 ring-white">
                {heroImage ? (
                  <img src={buildCloudinaryUrl(heroImage, 'w_700,f_auto,q_auto')} alt={hero.title} className="w-full h-full object-cover" fetchPriority="high" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                )}
              </div>
              <div aria-hidden className="absolute -left-3 bottom-6 w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust cards */}
      {features.length > 0 && (
        <section className="px-4 mt-5 sm:mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {features.slice(0, 4).map((f, i) => {
            const Icon = featureIcons[f.icon] || HelpCircle;
            return (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-100 p-3.5 sm:p-5">
                <Icon className="shrink-0 text-primary w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.8} />
                <div className="min-w-0">
                  <p className="font-bold text-[13px] sm:text-base text-slate-900 leading-tight">{f.title}</p>
                  <p className="text-[11.5px] sm:text-sm text-slate-500 leading-snug">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Categories */}
      {(catLoading || categories.length > 0) && (
        <section className="px-4 mt-8 sm:mt-12">
          <SectionHeader title="Categories" />
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
            {(catLoading && categories.length === 0 ? Array.from({ length: 6 }) : categories.slice(0, 6)).map((c: any, i) => (
              c ? (
                <Link key={c.id} to={categoryPath(c.name)} className="group">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100">
                    {c.image_url ? (
                      <img src={buildCloudinaryUrl(c.image_url, 'w_360,h_360,c_fill,f_auto,q_auto')} alt={c.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-black text-primary/60 bg-primary/10">{String(c.name).charAt(0)}</div>
                    )}
                  </div>
                  <p className="mt-2 text-center text-[13px] sm:text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                </Link>
              ) : <div key={i} className="aspect-square rounded-2xl skeleton-shimmer" />
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      <section className="px-4 mt-8 sm:mt-12">
        <SectionHeader title="New Arrivals" subtitle="সর্বশেষ যোগ হওয়া পণ্য" />
        <ProductGrid products={products.latest} loading={products.loading} max={8} />
      </section>
      {products.flash.length > 0 && (
        <section className="px-4 mt-8 sm:mt-12">
          <SectionHeader title="Special Offers" subtitle="সীমিত সময়ের অফার" />
          <ProductGrid products={products.flash} loading={false} />
        </section>
      )}
      {products.best.length > 0 && (
        <section className="px-4 mt-8 sm:mt-12">
          <SectionHeader title="Best Deals" />
          <ProductGrid products={products.best} loading={false} />
        </section>
      )}
    </div>
  );
}
