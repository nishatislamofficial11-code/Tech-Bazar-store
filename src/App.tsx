/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { Footer } from './components/layout/Footer';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { PageLoader } from './components/ui/PageLoader';
import { AppErrorBoundary } from './components/ui/AppErrorBoundary';
import { FloatingWhatsApp } from './components/layout/FloatingWhatsApp';

// Lazy loading pages for performance
const HomePage = lazy(() => import('./pages/HomePage'));
const LandingPageViewer = lazy(() => import('./pages/LandingPageViewer'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Checkout = lazy(() => import('./pages/Checkout'));
const SignIn = lazy(() => import('./pages/SignIn'));
const SignUp = lazy(() => import('./pages/SignUp'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminProductEditor = lazy(() => import('./pages/admin/ProductEditor'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminIncompleteOrders = lazy(() => import('./pages/admin/IncompleteOrders'));
const AdminReviews = lazy(() => import('./pages/admin/Reviews'));
const AdminBanners = lazy(() => import('./pages/admin/Banners'));
const AdminPages = lazy(() => import('./pages/admin/Pages'));
const AdminFeatures = lazy(() => import('./pages/admin/Features'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminLandingPages = lazy(() => import('./pages/admin/LandingPages'));
const AdminLandingPageBuilder = lazy(() => import('./pages/admin/LandingPageBuilder'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminSEO = lazy(() => import('./pages/admin/SEO'));
const AdminCustomize = lazy(() => import('./pages/admin/Customize'));
const AdminFacebookPixel = lazy(() => import('./pages/admin/FacebookPixel'));
const AdminCouriers = lazy(() => import('./pages/admin/Couriers'));
const AdminFraudCheck = lazy(() => import('./pages/admin/FraudCheck'));
const AdminBlacklist = lazy(() => import('./pages/admin/Blacklist'));
const AdminBulkProduct = lazy(() => import('./pages/admin/BulkProductUpload'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const VisitorAnalytics = lazy(() => import('./pages/admin/VisitorAnalytics'));
const SitePageViewer = lazy(() => import('./pages/SitePageViewer'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const Shop = lazy(() => import('./pages/Shop'));
const CatalogFeed = lazy(() => import('./pages/CatalogFeed'));
const NotFound = lazy(() => import('./pages/NotFound'));
const SidebarMenu = lazy(() => import('./components/layout/SidebarMenu').then((m) => ({ default: m.SidebarMenu })));
const SearchOverlay = lazy(() => import('./components/layout/SearchOverlay').then((m) => ({ default: m.SearchOverlay })));
const CartDrawer = lazy(() => import('./components/layout/CartDrawer').then((m) => ({ default: m.CartDrawer })));
import { FacebookPixelTracker } from './components/layout/FacebookPixelTracker';
import { PageTracker } from './components/layout/PageTracker';
import { GlobalIpGuard } from './components/GlobalIpGuard';

function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function UTMTracker() {
  const { search } = useLocation();

  React.useEffect(() => {
    const params = new URLSearchParams(search);
    let utmSource = params.get('utm_source');
    
    // Auto-detect from click IDs if utm_source is missing
    if (!utmSource) {
      if (params.has('ttclid')) {
        utmSource = 'tiktok';
      } else if (params.has('fbclid')) {
        utmSource = 'facebook';
      } else if (params.has('gclid')) {
        utmSource = 'google';
      }
    }
    
    // Fallback to referrer if no click ID is present
    if (!utmSource && document.referrer) {
      const referrer = document.referrer.toLowerCase();
      if (referrer.includes('tiktok.com') || referrer.includes('zhiliaoapp')) {
        utmSource = 'tiktok';
      } else if (referrer.includes('facebook.com') || referrer.includes('fb.me') || referrer.includes('instagram.com')) {
        utmSource = 'facebook'; // Assuming FB/Insta both map to facebook ads usually, or we can keep it facebook
      } else if (referrer.includes('google.')) {
        utmSource = 'google';
      }
    }
    
    if (utmSource) {
      localStorage.setItem('order_source', utmSource.toLowerCase());
    }
  }, [search]);

  return null;
}

function ThemeInjector() {
  const { settings } = useSettings();
  
  React.useEffect(() => {
    const primary = settings?.theme_primary_color || '#0066ff';
    const secondary = settings?.theme_secondary_color || '#10b981';
    const hover = `color-mix(in srgb, ${primary} 85%, black)`;
    const radius = settings?.theme_radius || '16px';
    const font = settings?.theme_font_family || 'Manrope';
    
    document.documentElement.style.setProperty('--color-primary', primary);
    document.documentElement.style.setProperty('--color-primary-hover', hover);
    document.documentElement.style.setProperty('--color-secondary', secondary);
    document.documentElement.style.setProperty('--theme-radius', radius);

    if (font) {
      document.documentElement.style.setProperty('--font-sans', `'${font}', 'Inter', 'Noto Sans Bengali', sans-serif`);
      document.body.style.fontFamily = `'${font}', 'Inter', 'Noto Sans Bengali', sans-serif`;
    }
  }, [settings?.theme_primary_color, settings?.theme_secondary_color, settings?.theme_radius, settings?.theme_font_family]);

  return null;
}

import { FrontendLayout } from './components/layout/FrontendLayout';

export default function App() {
  return (
    <HelmetProvider>
      <SettingsProvider>
        <ThemeInjector />
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <ScrollToTop />
              <PageTracker />
              <UTMTracker />
              <FacebookPixelTracker />
              <Toaster 
                position="top-right" 
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#ffffff',
                    color: '#0f172a',
                    padding: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    fontWeight: '500',
                    maxWidth: '400px',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#ffffff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#ffffff',
                    },
                  },
                }}
                containerStyle={{ 
                  top: 24,
                  right: 24,
                  zIndex: 999999 
                }} 
              />
              <GlobalIpGuard>
                <AppErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<FrontendLayout />}>
                        <Route index element={<HomePage />} />
                        <Route path="product/:id" element={<ProductDetails />} />
                        <Route path="checkout" element={<Checkout />} />
                        <Route path="track-order" element={<TrackOrder />} />
                        <Route path="shop" element={<Shop />} />
                        <Route path="category/:categorySlug" element={<Shop />} />
                        <Route path="shop/category/:categorySlug" element={<Shop />} />
                        <Route path="pages/:slug" element={<SitePageViewer />} />
                      </Route>
                      
                      {/* Standalone Route for Landing Pages (No Global Header/Footer) */}
                      <Route path="l/:slug" element={<LandingPageViewer />} />
                      
                      <Route path="/signin" element={<SignIn />} />
                      <Route path="/signup" element={<SignUp />} />
                      <Route path="/profile" element={<UserProfile />} />

                      <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="visitor-analytics" element={<VisitorAnalytics />} />
                        <Route path="couriers" element={<AdminCouriers />} />
                        <Route path="fraud-check" element={<AdminFraudCheck />} />
                        <Route path="blacklist" element={<AdminBlacklist />} />
                        <Route path="pixel" element={<AdminFacebookPixel />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="customers" element={<AdminCustomers />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="products/new" element={<AdminProductEditor />} />
                        <Route path="products/bulk" element={<AdminBulkProduct />} />
                        <Route path="products/edit/:id" element={<AdminProductEditor />} />
                        <Route path="categories" element={<AdminCategories />} />
                        <Route path="orders" element={<AdminOrders />} />
                        <Route path="incomplete-orders" element={<AdminIncompleteOrders />} />
                        <Route path="reviews" element={<AdminReviews />} />
                        <Route path="banners" element={<AdminBanners />} />
                        <Route path="pages" element={<AdminPages />} />
                        <Route path="features" element={<AdminFeatures />} />
                        <Route path="settings" element={<AdminSettings />} />
                        <Route path="landing-pages" element={<AdminLandingPages />} />
                        <Route path="landing-pages/builder/:id?" element={<AdminLandingPageBuilder />} />
                        <Route path="customize" element={<AdminCustomize />} />
                        <Route path="seo" element={<AdminSEO />} />
                      </Route>

                      {/* Public Feed Routes */}
                      <Route path="/feed/catalog.xml" element={<CatalogFeed />} />
                      <Route path="/catalog.xml" element={<CatalogFeed />} />

                      {/* Catch-all Not Found Route */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </AppErrorBoundary>
              </GlobalIpGuard>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </SettingsProvider>
    </HelmetProvider>
  );
}
