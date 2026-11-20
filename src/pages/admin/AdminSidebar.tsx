import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Activity, Users, Inbox, Package, 
  FolderTree, Star, Image as ImageIcon, LayoutTemplate, 
  FileText, Zap, Truck, Target, ShieldCheck, 
  Sliders, Paintbrush, SearchCheck, LogOut, 
  Search, X, PanelLeftClose, PanelLeft, 
  Globe, Receipt, Box, LifeBuoy, Settings, CreditCard,
  ChevronDown, ChevronRight, Gem, UserRound,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { buildCloudinaryUrl } from '../../lib/cloudinary';

export interface AdminSidebarProps {
  settings: any;
  profile: any;
  currentPath: string;
  onSignOut: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
  navRef?: React.RefObject<HTMLElement | null>;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
  plan?: { status: string; trial_ends_at: string | null; paid_until: string | null; open: boolean } | null;
}

export interface NavItemDef {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  adminOnly?: boolean;
  badgeKey?: 'pendingOrders' | 'incompleteOrders' | 'pendingReviews';
  children?: { name: string; path: string; adminOnly?: boolean }[];
  section?: string;
}

export const NAV_ITEMS: NavItemDef[] = [
  { name: 'Dashboard', path: '/admin', icon: PieChart },
  { section: 'Shop & Growth', name: 'Analytics', path: '/admin/analytics', icon: Activity, adminOnly: true },
  { section: 'Shop & Growth', name: 'Visitors', path: '/admin/visitor-analytics', icon: Globe, adminOnly: true },
  { name: 'Orders', path: '/admin/orders', icon: Inbox, badgeKey: 'pendingOrders' },
  { name: 'Incomplete', path: '/admin/incomplete-orders', icon: Receipt, badgeKey: 'incompleteOrders' },
  { 
    name: 'Products', 
    path: '/admin/products', 
    icon: Package,
    children: [
      { name: 'All Products', path: '/admin/products' },
      { name: 'Bulk Upload', path: '/admin/products/bulk', adminOnly: true }
    ]
  },
  { name: 'Categories', path: '/admin/categories', icon: FolderTree },
  { name: 'Customers', path: '/admin/customers', icon: UserRound, adminOnly: true },
  { name: 'Reviews', path: '/admin/reviews', icon: Star, badgeKey: 'pendingReviews' },
  { section: 'Shop & Growth', name: 'Banners', path: '/admin/banners', icon: ImageIcon, adminOnly: true },
  { section: 'Shop & Growth', name: 'Landing Pages', path: '/admin/landing-pages', icon: LayoutTemplate, adminOnly: true },
  { section: 'Shop & Growth', name: 'Pages', path: '/admin/pages', icon: FileText, adminOnly: true },
  { section: 'Shop & Growth', name: 'Features', path: '/admin/features', icon: Zap, adminOnly: true },
  { section: 'Sales Tools', name: 'Logistics', path: '/admin/couriers', icon: Truck, adminOnly: true },
  { section: 'Sales Tools', name: 'Tracking', path: '/admin/pixel', icon: Target, adminOnly: true },
  { 
    section: 'Sales Tools',
    name: 'Fraud Guard', 
    path: '/admin/fraud-check',
    icon: ShieldCheck, 
    children: [
      { name: 'Check Number', path: '/admin/fraud-check' },
      { name: 'Blacklist', path: '/admin/blacklist' }
    ]
  },
  { section: 'Team', name: 'Team', path: '/admin/users', icon: Users, adminOnly: true },
  { section: 'Shop & Growth', name: 'Appearance', path: '/admin/customize', icon: Paintbrush, adminOnly: true },
  { section: 'Shop & Growth', name: 'SEO', path: '/admin/seo', icon: SearchCheck, adminOnly: true },
];

export const BOTTOM_NAV_ITEMS: NavItemDef[] = [
  { name: 'Billing', path: '/admin/billing', icon: CreditCard, adminOnly: true },
  { name: 'Settings', path: '/admin/settings', icon: Settings, adminOnly: true },
];

export function AdminSidebar({
  settings,
  profile,
  currentPath,
  onSignOut,
  isCollapsed,
  onToggleCollapse,
  isMobile = false,
  onCloseMobile,
  navRef,
  onScroll,
  plan,
}: AdminSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [tapped, setTapped] = useState<string | null>(null);
  useEffect(() => { setTapped(null); }, [currentPath]);
  const activePath = tapped || currentPath;
  const navLabel = (n: string) => n;

  useEffect(() => {
    const parentMatches = NAV_ITEMS.filter(item => 
      item.children && item.children.some(child => currentPath === child.path)
    ).map(item => item.name);
    
    setExpandedMenus(prev => {
      const newExpanded = new Set([...prev, ...parentMatches]);
      return Array.from(newExpanded);
    });
  }, [currentPath]);

  const toggleMenu = (name: string, e: React.MouseEvent) => {
    e.preventDefault();
    setExpandedMenus(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const [counts, setCounts] = useState<{
    pendingOrders: number;
    incompleteOrders: number;
    pendingReviews: number;
  }>({
    pendingOrders: 0,
    incompleteOrders: 0,
    pendingReviews: 0,
  });

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const availableItems = useMemo(() => {
    const isSuperAdmin = profile?.role === 'admin' || profile?.role === 'demo';
    return NAV_ITEMS.filter((item) => isSuperAdmin || !item.adminOnly);
  }, [profile?.role]);

  const availableBottomItems = useMemo(() => {
    const isSuperAdmin = profile?.role === 'admin' || profile?.role === 'demo';
    return BOTTOM_NAV_ITEMS.filter((item) => isSuperAdmin || !item.adminOnly);
  }, [profile?.role]);

  const fetchCounts = async () => {
    try {
      const [ordersRes, incompleteRes, reviewsRes] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('incomplete_orders').select('*', { count: 'exact', head: true }),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      setCounts({
        pendingOrders: ordersRes.count || 0,
        incompleteOrders: incompleteRes.count || 0,
        pendingReviews: reviewsRes.count || 0,
      });
    } catch {
      // Silently handle
    }
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setTimeout(() => searchInputRef.current?.focus(), 80);
      } else if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return availableItems;
    const q = searchQuery.toLowerCase().trim();
    return availableItems.filter((item) => item.name.toLowerCase().includes(q));
  }, [availableItems, searchQuery]);
  const sectionOrder = ['', 'Shop & Growth', 'Sales Tools', 'Team'];
  const grouped = useMemo(() => sectionOrder
    .map((sec) => ({ sec, items: filteredItems.filter((i) => (i.section || '') === sec) }))
    .filter((g) => g.items.length > 0), [filteredItems]);
  const planDays = plan ? Math.ceil((new Date((plan.status === 'trial' ? plan.trial_ends_at : plan.paid_until) || 0).getTime() - Date.now()) / 86400000) : null;
  const showPlan = !!plan && (plan.status === 'trial' || !plan.open || (plan.paid_until && planDays !== null && planDays <= 7));

  return (
    <div
      className={`relative flex h-full flex-col font-sans bg-white border-r border-slate-200 transition-[width] duration-300 select-none ${
        isCollapsed && !isMobile ? 'w-[80px]' : 'w-[280px]'
      }`}
    >
      {/* ── Brand Header ── */}
      <div className="flex shrink-0 items-center h-[72px] px-5">
        {isCollapsed && !isMobile ? (
          <button
            onClick={onToggleCollapse}
            className="flex h-10 w-10 mx-auto items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <PanelLeft className="h-5 w-5" strokeWidth={2} />
          </button>
        ) : (
          <div className="flex w-full items-center justify-between">
            <Link to="/admin" className="flex items-center gap-2 min-w-0 h-10">
              {settings?.site_logo ? (
                <img
                  src={buildCloudinaryUrl(settings.site_logo, 'h_80,c_limit,f_auto,q_auto')}
                  alt="Logo"
                  className="h-full w-auto object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white font-semibold text-lg shadow-sm">
                  {(settings?.siteName?.[0] || 'B').toUpperCase()}
                </div>
              )}
              {profile?.role === 'demo' && (
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                  Demo Mode
                </span>
              )}
            </Link>

            {!isMobile && (
              <button
                onClick={onToggleCollapse}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors ml-2 shrink-0"
              >
                <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            )}
            {isMobile && onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Search Bar ── */}
      {(!isCollapsed || isMobile) && (
        <div className="px-4 pb-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" strokeWidth={2} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-[14px] text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-50 transition-all shadow-sm"
            />
          </div>
        </div>
      )}

      {/* ── Navigation Tree ── */}
      <nav
        ref={navRef as any}
        onScroll={onScroll}
        className="custom-scrollbar flex-1 overflow-y-auto px-4 pb-4 space-y-1"
      >
        {grouped.map(({ sec, items }) => (
          <div key={sec || 'main'} className={sec ? 'pt-5' : ''}>
            {sec && (!isCollapsed || isMobile) && (
              <p className="px-3 pb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-400">{sec}</p>
            )}
            {sec && isCollapsed && !isMobile && <div className="mx-auto mb-2 h-px w-8 bg-slate-200" />}
            <div className="space-y-1">
        {items.map((item) => {
          const isActive = activePath === item.path || (item.path !== '/admin' && activePath.startsWith(item.path));
          const badgeVal =
            item.badgeKey === 'pendingOrders' ? counts.pendingOrders
              : item.badgeKey === 'incompleteOrders' ? counts.incompleteOrders
              : item.badgeKey === 'pendingReviews' ? counts.pendingReviews : 0;

          const isExpanded = expandedMenus.includes(item.name);
          const hasChildren = item.children && item.children.length > 0;
          const isParentActive = isActive || (hasChildren && item.children!.some(c => activePath === c.path));

          return (
            <div key={item.name} className="flex flex-col">
              <Link
                to={hasChildren ? '#' : item.path}
                onClick={(e) => { 
                  if (hasChildren) {
                    toggleMenu(item.name, e);
                  } else {
                    setTapped(item.path);
                    if (isMobile && onCloseMobile) onCloseMobile();
                  }
                }}
                className={`group relative flex items-center rounded-xl transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isCollapsed && !isMobile
                    ? 'h-11 w-11 mx-auto justify-center'
                    : 'px-3 py-2.5 gap-3 justify-between'
                } ${
                  isParentActive && !hasChildren
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 hover:bg-slate-100 active:bg-primary/10'
                }`}
                title={isCollapsed && !isMobile ? item.name : undefined}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <item.icon
                    className={`shrink-0 ${isCollapsed && !isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${
                      isParentActive ? 'text-primary' : 'text-slate-500 group-hover:text-slate-700'
                    }`}
                    strokeWidth={isParentActive ? 2.2 : 1.8}
                  />
                  {(!isCollapsed || isMobile) && (
                    <span className={`truncate text-[15px] ${isParentActive ? 'font-semibold' : 'font-medium'}`}>
                      {navLabel(item.name)}
                    </span>
                  )}
                </div>

                {(!isCollapsed || isMobile) && (
                  <div className="flex items-center gap-2">
                    {badgeVal > 0 && (
                      <span className="shrink-0 rounded-full flex items-center justify-center min-w-[24px] h-[22px] px-2 text-[12px] font-bold bg-primary text-white">
                        {badgeVal}
                      </span>
                    )}
                    {hasChildren && (
                      isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                      )
                    )}
                  </div>
                )}
                {isCollapsed && !isMobile && badgeVal > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-slate-900 ring-2 ring-white" />
                )}
              </Link>
              
              {/* Children Dropdown */}
              {hasChildren && isExpanded && (!isCollapsed || isMobile) && (
                <div className="mt-1 flex flex-col space-y-1 pl-[34px] pr-2">
                  {item.children!.map(child => {
                    // Filter children by role
                    if (child.adminOnly && profile?.role !== 'admin') return null;
                    
                    const isChildActive = activePath === child.path;
                    
                    return (
                      <Link
                        key={child.name}
                        to={child.path}
                        onClick={() => { setTapped(child.path); if (isMobile && onCloseMobile) onCloseMobile(); }}
                        className={`flex items-center px-3 py-2 rounded-lg text-[14px] font-medium transition-all active:scale-[0.97] ${
                          isChildActive 
                            ? 'bg-primary/10 text-primary font-semibold' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom Settings & Support ── */}
      <div className="shrink-0 px-4 pt-4 pb-2 space-y-1">
        {availableBottomItems.map((item) => {
          const isActive = activePath === item.path || (item.path !== '/admin' && activePath.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => { setTapped(item.path); if (isMobile && onCloseMobile) onCloseMobile(); }}
              className={`group flex items-center rounded-xl transition-all duration-150 active:scale-[0.97] ${
                isCollapsed && !isMobile
                  ? 'h-11 w-11 mx-auto justify-center'
                  : 'px-3 py-2.5 gap-3'
              } ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-700 hover:bg-slate-100 active:bg-primary/10'
              }`}
              title={isCollapsed && !isMobile ? item.name : undefined}
            >
              <item.icon
                className={`shrink-0 ${isCollapsed && !isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${
                  isActive ? 'text-primary' : 'text-slate-500 group-hover:text-slate-700'
                }`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              {(!isCollapsed || isMobile) && (
                <span className={`truncate text-[15px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* ── Plan card ── */}
      {showPlan && (!isCollapsed || isMobile) && (
        <div className="mx-4 mb-2 rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
            <Gem className="h-4 w-4 text-primary" strokeWidth={2.2} />
            {!plan!.open ? 'দোকান বন্ধ আছে' : plan!.status === 'trial' ? 'ফ্রি ট্রায়াল' : 'প্ল্যানের মেয়াদ'}
          </p>
          <p className="mt-0.5 text-[13px] text-slate-500">
            {!plan!.open ? 'পেমেন্ট করলেই আবার চালু হবে' : planDays !== null ? `আর ${String(Math.max(planDays, 0)).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d])} দিন বাকি` : ''}
          </p>
          <Link to="/admin/billing" onClick={() => { setTapped('/admin/billing'); if (isMobile && onCloseMobile) onCloseMobile(); }}
            className="mt-3 flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-[14px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.97]">
            প্ল্যান আপগ্রেড করুন
          </Link>
        </div>
      )}

      {/* ── User Profile Bottom ── */}
      <div className="shrink-0 p-4 border-t border-slate-200 mt-2">
        {isCollapsed && !isMobile ? (
          <button
            onClick={onSignOut}
            title="Sign Out"
            className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <LogOut className="h-5 w-5" strokeWidth={2} />
          </button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-semibold text-[14px]">
                {profile?.role === 'admin' ? 'A' : (profile?.role === 'demo' ? 'D' : 'M')}
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="truncate text-[14px] font-semibold text-slate-900">
                  {profile?.role === 'admin' ? 'Administrator' : (profile?.role === 'demo' ? 'Demo Admin' : 'Manager')}
                </span>
                {/* Email removed as per user constraint */}
              </div>
            </div>
            <button
              onClick={onSignOut}
              title="Log out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
