import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { BlockUserDialog } from '../../components/ui/BlockUserDialog';
import {
  ShoppingBag,
  Eye,
  Trash2,
  CheckCircle,
  Search,
  Pencil,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Phone,
  MapPin,
  RefreshCw,
  Info,
  Truck,
  MessageSquareWarning,
  LayoutGrid,
  Table as TableIcon,
  Minimize2,
  Maximize2,
  Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  getLocalFraudCache,
  checkFraudFromApi,
  extractCourierBreakdowns,
  extractFraudReports,
  getCleanPhoneNumber,
  FraudCheckResultData
} from '../../lib/fraudCheck';
import { sendTelegramOrderNotification } from '../../lib/telegramApi';

interface IncompleteOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  order_note?: string;
  cart_items: any[];
  total_amount: number;
  status?: string;
  order_source?: string;
  created_at: string;
}

import { Pagination } from '../../components/ui/Pagination';

export default function IncompleteOrders() {
  const [orders, setOrders] = useState<IncompleteOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockUserDialog, setBlockUserDialog] = useState<{ isOpen: boolean; phone?: string; ip?: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<IncompleteOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'hold' | 'cancelled'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);


  // In-place Collapsed Slim Line Columns state ('date' | 'customer' | 'source' | 'fraud')
  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('incomplete_orders_collapsed_cols');
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {}
    return new Set();
  });

  const toggleColumnCollapse = (colKey: string, label: string) => {
    setCollapsedCols(prev => {
      const next = new Set(prev);
      if (next.has(colKey)) {
        next.delete(colKey);
        toast.success(`✨ ${label} কলাম ওপেন করা হয়েছে`, { duration: 1500 });
      } else {
        next.add(colKey);
        toast.success(`📏 ${label} কলাম ছোট লাইনে হাইড করা হয়েছে`, { duration: 1500 });
      }
      try {
        localStorage.setItem('incomplete_orders_collapsed_cols', JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  };

  // Edit Order state
  const [editingOrder, setEditingOrder] = useState<IncompleteOrder | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editOrderNote, setEditOrderNote] = useState('');
  const [editStatus, setEditStatus] = useState<'pending' | 'hold' | 'cancelled'>('pending');
  const [savingEdit, setSavingEdit] = useState(false);

  // Convert to real order state
  const [convertingOrder, setConvertingOrder] = useState<IncompleteOrder | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Fraud Check state
  const [apiKey, setApiKey] = useState('');
  const [fraudModalOpen, setFraudModalOpen] = useState(false);
  const [fraudChecking, setFraudChecking] = useState(false);
  const [fraudTargetPhone, setFraudTargetPhone] = useState('');
  const [fraudTargetName, setFraudTargetName] = useState('');
  const [fraudCheckResult, setFraudCheckResult] = useState<FraudCheckResultData | null>(null);

  // Table horizontal scrolling references for top slider controls
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchOrders();
    fetchApiKey();
  }, []);

  const fetchApiKey = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'bd_courier_api_key')
        .single();
      if (data?.value) {
        setApiKey(data.value);
      }
    } catch (e) {
      console.log('BD Courier API key not configured yet');
    }
  };

  const getOrderStatus = (order: IncompleteOrder): 'pending' | 'hold' | 'cancelled' => {
    if (order.status && ['pending', 'hold', 'cancelled'].includes(order.status)) {
      return order.status as 'pending' | 'hold' | 'cancelled';
    }
    const note = (order.order_note || '').toLowerCase();
    if (note.includes('[status: hold]') || note.includes('[status:hold]')) return 'hold';
    if (note.includes('[status: cancelled]') || note.includes('[status:cancelled]')) return 'cancelled';
    return 'pending';
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('incomplete_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch incomplete orders');
      console.error('Error fetching incomplete orders:', error);
    } finally {
      setLoading(false);
    }
  };


  // Top Slide Navigation controls
  const handleScrollLeft = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: 'pending' | 'hold' | 'cancelled') => {
    try {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

      const { error } = await supabase
        .from('incomplete_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) {
        const targetOrder = orders.find(o => o.id === orderId);
        const cleanNote = (targetOrder?.order_note || '').replace(/\[status:\s*\w+\]/gi, '').trim();
        const updatedNote = cleanNote ? `${cleanNote} [Status: ${newStatus}]` : `[Status: ${newStatus}]`;
        await supabase
          .from('incomplete_orders')
          .update({ order_note: updatedNote, updated_at: new Date().toISOString() })
          .eq('id', orderId);
      }

      toast.success(`Status updated to ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    try {
      const { error } = await supabase.from('incomplete_orders').delete().eq('id', orderToDelete);
      if (error) throw error;
      toast.success('Incomplete order deleted');
      setOrders(orders.filter(o => o.id !== orderToDelete));
    } catch (error: any) {
      toast.error('Failed to delete order: ' + error.message);
    } finally {
      setOrderToDelete(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    try {
      setSavingEdit(true);
      const cleanNote = (editOrderNote || '').replace(/\[status:\s*\w+\]/gi, '').trim();
      const updatedNote = cleanNote ? `${cleanNote} [Status: ${editStatus}]` : `[Status: ${editStatus}]`;

      const { error } = await supabase
        .from('incomplete_orders')
        .update({
          customer_name: editName,
          customer_phone: editPhone,
          customer_address: editAddress,
          order_note: updatedNote,
          status: editStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingOrder.id);

      if (error) throw error;

      toast.success('Incomplete order updated successfully');
      setOrders(orders.map(o => o.id === editingOrder.id ? {
        ...o,
        customer_name: editName,
        customer_phone: editPhone,
        customer_address: editAddress,
        order_note: updatedNote,
        status: editStatus
      } : o));
      setEditingOrder(null);
    } catch (error: any) {
      toast.error('Failed to save changes: ' + error.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConvert = async () => {
    if (!convertingOrder) return;
    const order = convertingOrder;
    try {
      setIsConverting(true);

      const customerName = order.customer_name?.trim() || 'Customer';
      const customerPhone = order.customer_phone?.trim() || '';
      const customerAddress = order.customer_address?.trim() || 'Address not specified';
      
      // Clean order note from status tags
      const rawNote = order.order_note?.trim() || '';
      const cleanNote = rawNote.replace(/\[status:\s*[\w-]+\]/gi, '').trim();

      // Generate tracking ID conforming to standard ORD-XXXX format
      const shortId = Math.random().toString(36).substring(2, 9).toUpperCase();
      const generatedTrackingCode = `ORD-${shortId}`;

      // Build structured deliveryInfo expected by orders table and courier integrations
      const deliveryInfo = [
        `Name: ${customerName}`,
        `Phone: ${customerPhone}`,
        customerPhone ? `WhatsApp: ${customerPhone}` : null,
        `Address: ${customerAddress}`,
        cleanNote ? `Order Note: ${cleanNote}` : null,
        `[TID:${generatedTrackingCode}]`
      ].filter(Boolean).join('\n');

      // Check cached fraud result for phone number
      const cleanPhone = getCleanPhoneNumber(customerPhone);
      const cachedFraud = cleanPhone ? getLocalFraudCache(cleanPhone) : null;

      const orderPayload: any = {
        shipping_address: deliveryInfo,
        total_amount: Number(order.total_amount || 0),
        status: 'pending',
        order_source: order.order_source || 'direct',
        admin_note: cleanNote ? `Converted from Incomplete Checkout. Note: ${cleanNote}` : 'Converted from Incomplete Checkout'
      };

      if (cachedFraud) {
        orderPayload.fraud_result = cachedFraud;
      }

      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (orderErr) throw orderErr;

      // Insert order items if available
      if (newOrder && order.cart_items && Array.isArray(order.cart_items) && order.cart_items.length > 0) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const orderItems = order.cart_items.map((item: any) => {
          const prod = item.product || item;
          const rawId = prod?.id || item.product_id;
          const productId = (typeof rawId === 'string' && uuidRegex.test(rawId)) ? rawId : null;

          return {
            order_id: newOrder.id,
            product_id: productId,
            quantity: Number(item.quantity || 1),
            price: Number(prod?.discount_price ?? prod?.price ?? item.price ?? 0),
            variant_sku: prod?.sku || prod?.selectedVariant?.sku || item.variant_sku || null,
            variant_options: prod?.selectedVariants || item.variant_options || null,
            variant_compare_price: prod?.original_price || prod?.selectedVariant?.compare_price || item.variant_compare_price || null,
            variant_cost_price: prod?.selectedVariant?.cost_price || item.variant_cost_price || null,
            variant_weight: prod?.weight || prod?.selectedVariant?.weight || item.variant_weight || null
          };
        });

        const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
        if (itemsErr) {
          console.error('Failed to insert order items:', itemsErr);
        }
      }

      // Delete from incomplete orders
      const { error: deleteErr } = await supabase.from('incomplete_orders').delete().eq('id', order.id);
      if (deleteErr) {
        console.warn('Failed to delete incomplete order:', deleteErr);
      }
      
      // Notify Telegram if configured
      sendTelegramOrderNotification({
        orderId: generatedTrackingCode,
        customerName,
        phone: customerPhone,
        address: customerAddress,
        totalAmount: Number(order.total_amount || 0),
        note: cleanNote || 'Converted from Incomplete Checkout'
      }).catch(e => console.warn('Telegram notification error:', e));

      toast.success('Successfully converted to active order!');
      setOrders(prev => prev.filter(o => o.id !== order.id));
    } catch (error: any) {
      console.error('Error converting order:', error);
      toast.error('Failed to convert order: ' + (error.message || 'Unknown error'));
    } finally {
      setIsConverting(false);
      setConvertingOrder(null);
    }
  };

  // Fraud Check Runner
  const handleOpenFraudCheck = async (phone: string, customerName: string, forceRecheck: boolean = false) => {
    const clean = getCleanPhoneNumber(phone);
    if (!clean) {
      toast.error('Customer phone number is invalid or missing');
      return;
    }

    setFraudTargetPhone(phone);
    setFraudTargetName(customerName || 'Customer');
    setFraudModalOpen(true);

    // Check cached result first
    if (!forceRecheck) {
      const cached = getLocalFraudCache(clean);
      if (cached) {
        setFraudCheckResult(cached);
        return;
      }
    }

    if (!apiKey) {
      setFraudCheckResult({
        error: 'BD Courier API Key is not configured yet. Please configure it in Fraud Check Settings.',
      });
      return;
    }

    try {
      setFraudChecking(true);
      const res = await checkFraudFromApi(clean, apiKey);
      setFraudCheckResult(res);
      toast.success('Fraud report fetched successfully');
    } catch (err: any) {
      setFraudCheckResult({
        error: err.message || 'Failed to check phone number',
      });
    } finally {
      setFraudChecking(false);
    }
  };

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => getOrderStatus(o) === 'pending').length,
    hold: orders.filter(o => getOrderStatus(o) === 'hold').length,
    cancelled: orders.filter(o => getOrderStatus(o) === 'cancelled').length,
  };

  const filteredOrders = orders.filter(order => {
    const status = getOrderStatus(order);
    if (statusFilter !== 'all' && status !== statusFilter) {
      return false;
    }
    const nameMatch = (order.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const phoneMatch = (order.customer_phone?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const addressMatch = (order.customer_address?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return nameMatch || phoneMatch || addressMatch;
  });

  const ITEMS_PER_PAGE = 25;
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-16 max-w-7xl mx-auto font-sans">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Incomplete Orders
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800">
              Abandoned Checkouts
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            যেসব কাস্টমার অর্ডার ফর্মে নাম-ঠিকানা দিয়ে অর্ডার সম্পূর্ণ করেননি তাদের তালিকা ও ফ্রড চেক
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs sm:text-sm font-semibold"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <TableIcon size={16} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Compact Card View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* STATUS FILTER PILLS & TOP SLIDE CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Incomplete', count: statusCounts.all, color: 'bg-slate-100 text-slate-800' },
            { id: 'pending', label: 'Pending', count: statusCounts.pending, color: 'bg-amber-100 text-amber-800' },
            { id: 'hold', label: 'Hold', count: statusCounts.hold, color: 'bg-orange-100 text-orange-800' },
            { id: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled, color: 'bg-red-100 text-red-800' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === pill.id
                  ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
              }`}
            >
              <span>{pill.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === pill.id ? 'bg-white/20 text-white' : pill.color
              }`}>
                {pill.count}
              </span>
            </button>
          ))}
        </div>

        {/* TOP SLIDE / SCROLL CONTROLS */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Left/Right Top Slider Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handleScrollLeft}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-slate-700 hover:bg-slate-50 active:scale-95 shadow-xs text-xs font-bold transition-all cursor-pointer"
              title="Slide Left"
            >
              <ChevronLeft size={15} />
              <span className="hidden sm:inline">Slide Left</span>
            </button>
            <button
              onClick={handleScrollRight}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-slate-700 hover:bg-slate-50 active:scale-95 shadow-xs text-xs font-bold transition-all cursor-pointer"
              title="Slide Right"
            >
              <span className="hidden sm:inline">Slide Right</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: TABLE OR CARDS */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden flex flex-col">
          
          {/* Subtle Top Hint Strip */}
          <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Info size={13} className="text-primary" />
              যে কোনো কলামে (DATE, CUSTOMER, SOURCE) ক্লিক করলে তা ওই স্থানেই একটি সরু লাইনে হাইড হবে, আবার ক্লিক করলে ওপেন হবে
            </span>
            <span className="font-semibold text-slate-400 hidden sm:inline">
              মোট: {filteredOrders.length} টি
            </span>
          </div>

          <div
            ref={tableContainerRef}
            className="overflow-x-auto min-h-[400px] scroll-smooth"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/60 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="w-10 px-4 py-3.5 text-center">#</th>

                  {/* 1. DATE COLUMN HEADER (Collapses to slim vertical line in the same place) */}
                  {collapsedCols.has('date') ? (
                    <th
                      onClick={() => toggleColumnCollapse('date', 'Date')}
                      className="w-8 min-w-[32px] max-w-[32px] p-0 text-center bg-slate-100 hover:bg-primary/15 border-x border-slate-200 cursor-pointer transition-colors group select-none"
                      title="Date কলাম পুনরায় ওপেন করতে ক্লিক করুন (Click to reveal Date)"
                    >
                      <div className="flex flex-col items-center justify-center h-full py-2 gap-1">
                        <div className="w-1 h-3.5 bg-slate-300 group-hover:bg-primary rounded-full transition-colors" />
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-primary [writing-mode:vertical-lr] tracking-widest uppercase">
                          DATE
                        </span>
                      </div>
                    </th>
                  ) : (
                    <th
                      onClick={() => toggleColumnCollapse('date', 'Date')}
                      className="px-4 py-3.5 cursor-pointer select-none group hover:bg-slate-100/90 transition-colors"
                      title="ক্লিক করলে এই স্থানেই সরু লাইনে হাইড হবে (Click to collapse Date into slim line)"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="group-hover:text-primary">Date</span>
                        <Minimize2 size={12} className="text-slate-400 group-hover:text-primary transition-opacity" />
                      </div>
                    </th>
                  )}

                  {/* 2. CUSTOMER & PHONE COLUMN HEADER (Collapses to slim vertical line in the same place) */}
                  {collapsedCols.has('customer') ? (
                    <th
                      onClick={() => toggleColumnCollapse('customer', 'Customer')}
                      className="w-8 min-w-[32px] max-w-[32px] p-0 text-center bg-slate-100 hover:bg-primary/15 border-x border-slate-200 cursor-pointer transition-colors group select-none"
                      title="Customer & Phone কলাম পুনরায় ওপেন করতে ক্লিক করুন (Click to reveal Customer)"
                    >
                      <div className="flex flex-col items-center justify-center h-full py-2 gap-1">
                        <div className="w-1 h-3.5 bg-slate-300 group-hover:bg-primary rounded-full transition-colors" />
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-primary [writing-mode:vertical-lr] tracking-widest uppercase">
                          CUSTOMER
                        </span>
                      </div>
                    </th>
                  ) : (
                    <th
                      onClick={() => toggleColumnCollapse('customer', 'Customer')}
                      className="px-4 py-3.5 cursor-pointer select-none group hover:bg-slate-100/90 transition-colors"
                      title="ক্লিক করলে এই স্থানেই সরু লাইনে হাইড হবে (Click to collapse Customer into slim line)"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="group-hover:text-primary">Customer & Phone</span>
                        <Minimize2 size={12} className="text-slate-400 group-hover:text-primary transition-opacity" />
                      </div>
                    </th>
                  )}

                  {/* 3. SOURCE COLUMN HEADER (Collapses to slim vertical line in the same place) */}
                  {collapsedCols.has('source') ? (
                    <th
                      onClick={() => toggleColumnCollapse('source', 'Source')}
                      className="w-8 min-w-[32px] max-w-[32px] p-0 text-center bg-slate-100 hover:bg-primary/15 border-x border-slate-200 cursor-pointer transition-colors group select-none"
                      title="Source কলাম পুনরায় ওপেন করতে ক্লিক করুন (Click to reveal Source)"
                    >
                      <div className="flex flex-col items-center justify-center h-full py-2 gap-1">
                        <div className="w-1 h-3.5 bg-slate-300 group-hover:bg-primary rounded-full transition-colors" />
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-primary [writing-mode:vertical-lr] tracking-widest uppercase">
                          SOURCE
                        </span>
                      </div>
                    </th>
                  ) : (
                    <th
                      onClick={() => toggleColumnCollapse('source', 'Source')}
                      className="px-4 py-3.5 text-center cursor-pointer select-none group hover:bg-slate-100/90 transition-colors"
                      title="ক্লিক করলে এই স্থানেই সরু লাইনে হাইড হবে (Click to collapse Source into slim line)"
                    >
                      <div className="inline-flex items-center gap-1.5 group-hover:text-primary">
                        <span>Source</span>
                        <Minimize2 size={12} className="text-slate-400 group-hover:text-primary transition-opacity" />
                      </div>
                    </th>
                  )}

                  <th className="px-4 py-3.5 text-center">Status</th>

                  {/* 4. FRAUD CHECK COLUMN HEADER */}
                  {collapsedCols.has('fraud') ? (
                    <th
                      onClick={() => toggleColumnCollapse('fraud', 'Fraud Check')}
                      className="w-8 min-w-[32px] max-w-[32px] p-0 text-center bg-slate-100 hover:bg-primary/15 border-x border-slate-200 cursor-pointer transition-colors group select-none"
                      title="Fraud Check কলাম পুনরায় ওপেন করতে ক্লিক করুন (Click to reveal Fraud Check)"
                    >
                      <div className="flex flex-col items-center justify-center h-full py-2 gap-1">
                        <div className="w-1 h-3.5 bg-slate-300 group-hover:bg-primary rounded-full transition-colors" />
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-primary [writing-mode:vertical-lr] tracking-widest uppercase">
                          FRAUD
                        </span>
                      </div>
                    </th>
                  ) : (
                    <th
                      onClick={() => toggleColumnCollapse('fraud', 'Fraud Check')}
                      className="px-4 py-3.5 text-center cursor-pointer select-none group hover:bg-slate-100/90 transition-colors"
                      title="ক্লিক করলে এই স্থানেই সরু লাইনে হাইড হবে (Click to collapse Fraud Check into slim line)"
                    >
                      <div className="inline-flex items-center gap-1.5 group-hover:text-primary">
                        <span>Fraud Check</span>
                        <Minimize2 size={12} className="text-slate-400 group-hover:text-primary transition-opacity" />
                      </div>
                    </th>
                  )}

                  <th className="px-4 py-3.5 text-right">Items & Total</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-slate-500 bg-white">
                      <div className="flex flex-col items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-base font-bold text-slate-800">No incomplete orders found</p>
                        <p className="text-xs text-slate-400 mt-1">There are currently no checkouts matching this filter.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order, index) => {
                    const currentStatus = getOrderStatus(order);
                    const cachedFraud = getLocalFraudCache(order.customer_phone);
                    const summaryRatio = cachedFraud?.data?.summary?.success_ratio ?? (cachedFraud?.data?.summary?.total_parcel ? Math.round(((cachedFraud.data.summary.success_parcel || 0) / cachedFraud.data.summary.total_parcel) * 100) : null);

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/80 transition-colors bg-white"
                      >
                        {/* Serial Number (No Dropdown Chevron) */}
                        <td className="px-4 py-3.5 text-center text-xs text-slate-400 font-bold">
                          {index + 1}
                        </td>

                        {/* 1. DATE CELL (Slim vertical line if collapsed, normal if open) */}
                        {collapsedCols.has('date') ? (
                          <td
                            onClick={() => toggleColumnCollapse('date', 'Date')}
                            className="w-8 min-w-[32px] max-w-[32px] p-0 text-center bg-slate-50/60 hover:bg-primary/10 border-x border-slate-100 cursor-pointer transition-colors group"
                            title="Date কলাম ওপেন করতে ক্লিক করুন"
                          >
                            <div className="flex items-center justify-center h-full py-3">
                              <div className="w-0.5 h-6 bg-slate-200 group-hover:bg-primary rounded-full transition-colors" />
                            </div>
                          </td>
                        ) : (
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 font-medium">
                            {new Date(order.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        )}

                        {/* 2. CUSTOMER & PHONE CELL (Slim vertical line if collapsed, normal if open) */}
                        {collapsedCols.has('customer') ? (
                          <td
                            onClick={() => toggleColumnCollapse('customer', 'Customer')}
                            className="w-8 min-w-[32px] max-w-[32px] p-0 text-center bg-slate-50/60 hover:bg-primary/10 border-x border-slate-100 cursor-pointer transition-colors group"
                            title="Customer কলাম ওপেন করতে ক্লিক করুন"
                          >
                            <div className="flex items-center justify-center h-full py-3">
                              <div className="w-0.5 h-6 bg-slate-200 group-hover:bg-primary rounded-full transition-colors" />
                            </div>
                          </td>
                        ) : (
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{order.customer_name || 'N/A'}</span>
                            </div>
                            <div className="text-xs font-mono font-bold text-primary flex items-center gap-1 mt-0.5">
                              <Phone size={11} />
                              <span>{order.customer_phone || 'N/A'}</span>
                            </div>
                          </td>
                        )}

                        {/* 3. SOURCE CELL (Slim vertical line if collapsed, normal if open) */}
                        {collapsedCols.has('source') ? (
                          <td
                            onClick={() => toggleColumnCollapse('source', 'Source')}
                            className="w-8 min-w-[32px] max-w-[32px] p-0 text-center bg-slate-50/60 hover:bg-primary/10 border-x border-slate-100 cursor-pointer transition-colors group"
                            title="Source কলাম ওপেন করতে ক্লিক করুন"
                          >
                            <div className="flex items-center justify-center h-full py-3">
                              <div className="w-0.5 h-6 bg-slate-200 group-hover:bg-primary rounded-full transition-colors" />
                            </div>
                          </td>
                        ) : (
                          <td className="px-4 py-3.5 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              order.order_source?.toLowerCase() === 'facebook' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                              order.order_source?.toLowerCase() === 'tiktok' ? 'bg-slate-900 text-white border border-slate-950' :
                              'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {order.order_source || 'organic'}
                            </span>
                          </td>
                        )}

                        {/* Status Selector */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          <select
                            value={currentStatus}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as any)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase cursor-pointer border-0 ring-1 ring-inset focus:ring-2 appearance-none transition-colors ${
                              currentStatus === 'hold' ? 'bg-orange-50 text-orange-700 ring-orange-600/30' :
                              currentStatus === 'cancelled' ? 'bg-red-50 text-red-700 ring-red-600/30' :
                              'bg-amber-50 text-amber-700 ring-amber-600/30'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="hold">Hold</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>

                        {/* 4. FRAUD CHECK CELL (Slim vertical line if collapsed, normal if open) */}
                        {collapsedCols.has('fraud') ? (
                          <td
                            onClick={() => toggleColumnCollapse('fraud', 'Fraud Check')}
                            className="w-8 min-w-[32px] max-w-[32px] p-0 text-center bg-slate-50/60 hover:bg-primary/10 border-x border-slate-100 cursor-pointer transition-colors group"
                            title="Fraud Check কলাম ওপেন করতে ক্লিক করুন"
                          >
                            <div className="flex items-center justify-center h-full py-3">
                              <div className="w-0.5 h-6 bg-slate-200 group-hover:bg-primary rounded-full transition-colors" />
                            </div>
                          </td>
                        ) : (
                          <td className="px-4 py-3.5 whitespace-nowrap text-center">
                            {summaryRatio !== null ? (
                              <button
                                onClick={() => handleOpenFraudCheck(order.customer_phone, order.customer_name)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1 shadow-2xs cursor-pointer ${
                                  summaryRatio >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  summaryRatio >= 50 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                  'bg-red-100 text-red-800 border border-red-300'
                                }`}
                                title="Click to view full fraud report"
                              >
                                <ShieldCheck size={12} />
                                <span>{summaryRatio}% Success</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenFraudCheck(order.customer_phone, order.customer_name)}
                                className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80 inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="Check delivery success & fraud risk"
                              >
                                <ShieldAlert size={12} className="text-amber-600" />
                                <span>Check Fraud</span>
                              </button>
                            )}
                          </td>
                        )}

                        {/* Items & Total */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="font-bold text-slate-900">৳{order.total_amount?.toLocaleString() || 0}</div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {order.cart_items?.length || 0} items
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenFraudCheck(order.customer_phone, order.customer_name)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Fraud Check"
                            >
                              <ShieldAlert size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingOrder(order);
                                setEditName(order.customer_name || '');
                                setEditPhone(order.customer_phone || '');
                                setEditAddress(order.customer_address || '');
                                setEditOrderNote(order.order_note || '');
                                setEditStatus(getOrderStatus(order));
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Order"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setConvertingOrder(order)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Convert to Active Order"
                            >
                              <ShoppingCart size={16} />
                            </button>
                            <button
                              onClick={() => {
                                const matchIp = (order.customer_address || '').match(/\[IP:\s*([^\]]+)\]/);
                                const ipLine = matchIp ? matchIp[1].trim() : '';
                                setBlockUserDialog({ isOpen: true, phone: getCleanPhoneNumber(order.customer_phone || '') || order.customer_phone || '', ip: ipLine });
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Block Customer (Phone & IP)"
                            >
                              <Ban size={16} />
                            </button>
                            <button
                              onClick={() => setOrderToDelete(order.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Incomplete Order"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* COMPACT CARD VIEW (Optimized for Phones & Small Screens) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
              No incomplete orders found
            </div>
          ) : (
            paginatedOrders.map((order) => {
              const currentStatus = getOrderStatus(order);
              const cachedFraud = getLocalFraudCache(order.customer_phone);
              const summaryRatio = cachedFraud?.data?.summary?.success_ratio ?? (cachedFraud?.data?.summary?.total_parcel ? Math.round(((cachedFraud.data.summary.success_parcel || 0) / cachedFraud.data.summary.total_parcel) * 100) : null);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3 transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">
                      {new Date(order.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      order.order_source?.toLowerCase() === 'tiktok' ? 'bg-slate-900 text-white' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {order.order_source || 'organic'}
                    </span>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{order.customer_name || 'N/A'}</h4>
                      <p className="font-mono font-bold text-xs text-primary">{order.customer_phone || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900 text-sm">৳{order.total_amount?.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-400">{order.cart_items?.length || 0} items</div>
                    </div>
                  </div>

                  {/* Status & Fraud Badge */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as any)}
                      className="px-2 py-1 rounded-full text-[11px] font-bold border border-slate-200 bg-slate-50"
                    >
                      <option value="pending">Pending</option>
                      <option value="hold">Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <button
                      onClick={() => handleOpenFraudCheck(order.customer_phone, order.customer_name)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                        summaryRatio !== null
                          ? summaryRatio >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <ShieldAlert size={12} />
                      <span>{summaryRatio !== null ? `${summaryRatio}% Delivery` : 'Check Fraud'}</span>
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Eye size={14} />
                      <span>View Details</span>
                    </button>
                    <button
                      onClick={() => setConvertingOrder(order)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="Convert to Order"
                    >
                      <ShoppingCart size={14} />
                    </button>
                    <button
                      onClick={() => {
                        const matchIp = (order.customer_address || '').match(/\[IP:\s*([^\]]+)\]/);
                        const ipLine = matchIp ? matchIp[1].trim() : '';
                        setBlockUserDialog({ isOpen: true, phone: getCleanPhoneNumber(order.customer_phone || '') || order.customer_phone || '', ip: ipLine });
                      }}
                      className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl cursor-pointer transition-colors"
                      title="Block User"
                    >
                      <Ban size={16} />
                    </button>
                    <button
                      onClick={() => setOrderToDelete(order.id)}
                      className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl cursor-pointer transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        className="rounded-xl border-t-0 border border-slate-200 shadow-sm mt-6"
      />

      {/* ORDER DETAILS MODAL */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Incomplete Order Details"
      >
        {selectedOrder && (
          <div className="space-y-5">
            {/* Customer & Order Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Customer</span>
                  <h3 className="font-black text-slate-900 text-base">{selectedOrder.customer_name || 'N/A'}</h3>
                  <a
                    href={`tel:${selectedOrder.customer_phone}`}
                    className="font-mono font-bold text-primary text-xs hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Phone size={12} />
                    <span>{selectedOrder.customer_phone || 'N/A'}</span>
                  </a>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Value</span>
                  <div className="font-black text-slate-900 text-lg">৳{selectedOrder.total_amount?.toLocaleString() || 0}</div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase mt-1 ${
                    getOrderStatus(selectedOrder) === 'hold' ? 'bg-orange-100 text-orange-700' :
                    getOrderStatus(selectedOrder) === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {getOrderStatus(selectedOrder)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">DATE & TIME</span>
                  <span className="font-medium text-slate-700">
                    {new Date(selectedOrder.created_at).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">SOURCE</span>
                  <span className="font-bold text-slate-800 uppercase text-[11px]">
                    {selectedOrder.order_source || 'organic'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-bold">SHIPPING ADDRESS</span>
                <p className="text-slate-700 font-medium bg-white p-2.5 rounded-xl border border-slate-200/80 mt-1 text-xs leading-relaxed">
                  {selectedOrder.customer_address || 'No address provided'}
                </p>
              </div>

              {selectedOrder.order_note && (
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">CUSTOMER NOTE</span>
                  <p className="text-amber-900 font-medium bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/70 mt-1 text-xs">
                    {selectedOrder.order_note}
                  </p>
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-primary" /> Cart Items ({selectedOrder.cart_items?.length || 0})
              </h4>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {selectedOrder.cart_items && selectedOrder.cart_items.length > 0 ? (
                  selectedOrder.cart_items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="w-12 h-12 bg-white rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        {item.product?.image || item.product?.images?.[0] ? (
                          <img
                            src={item.product.image || item.product.images[0]}
                            alt={item.product?.title || 'Product'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ShoppingBag size={18} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.product?.title || 'Unknown Product'}</p>
                        {item.product?.selectedVariants && typeof item.product.selectedVariants === 'object' && (
                          <p className="text-[10px] font-bold text-primary bg-primary/10 inline-block px-1.5 py-0.5 rounded mt-0.5">
                            {Object.entries(item.product.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          ৳{item.product?.discount_price || item.product?.price || 0} × {item.quantity || 1}
                        </p>
                      </div>
                      <div className="text-right font-black text-slate-900 text-xs">
                        ৳{((Number(item.product?.discount_price || item.product?.price || 0)) * (item.quantity || 1)).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic p-3 text-center bg-slate-50 rounded-xl">No items in cart</p>
                )}
              </div>
            </div>

            {/* Fraud Check Quick Action */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-600" />
                <span className="text-xs font-bold text-slate-700">Courier Delivery Risk</span>
              </div>
              <button
                onClick={() => handleOpenFraudCheck(selectedOrder.customer_phone, selectedOrder.customer_name)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
              >
                Check Fraud
              </button>
            </div>

            {/* Action Buttons inside modal */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => {
                  const toEdit = selectedOrder;
                  setSelectedOrder(null);
                  setEditingOrder(toEdit);
                  setEditName(toEdit.customer_name || '');
                  setEditPhone(toEdit.customer_phone || '');
                  setEditAddress(toEdit.customer_address || '');
                  setEditOrderNote(toEdit.order_note || '');
                  setEditStatus(getOrderStatus(toEdit));
                }}
                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Pencil size={13} />
                Edit
              </button>
              <button
                onClick={() => {
                  const toConvert = selectedOrder;
                  setSelectedOrder(null);
                  setConvertingOrder(toConvert);
                }}
                className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ShoppingCart size={13} />
                Convert to Order
              </button>
              <button
                onClick={() => {
                  const toBlock = selectedOrder;
                  setSelectedOrder(null);
                  const matchIp = (toBlock.customer_address || '').match(/\[IP:\s*([^\]]+)\]/);
                  const ipLine = matchIp ? matchIp[1].trim() : '';
                  setBlockUserDialog({ isOpen: true, phone: getCleanPhoneNumber(toBlock.customer_phone || '') || toBlock.customer_phone || '', ip: ipLine });
                }}
                className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Ban size={13} />
                Block Customer
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* FRAUD CHECK MODAL */}
      <Modal
        isOpen={fraudModalOpen}
        onClose={() => setFraudModalOpen(false)}
        title="Fraud Check Intelligence"
      >
        <div className="space-y-5">
          {/* Header Info */}
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Customer</span>
              <h3 className="font-black text-slate-900 text-base">{fraudTargetName}</h3>
              <p className="font-mono font-bold text-primary text-xs mt-0.5">{fraudTargetPhone}</p>
            </div>
            <button
              onClick={() => handleOpenFraudCheck(fraudTargetPhone, fraudTargetName, true)}
              disabled={fraudChecking || !apiKey}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Force Live Refresh from BD Courier"
            >
              <RefreshCw size={13} className={fraudChecking ? 'animate-spin' : ''} />
              <span>Re-check Live</span>
            </button>
          </div>

          {fraudChecking ? (
            <div className="py-12 text-center">
              <LoadingSpinner />
              <p className="text-xs text-slate-500 font-bold mt-3">কুরিয়ার ডাটাবেজ থেকে ডেলিভারি হিস্টোরি আনা হচ্ছে...</p>
            </div>
          ) : fraudCheckResult?.error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-start gap-2.5">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <div>
                <p>{fraudCheckResult.error}</p>
                <p className="text-[11px] font-normal text-red-600 mt-1">
                  আপনার কুরিয়ার API Key চেক করতে অ্যাডমিন মেনুর "Courier API" অথবা "Fraud Check" পেজ ভিজিট করুন।
                </p>
              </div>
            </div>
          ) : fraudCheckResult ? (() => {
            const courierBreakdowns = extractCourierBreakdowns(fraudCheckResult);
            const fraudReports = extractFraudReports(fraudCheckResult);
            const summaryRatio = Number(fraudCheckResult.data?.summary?.success_ratio ?? (fraudCheckResult.data?.summary?.total_parcel ? Math.round(((fraudCheckResult.data.summary.success_parcel || 0) / fraudCheckResult.data.summary.total_parcel) * 100) : 100));

            return (
              <div className="space-y-4">
                {/* Overall Score Badge */}
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Overall Delivery Success</span>
                    <div className="text-sm font-bold text-slate-800">ডেলিভারি সফলতার হার</div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-base font-black shadow-xs ${
                    summaryRatio >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    summaryRatio >= 50 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {summaryRatio}% Success
                  </div>
                </div>

                {/* 3 Metrics Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                    <div className="text-[11px] text-slate-500 font-bold uppercase">Total Parcels</div>
                    <div className="text-xl font-black text-slate-900 mt-1">
                      {fraudCheckResult.data?.summary?.total_parcel || 0}
                    </div>
                  </div>
                  <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 text-center">
                    <div className="text-[11px] text-emerald-700 font-bold uppercase">Delivered</div>
                    <div className="text-xl font-black text-emerald-700 mt-1">
                      {fraudCheckResult.data?.summary?.success_parcel || 0}
                    </div>
                  </div>
                  <div className="bg-red-50/60 p-3 rounded-2xl border border-red-200 text-center">
                    <div className="text-[11px] text-red-600 font-bold uppercase">Returned</div>
                    <div className="text-xl font-black text-red-600 mt-1">
                      {fraudCheckResult.data?.summary?.cancelled_parcel || 0}
                    </div>
                  </div>
                </div>

                {/* Courier Breakdown List */}
                {courierBreakdowns.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                      <Truck size={14} className="text-primary" /> Courier Breakdown
                    </h4>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {courierBreakdowns.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <span className="font-bold text-slate-800">{c.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">
                              Total: {c.total_parcel} (✔ {c.success_parcel} / ✖ {c.cancelled_parcel})
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              c.success_ratio >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {c.success_ratio}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fraud Reports List */}
                {fraudReports.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-black uppercase text-red-600 tracking-wider flex items-center gap-1.5">
                      <MessageSquareWarning size={14} /> Merchant Complaints & Fraud Reports ({fraudReports.length})
                    </h4>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {fraudReports.map((r, i) => (
                        <div key={i} className="p-2.5 bg-red-50 rounded-xl border border-red-100 text-xs text-red-800 space-y-1">
                          <div className="flex justify-between font-bold text-[11px]">
                            <span>{r.courierName}</span>
                            <span className="text-slate-400 font-normal">{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-700">{r.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })() : null}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!orderToDelete}
        onClose={() => setOrderToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Incomplete Order"
        message="Are you sure you want to delete this incomplete order? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />

      {/* Convert Confirmation Modal */}
      <ConfirmModal
        isOpen={!!convertingOrder}
        onClose={() => setConvertingOrder(null)}
        onConfirm={handleConvert}
        title="Convert to Active Order"
        message="Are you sure you want to convert this incomplete checkout into a confirmed active order?"
        confirmText="Convert Now"
        isDestructive={false}
      />

      {/* Edit Incomplete Order Modal */}
      <Modal isOpen={!!editingOrder} onClose={() => setEditingOrder(null)} title="Edit Incomplete Order">
        {editingOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold text-sm bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="hold">Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
              <textarea
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Order Note (Optional)</label>
              <textarea
                value={editOrderNote}
                onChange={(e) => setEditOrderNote(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none text-sm"
              />
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-5 py-2 bg-primary text-white hover:bg-primary-hover rounded-xl font-bold text-xs shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>
      {blockUserDialog && (
        <BlockUserDialog
          isOpen={blockUserDialog.isOpen}
          onClose={() => setBlockUserDialog(null)}
          phone={blockUserDialog.phone}
          initialIp={blockUserDialog.ip}
        />
      )}
    </div>
  );
}
