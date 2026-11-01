import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminPageSkeleton } from '../../components/ui/AdminPageSkeleton';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Eye, Users, Activity, Calendar, Globe, MousePointerClick, Link as LinkIcon, 
  RefreshCw, Clock, Flame, Zap, ArrowUpRight, CheckCircle2, Search, Radio, ShoppingCart, ShoppingBag, Banknote
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateRangePicker } from '../../components/ui/date-picker';
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import type { RangeValue } from 'react-aria-components';

// Helper for relative and safe date formatting
function formatTimeAgo(dateVal: any): string {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatExactDateTime(dateVal: any): string {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes();
  const seconds = d.getSeconds() < 10 ? '0' + d.getSeconds() : d.getSeconds();
  
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${hours}:${minutes}:${seconds} ${ampm}`;
}

const getReferrerSource = (referrerUrl?: string, pageUrl?: string) => {
  // Check page URL for campaign click IDs and UTM tags first
  if (pageUrl) {
    const lower = pageUrl.toLowerCase();
    if (lower.includes('ttclid=') || lower.includes('utm_source=tiktok')) return 'TikTok';
    if (lower.includes('fbclid=') || lower.includes('utm_source=facebook') || lower.includes('utm_source=fb')) return 'Facebook';
    if (lower.includes('gclid=') || lower.includes('utm_source=google')) return 'Google';
    if (lower.includes('utm_source=instagram')) return 'Instagram';
    if (lower.includes('utm_source=youtube')) return 'YouTube';
    if (lower.includes('utm_source=whatsapp')) return 'WhatsApp';
    if (lower.includes('utm_source=twitter') || lower.includes('utm_source=x')) return 'Twitter / X';
  }

  if (!referrerUrl || referrerUrl === 'Direct') return 'Direct';

  try {
    const hostname = new URL(referrerUrl).hostname.toLowerCase();
    const currentHost = window.location.hostname.toLowerCase();

    // If referrer is this site itself, count as Direct
    if (
      hostname === currentHost ||
      hostname.endsWith(currentHost) ||
      (currentHost && currentHost.endsWith(hostname)) ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1'
    ) {
      return 'Direct';
    }

    if (hostname.includes('facebook.com') || hostname.includes('fb.me') || hostname.includes('fb.com')) return 'Facebook';
    if (hostname.includes('google.') || hostname.includes('googlesyndication.')) return 'Google';
    if (hostname.includes('tiktok.com')) return 'TikTok';
    if (hostname.includes('instagram.com')) return 'Instagram';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YouTube';
    if (hostname.includes('whatsapp.com') || hostname.includes('wa.me')) return 'WhatsApp';
    if (hostname.includes('t.co') || hostname.includes('twitter.com') || hostname.includes('x.com')) return 'Twitter / X';
    if (hostname.includes('bing.com')) return 'Bing';
    if (hostname.includes('pinterest.com')) return 'Pinterest';

    return hostname.replace(/^www\./, '');
  } catch {
    return 'Other';
  }
};

const getSourceColorBadge = (source: string) => {
  switch (source) {
    case 'Facebook':
      return 'bg-blue-50 text-blue-600 border-blue-200';
    case 'TikTok':
      return 'bg-slate-900 text-white border-slate-700';
    case 'Google':
      return 'bg-amber-50 text-amber-600 border-amber-200';
    case 'Instagram':
      return 'bg-pink-50 text-pink-600 border-pink-200';
    case 'YouTube':
      return 'bg-red-50 text-red-600 border-red-200';
    case 'WhatsApp':
      return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export default function VisitorAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const nowObj = today(getLocalTimeZone());
  const [dateRange, setDateRange] = useState<RangeValue<CalendarDate> | null>({
    start: nowObj,
    end: nowObj
  });

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  
  const [pageViews, setPageViews] = useState<any[]>([]);
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [referrerData, setReferrerData] = useState<any[]>([]);
  const [topPages, setTopPages] = useState<any[]>([]);
  const [recentViews, setRecentViews] = useState<any[]>([]);
  const [hourlyBreakdown, setHourlyBreakdown] = useState<any[]>([]);
  const [eventList, setEventList] = useState<any[]>([]);
  const [productMap, setProductMap] = useState<Record<string, { title: string; slug: string }>>({});
  
  const [stats, setStats] = useState({
    totalViews: 0,
    uniqueSessions: 0,
    avgViewsPerSession: 0,
    peakHourText: 'N/A',
    peakHourViews: 0,
    lastHourViews: 0,
    addToCartCount: 0,
    buyNowCount: 0,
    checkoutCount: 0,
  });

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6'];

  // Multi-batch fetching to remove the 1,000 Supabase PostgREST default limit
  const fetchAllPageViews = useCallback(async (filterObj: any) => {
    const PAGE_SIZE = 1000;
    let allRows: any[] = [];
    let from = 0;
    let hasMore = true;

    let filterDateIsoStart: string | null = null;
    let filterDateIsoEnd: string | null = null;
    const now = new Date();
    
    if (filterObj && typeof filterObj === 'object' && filterObj.start && filterObj.end) {
      const start = filterObj.start;
      const end = filterObj.end;
      const startDate = new Date(start.year, start.month - 1, start.day, 0, 0, 0, 0);
      const endDate = new Date(end.year, end.month - 1, end.day, 23, 59, 59, 999);
      filterDateIsoStart = startDate.toISOString();
      filterDateIsoEnd = endDate.toISOString();
    } else {
      // Default fallback
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      filterDateIsoStart = startOfToday.toISOString();
    }

    while (hasMore) {
      let query = supabase
        .from('page_views')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (filterDateIsoStart) {
        query = query.gte('created_at', filterDateIsoStart);
      }
      if (filterDateIsoEnd) {
        query = query.lte('created_at', filterDateIsoEnd);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        allRows = allRows.concat(data);
        if (data.length < PAGE_SIZE || allRows.length >= 100000) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
      } else {
        hasMore = false;
      }
    }

    return allRows;
  }, []);

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setHasError(false);
    try {
      const [rows, productsResponse] = await Promise.all([
        fetchAllPageViews(dateRange),
        supabase.from('products').select('id, title, slug')
      ]);
      setPageViews(rows || []);
      
      if (productsResponse.data) {
        const pMap: Record<string, { title: string; slug: string }> = {};
        productsResponse.data.forEach((p: any) => {
          pMap[p.id] = { title: p.title, slug: p.slug };
        });
        setProductMap(pMap);
      }
    } catch (error) {
      console.error('Error fetching visitor analytics:', error);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, fetchAllPageViews]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh interval (20s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAnalytics]);

  // Process and Aggregate Analytics Data
  useEffect(() => {
    if (loading) return;

    try {
      const now = new Date();
      let startMs = 0;
      let endMs = Infinity;
      
      let isHourly = false;

      if (dateRange && typeof dateRange === 'object' && dateRange.start && dateRange.end) {
        const start = dateRange.start;
        const end = dateRange.end;
        const startDate = new Date(start.year, start.month - 1, start.day, 0, 0, 0, 0);
        const endDate = new Date(end.year, end.month - 1, end.day, 23, 59, 59, 999);
        startMs = startDate.getTime();
        endMs = endDate.getTime();
        
        // If range is within 3 days, show hourly breakdown instead of daily
        if (endDate.getTime() - startDate.getTime() <= 3 * 24 * 60 * 60 * 1000) {
           isHourly = true;
        }
      } else {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        startMs = start.getTime();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        endMs = end.getTime();
        isHourly = true;
      }

      // Filter rows strictly in the window
      const allRows = pageViews.filter((pv: any) => {
        if (!pv.created_at) return false;
        const t = new Date(pv.created_at).getTime();
        return !isNaN(t) && t >= startMs && t <= endMs;
      });

      const filteredViews = allRows.filter(pv => !pv.url?.startsWith('/event/'));
      const eventViews = allRows.filter(pv => pv.url?.startsWith('/event/'));

      // Event counts
      const addToCartCount = eventViews.filter(pv => pv.url?.includes('add_to_cart')).length;
      const buyNowCount = eventViews.filter(pv => pv.url?.includes('buy_now')).length;
      const checkoutCount = eventViews.filter(pv => pv.url?.includes('checkout')).length;

      // Top Stats
      const sessionIds = new Set(filteredViews.map((pv: any) => pv.session_id).filter(Boolean));
      const totalViews = filteredViews.length;
      const uniqueSessions = sessionIds.size;
      const avgViewsPerSession = uniqueSessions > 0 ? (totalViews / uniqueSessions).toFixed(1) : '0.0';

      // Last 1 hour views
      const oneHourAgoMs = now.getTime() - 60 * 60 * 1000;
      const lastHourViews = filteredViews.filter((pv: any) => {
        const t = new Date(pv.created_at).getTime();
        return t >= oneHourAgoMs;
      }).length;

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let slots: any[] = [];

      if (dateRange === 'today' || dateRange === 'yesterday') {
        const targetDay = dateRange === 'yesterday'
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
          : new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // 24 Hour Slots (12 AM to 11 PM)
        slots = Array.from({ length: 24 }).map((_, hour) => {
          const s = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), hour, 0, 0, 0).getTime();
          const e = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), hour, 59, 59, 999).getTime();
          
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayH = hour % 12 === 0 ? 12 : hour % 12;
          const label = `${displayH} ${ampm}`;
          const fullLabel = `${displayH}:00 ${ampm} - ${displayH}:59 ${ampm}`;

          return {
            time: label,
            fullLabel,
            hour,
            startMs: s,
            endMs: e,
            views: 0,
          };
        });
      } else if (dateRange === '24h') {
        // Last 24 continuous hourly slots
        slots = Array.from({ length: 24 }).map((_, i) => {
          const d = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
          const hour = d.getHours();
          const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0, 0).getTime();
          const e = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 59, 59, 999).getTime();

          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayH = hour % 12 === 0 ? 12 : hour % 12;
          const label = `${displayH} ${ampm}`;
          const fullLabel = `${months[d.getMonth()]} ${d.getDate()}, ${displayH}:00 ${ampm}`;

          return {
            time: label,
            fullLabel,
            hour,
            startMs: s,
            endMs: e,
            views: 0,
          };
        });
      } else {
        // Daily slots for 7d, 30d, 90d, all
        const daysCount = dateRange === '7d' ? 7 : (dateRange === '30d' ? 30 : (dateRange === '90d' ? 90 : 45));
        slots = Array.from({ length: daysCount }).map((_, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() - (daysCount - 1 - i));
          const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
          const e = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

          return {
            time: `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`,
            fullLabel: `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`,
            startMs: s,
            endMs: e,
            views: 0,
          };
        });
      }

      // Fill views in slots
      filteredViews.forEach((pv: any) => {
        if (pv.created_at) {
          const t = new Date(pv.created_at).getTime();
          if (!isNaN(t)) {
            const slot = slots.find(s => t >= s.startMs && t <= s.endMs);
            if (slot) {
              slot.views++;
            }
          }
        }
      });

      setChartData(slots);

      // Find Peak Hour
      let peakSlot = slots[0];
      slots.forEach(s => {
        if (s.views > (peakSlot?.views || 0)) {
          peakSlot = s;
        }
      });

      setStats({
        totalViews,
        uniqueSessions,
        avgViewsPerSession: Number(avgViewsPerSession),
        peakHourText: peakSlot?.fullLabel || 'N/A',
        peakHourViews: peakSlot?.views || 0,
        lastHourViews,
        addToCartCount,
        buyNowCount,
        checkoutCount,
      });

      // Filtered hourly breakdown for list view
      if (isHourly) {
        const sortedHours = [...slots]
          .filter(s => s.views > 0)
          .sort((a, b) => b.views - a.views);
        setHourlyBreakdown(sortedHours);
      } else {
        setHourlyBreakdown([]);
      }

      // Referrer Data
      const refMap: Record<string, number> = {};
      filteredViews.forEach((pv: any) => {
        const source = getReferrerSource(pv.referrer, pv.url);
        refMap[source] = (refMap[source] || 0) + 1;
      });
      const rData = Object.entries(refMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      
      setReferrerData(rData);

      // Top Pages (Normalized clean path without noisy query params)
      const pagesMap: Record<string, number> = {};
      filteredViews.forEach((pv: any) => {
        let rawUrl = pv.url || '/';
        // Clean query parameters like ?ttclid=... or ?fbclid=...
        let cleanPath = rawUrl.split('?')[0].split('#')[0] || '/';
        // Normalize leading slashes
        cleanPath = cleanPath.replace(/^\/+/, '/');
        pagesMap[cleanPath] = (pagesMap[cleanPath] || 0) + 1;
      });
      const pData = Object.entries(pagesMap)
        .map(([url, views]) => ({ url, views }))
        .sort((a, b) => b.views - a.views);
        
      setTopPages(pData);

      // Recent Views (latest 100)
      setRecentViews(allRows.slice(0, 100));
      setEventList(eventViews);
    } catch (err) {
      console.error('Data processing error:', err);
    }
  }, [pageViews, dateRange, loading]);

  const filteredRecentViews = recentViews.filter(v => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    const source = getReferrerSource(v.referrer, v.url).toLowerCase();
    const url = (v.url || '').toLowerCase();
    return url.includes(q) || source.includes(q);
  });

  if (loading && pageViews.length === 0) {
    return <AdminPageSkeleton variant="analytics" />;
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const isHourlyMode = dateRange === 'today' || dateRange === '24h' || dateRange === 'yesterday';

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 lg:space-y-8 pb-12 max-w-7xl mx-auto"
    >
      {/* Page Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Visitor Analytics
                {autoRefresh && (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Live Polling
                  </span>
                )}
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Real-time website traffic, hourly views distribution, and ad campaign acquisition sources.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Live Auto-Refresh Toggle */}
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              autoRefresh 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm' 
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Toggle Realtime Auto Refresh"
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
            {autoRefresh ? 'Live (20s)' : 'Live Off'}
          </button>

          {/* Refresh Button */}
          <button 
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition-all disabled:opacity-50 border border-slate-200"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          
          {/* Time Range Selector */}
          <div className="w-[260px] relative z-10 flex-shrink-0">
            <DateRangePicker
              aria-label="Filter by date range"
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
        </div>
      </motion.div>

      {/* Primary Stats Grid */}
      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Page Views */}
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Eye className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              {isHourlyMode ? 'Selected Period' : 'Total'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Page Views</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {stats.totalViews.toLocaleString()}
            </h3>
          </div>
        </motion.div>

        {/* Unique Sessions */}
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              Unique
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Unique Visitors</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {stats.uniqueSessions.toLocaleString()}
            </h3>
          </div>
        </motion.div>

        {/* Avg Views Per Session */}
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <MousePointerClick className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              Engagement
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Pages per Visitor</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {stats.avgViewsPerSession}
            </h3>
          </div>
        </motion.div>

        {/* Real-time / Peak Insights */}
        <motion.div variants={item} className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-3xl shadow-xl shadow-indigo-500/20 p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-white/10 rounded-2xl text-white backdrop-blur-md">
              {isHourlyMode ? <Flame className="w-5 h-5 text-amber-300" /> : <Zap className="w-5 h-5 text-amber-300" />}
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full text-white">
              {isHourlyMode ? 'Peak Velocity' : 'Recent 1h'}
            </span>
          </div>
          <div>
            {isHourlyMode ? (
              <>
                <p className="text-xs font-medium text-indigo-100 mb-1">Highest Traffic Time</p>
                <h4 className="text-lg font-bold truncate">{stats.peakHourText}</h4>
                <p className="text-xs text-indigo-200 mt-1 font-semibold">
                  🔥 {stats.peakHourViews} views recorded
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-indigo-100 mb-1">Active Last 60 Mins</p>
                <h3 className="text-3xl font-black">{stats.lastHourViews}</h3>
                <p className="text-xs text-indigo-200 mt-1">Live realtime visitors</p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Advanced Conversion / Event Tracking Grid */}
      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-5 flex items-center justify-between hover:border-indigo-200 transition-all">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Add to Cart</p>
            <h3 className="text-2xl font-black text-slate-900">{stats.addToCartCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </motion.div>
        
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-5 flex items-center justify-between hover:border-amber-200 transition-all">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Buy Now Clicks</p>
            <h3 className="text-2xl font-black text-slate-900">{stats.buyNowCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Zap className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-5 flex items-center justify-between hover:border-emerald-200 transition-all">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Checkouts Begun</p>
            <h3 className="text-2xl font-black text-slate-900">{stats.checkoutCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </motion.div>
      </motion.div>

      {/* Main Charts Row */}
      <motion.div variants={container} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Area Chart: Views over time / Hourly Trend */}
        <motion.div variants={item} className="lg:col-span-2 bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {isHourlyMode ? (
                  <>
                    <Clock className="w-5 h-5 text-indigo-600" />
                    Hourly Traffic Distribution
                  </>
                ) : (
                  <>
                    <Activity className="w-5 h-5 text-indigo-600" />
                    Traffic Trend
                  </>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {isHourlyMode 
                  ? 'Detailed hourly breakdown showing exact peak hours throughout the day'
                  : 'Daily visitor trend over the selected time range'}
              </p>
            </div>
            
            {isHourlyMode && (
              <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl">
                24-Hour Timeline
              </span>
            )}
          </div>

          <div className="h-[340px] w-full mt-2">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorViewsHourly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                    dy={10}
                    interval={isHourlyMode ? 1 : 'preserveStartEnd'}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    dx={-5}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                      backgroundColor: '#ffffff',
                      padding: '10px 14px'
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} views`, 'Traffic']}
                    labelFormatter={(_, payload) => {
                      const itemData = payload?.[0]?.payload;
                      return itemData?.fullLabel || '';
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorViewsHourly)" 
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff', fill: '#6366f1' }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                No views recorded for this period
              </div>
            )}
          </div>
        </motion.div>

        {/* Pie Chart: Traffic Sources */}
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col items-center justify-between">
          <div className="w-full flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-slate-900">Traffic Sources</h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
              Acquisition
            </span>
          </div>

          <div className="h-[280px] w-full items-center justify-center flex">
            {referrerData && referrerData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={referrerData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={95}
                    innerRadius={55}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={4}
                  >
                    {referrerData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 8px 20px -4px rgb(0 0 0 / 0.15)' }}
                    formatter={(value: number) => [`${value.toLocaleString()} views`, 'Source']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                No source data recorded
              </div>
            )}
          </div>

          {/* Sources Summary Badges */}
          <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {referrerData.slice(0, 4).map((src, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl text-xs">
                <span className="font-semibold text-slate-700 truncate">{src.name}</span>
                <span className="font-bold text-indigo-600 ml-1">
                  {Math.round((src.value / (stats.totalViews || 1)) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Hourly Peaks List (Shown when Today or 24h is active) */}
      {isHourlyMode && hourlyBreakdown.length > 0 && (
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                Peak Traffic Hours Leaderboard
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Exact hours with the highest concentration of views
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl">
              {hourlyBreakdown.length} active hours
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {hourlyBreakdown.slice(0, 6).map((slot, idx) => {
              const pct = Math.round((slot.views / (stats.totalViews || 1)) * 100);
              return (
                <div key={idx} className="flex flex-col p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                        idx === 0 ? 'bg-amber-500 text-white' : (idx === 1 ? 'bg-slate-400 text-white' : 'bg-slate-200 text-slate-700')
                      }`}>
                        {idx + 1}
                      </span>
                      {slot.fullLabel}
                    </span>
                    <span className="text-xs font-black text-indigo-600">
                      {slot.views} views ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Bottom Grids: Top Pages & Live Visitors Feed */}
      <motion.div variants={container} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Pages Table with Scroll */}
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 h-[560px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Top Visited Pages</h2>
                <p className="text-xs text-slate-400 font-medium">Most popular URLs visited in this timeframe</p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {topPages.length} Pages
              </span>
            </div>

            <div className="overflow-y-auto h-[440px] custom-scrollbar pr-1">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-3 py-2.5 rounded-l-xl">#</th>
                    <th className="px-3 py-2.5">Page Path</th>
                    <th className="px-3 py-2.5 text-right rounded-r-xl">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topPages.map((page, idx) => {
                    const pct = Math.round((page.views / (stats.totalViews || 1)) * 100);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3 py-2.5 text-xs font-bold text-slate-400 w-7">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                              <LinkIcon className="w-3 h-3 text-indigo-600" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-slate-900 truncate max-w-[160px] sm:max-w-[240px]" title={page.url}>
                                {page.url}
                              </span>
                              <div className="w-20 bg-slate-100 h-1 rounded-full mt-0.5 overflow-hidden">
                                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.max(3, pct)}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-indigo-600 text-xs sm:text-sm">{page.views.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {topPages.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-16 text-center text-slate-400 text-xs font-medium">
                        No page views recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Live Feed / Recent Visitors */}
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 h-[560px] flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  Recent Visitors Stream
                </h2>
                <p className="text-xs text-slate-400 font-medium">Real-time chronologically sorted visitor hits</p>
              </div>

              {/* Search in Feed */}
              <div className="relative w-full sm:w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter URL or source..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Visitors List */}
            <div className="overflow-y-auto h-[420px] custom-scrollbar pr-2 space-y-2.5">
              {filteredRecentViews.map((view, idx) => {
                const source = getReferrerSource(view.referrer, view.url);
                const badgeStyle = getSourceColorBadge(source);
                const timeAgo = formatTimeAgo(view.created_at);
                const exactTime = formatExactDateTime(view.created_at);

                const isEvent = view.url?.startsWith('/event/');
                let eventName = '';
                if (isEvent) {
                  const urlParams = view.url.split('?')[0];
                  eventName = urlParams.replace('/event/', '').replace(/_/g, ' ').toUpperCase();
                }

                return (
                  <div 
                    key={idx} 
                    className={`flex flex-col p-3 rounded-2xl border transition-all duration-200 ${
                      isEvent 
                        ? 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-100 hover:shadow-md hover:border-indigo-300' 
                        : 'bg-slate-50/70 hover:bg-white hover:shadow-md border-slate-100 hover:border-indigo-100'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        isEvent ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : badgeStyle
                      }`}>
                        {isEvent ? eventName : source}
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium" title={exactTime}>
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className={`font-bold ${isEvent ? 'text-indigo-600' : 'text-slate-600'}`}>{timeAgo}</span>
                        <span className="text-[10px] text-slate-400">({exactTime})</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className={`text-xs font-bold break-all leading-tight truncate ${isEvent ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {isEvent ? `Product ID: ${new URLSearchParams(view.url.split('?')[1]).get('product_id') || 'Unknown'}` : view.url}
                      </span>
                      {view.url && !isEvent && (
                        <a 
                          href={view.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-slate-400 hover:text-indigo-600 shrink-0 p-1"
                          title="Open Page"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredRecentViews.length === 0 && (
                <div className="py-16 text-center text-slate-400 text-xs font-medium">
                  No recent visitor records matching your filter.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Conversion Events Detailed Table */}
      <motion.div variants={container} className="mt-6 mb-10">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Detailed Conversion Events
        </h2>
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar max-h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acquisition Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eventList.map((evt, idx) => {
                  const urlParams = evt.url?.split('?')[0] || '';
                  const eventName = urlParams.replace('/event/', '').replace(/_/g, ' ').toUpperCase();
                  const exactTime = formatExactDateTime(evt.created_at);
                  const source = getReferrerSource(evt.referrer, evt.url);
                  const badgeStyle = getSourceColorBadge(source);
                  
                  const productId = new URLSearchParams(evt.url?.split('?')[1] || '').get('product_id') || 'multiple';
                  const productDetails = productMap[productId];
                  const displayProduct = productDetails ? productDetails.title : (productId === 'multiple' ? 'Multiple Products (Checkout)' : productId);
                  
                  let icon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
                  if (eventName.includes('CART')) icon = <ShoppingCart className="w-4 h-4 text-indigo-500" />;
                  if (eventName.includes('BUY')) icon = <Zap className="w-4 h-4 text-amber-500" />;
                  if (eventName.includes('CHECKOUT')) icon = <ShoppingBag className="w-4 h-4 text-emerald-500" />;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-700">{exactTime}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {icon}
                          <span className="text-sm font-bold text-slate-900">{eventName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-[200px]">
                        {productDetails ? (
                          <a href={`/product/${productDetails.slug || productId}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline block truncate" title={displayProduct}>
                            {displayProduct}
                          </a>
                        ) : (
                          <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md block truncate" title={displayProduct}>
                            {displayProduct}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border ${badgeStyle}`}>
                          {source}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {eventList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-16 text-center text-slate-400 text-sm font-medium">
                      No conversion events recorded in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
