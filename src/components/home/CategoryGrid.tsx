import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import { buildCloudinaryUrl } from '../../lib/cloudinary';
import { getCachedData, setCachedData } from '../../lib/cache';
import { isBot } from '../../lib/isBot';

const generateSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

export const CategoryGrid = () => {
  const [categories, setCategories] = useState<any[]>(() => {
    const cached = getCachedData('categories_cache');
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading] = useState(!getCachedData('categories_cache'));
  const navigate = useNavigate();
  const { settings } = useSettings();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const isSlider = settings?.theme_category_style === 'slider';

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isSlider && !loading && !isBot()) {
      intervalId = setInterval(() => {
        if (scrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
          // If reached the end, smoothly go back to start
          if (scrollLeft + clientWidth >= scrollWidth - 10) {
            scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            // Scroll right by approximately two items
            scrollRef.current.scrollBy({ left: 240, behavior: 'smooth' });
          }
        }
      }, 3000);
    }
    
    return () => clearInterval(intervalId);
  }, [isSlider, loading]);

  useEffect(() => {
    const fetchCategories = async () => {
      const cached = getCachedData('categories_cache');
      if (cached && categories.length > 0) {
        setLoading(false);
        return;
      }
      
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (data) {
        setCategories(data);
        setCachedData('categories_cache', data, 5); // 5 mins ttl
      }
      setLoading(false);
    };
    fetchCategories();
  }, []);

  const placeholderItems = Array.from({ length: 10 });
  const baseCategories = loading ? placeholderItems : categories;
  // Duplicate categories for slider to ensure enough items to scroll on desktop
  const visibleCategories = isSlider ? [...baseCategories, ...baseCategories] : baseCategories;

  return (
    <div className="px-4 mb-8">
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 mt-2 group">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center transition-all duration-500 group-hover:bg-primary group-hover:text-white shadow-inner group-hover:scale-105 group-hover:rotate-3 group-hover:shadow-primary/30">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-7 sm:h-7 transition-transform duration-500 group-hover:scale-110"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
        </div>
        <div>
          <h2 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-none mb-1.5 sm:mb-2">
            Shop by Category
          </h2>
          <div className="flex gap-1">
            <div className="w-8 sm:w-12 h-1.5 bg-primary rounded-full"></div>
            <div className="w-2 h-1.5 bg-primary/30 rounded-full"></div>
            <div className="w-1 h-1.5 bg-primary/20 rounded-full"></div>
          </div>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className={
          isSlider 
            ? "flex overflow-x-auto gap-3 sm:gap-6 pb-4 -mx-4 px-4 snap-x hide-scrollbar scroll-smooth" 
            : "grid grid-cols-5 lg:grid-cols-10 gap-x-1.5 sm:gap-x-2 gap-y-4"
        }
      >
        {visibleCategories.map((category: any, idx) => {
          const isLoading = loading;
          const displayName = isLoading ? '' : category.name;
          return (
            <div 
              key={`${category?.id || 'ph'}-${idx}`} 
              onClick={() => !isLoading && navigate(`/category/${generateSlug(category.name)}`)}
              onKeyDown={(e) => {
                if (!isLoading && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  navigate(`/category/${generateSlug(category.name)}`);
                }
              }}
              role={isLoading ? undefined : "button"}
              tabIndex={isLoading ? -1 : 0}
              aria-label={isLoading ? 'Loading category' : `Browse ${category.name} category`}
              className={`flex flex-col items-center gap-2 sm:gap-3 group ${isLoading ? '' : 'cursor-pointer'} ${isSlider ? 'shrink-0 w-[72px] sm:w-[100px] md:w-[120px] snap-start' : ''}`}
            >
              <div className={`
                ${isSlider 
                  ? 'w-[64px] h-[64px] sm:w-[86px] sm:h-[86px] md:w-[96px] md:h-[96px]' 
                  : 'w-[54px] h-[54px] sm:w-[76px] sm:h-[76px]'} 
                bg-white rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-100 flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] group-hover:border-primary/30 group-hover:-translate-y-1 overflow-hidden relative ${isLoading ? 'skeleton-shimmer' : ''} ${!category?.image_url ? 'p-3 sm:p-4' : 'p-1.5 sm:p-2'}
              `}>
                <div className="w-full h-full rounded-full overflow-hidden bg-slate-50/50 flex items-center justify-center">
                  {isLoading ? (
                    <div className="w-full h-full bg-slate-100 rounded-full" />
                  ) : category.image_url ? (
                    <img
                      src={buildCloudinaryUrl(category.image_url, 'w_140,h_140,c_fill,f_auto,q_auto')}
                      alt={category.name}
                      className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                      width={70}
                      height={70}
                    />
                  ) : (
                    <span className="text-slate-500 text-lg sm:text-2xl font-black uppercase leading-none">
                      {String(category.name || '?').charAt(0)}
                    </span>
                  )}
                </div>
              </div>
              <span className={`
                ${isSlider ? 'text-[11px] sm:text-[13px]' : 'text-[10.5px] sm:text-xs'} 
                font-bold text-center leading-tight min-h-[24px] transition-colors group-hover:text-primary
                ${isLoading ? 'skeleton-shimmer w-16 sm:w-20 rounded-md' : 'text-slate-700'}
              `}>
                {displayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

