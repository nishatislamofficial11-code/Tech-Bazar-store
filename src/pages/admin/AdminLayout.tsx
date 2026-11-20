import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Menu, ExternalLink } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import toast from 'react-hot-toast';
import SubscriptionBanner, { useMyStore } from '../../components/admin/SubscriptionBanner';

function storefrontLink(search: string, storedSlug: string | null): string {
  const slug = new URLSearchParams(search).get('store') || storedSlug;
  return slug ? `/?${new URLSearchParams({ store: slug }).toString()}` : '/';
}

export default function AdminLayout() {
  const { profile, loading, signOut } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const myStore = useMyStore();
  const websiteLink = storefrontLink(location.search, localStorage.getItem('current_store_slug'));
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });

  const navRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        navigate('/merchant/login');
      } else if (profile.role !== 'admin' && profile.role !== 'manager' && profile.role !== 'demo') {
        toast.error('Access denied. Administrator privileges required.');
        navigate('/');
      }
    }
  }, [profile, loading, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/merchant/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleToggleCollapse = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem('admin_sidebar_collapsed', String(newVal));
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
      </div>
    );
  }

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager' && profile.role !== 'demo')) return null;

  return (
    <div className="flex h-screen w-full bg-white font-sans text-slate-900 selection:bg-slate-100 overflow-hidden">
      
      {/* ── Mobile Sidebar Overlay ── */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 transition-opacity lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar ── */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AdminSidebar
          settings={settings}
          profile={profile}
          currentPath={location.pathname}
          onSignOut={handleSignOut}
          isCollapsed={false}
          onToggleCollapse={() => {}}
          isMobile={true}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden h-full shrink-0 z-20 lg:block">
        <AdminSidebar
          settings={settings}
          profile={profile}
          currentPath={location.pathname}
          onSignOut={handleSignOut}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          navRef={navRef}
        />
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-white">

        {/* Admin Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 lg:justify-end">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0 lg:hidden"
          >
            <Menu className="h-6 w-6" strokeWidth={2} />
          </button>
          <a
            href={websiteLink}
            target="_blank"
            rel="noopener noreferrer"
            title="Open your store website"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-primary px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Visit Website
          </a>
        </header>

        <SubscriptionBanner store={myStore} />

        {/* Main Scrollable Content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto bg-white custom-scrollbar"
        >
          <div className="mx-auto max-w-7xl h-full p-4 lg:p-8">
            <Outlet context={{ isSidebarCollapsed: isCollapsed }} />
          </div>
        </main>

      </div>
    </div>
  );
}
