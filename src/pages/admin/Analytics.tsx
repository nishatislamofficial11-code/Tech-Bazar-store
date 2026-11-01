import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminPageSkeleton } from '../../components/ui/AdminPageSkeleton';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { DollarSign, ShoppingBag, Users, Package, CreditCard, Calendar, Truck, Store, CheckCircle, XCircle, RefreshCcw, TrendingUp, Activity } from 'lucide-react';
import { getSteadfastBalance, SteadfastConfig } from '../../lib/steadfastApi';
import { motion } from 'framer-motion';
import { DateRangePicker } from '../../components/ui/date-picker';
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import type { RangeValue } from 'react-aria-components';

// Helper for safe date formatting
function formatDate(dateVal: any): string {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  
  // Default to last 30 days
  const now = today(getLocalTimeZone());
  const thirtyDaysAgo = now.subtract({ days: 30 });
  const [dateRange, setDateRange] = useState<RangeValue<CalendarDate> | null>({
    start: thirtyDaysAgo,
    end: now
  });

  const [hasError, setHasError] = useState(false);
  
  const [rawData, setRawData] = useState<{
    orders: any[];
    profiles: any[];
    categories: any[];
    items: any[];
    pageViews: any[];
    totalViewsCount: number;
  }>({ orders: [], profiles: [], categories: [], items: [], pageViews: [], totalViewsCount: 0 });
  
  const [salesData, setSalesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [topViewedPages, setTopViewedPages] = useState<any[]>([]);
  const [steadfastBalance, setSteadfastBalance] = useState<number | null>(null);

  const [courierStats, setCourierStats] = useState({
    totalDispatched: 0,
    steadfastCount: 0,
    pathaoCount: 0,
    deliveredCount: 0,
    cancelledCount: 0,
    deliverySuccessRate: 0
  });
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalCustomers: 0,
    totalViews: 0,
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setHasError(false);
    try {
      const [
        ordersRes,
        profilesRes,
        categoriesRes,
        itemsRes,
        settingsRes,
        pageViewsRes,
        totalViewsCountRes
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total_amount, status, created_at, user_id, courier_name, courier_status, courier_tracking_code')
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase
          .from('profiles')
          .select('id, full_name, email, created_at')
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase
          .from('categories')
          .select('id, name'),
        supabase
          .from('order_items')
          .select('order_id, product_id, quantity, price, variant_cost_price, variant_options, products(title, category_id, image, buy_price, variants)')
          .order('id', { ascending: false })
          .limit(5000),
        supabase
          .from('settings')
          .select('key, value')
          .in('key', ['steadfast_api_key', 'steadfast_secret_key', 'steadfast_base_url']),
        supabase
          .from('page_views')
          .select('url, created_at')
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase
          .from('page_views')
          .select('*', { count: 'exact', head: true })
      ]);

      const orders = ordersRes.data || [];
      const profiles = profilesRes.data || [];
      const categories = categoriesRes.data || [];
      const items = itemsRes.data || [];
      const pageViews = pageViewsRes.data || [];
      const totalViewsCount = totalViewsCountRes.count || pageViews.length;

      setRawData({ orders, profiles, categories, items, pageViews, totalViewsCount });

      // Check Steadfast balance non-blocking in background
      const settingsMap: any = {};
      settingsRes.data?.forEach(s => { settingsMap[s.key] = s.value; });
      if (settingsMap.steadfast_api_key && settingsMap.steadfast_secret_key) {
        const config: SteadfastConfig = {
          apiKey: settingsMap.steadfast_api_key,
          secretKey: settingsMap.steadfast_secret_key,
          baseUrl: settingsMap.steadfast_base_url || 'https://portal.packzy.com/api/v1'
        };
        Promise.race([
          getSteadfastBalance(config),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Steadfast timeout')), 5000))
        ])
          .then(bal => setSteadfastBalance(Number(bal) || 0))
          .catch(e => console.warn('Steadfast balance check failed:', e));
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return;

    try {
      const now = new Date();
      let daysCount = 30;
      let startMs = 0;
      let endMs = now.getTime();

      if (dateRange && typeof dateRange === 'object' && dateRange.start && dateRange.end) {
        const start = dateRange.start;
        const end = dateRange.end;
        const startDate = new Date(start.year, start.month - 1, start.day);
        const endDate = new Date(end.year, end.month - 1, end.day, 23, 59, 59);
        startMs = startDate.getTime();
        endMs = endDate.getTime();
        daysCount = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));
      } else {
        // Default to last 30 days if no valid range
        daysCount = 30;
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        d.setHours(0, 0, 0, 0);
        startMs = d.getTime();
      }

      const { orders, categories, items, profiles, pageViews, totalViewsCount } = rawData;

      // Safe order filtering
      const filteredOrders = orders.filter((o: any) => {
        if (!o.created_at) return false;
        const t = new Date(o.created_at).getTime();
        return !isNaN(t) && t >= startMs && t <= endMs;
      });

      const filteredPageViews = pageViews.filter((pv: any) => {
        if (!pv.created_at) return false;
        const t = new Date(pv.created_at).getTime();
        return !isNaN(t) && t >= startMs && t <= endMs;
      });

      const filteredOrderIds = new Set(filteredOrders.map((o: any) => o.id));

      const filteredProfiles = profiles.filter((p: any) => {
        if (!p.created_at) return false;
        const t = new Date(p.created_at).getTime();
        return !isNaN(t) && t >= startMs && t <= endMs;
      });

      // Compute Primary Stats
      let totalRevenue = 0;
      let totalProfit = 0;
      let validOrdersCount = 0;
      
      const orderStatusMap: Record<string, string> = {};

      filteredOrders.forEach((order: any) => {
        orderStatusMap[order.id] = order.status;
        if (order.status !== 'cancelled') {
          totalRevenue += Number(order.total_amount || 0);
          validOrdersCount++;
        }
      });
      
      // Calculate profit from items
      items.forEach((item: any) => {
        if (!filteredOrderIds.has(item.order_id)) return;
        if (orderStatusMap[item.order_id] === 'cancelled') return;
        
        const salePrice = Number(item.price || 0);
        const quantity = Number(item.quantity || 1);
        let buyPrice = Number(item.variant_cost_price || 0);

        if (!buyPrice && item.products?.variants) {
          try {
            let matchedVariant = null;

            // 1. Try to match by variant_options
            if (item.variant_options) {
              const iOpts = Object.values(item.variant_options) as string[];
              if (iOpts.length > 0) {
                matchedVariant = item.products.variants.find((v: any) => {
                  const vOpts = [v.option1_value, v.option2_value, v.color, v.size].filter(Boolean);
                  return iOpts.every(opt => vOpts.includes(opt));
                });
              }
            }

            // 2. If no match by options (or options missing), try to match by sale price
            if (!matchedVariant) {
              matchedVariant = item.products.variants.find((v: any) => Number(v.price) === Number(item.price));
            }

            if (matchedVariant && matchedVariant.cost_price) {
              buyPrice = Number(matchedVariant.cost_price);
            }
          } catch (e) {
            console.error('Error matching retroactive variant cost:', e);
          }
        }

        if (!buyPrice) {
          buyPrice = Number(item.products?.buy_price || 0);
        }
        
        totalProfit += (salePrice - buyPrice) * quantity;
      });

      // Cost settings for accurate Net Profit calculation
      const costSettings = (() => {
        try {
          const saved = localStorage.getItem('bd_order_profit_cost_settings');
          if (saved) return JSON.parse(saved);
        } catch (e) {}
        return { packagingCostPerOrder: 20, deliveryCostPerOrder: 70, returnLossPerOrder: 100 };
      })();

      const cancelledOrders = filteredOrders.filter((o: any) => o.status === 'cancelled').length;
      const dispatchedOrders = filteredOrders.filter((o: any) => o.status === 'delivered' || o.status === 'shipped').length;
      const totalPackaging = validOrdersCount * costSettings.packagingCostPerOrder;
      const totalDelivery = dispatchedOrders * costSettings.deliveryCostPerOrder;
      const totalReturnLoss = cancelledOrders * costSettings.returnLossPerOrder;
      const netProfit = totalProfit - totalPackaging - totalDelivery - totalReturnLoss;

      setStats({
        totalRevenue,
        totalProfit: netProfit,
        totalOrders: filteredOrders.length,
        averageOrderValue: validOrdersCount > 0 ? Math.round(totalRevenue / validOrdersCount) : 0,
        totalCustomers: filteredProfiles.length,
        totalViews: filteredPageViews.length,
      });

      // Compute Courier Analytics Stats
      let totalDispatched = 0;
      let steadfastCount = 0;
      let pathaoCount = 0;
      let deliveredCount = 0;
      let cancelledCount = 0;

      filteredOrders.forEach((o: any) => {
        if (o.courier_name) totalDispatched++;
        if (o.courier_name === 'steadfast') steadfastCount++;
        if (o.courier_name === 'pathao') pathaoCount++;
        if (o.status === 'delivered') deliveredCount++;
        if (o.status === 'cancelled') cancelledCount++;
      });

      const deliverySuccessRate = totalDispatched > 0 
        ? Math.round((deliveredCount / totalDispatched) * 100) 
        : (filteredOrders.length > 0 ? Math.round((deliveredCount / filteredOrders.length) * 100) : 0);

      setCourierStats({
        totalDispatched,
        steadfastCount,
        pathaoCount,
        deliveredCount,
        cancelledCount,
        deliverySuccessRate
      });

      // Generate Chart Days
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const chartDays = Array.from({ length: daysCount }).map((_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (daysCount - 1 - i));
        
        const startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
        const endDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

        return {
          date: `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`,
          startMs: startDay,
          endMs: endDay,
          sales: 0,
          orders: 0
        };
      });

      filteredOrders.forEach((order: any) => {
        if (order.status !== 'cancelled' && order.created_at) {
          const t = new Date(order.created_at).getTime();
          if (!isNaN(t)) {
            const dayData = chartDays.find(d => t >= d.startMs && t <= d.endMs);
            if (dayData) {
              dayData.sales += Number(order.total_amount || 0);
              dayData.orders++;
            }
          }
        }
      });
      setSalesData(chartDays);

      // Compute Status Data
      const statusCounts: Record<string, number> = {};
      filteredOrders.forEach((order: any) => {
        const st = order.status || 'pending';
        statusCounts[st] = (statusCounts[st] || 0) + 1;
      });
      setStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

      // Compute Categories & Products
      const categorySales: Record<string, number> = {};
      const productSales: Record<string, { name: string, sales: number, quantity: number, image: string }> = {};

      items.forEach((item: any) => {
        if (!filteredOrderIds.has(item.order_id)) return;

        const prodData = item.products || {};
        const prodName = prodData.title || prodData.name || 'Unknown Product';
        const catId = prodData.category_id;
        const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
        
        if (catId) {
          const cat = categories.find((c: any) => c.id === catId);
          const catName = cat ? cat.name : 'Unknown';
          categorySales[catName] = (categorySales[catName] || 0) + itemTotal;
        }

        if (!productSales[prodName]) {
           productSales[prodName] = { 
             name: prodName, 
             sales: 0, 
             quantity: 0, 
             image: prodData.image || (prodData.images && prodData.images[0]) || null 
           };
        }
        productSales[prodName].sales += itemTotal;
        productSales[prodName].quantity += Number(item.quantity || 1);
      });
      
      setCategoryData(Object.entries(categorySales)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value).slice(0, 5));
        
      const sortedProducts = Object.values(productSales)
        .sort((a: any, b: any) => b.quantity - a.quantity)
        .slice(0, 5);

      setTopProducts(sortedProducts);
      
      // Top Viewed Pages
      const pageViewsMap: Record<string, number> = {};
      filteredPageViews.forEach((pv: any) => {
        const url = pv.url || '/';
        pageViewsMap[url] = (pageViewsMap[url] || 0) + 1;
      });
      
      const sortedViewedPages = Object.entries(pageViewsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([url, views]) => ({ url, views }));
        
      setTopViewedPages(sortedViewedPages);

      // Recent Users
      setRecentUsers([...filteredProfiles].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 5));
    } catch (err) {
      console.error('Analytics processing error:', err);
    }
  }, [rawData, dateRange, loading]);

  if (loading) return <AdminPageSkeleton variant="analytics" />;

  if (hasError) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-4 max-w-md mx-auto my-12">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Analytics Load Error</h2>
        <p className="text-xs text-gray-500">Failed to load analytics data from database.</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 mx-auto"
        >
          <RefreshCcw className="w-4 h-4" /> Retry Loading
        </button>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Website & Courier Analytics</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Detailed sales, order status, and Steadfast / Pathao courier delivery metrics.</p>
        </div>
        <div className="w-[260px] relative z-10">
          <DateRangePicker
            aria-label="Filter by date range"
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </motion.div>

      {/* Primary Stats Grid */}
      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6">
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <DollarSign className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Profit</span>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Profit</p>
                <h3 className="text-2xl font-bold text-emerald-600">৳{stats.totalProfit.toLocaleString()}</h3>
            </div>
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <Activity className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">Sales</span>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Gross Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900">৳{stats.totalRevenue.toLocaleString()}</h3>
            </div>
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">Orders</span>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Orders</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.totalOrders.toLocaleString()}</h3>
            </div>
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <CreditCard className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">AOV</span>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Average Order Value</p>
                <h3 className="text-2xl font-bold text-gray-900">৳{stats.averageOrderValue.toLocaleString()}</h3>
            </div>
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                    <Users className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">Users</span>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Registered Customers</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.totalCustomers.toLocaleString()}</h3>
            </div>
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
                    <Activity className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-1 rounded-full">Views</span>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Page Views</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</h3>
            </div>
        </motion.div>
      </motion.div>

      {/* COURIER PERFORMANCE METRICS SECTION */}
      <motion.div variants={item} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Courier Delivery Performance</h2>
            <p className="text-xs text-gray-500">Live courier dispatch metrics for Steadfast & Pathao Courier Services</p>
          </div>

          {steadfastBalance !== null && (
            <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-right">
              <span className="text-[11px] text-emerald-700 font-bold block uppercase tracking-wider">Steadfast Account Balance</span>
              <span className="text-base font-mono font-extrabold text-emerald-800">৳{Number(steadfastBalance || 0).toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
          <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-5 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">Dispatched</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">Total Dispatched</p>
              <h3 className="text-xl font-bold text-gray-900">{courierStats.totalDispatched}</h3>
            </div>
          </motion.div>

          <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-5 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Steadfast</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">Steadfast Orders</p>
              <h3 className="text-xl font-bold text-gray-900">{courierStats.steadfastCount}</h3>
            </div>
          </motion.div>

          <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-5 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                <Store className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase">Pathao</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">Pathao Orders</p>
              <h3 className="text-xl font-bold text-gray-900">{courierStats.pathaoCount}</h3>
            </div>
          </motion.div>

          <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-5 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase">Delivered</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">Delivered</p>
              <h3 className="text-xl font-bold text-green-600">{courierStats.deliveredCount}</h3>
            </div>
          </motion.div>

          <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-5 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <XCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase">Cancelled</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">Cancelled</p>
              <h3 className="text-xl font-bold text-rose-600">{courierStats.cancelledCount}</h3>
            </div>
          </motion.div>

          <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-5 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase">Success %</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">Success Rate</p>
              <h3 className="text-xl font-bold text-amber-600">{courierStats.deliverySuccessRate}%</h3>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Charts Section */}
      <motion.div variants={container} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Trend Chart */}
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Revenue & Sales Over Time</h2>
            <div className="h-[320px] w-full">
              {salesData && salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                         <linearGradient id="colorSalesBig" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, className: 'text-gray-400' }} dy={10} minTickGap={30} />
                      <YAxis 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fontSize: 12, className: 'text-gray-400' }} 
                         tickFormatter={(value) => `৳${value}`}
                         width={60}
                      />
                      <Tooltip 
                         contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                         formatter={(value: number) => [`৳${value.toLocaleString()}`, 'Sales']}
                         labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSalesBig)" activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} />
                    </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 font-medium">No sales data in selected period</div>
              )}
            </div>
        </motion.div>

        {/* Order Status Distribution Pie Chart */}
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col items-center">
            <h2 className="text-lg font-bold text-gray-900 mb-6 self-start">Order Status Distribution</h2>
            <div className="h-[320px] w-full items-center justify-center flex">
              {statusData && statusData.length > 0 ? (
                 <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={90}
                        innerRadius={55}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={5}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)' }}
                         formatter={(value: number) => [value, 'Orders']}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 font-medium">No order status data available</div>
              )}
            </div>
        </motion.div>

        {/* Top Categories Bar Chart */}
        <motion.div variants={item} className="lg:col-span-3 bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Top Categories by Revenue</h2>
            <div className="h-[300px] w-full mt-4">
              {categoryData && categoryData.length > 0 ? (
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                      <XAxis type="number" hide={true} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 12, fill: '#4b5563' }} />
                      <Tooltip 
                         cursor={{fill: 'transparent'}}
                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)' }}
                         formatter={(value: number) => [`৳${value.toLocaleString()}`, 'Revenue']}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={40}>
                         {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 font-medium">No category sales in selected period</div>
              )}
            </div>
        </motion.div>
      </motion.div>

      {/* Bottom Grids */}
      <motion.div variants={container} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Products Table */}
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Top Selling Products</h2>
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                     <tr>
                        <th className="px-4 py-3 font-semibold rounded-tl-lg">Product</th>
                        <th className="px-4 py-3 font-semibold">Qty</th>
                        <th className="px-4 py-3 font-semibold text-right rounded-tr-lg">Sales</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {topProducts.map((product, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                           <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                 {product.image ? (
                                    <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                                 ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                       <Package className="w-5 h-5 text-gray-400" />
                                    </div>
                                 )}
                                 <span className="font-medium text-gray-900 truncate max-w-[150px] sm:max-w-[200px]">{product.name}</span>
                              </div>
                           </td>
                           <td className="px-4 py-3 text-gray-600 font-medium">{product.quantity}</td>
                           <td className="px-4 py-3 text-right font-bold text-gray-900">৳{product.sales.toLocaleString()}</td>
                        </tr>
                     ))}
                     {topProducts.length === 0 && (
                        <tr>
                           <td colSpan={3} className="px-4 py-8 text-center text-gray-500">No product sales in this period.</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
        </motion.div>

        {/* Recent Customers */}
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Customers</h2>
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                     <tr>
                        <th className="px-4 py-3 font-semibold rounded-tl-lg">Customer</th>
                        <th className="px-4 py-3 font-semibold text-right">Joined</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {recentUsers.map((user, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                           <td className="px-4 py-3">
                              <div className="flex flex-col">
                                 <span className="font-bold text-gray-900">{user.full_name || 'Guest User'}</span>
                                 <span className="text-xs text-gray-500">{user.email || 'No email provided'}</span>
                              </div>
                           </td>
                           <td className="px-4 py-3 text-right text-gray-500 font-medium">
                              {formatDate(user.created_at)}
                           </td>
                        </tr>
                     ))}
                     {recentUsers.length === 0 && (
                        <tr>
                           <td colSpan={2} className="px-4 py-8 text-center text-gray-500">No new customers in this period.</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
        </motion.div>

        {/* Top Viewed Pages */}
        <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Top Viewed Pages</h2>
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                     <tr>
                        <th className="px-4 py-3 font-semibold rounded-tl-lg">Page URL</th>
                        <th className="px-4 py-3 font-semibold text-right rounded-tr-lg">Views</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {topViewedPages.map((page, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                           <td className="px-4 py-3 text-gray-900 font-medium truncate max-w-xs">{page.url}</td>
                           <td className="px-4 py-3 text-right text-indigo-600 font-bold">{page.views.toLocaleString()}</td>
                        </tr>
                     ))}
                     {topViewedPages.length === 0 && (
                        <tr>
                           <td colSpan={2} className="px-4 py-8 text-center text-gray-500">No page views in this period.</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
