import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { buildCloudinaryUrl } from '../../lib/cloudinary';
import { getCachedData, setCachedData } from '../../lib/cache';
import { isBot } from '../../lib/isBot';

export const HeroBanner = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [banners, setBanners] = useState<any[]>(() => {
    const cached = getCachedData('home_banners_cache');
    return Array.isArray(cached) ? cached : [];
  });
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [loading, setLoading] = useState(banners.length === 0);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    // Keep a cached banner visible while fresh data arrives. Replacing it with
    // a skeleton during a fast refresh makes the page feel unnecessarily slow.
    if (banners.length === 0) setLoading(true);
    try {
      const { data } = await supabase.from('banners').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setBanners(data);
        setCachedData('home_banners_cache', data, 60);
      }
    } catch (e) {
      console.log('Could not fetch banners', e);
    } finally {
      setLoading(false);
    }
  };
  const totalSlides = banners.length;

  const nextSlide = () => {
    if (totalSlides === 0) return;
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    if (totalSlides === 0) return;
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  useEffect(() => {
    if (totalSlides <= 1 || isBot()) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);
    return () => clearInterval(timer);
  }, [totalSlides]);

  if (loading) {
    return (
      <div className="px-4 py-4 md:py-8 relative group max-w-7xl mx-auto">
        <div className="skeleton-shimmer relative rounded-3xl sm:rounded-[2rem] overflow-hidden aspect-[2.3/1] sm:aspect-[2.5/1] border border-slate-200/60 shadow-sm" />
      </div>
    );
  }

  if (banners.length === 0) return null;

  return (
    <div className="px-4 py-4 md:py-8 relative group max-w-7xl mx-auto">
      <div 
        className="relative rounded-3xl sm:rounded-[2rem] overflow-hidden aspect-[2.3/1] sm:aspect-[2.5/1] bg-slate-50 shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-slate-200/50"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        
        {/* Slides Container */}
        <div 
          className="absolute inset-0 flex transition-transform duration-500 ease-out" 
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {banners.map((banner, idx) => {
            const srcSet = [
              `${buildCloudinaryUrl(banner.image_url, 'w_480,f_auto,q_auto')} 480w`,
              `${buildCloudinaryUrl(banner.image_url, 'w_768,f_auto,q_auto')} 768w`,
              `${buildCloudinaryUrl(banner.image_url, 'w_1024,f_auto,q_auto')} 1024w`,
              `${buildCloudinaryUrl(banner.image_url, 'w_1400,f_auto,q_auto')} 1400w`
            ].join(', ');
            return (
              <div key={banner.id || idx} className="w-full flex-shrink-0 relative overflow-hidden flex items-center justify-center bg-gray-100">
                {banner.link_url ? (
                  <a href={banner.link_url} className="absolute inset-0">
                    <img
                      src={buildCloudinaryUrl(banner.image_url, 'w_1024,f_auto,q_auto')}
                      srcSet={srcSet}
                      alt={banner.title || "Hero Banner"}
                      className="w-full h-full object-contain sm:object-cover"
                      width={1200}
                      height={480}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      fetchPriority={idx === 0 ? 'high' : 'auto'}
                      decoding="async"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
                    />
                  </a>
                ) : (
                  <img
                    src={buildCloudinaryUrl(banner.image_url, 'w_1024,f_auto,q_auto')}
                    srcSet={srcSet}
                    alt={banner.title || "Hero Banner"}
                    className="w-full h-full object-contain sm:object-cover"
                    width={1200}
                    height={480}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    fetchPriority={idx === 0 ? 'high' : 'auto'}
                    decoding="async"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination Dots */}
        {totalSlides > 1 && (
          <>
            <div className="absolute bottom-3 left-4 sm:left-6 flex gap-1.5 sm:gap-2 z-20">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all ${
                    activeIndex === idx ? 'bg-primary w-4 sm:w-6' : 'bg-white shadow-[0_0_2px_rgba(0,0,0,0.5)]'
                  }`}
                />
              ))}
            </div>

            {/* Desktop Navigation Arrows */}
            <button
              onClick={(e) => { e.preventDefault(); prevSlide(); }}
              aria-label="Previous banner slide"
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 items-center justify-center bg-white/80 hover:bg-white text-gray-800 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-105"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); nextSlide(); }}
              aria-label="Next banner slide"
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 items-center justify-center bg-white/80 hover:bg-white text-gray-800 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-105"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
