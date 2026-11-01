import React, { useState, Suspense, lazy } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { AnnouncementBar } from './AnnouncementBar';
import { BottomNav } from './BottomNav';
import { PageLoader } from '../ui/PageLoader';
import { useSettings } from '../../contexts/SettingsContext';

const Footer = lazy(() => import('./Footer').then((m) => ({ default: m.Footer })));
const FloatingWhatsApp = lazy(() => import('./FloatingWhatsApp').then((m) => ({ default: m.FloatingWhatsApp })));
const SidebarMenu = lazy(() => import('./SidebarMenu').then((m) => ({ default: m.SidebarMenu })));
const SearchOverlay = lazy(() => import('./SearchOverlay').then((m) => ({ default: m.SearchOverlay })));
const CartDrawer = lazy(() => import('./CartDrawer').then((m) => ({ default: m.CartDrawer })));

export function FrontendLayoutDefault() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { settings } = useSettings();
  const location = useLocation();

  return (
    <div 
      className="min-h-screen w-full bg-slate-50/80 font-sans pb-16 md:pb-0 transition-colors duration-300 global-layout-wrapper"
      style={settings?.theme_bg_tone ? { backgroundColor: settings.theme_bg_tone } : undefined}
    >
      <Suspense fallback={null}>
        {isSidebarOpen && <SidebarMenu isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />}
        {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
        <CartDrawer />
      </Suspense>
      <div className="global-announcement"><AnnouncementBar /></div>
      <div className="global-header"><Header onMenuClick={() => setIsSidebarOpen(true)} /></div>
      
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>

      <Suspense fallback={null}>
        <div className="global-footer"><Footer /></div>
        <div className="global-whatsapp"><FloatingWhatsApp /></div>
      </Suspense>
      <div className="global-bottom-nav">
        <BottomNav 
          onMenuClick={() => setIsSidebarOpen(true)} 
          onSearchClick={() => setIsSearchOpen(true)} 
        />
      </div>
    </div>
  );
}
