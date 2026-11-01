import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Package, Users, ShoppingBag, DollarSign, 
  ArrowUpRight, ArrowDownRight, Activity 
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPremiumOrderId } from '../../lib/orderUtils';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

interface ChartData {
  date: string;
  sales: number;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto" aria-label="Loading dashboard" role="status">
      <div className="flex items-end justify-between">
        <div className="space-y-3">
          <div className="skeleton-shimmer h-8 w-56 rounded-lg" />
          <div className="skeleton-shimmer h-4 w-72 rounded-md" />
        </div>
        <div className="skeleton-shimmer hidden h-10 w-32 rounded-xl sm:block" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="skeleton-shimmer h-11 w-11 rounded-2xl" />
              <div className="skeleton-shimmer h-5 w-12 rounded-md" />
            </div>
            <div className="mt-8 space-y-3">
              <div className="skeleton-shimmer h-3 w-24 rounded" />
              <div className="skeleton-shimmer h-8 w-32 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2 sm:p-8">
          <div className="space-y-3">
            <div className="skeleton-shimmer h-5 w-40 rounded" />
            <div className="skeleton-shimmer h-4 w-48 rounded" />
          </div>
          <div className="skeleton-shimmer mt-8 h-[280px] w-full rounded-2xl sm:h-[320px]" />
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="skeleton-shimmer h-5 w-32 rounded" />
          <div className="mt-6 space-y-5">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton-shimmer h-12 w-full rounded-xl" />)}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    users: 0,
    totalSales: 0,
    totalOrders: 0,
  });

  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData, profilesData, ordersData] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('id, total_amount, status, created_at, profiles(email)').order('created_at', { ascending: false }),
      ]);

      const allOrders = ordersData.data || [];

      let totalSales = 0;
      allOrders.forEach((o: any) => {
        if (o.status !== 'cancelled') {
          totalSales += Number(o.total_amount || 0);
        }
      });

      // 7-day sales trend
      const last7Days: ChartData[] = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i);
        return {
          date: format(d, 'MMM dd'),
          sales: 0,
        };
      });

      allOrders.forEach((order: any) => {
        if (order.status !== 'cancelled' && order.created_at) {
          const orderDate = new Date(order.created_at);
          const dayIndex = 6 - Math.floor((new Date().getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
          if (dayIndex >= 0 && dayIndex < 7) {
            last7Days[dayIndex].sales += Number(order.total_amount || 0);
          }
        }
      });

      setChartData(last7Days);
      setRecentOrders(allOrders.slice(0, 5));
      setStats({
        products: productsData.count || 0,
        categories: categoriesData.count || 0,
        users: profilesData.count || 0,
        totalSales: totalSales,
        totalOrders: allOrders.length || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      name: 'Total Revenue', 
      value: `৳ ${stats.totalSales.toLocaleString()}`, 
      icon: DollarSign, 
      color: 'from-blue-600 to-indigo-600',
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
      trend: '+12.5%', 
      isUp: true 
    },
    { 
      name: 'Total Orders', 
      value: stats.totalOrders || 0, 
      icon: ShoppingBag, 
      color: 'from-emerald-500 to-teal-500',
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
      trend: '+8.2%', 
      isUp: true 
    },
    { 
      name: 'Active Products', 
      value: stats.products, 
      icon: Package, 
      color: 'from-orange-500 to-amber-500',
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-500/10',
      trend: '+2.4%', 
      isUp: true 
    },
    { 
      name: 'Total Customers', 
      value: stats.users, 
      icon: Users, 
      color: 'from-purple-500 to-pink-500',
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-500/10',
      trend: '+18.1%', 
      isUp: true 
    },
  ];

  if (loading) return <DashboardSkeleton />;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-500/20 shadow-sm">Pending</span>;
      case 'processing': return <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-500/20 shadow-sm">Processing</span>;
      case 'shipped': return <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 shadow-sm">Shipped</span>;
      case 'delivered': return <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-sm">Delivered</span>;
      case 'cancelled': return <span className="px-2.5 py-1 bg-red-500/10 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-500/20 shadow-sm">Cancelled</span>;
      default: return <span className="px-2.5 py-1 bg-slate-500/10 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-500/20 shadow-sm">{status}</span>;
    }
  };

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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome & Live Analytics */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4"
      >
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
           <p className="text-sm font-medium text-slate-500 mt-1">Real-time revenue and order metrics.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200/60 text-sm font-bold text-slate-600">
           <Activity className="w-4 h-4 text-primary" />
           Live Analytics
        </div>
      </motion.div>
      
      {/* 4 Standard Top KPI Cards */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statCards.map((stat) => (
          <motion.div key={stat.name} variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100/80 p-6 overflow-hidden relative group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 p-6 opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
               <stat.icon className={`w-24 h-24 ${stat.iconColor}`} />
            </div>
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-2xl ${stat.iconBg} ${stat.iconColor} ring-1 ring-white/50 shadow-inner`}>
                  <stat.icon className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${stat.isUp ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                  {stat.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.trend}
                </div>
              </div>
              
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.name}</p>
                <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
      
      {/* CHARTS & RECENT ORDERS SECTION */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
          {/* Main Chart Area */}
          <motion.div variants={item} className="lg:col-span-2 bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100/80 p-6 sm:p-8">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
                <div>
                   <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                     <span>Revenue Trend</span>
                   </h2>
                   <p className="text-sm font-medium text-slate-500">Last 7 days performance</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <span className="w-3 h-3 rounded-full bg-blue-500" /> Total Sales
                  </span>
                </div>
             </div>
             <div className="h-[280px] sm:h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                         <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8', fontWeight: 600 }} dy={15} />
                      <YAxis 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fontSize: 12, fill: '#94A3B8', fontWeight: 600 }} 
                         tickFormatter={(value) => `৳${value}`}
                         width={80}
                      />
                      <Tooltip 
                         contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                         formatter={(value: number) => [`৳${Number(value || 0).toLocaleString()}`, 'Total Sales']}
                         labelStyle={{ fontWeight: '900', color: '#0F172A', marginBottom: '8px' }}
                      />
                      <Area type="monotone" dataKey="sales" name="sales" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </motion.div>

          {/* Recent Orders List */}
          <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100/80 overflow-hidden flex flex-col">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-xl">
                <div>
                   <h2 className="text-lg font-black text-slate-900 tracking-tight">Recent Orders</h2>
                   <p className="text-sm font-medium text-slate-500">Latest transactions</p>
                </div>
                <button 
                   onClick={() => navigate('/admin/orders')}
                   className="text-xs font-black uppercase tracking-wider text-primary hover:text-primary-hover transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer"
                >
                   View All
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {recentOrders.length > 0 ? (
                   <ul className="space-y-1">
                      {recentOrders.map((order) => (
                         <li key={order.id} className="p-4 hover:bg-slate-50 rounded-2xl transition-colors flex items-center justify-between group cursor-pointer" onClick={() => navigate('/admin/orders')}>
                            <div className="min-w-0 pr-4">
                               <p className="text-sm font-black text-slate-900 truncate mb-1 flex items-center gap-2">
                                  {getPremiumOrderId(order)}
                               </p>
                               <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs font-medium text-slate-500">
                                  <span className="truncate max-w-[120px] sm:max-w-[150px]">{order.profiles?.email || 'Guest Customer'}</span>
                                  <span className="hidden sm:inline text-slate-300">•</span>
                                  <span>{format(new Date(order.created_at), 'MMM d, h:mm a')}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                               <span className="text-sm font-black text-slate-900">৳{order.total_amount?.toLocaleString() || 0}</span>
                               {getStatusBadge(order.status)}
                            </div>
                         </li>
                      ))}
                   </ul>
                ) : (
                   <div className="p-8 text-center flex flex-col items-center justify-center h-full text-slate-400">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                        <ShoppingBag className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-500">No orders yet</p>
                      <p className="text-xs font-medium mt-1">When customers place orders, they will appear here.</p>
                   </div>
                )}
             </div>
          </motion.div>
      </motion.div>
    </div>
  );
}
