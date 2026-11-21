import React, { useState, Suspense, lazy } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { AnnouncementBar } from './AnnouncementBar';
import { BottomNav } from './BottomNav';
import { PageLoader } from '../ui/PageLoader';
import { useSettings } from '../../contexts/SettingsContext';
import { useStoreTheme, previewThemeId, endThemePreview, STORE_THEMES } from '../../lib/storeTheme';
import { FashionHeader } from './fashion/FashionHeader';
import { FashionBottomNav } from './fashion/FashionBottomNav';

const FashionFooter = lazy(() => import('./fashion/FashionFooter').then((m) => ({ default: m.FashionFooter })));

const Footer = lazy(() => import('./Footer').then((m) => ({ default: m.Footer })));
const FloatingWhatsApp = lazy(() => import('./FloatingWhatsApp').then((m) => ({ default: m.FloatingWhatsApp })));
const SidebarMenu = lazy(() => import('./SidebarMenu').then((m) => ({ default: m.SidebarMenu })));
const SearchOverlay = lazy(() => import('./SearchOverlay').then((m) => ({ default: m.SearchOverlay })));
const CartDrawer = lazy(() => import('./CartDrawer').then((m) => ({ default: m.CartDrawer })));

export function FrontendLayoutDefault() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'menu' | 'categories'>('menu');
  const theme = useStoreTheme();
  const fashion = theme === 'fashion';
  const openMenu = (tab: 'menu' | 'categories' = 'menu') => { setSidebarTab(tab); setIsSidebarOpen(true); };
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { settings } = useSettings();
  const location = useLocation();

  return (
    <div 
      className="min-h-screen w-full bg-slate-50/80 font-sans pb-16 md:pb-0 transition-colors duration-300 global-layout-wrapper"
      style={settings?.theme_bg_tone ? { backgroundColor: settings.theme_bg_tone } : undefined}
    >
      <Suspense fallback={null}>
        {isSidebarOpen && <SidebarMenu key={sidebarTab} initialTab={sidebarTab} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />}
        {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
        <CartDrawer />
      </Suspense>
      {previewThemeId() && (
        <div className="sticky top-0 z-[60] flex items-center justify-center gap-3 bg-slate-900 px-3 py-2 text-xs sm:text-sm text-white">
          <span>প্রিভিউ: {STORE_THEMES.find((t) => t.id === theme)?.name} থিম (শুধু আপনি দেখছেন)</span>
          <button className="rounded-full bg-white/15 px-3 py-1 font-bold" onClick={() => { endThemePreview(); window.location.href = '/'; }}>বন্ধ করুন</button>
        </div>
      )}
      <div className="global-announcement"><AnnouncementBar /></div>
      <div className="global-header">
        {fashion
          ? <FashionHeader onMenuClick={() => openMenu()} onSearchClick={() => setIsSearchOpen(true)} />
          : <Header onMenuClick={() => openMenu()} />}
      </div>
      
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>

      <Suspense fallback={null}>
        <div className="global-footer">{fashion ? <FashionFooter /> : <Footer />}</div>
        <div className="global-whatsapp"><FloatingWhatsApp /></div>
      </Suspense>
      <div className="global-bottom-nav">
        {fashion
          ? <FashionBottomNav onCategoriesClick={() => openMenu('categories')} />
          : <BottomNav onMenuClick={() => openMenu()} onSearchClick={() => setIsSearchOpen(true)} />}
      </div>
    </div>
  );
}
