import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Menu } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import toast from 'react-hot-toast';

export default function AdminLayout() {
  const { profile, loading, signOut } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });

  const navRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        navigate('/signin');
      } else if (profile.role !== 'admin' && profile.role !== 'manager' && profile.role !== 'demo') {
        toast.error('Access denied. Administrator privileges required.');
        navigate('/');
      }
    }
  }, [profile, loading, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/signin');
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

        {/* Mobile Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 lg:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
          >
            <Menu className="h-6 w-6" strokeWidth={2} />
          </button>
          {/* Title removed per user request for cleaner look */}
        </header>

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
