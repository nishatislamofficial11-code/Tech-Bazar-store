import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { ShoppingBag, Eye, X, PackageOpen, Truck, CheckCircle, Copy, Send, Store, Pencil, Plus, Printer, FileText, CheckSquare, Square, RefreshCcw, ShieldAlert, Sparkles, AlertCircle, MessageSquareWarning, UserCheck, History, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { AdminPageSkeleton } from '../../components/ui/AdminPageSkeleton';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { getPremiumOrderId, cleanShippingAddress } from '../../lib/orderUtils';
import { createSteadfastOrder, SteadfastConfig } from '../../lib/steadfastApi';
import { getPathaoAccessToken, createPathaoOrder, PathaoConfig } from '../../lib/pathaoApi';
import { autoResolveBDLocation } from '../../lib/bdLocationMatcher';
import { syncAllDispatchedOrders } from '../../lib/courierSync';
import { sendTelegramOrderNotification } from '../../lib/telegramApi';
import { getCleanPhoneNumber, getLocalFraudCache, checkFraudFromApi, saveOrderFraudResult, extractCourierBreakdowns, extractFraudReports } from '../../lib/fraudCheck';
import { BlockUserDialog } from '../../components/ui/BlockUserDialog';
import { motion } from 'motion/react';
import { DateRangePicker } from '../../components/ui/date-picker';
import { parseDate, CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import type { RangeValue } from 'react-aria-components';
import { Pagination } from '../../components/ui/Pagination';
import { OrderPrintModal } from '../../components/admin/OrderPrintModal';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { name?: string; title?: string; images?: string[]; image?: string };
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  shipping_address: string;
  admin_note?: string;
  created_at: string;
  courier_name?: string;
  courier_consignment_id?: string;
  courier_tracking_code?: string;
  courier_status?: string;
  courier_sent_at?: string;
  courier_response?: any;
  fraud_result?: any;
  profiles?: { email?: string };
  order_items?: OrderItem[];
}

export interface CustomerOrderIntelligence {
  cleanPhone: string;
  isDuplicate: boolean;
  duplicateClusterCount: number;
  duplicateOrderIds: string[];
  duplicateOrders: Order[];
  duplicateReason?: string;
  totalOrdersCount: number;
  isRepeatCustomer: boolean;
  orderSequenceNumber: number;
  deliveredOrdersCount: number;
  cancelledOrdersCount: number;
  totalSpent: number;
  firstOrderDate?: string;
  lastOrderDate?: string;
}

export default function AdminOrders() {
  const nowObj = today(getLocalTimeZone());
  const thirtyDaysAgoObj = nowObj.subtract({ days: 30 });
  const [filterDate, setFilterDate] = useState<RangeValue<CalendarDate> | null>({
    start: thirtyDaysAgoObj,
    end: nowObj
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockUserDialog, setBlockUserDialog] = useState<{ isOpen: boolean; phone?: string; ip?: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderAction, setOrderAction] = useState<{id: string, status: string} | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, filterDate]);
  // Bulk Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkDispatching, setBulkDispatching] = useState<string | null>(null);
  const [syncingStatus, setSyncingStatus] = useState(false);

  // Manual Create Order Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createDeliveryArea, setCreateDeliveryArea] = useState<'Inside Dhaka' | 'Outside Dhaka'>('Inside Dhaka');
  const [createShippingFee, setCreateShippingFee] = useState(60);
  const [createProductId, setCreateProductId] = useState('');
  const [createQuantity, setCreateQuantity] = useState(1);
  const [createPrice, setCreatePrice] = useState(0);

  // Edit Order Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState(0);
  const [editStatus, setEditStatus] = useState('pending');
  const [editAdminNote, setEditAdminNote] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  // Fraud Check State
  const [checkingFraud, setCheckingFraud] = useState(false);
  const [fraudResult, setFraudResult] = useState<any>(null);
  const [sendingCourier, setSendingCourier] = useState<'steadfast' | 'pathao' | null>(null);
  const [aiLocations, setAiLocations] = useState<Record<string, any>>(() => {
    try {
      return JSON.parse(localStorage.getItem('bd_order_ai_locations') || '{}');
    } catch (e) {
      return {};
    }
  });

  // Thermal Slip & Invoice Print State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalOrders, setPrintModalOrders] = useState<Order[]>([]);
  const [printingSlips, setPrintingSlips] = useState(false);

  // Synchronized Dual Horizontal Scrollbar (Top & Bottom Slider)
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState<number>(0);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState<boolean>(false);
  const isSyncingTop = useRef<boolean>(false);
  const isSyncingBottom = useRef<boolean>(false);

  useEffect(() => {
    const updateWidth = () => {
      if (tableRef.current && bottomScrollRef.current) {
        const sWidth = tableRef.current.scrollWidth;
        const cWidth = bottomScrollRef.current.clientWidth;
        setTableScrollWidth(sWidth);
        setHasHorizontalOverflow(sWidth > cWidth);
      }
    };

    updateWidth();
    const timer = setTimeout(updateWidth, 150);

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    if (tableRef.current) resizeObserver.observe(tableRef.current);
    if (bottomScrollRef.current) resizeObserver.observe(bottomScrollRef.current);

    window.addEventListener('resize', updateWidth);
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [orders, currentPage, statusFilter]);

  const handleTopScroll = () => {
    if (isSyncingBottom.current) return;
    isSyncingTop.current = true;
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingTop.current = false;
    });
  };

  const handleBottomScroll = () => {
    if (isSyncingTop.current) return;
    isSyncingBottom.current = true;
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingBottom.current = false;
    });
  };

  const handleOpenPrintModal = async (order: Order) => {
    if (!order.order_items || order.order_items.length === 0) {
      try {
        const { data } = await supabase
          .from('order_items')
          .select('id, quantity, price, variant_options, variant_sku, products(title, image)')
          .eq('order_id', order.id);
        const items = (data || []).map((item: any) => ({
          ...item,
          product: item.products
        }));
        setPrintModalOrders([{ ...order, order_items: items as any }]);
      } catch (e) {
        setPrintModalOrders([order]);
      }
    } else {
      setPrintModalOrders([order]);
    }
    setIsPrintModalOpen(true);
  };

  const handleBulkPrint = async () => {
    if (selectedOrderIds.length === 0) return;
    setPrintingSlips(true);
    try {
      const selected = orders.filter(o => selectedOrderIds.includes(o.id));
      const ordersWithItems = await Promise.all(
        selected.map(async (order) => {
          if (order.order_items && order.order_items.length > 0) return order;
          const { data } = await supabase
            .from('order_items')
            .select('id, quantity, price, variant_options, variant_sku, products(title, image)')
            .eq('order_id', order.id);
          const items = (data || []).map((item: any) => ({
            ...item,
            product: item.products
          }));
          return { ...order, order_items: items as any };
        })
      );
      setPrintModalOrders(ordersWithItems);
      setIsPrintModalOpen(true);
    } catch (e: any) {
      toast.error('Failed to prepare print slips: ' + e.message);
    } finally {
      setPrintingSlips(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Auto-sync live courier statuses in background on load
    syncAllDispatchedOrders().then(res => {
      if (res.updated > 0) fetchOrders();
    });
  }, []);

  // Background AI auto-matcher on order load (Parallel & Cached)
  useEffect(() => {
    if (orders.length > 0) {
      resolveOrdersWithAI();
    }
  }, [orders]);

  const resolveOrdersWithAI = async () => {
    try {
      const { data: settingsData } = await supabase.from('settings').select('*');
      const map: any = {};
      settingsData?.forEach(s => { map[s.key] = s.value; });

      let token = '';
      let config: any = null;
      if (map.pathao_client_id && map.pathao_client_secret) {
        config = {
          clientId: map.pathao_client_id,
          clientSecret: map.pathao_client_secret,
          username: map.pathao_username,
          password: map.pathao_password,
          environment: map.pathao_environment || 'sandbox'
        };
        try {
          const tokData = await getPathaoAccessToken(config);
          token = tokData.access_token;
        } catch (e) {}
      }

      const existingCache = (() => {
        try { return JSON.parse(localStorage.getItem('bd_order_ai_locations') || '{}'); } catch (e) { return {}; }
      })();

      const resolvedEntries = await Promise.all(
        orders.map(async (order) => {
          // If already matched with full details in cache, keep it
          if (existingCache[order.id]?.isMatched && existingCache[order.id]?.areaId) {
            return [order.id, existingCache[order.id]];
          }

          const addressLines = (order.shipping_address || '').split('\n');
          const matchAddress = (order.shipping_address || '').match(/Address:([\s\S]*?)(?=\nDelivery Area:|\nDelivery:|\nShipping Charge:|\nOrder Note:|\n\[TID:|$)/);
          const baseAddress = matchAddress ? matchAddress[1].trim() : '';
          const deliveryArea = addressLines.find((l: string) => l.startsWith('Delivery Area:'))?.replace('Delivery Area:', '').trim();
          const addressLine = baseAddress || order.shipping_address || "";

          try {
            const resolved = await autoResolveBDLocation(addressLine, config, token);
            const isFullyMatched = !!(resolved.cityId && resolved.zoneId && resolved.areaId);

            let label = '';
            if (isFullyMatched) {
              label = `${resolved.zoneName || ''} > ${resolved.areaName || ''}`;
            } else if (resolved.zoneName) {
              label = `${resolved.zoneName} (Select Area)`;
            } else {
              label = 'Needs Area Selection';
            }

            return [
              order.id,
              {
                isMatched: isFullyMatched,
                label,
                cityId: resolved.cityId,
                zoneId: resolved.zoneId,
                areaId: resolved.areaId,
                cityName: resolved.cityName,
                zoneName: resolved.zoneName,
                areaName: resolved.areaName,
                district: resolved.district,
                thana: resolved.thana,
                details: resolved
              }
            ];
          } catch (e) {
            return [order.id, { isMatched: false, label: 'Select Area' }];
          }
        })
      );

      const merged = { ...existingCache, ...Object.fromEntries(resolvedEntries) };
      setAiLocations(merged);
      try {
        localStorage.setItem('bd_order_ai_locations', JSON.stringify(merged));
      } catch (e) {}
    } catch (err) {
      console.warn('AI resolve error:', err);
    }
  };

  const handleSyncCourierStatus = async () => {
    setSyncingStatus(true);
    try {
      const res = await syncAllDispatchedOrders();
      if (res.updated > 0) {
        toast.success(`Updated live status for ${res.updated} orders!`);
        fetchOrders();
      } else {
        toast.success(`Synced ${res.checked} active courier parcels. All statuses are up to date!`);
      }
    } catch (e: any) {
      toast.error('Sync failed: ' + e.message);
    } finally {
      setSyncingStatus(false);
    }
  };

  // Fetch available products for manual order creation
  const fetchProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('id, title, price').order('title', { ascending: true });
      setProductsList(data || []);
      if (data && data.length > 0) {
        setCreateProductId(data[0].id);
        setCreatePrice(data[0].price || 0);
      }
    } catch (e) {
      console.error('Error fetching products:', e);
    }
  };

  const handleOpenCreateModal = () => {
    fetchProducts();
    setCreateName('');
    setCreatePhone('');
    setCreateAddress('');
    setCreateQuantity(1);
    setCreateShippingFee(60);
    setCreateDeliveryArea('Inside Dhaka');
    setIsCreateModalOpen(true);
  };

  const handleProductSelectChange = (prodId: string) => {
    setCreateProductId(prodId);
    const prod = productsList.find(p => p.id === prodId);
    if (prod) {
      setCreatePrice(prod.price || 0);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createPhone.trim() || !createAddress.trim()) {
      toast.error('Please fill in Customer Name, Phone, and Address.');
      return;
    }

    setSavingOrder(true);
    try {
      const shippingAddressStr = `Name: ${createName.trim()}\nPhone: ${createPhone.trim()}\nWhatsApp: ${createPhone.trim()}\nAddress: ${createAddress.trim()}\nDelivery Area: ${createDeliveryArea}\nShipping Charge: ${createShippingFee}`;
      const prodPrice = Number(createPrice || 0);
      const qty = Number(createQuantity || 1);
      const totalAmt = (prodPrice * qty) + Number(createShippingFee || 0);

      // 1. Create order
      const { data: newOrder, error: orderErr } = await supabase.from('orders').insert({
        shipping_address: shippingAddressStr,
        total_amount: totalAmt,
        status: 'pending'
      }).select().single();

      if (orderErr) throw orderErr;

      // 2. Create order_item if product selected
      if (newOrder && createProductId) {
        await supabase.from('order_items').insert({
          order_id: newOrder.id,
          product_id: createProductId,
          quantity: qty,
          price: prodPrice
        });
      }

      // Trigger Telegram Order Notification
      const selectedProd = productsList.find(p => p.id === createProductId);
      sendTelegramOrderNotification({
        orderId: getPremiumOrderId(newOrder),
        customerName: createName.trim(),
        phone: createPhone.trim(),
        address: createAddress.trim(),
        totalAmount: totalAmt,
        shippingFee: Number(createShippingFee || 0),
        deliveryArea: createDeliveryArea,
        items: [{
          title: selectedProd ? (selectedProd.title || selectedProd.name) : 'Manual Item',
          quantity: qty,
          price: prodPrice
        }]
      }).catch(e => console.warn('Telegram notification error:', e));

      toast.success('New Order Created Successfully!');
      setIsCreateModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      toast.error('Failed to create order: ' + err.message);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleOpenEditModal = (order: Order) => {
    const addressLines = (order.shipping_address || '').split('\n');
    const nameLine = addressLines.find((l: string) => l.startsWith('Name:'))?.replace('Name:', '').trim() || '';
    const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '';
    const matchAddress = (order.shipping_address || '').match(/Address:([\s\S]*?)(?=\nDelivery Area:|\nDelivery:|\nShipping Charge:|\nOrder Note:|\n\[TID:|$)/);
      const addressLine = matchAddress ? matchAddress[1].trim() : order.shipping_address || '';

    setEditOrderId(order.id);
    setEditName(nameLine);
    setEditPhone(phoneLine);
    setEditAddress(addressLine);
    setEditTotalAmount(order.total_amount || 0);
    setEditStatus(order.status || 'pending');
    setEditAdminNote(order.admin_note || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrderId) return;

    setSavingOrder(true);
    try {
      const currentOrder = orders.find(o => o.id === editOrderId) || selectedOrder;
      const oldAddress = currentOrder?.shipping_address || '';
      const deliveryAreaMatch = oldAddress.match(/Delivery Area:.*?$/m);
      const shippingChargeMatch = oldAddress.match(/Shipping Charge:.*?$/m);
      const tidMatch = oldAddress.match(/\[TID:.*?\]/);

      let updatedAddress = `Name: ${editName.trim()}\nPhone: ${editPhone.trim()}\nWhatsApp: ${editPhone.trim()}\nAddress: ${editAddress.trim()}`;
      
      if (deliveryAreaMatch) updatedAddress += `\n${deliveryAreaMatch[0]}`;
      if (shippingChargeMatch) updatedAddress += `\n${shippingChargeMatch[0]}`;
      if (tidMatch) updatedAddress += `\n${tidMatch[0]}`;

      const { error } = await supabase
        .from('orders')
        .update({
          shipping_address: updatedAddress,
          total_amount: Number(editTotalAmount || 0),
          status: editStatus,
          admin_note: editAdminNote
        })
        .eq('id', editOrderId);

      if (error) throw error;

      toast.success('Order Updated Successfully!');
      setIsEditModalOpen(false);
      if (selectedOrder && selectedOrder.id === editOrderId) {
        setSelectedOrder(null);
      }
      fetchOrders();
    } catch (err: any) {
      toast.error('Failed to update order: ' + err.message);
    } finally {
      setSavingOrder(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error(`Failed to load orders: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (order: Order) => {
    // Load saved DB fraud result or local cached fraud result
    const addressLines = (order.shipping_address || '').split('\n');
    const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '';
    const cleanPhone = getCleanPhoneNumber(phoneLine);
    const cachedFraud = order.fraud_result || (cleanPhone ? getLocalFraudCache(cleanPhone) : null);
    setFraudResult(cachedFraud || null);

    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id, quantity, price, variant_options, variant_sku,
          products(title, image)
        `)
        .eq('order_id', order.id);
      
      if (error) throw error;
      
      const items = (data || []).map(item => ({
        ...item,
        product: item.products
      }));
      
      setSelectedOrder({ ...order, order_items: items as any });
    } catch (error) {
       console.error('Error fetching order items:', error);
    }
  };

  const requestStatusUpdate = (id: string, status: string) => {
    setOrderAction({ id, status });
  };

  const confirmStatusUpdate = async () => {
    if (!orderAction) return;
    const { id, status } = orderAction;
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
      toast.success('Order status updated');
      fetchOrders();
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder({ ...selectedOrder, status });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
    setOrderAction(null);
  };

  // 1-Click Send to Steadfast
  const handleSendToSteadfast = async (order: any) => {
    if (!order) return;
    setSendingCourier('steadfast');
    try {
      const { data: settingsData } = await supabase.from('settings').select('*');
      const settingsMap: any = {};
      settingsData?.forEach(s => { settingsMap[s.key] = s.value; });

      const apiKey = settingsMap.steadfast_api_key;
      const secretKey = settingsMap.steadfast_secret_key;
      if (!apiKey || !secretKey) {
        toast.error('Steadfast API Key & Secret Key are missing in Courier Settings!');
        return;
      }

      const addressLines = (order.shipping_address || '').split('\n');
      const nameLine = addressLines.find((l: string) => l.startsWith('Name:'))?.replace('Name:', '').trim() || 'Customer';
      const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '01700000000';
      const cleanPhone = phoneLine.replace(/\D/g, '').slice(-11);
      const matchAddress = (order.shipping_address || '').match(/Address:([\s\S]*?)(?=\nDelivery Area:|\nDelivery:|\nShipping Charge:|\nOrder Note:|\n\[TID:|$)/);
        const baseAddress = matchAddress ? matchAddress[1].trim() : 'Dhaka';
      const deliveryArea = addressLines.find((l: string) => l.startsWith('Delivery Area:'))?.replace('Delivery Area:', '').trim();
      const addressLine = baseAddress;

      const shortId = order.id.slice(0, 8).toUpperCase();
      const invoice = `ORD-${shortId}`;

      const config: SteadfastConfig = { apiKey, secretKey, baseUrl: settingsMap.steadfast_base_url };
      const res = await createSteadfastOrder({
        invoice,
        recipient_name: nameLine,
        recipient_phone: cleanPhone.length === 11 ? cleanPhone : '01700000000',
        recipient_address: addressLine,
        cod_amount: Number(order.total_amount || 0),
        note: ''
      }, config);

      if (res && res.consignment) {
        await supabase.from('orders').update({
          courier_name: 'steadfast',
          courier_consignment_id: String(res.consignment.consignment_id),
          courier_tracking_code: res.consignment.tracking_code,
          courier_status: res.consignment.status || 'in_review',
          courier_sent_at: new Date().toISOString(),
          status: 'processing'
        }).eq('id', order.id);

        toast.success(`Dispatched to Steadfast! Tracking: ${res.consignment.tracking_code}`);
        fetchOrders();
        if (selectedOrder && selectedOrder.id === order.id) {
          setSelectedOrder(prev => prev ? {
            ...prev,
            courier_name: 'steadfast',
            courier_consignment_id: String(res.consignment.consignment_id),
            courier_tracking_code: res.consignment.tracking_code,
            courier_status: res.consignment.status || 'in_review',
            status: 'processing'
          } : null);
        }
      }
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('not active')) {
        toast.error('Steadfast Error: আপনার স্টিডফাস্ট কুরিয়ার অ্যাকাউন্ট বা এপিআই কি এখনও Active করা হয়নি। স্টিডফাস্ট প্যানেলে লগইন করুন অথবা স্টিডফাস্ট সাপোর্টে কথা বলে API Active করুন।', { duration: 7000 });
      } else {
        toast.error(`Steadfast Dispatch Error: ${err.message}`);
      }
    } finally {
      setSendingCourier(null);
    }
  };

  // 1-Click Send to Pathao
  const handleSendToPathao = async (order: any) => {
    if (!order) return;
    setSendingCourier('pathao');
    try {
      const { data: settingsData } = await supabase.from('settings').select('*');
      const settingsMap: any = {};
      settingsData?.forEach(s => { settingsMap[s.key] = s.value; });

      const clientId = settingsMap.pathao_client_id;
      const clientSecret = settingsMap.pathao_client_secret;
      const username = settingsMap.pathao_username;
      const password = settingsMap.pathao_password;
      if (!clientId || !clientSecret) {
        toast.error('Pathao Client ID & Secret are missing in Courier Settings!');
        return;
      }

      const addressLines = (order.shipping_address || '').split('\n');
      const nameLine = addressLines.find((l: string) => l.startsWith('Name:'))?.replace('Name:', '').trim() || 'Customer';
      const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '01700000000';
      const cleanPhone = phoneLine.replace(/\D/g, '').slice(-11);
      const matchAddress = (order.shipping_address || '').match(/Address:([\s\S]*?)(?=\nDelivery Area:|\nDelivery:|\nShipping Charge:|\nOrder Note:|\n\[TID:|$)/);
        const baseAddress = matchAddress ? matchAddress[1].trim() : 'Dhaka, Bangladesh';
      const deliveryArea = addressLines.find((l: string) => l.startsWith('Delivery Area:'))?.replace('Delivery Area:', '').trim();
      const addressLine = baseAddress;

      const shortId = order.id.slice(0, 8).toUpperCase();
      const invoice = `ORD-${shortId}`;

      const storeId = settingsMap.pathao_store_id;
      if (!storeId) {
        toast.error('Pathao Store ID অনুপস্থিত! দয়া করে Courier API Settings পেজ থেকে আপনার পাঠাও পিকআপ স্টোর সিলেক্ট করে নিন।');
        return;
      }

      const config: PathaoConfig = {
        clientId, clientSecret, username, password,
        environment: settingsMap.pathao_environment || 'sandbox'
      };

      const tokenData = await getPathaoAccessToken(config);

      // Auto-resolve City, Zone, and Area from customer address
      const resolved = await autoResolveBDLocation(addressLine, config, tokenData.access_token);

      const pathaoPayload: any = {
        store_id: Number(storeId),
        merchant_order_id: invoice,
        recipient_name: nameLine,
        recipient_phone: cleanPhone.length === 11 ? cleanPhone : '01700000000',
        recipient_address: addressLine.length >= 10 ? addressLine : `${addressLine}, Dhaka Bangladesh`,
        delivery_type: 48,
        item_type: 2,
        item_quantity: 1,
        item_weight: 0.5,
        amount_to_collect: Number(order.total_amount || 0)
      };

      if (resolved.cityId) pathaoPayload.recipient_city = resolved.cityId;
      if (resolved.zoneId) pathaoPayload.recipient_zone = resolved.zoneId;
      if (resolved.areaId) pathaoPayload.recipient_area = resolved.areaId;

      const res = await createPathaoOrder(pathaoPayload, config, tokenData.access_token);

      if (res && res.data) {
        await supabase.from('orders').update({
          courier_name: 'pathao',
          courier_consignment_id: String(res.data.consignment_id),
          courier_tracking_code: res.data.consignment_id,
          courier_status: res.data.order_status || 'Pending',
          courier_sent_at: new Date().toISOString(),
          status: 'processing'
        }).eq('id', order.id);

        toast.success(`Dispatched to Pathao! Consignment: ${res.data.consignment_id}`);
        fetchOrders();
        if (selectedOrder && selectedOrder.id === order.id) {
          setSelectedOrder(prev => prev ? {
            ...prev,
            courier_name: 'pathao',
            courier_consignment_id: String(res.data.consignment_id),
            courier_tracking_code: res.data.consignment_id,
            courier_status: res.data.order_status || 'Pending',
            status: 'processing'
          } : null);
        }
      }
    } catch (err: any) {
      toast.error(`Pathao Dispatch Error: ${err.message}`);
    } finally {
      setSendingCourier(null);
    }
  };

  const handleFraudCheck = async (order: Order, forceRecheck: boolean = false) => {
    setCheckingFraud(true);
    try {
      const addressLines = (order.shipping_address || '').split('\n');
      const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '';
      const cleanPhone = getCleanPhoneNumber(phoneLine);
      
      if (!cleanPhone) {
        toast.error('Customer phone number not found in shipping address.');
        setCheckingFraud(false);
        return;
      }

      // Check existing saved/cached fraud check result
      if (!forceRecheck) {
        const saved = order.fraud_result || getLocalFraudCache(cleanPhone);
        if (saved) {
          setFraudResult(saved);
          toast.success('Loaded saved fraud check result (0 tokens used)');
          setCheckingFraud(false);
          return;
        }
      }

      const { data: settingsData } = await supabase.from('settings').select('*').eq('key', 'bd_courier_api_key').single();
      const apiKey = settingsData?.value;
      
      if (!apiKey) {
        toast.error('BD Courier API Key not found. Please set it in Fraud Check Settings.');
        setCheckingFraud(false);
        return;
      }

      const result = await checkFraudFromApi(cleanPhone, apiKey);
      setFraudResult(result);

      await saveOrderFraudResult(order.id, result, cleanPhone);

      // Update state in memory
      setSelectedOrder(prev => prev ? { ...prev, fraud_result: result } : null);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, fraud_result: result } : o));

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Fraud check complete & saved!');
      }
    } catch (err: any) {
      toast.error(`Error checking fraud: ${err.message}`);
    } finally {
      setCheckingFraud(false);
    }
  };

  // Bulk Dispatch Handler
  const handleBulkDispatch = async (courier: 'steadfast' | 'pathao') => {
    if (selectedOrderIds.length === 0) return;
    setBulkDispatching(courier);
    const targetOrders = orders.filter(o => selectedOrderIds.includes(o.id));

    let successCount = 0;
    for (const order of targetOrders) {
      if (courier === 'steadfast') {
        try {
          await handleSendToSteadfast(order);
          successCount++;
        } catch (e) {}
      } else {
        try {
          await handleSendToPathao(order);
          successCount++;
        } catch (e) {}
      }
    }

    setBulkDispatching(null);
    setSelectedOrderIds([]);
    toast.success(`Bulk Dispatch Completed! ${successCount} orders sent to ${courier}.`);
  };

  // Bulk Status Update Handler
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedOrderIds.length === 0 || !newStatus) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .in('id', selectedOrderIds);

      if (error) throw error;
      toast.success(`Updated status of ${selectedOrderIds.length} orders to ${newStatus}`);
      setSelectedOrderIds([]);
      fetchOrders();
    } catch (err: any) {
      toast.error('Bulk update failed: ' + err.message);
    }
  };

  const copyOrderDetails = async (order: Order) => {
    const addressLines = (order.shipping_address || '').split('\n');
    const nameLine = addressLines.find((l: string) => l.startsWith('Name:'))?.replace('Name:', '').trim() || 'N/A';
    const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || 'N/A';
    const matchAddress = (order.shipping_address || '').match(/Address:([\s\S]*?)(?=\nDelivery Area:|\nDelivery:|\nShipping Charge:|\nOrder Note:|\n\[TID:|$)/);
    const addressLine = matchAddress ? matchAddress[1].trim() : 'N/A';

    let itemsText = '';
    
    // Fetch items if not already loaded
    if (!order.order_items) {
      try {
        const { data } = await supabase
          .from('order_items')
          .select('quantity, price, products(title)')
          .eq('order_id', order.id);
          
        if (data && data.length > 0) {
          itemsText = '\nProducts:\n' + data.map((item: any) => {
            const productTitle = Array.isArray(item.products) ? item.products[0]?.title : item.products?.title;
            return `- ${productTitle || 'Unknown Product'} (${item.quantity} x ৳${item.price})`;
          }).join('\n');
        }
      } catch (e) {
        console.error('Failed to fetch items for copy', e);
      }
    } else {
      if (order.order_items.length > 0) {
        itemsText = '\nProducts:\n' + order.order_items.map(item => `- ${item.product?.title || item.product?.name || 'Unknown Product'} (${item.quantity} x ৳${item.price})`).join('\n');
      }
    }

    let courierText = '';
    if (order.courier_name) {
      const cid = order.courier_consignment_id ? `CID: ${order.courier_consignment_id}` : '';
      const trk = order.courier_tracking_code && order.courier_tracking_code !== order.courier_consignment_id ? `Tracking: ${order.courier_tracking_code}` : '';
      const idParts = [cid, trk].filter(Boolean).join(', ');
      courierText = `\nCourier: ${order.courier_name.toUpperCase()}${idParts ? ` (${idParts})` : ''} [${order.courier_status || 'Dispatched'}]`;
    }

    const text = `Name: ${nameLine}\nPhone: ${phoneLine}\nAddress: ${addressLine}${itemsText}\nTotal: ৳${order.total_amount}${courierText}`;
    navigator.clipboard.writeText(text);
    toast.success('Order details copied!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-500/20 shadow-sm">Pending</span>;
      case 'call_verified': return <span className="px-2.5 py-1 bg-teal-500/10 text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-teal-500/20 shadow-sm">Call Verified</span>;
      case 'processing': return <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-500/20 shadow-sm">Processing</span>;
      case 'hold': return <span className="px-2.5 py-1 bg-orange-500/10 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-orange-500/20 shadow-sm">Hold</span>;
      case 'shipped': return <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 shadow-sm">Shipped</span>;
      case 'delivered': return <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-sm">Delivered</span>;
      case 'cancelled': return <span className="px-2.5 py-1 bg-red-500/10 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-500/20 shadow-sm">Cancelled</span>;
      default: return <span className="px-2.5 py-1 bg-slate-500/10 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-500/20 shadow-sm">{status}</span>;
    }
  };

  // Intelligence mapping: Detect duplicates and repeat customer history across all orders
  const orderIntelligenceMap = React.useMemo<Record<string, CustomerOrderIntelligence>>(() => {
    // 1. Group orders by clean phone number
    const phoneGroups: Record<string, Order[]> = {};

    orders.forEach((order) => {
      const addressLines = (order.shipping_address || '').split('\n');
      const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '';
      const cleanPhone = getCleanPhoneNumber(phoneLine);
      if (cleanPhone && cleanPhone.length >= 10) {
        if (!phoneGroups[cleanPhone]) {
          phoneGroups[cleanPhone] = [];
        }
        phoneGroups[cleanPhone].push(order);
      }
    });

    const intelMap: Record<string, CustomerOrderIntelligence> = {};

    orders.forEach((order) => {
      const addressLines = (order.shipping_address || '').split('\n');
      const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '';
      const cleanPhone = getCleanPhoneNumber(phoneLine);

      if (!cleanPhone || cleanPhone.length < 10) {
        intelMap[order.id] = {
          cleanPhone: '',
          isDuplicate: false,
          duplicateClusterCount: 1,
          duplicateOrderIds: [],
          duplicateOrders: [],
          totalOrdersCount: 1,
          isRepeatCustomer: false,
          orderSequenceNumber: 1,
          deliveredOrdersCount: 0,
          cancelledOrdersCount: 0,
          totalSpent: order.total_amount || 0,
        };
        return;
      }

      const customerOrders = (phoneGroups[cleanPhone] || []).slice().sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const totalOrdersCount = customerOrders.length;
      const orderSequenceNumber = customerOrders.findIndex(o => o.id === order.id) + 1;
      const isRepeatCustomer = totalOrdersCount > 1;
      const deliveredOrdersCount = customerOrders.filter(o => o.status === 'delivered').length;
      const cancelledOrdersCount = customerOrders.filter(o => o.status === 'cancelled').length;
      const totalSpent = customerOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? (o.total_amount || 0) : 0), 0);
      const firstOrderDate = customerOrders[0]?.created_at;
      const lastOrderDate = customerOrders[customerOrders.length - 1]?.created_at;

      // Duplicate detection logic:
      // Orders from the same phone number where:
      // 1. Placed within 48 hours of each other (and neither order is cancelled)
      // 2. OR multiple active/unfulfilled orders (pending, call_verified, processing, hold)
      const thisTime = new Date(order.created_at).getTime();
      const duplicateMatches = customerOrders.filter((other) => {
        if (other.id === order.id) return false;
        if (other.status === 'cancelled' || order.status === 'cancelled') return false;

        const otherTime = new Date(other.created_at).getTime();
        const diffHours = Math.abs(thisTime - otherTime) / (1000 * 60 * 60);

        if (diffHours <= 48) return true;

        const unfulfilledStatuses = ['pending', 'call_verified', 'processing', 'hold'];
        if (unfulfilledStatuses.includes(order.status) && unfulfilledStatuses.includes(other.status)) {
          return true;
        }

        return false;
      });

      const isDuplicate = duplicateMatches.length > 0;
      let duplicateReason = '';
      if (isDuplicate) {
        const within48h = duplicateMatches.some(o => Math.abs(thisTime - new Date(o.created_at).getTime()) <= 48 * 3600 * 1000);
        duplicateReason = within48h 
          ? `৪৮ ঘণ্টার মধ্যে ${duplicateMatches.length + 1}টি অর্ডার`
          : `একাধিক অনিষ্পন্ন অর্ডার (${duplicateMatches.length + 1}টি)`;
      }

      intelMap[order.id] = {
        cleanPhone,
        isDuplicate,
        duplicateClusterCount: isDuplicate ? duplicateMatches.length + 1 : 1,
        duplicateOrderIds: duplicateMatches.map(o => o.id),
        duplicateOrders: duplicateMatches,
        duplicateReason,
        totalOrdersCount,
        isRepeatCustomer,
        orderSequenceNumber: orderSequenceNumber > 0 ? orderSequenceNumber : 1,
        deliveredOrdersCount,
        cancelledOrdersCount,
        totalSpent,
        firstOrderDate,
        lastOrderDate,
      };
    });

    return intelMap;
  }, [orders]);

  const statusCounts = {
    all: orders.length,
    duplicates: orders.filter(o => orderIntelligenceMap[o.id]?.isDuplicate).length,
    repeat_customers: orders.filter(o => orderIntelligenceMap[o.id]?.isRepeatCustomer).length,
    pending: orders.filter(o => o.status === 'pending').length,
    call_verified: orders.filter(o => o.status === 'call_verified').length,
    processing: orders.filter(o => o.status === 'processing').length,
    hold: orders.filter(o => o.status === 'hold').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'duplicates') {
      if (!orderIntelligenceMap[order.id]?.isDuplicate) return false;
    } else if (statusFilter === 'repeat_customers') {
      if (!orderIntelligenceMap[order.id]?.isRepeatCustomer) return false;
    } else if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }
    
    if (filterDate && filterDate.start && filterDate.end) {
      const orderDate = new Date(order.created_at);
      const startDate = new Date(filterDate.start.year, filterDate.start.month - 1, filterDate.start.day);
      const endDate = new Date(filterDate.end.year, filterDate.end.month - 1, filterDate.end.day, 23, 59, 59);
      
      if (orderDate < startDate || orderDate > endDate) {
        return false;
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const addressLines = (order.shipping_address || '').toLowerCase();
      const orderId = order.id.toLowerCase();
      const phoneMatch = addressLines.includes(term);
      const idMatch = orderId.includes(term);
      const courierConsignmentMatch = (order.courier_consignment_id || '').toLowerCase().includes(term);
      const courierTrackingMatch = (order.courier_tracking_code || '').toLowerCase().includes(term);
      const courierNameMatch = (order.courier_name || '').toLowerCase().includes(term);
      if (!phoneMatch && !idMatch && !courierConsignmentMatch && !courierTrackingMatch && !courierNameMatch) return false;
    }
    return true;
  });

  const ITEMS_PER_PAGE = 25;
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

  if (loading) {
    return <AdminPageSkeleton variant="table" />;
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12 max-w-7xl mx-auto"
    >
      {/* Page Title & Top Actions */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Order Management</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage orders, dispatch parcels, and track statuses.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Create New Order
          </button>

          <button
            onClick={handleSyncCourierStatus}
            disabled={syncingStatus}
            className="flex items-center gap-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 py-2 rounded-xl transition-all"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${syncingStatus ? 'animate-spin' : ''}`} />
            {syncingStatus ? 'Syncing...' : 'Sync Live Status'}
          </button>

          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-xl transition-all"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </motion.div>

      {/* STATUS FILTER PILLS & SEARCH BAR */}
      <motion.div variants={item} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All', count: statusCounts.all, color: 'bg-slate-100 text-slate-800' },
            { id: 'duplicates', label: '⚠️ Duplicates', count: statusCounts.duplicates, color: 'bg-rose-100 text-rose-800' },
            { id: 'repeat_customers', label: '🔁 Repeat Customers', count: statusCounts.repeat_customers, color: 'bg-purple-100 text-purple-800' },
            { id: 'pending', label: 'Pending', count: statusCounts.pending, color: 'bg-amber-100 text-amber-800' },
            { id: 'call_verified', label: 'Call Verified', count: statusCounts.call_verified, color: 'bg-teal-100 text-teal-800' },
            { id: 'processing', label: 'Processing', count: statusCounts.processing, color: 'bg-blue-100 text-blue-800' },
            { id: 'hold', label: 'Hold', count: statusCounts.hold, color: 'bg-orange-100 text-orange-800' },
            { id: 'shipped', label: 'Shipped', count: statusCounts.shipped, color: 'bg-indigo-100 text-indigo-800' },
            { id: 'delivered', label: 'Delivered', count: statusCounts.delivered, color: 'bg-emerald-100 text-emerald-800' },
            { id: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled, color: 'bg-red-100 text-red-800' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => {
                setStatusFilter(pill.id);
                setSelectedOrderIds([]);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
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

        {/* Search Bar & Date Filter */}
        <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
          <div className="w-full md:w-[260px] relative z-10">
            <DateRangePicker 
              aria-label="Filter by date range"
              value={filterDate}
              onChange={setFilterDate}
            />
          </div>
          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="Search phone, order ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedOrderIds([]);
              }}
              className="w-full pl-3.5 pr-3.5 py-1.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium h-[38px]"
            />
          </div>
        </div>
      </motion.div>

      {/* BULK ACTION BAR */}
      {selectedOrderIds.length > 0 && (
        <motion.div variants={item} className="bg-white border border-primary/20 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-wrap items-center justify-between gap-4 sticky top-4 z-20 transition-all animate-fadeIn ring-1 ring-primary/5">
          <div className="flex items-center gap-4">
            <span className="bg-primary/10 text-primary text-sm font-bold px-4 py-1.5 rounded-full">
              {selectedOrderIds.length} Orders Selected
            </span>
            <button
              onClick={() => setSelectedOrderIds([])}
              className="text-sm font-medium text-gray-500 hover:text-primary transition-colors underline underline-offset-2"
            >
              Clear Selection
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Send to Steadfast */}
            <button
              onClick={() => handleBulkDispatch('steadfast')}
              disabled={bulkDispatching !== null}
              className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
            >
              <Truck className="w-4 h-4" />
              {bulkDispatching === 'steadfast' ? 'Sending...' : 'Send to Steadfast'}
            </button>

            {/* Send to Pathao */}
            <button
              onClick={() => handleBulkDispatch('pathao')}
              disabled={bulkDispatching !== null}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
            >
              <Store className="w-4 h-4" />
              {bulkDispatching === 'pathao' ? 'Sending...' : 'Send to Pathao'}
            </button>

            {/* Bulk Print Thermal Slips */}
            <button
              onClick={handleBulkPrint}
              disabled={printingSlips}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Print POS Thermal Slips or Invoices for selected orders"
            >
              <Printer className="w-4 h-4" />
              {printingSlips ? 'Loading...' : `Print Slips (${selectedOrderIds.length})`}
            </button>

            {/* Bulk Status Selector */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkStatusChange(e.target.value);
                  e.target.value = '';
                }
              }}
              className="bg-gray-50 text-gray-800 border border-gray-200 text-sm font-bold px-4 py-2.5 rounded-xl outline-none cursor-pointer focus:ring-2 focus:ring-primary/20 hover:bg-gray-100 transition-colors"
            >
              <option value="">Change Status To...</option>
              <option value="pending">Mark Pending</option>
              <option value="call_verified">Mark Call Verified</option>
              <option value="processing">Mark Processing</option>
              <option value="hold">Mark Hold</option>
              <option value="shipped">Mark Shipped</option>
              <option value="delivered">Mark Delivered</option>
              <option value="cancelled">Mark Cancelled</option>
            </select>
          </div>
        </motion.div>
      )}

      {/* ORDERS TABLE */}
      <motion.div variants={item} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* TOP SYNCHRONIZED SCROLLBAR (SLIDER) */}
        {hasHorizontalOverflow && (
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            className="overflow-x-auto overflow-y-hidden border-b border-gray-100 bg-gray-50/70 table-horizontal-scrollbar select-none"
            style={{ height: '12px' }}
            title="টেবিল ডানে-বামে স্লাইড করুন"
          >
            <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
          </div>
        )}

        <div 
          ref={bottomScrollRef}
          onScroll={handleBottomScroll}
          className="overflow-x-auto table-horizontal-scrollbar"
        >
          <table ref={tableRef} className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      paginatedOrders.length > 0 &&
                      paginatedOrders.every(o => selectedOrderIds.includes(o.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrderIds(prev => {
                          const newIds = new Set(prev);
                          paginatedOrders.forEach(o => newIds.add(o.id));
                          return Array.from(newIds);
                        });
                      } else {
                        const filteredIdsSet = new Set(paginatedOrders.map(o => o.id));
                        setSelectedOrderIds(prev => prev.filter(id => !filteredIdsSet.has(id)));
                      }
                    }}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer Details</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Courier / Order ID</th>
                <th className="p-4">Source</th>
                <th className="p-4">Date</th>
                <th className="p-4">Order Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedOrders.map((order) => {
                const addressLines = (order.shipping_address || '').split('\n');
                const nameLine = addressLines.find((l: string) => l.startsWith('Name:'))?.replace('Name:', '').trim() || 'Customer';
                const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '';
                const cleanPhone = getCleanPhoneNumber(phoneLine);
                const savedFraud = order.fraud_result || (cleanPhone ? getLocalFraudCache(cleanPhone) : null);

                return (
                  <tr key={order.id} className={`hover:bg-gray-50/50 transition-colors ${selectedOrderIds.includes(order.id) ? 'bg-primary/10/30' : ''}`}>
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds([...selectedOrderIds, order.id]);
                          } else {
                            setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="p-4 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <code className="bg-primary/10 text-primary font-mono text-xs font-bold px-2 py-1 rounded border border-primary/20">
                          {getPremiumOrderId(order)}
                        </code>
                      </div>
                      {order.admin_note && (
                        <div className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded w-max">
                          <FileText className="w-3 h-3" />
                          <span>Note</span>
                        </div>
                      )}
                    </td>

                    <td className="p-4 align-middle">
                      <div className="font-bold text-gray-900">{nameLine}</div>
                      <div className="text-xs text-gray-500 font-mono">{phoneLine}</div>

                      {/* Customer Intelligence Badges */}
                      {(() => {
                        const intel = orderIntelligenceMap[order.id];
                        if (!intel) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {/* Duplicate Badge */}
                            {intel.isDuplicate && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchTerm(intel.cleanPhone || phoneLine);
                                }}
                                title={`ডুপ্লিকেট সন্দেহ! এই ফোন নম্বরে ${intel.duplicateClusterCount}টি অর্ডার রয়েছে। ক্লিক করে ফিল্টার করুন।`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-500 flex-shrink-0 animate-pulse" />
                                <span>ডুপ্লিকেট ({intel.duplicateClusterCount}টি)</span>
                              </button>
                            )}

                            {/* Repeat or New Customer Badge */}
                            {intel.isRepeatCustomer ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchTerm(intel.cleanPhone || phoneLine);
                                }}
                                title={`পুরাতন কাস্টমার! মোট অর্ডার: ${intel.totalOrdersCount}টি (সফল: ${intel.deliveredOrdersCount}টি)। মোট কেনাকাটা: ৳${intel.totalSpent}। ক্লিক করে সব অর্ডার দেখুন।`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer shadow-2xs"
                              >
                                <History className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                <span>পুরাতন কাস্টমার ({intel.orderSequenceNumber}/{intel.totalOrdersCount})</span>
                              </button>
                            ) : (
                              <span 
                                title="এই কাস্টমারের এটি প্রথম অর্ডার"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200/60"
                              >
                                <UserCheck className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                <span>নতুন কাস্টমার</span>
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      {savedFraud?.data?.summary && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            savedFraud.data.summary.success_ratio >= 80 ? 'bg-green-100 text-green-800' :
                            savedFraud.data.summary.success_ratio >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            Success: {savedFraud.data.summary.success_ratio}%
                          </span>
                          {savedFraud.reports && savedFraud.reports.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800" title={`${savedFraud.reports.length} Fraud Reports`}>
                              <ShieldAlert className="w-3 h-3" />
                              {savedFraud.reports.length}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="p-4 align-middle whitespace-nowrap">
                      <div className="font-bold text-primary">৳{order.total_amount?.toFixed(2)}</div>
                    </td>

                    <td className="p-4 align-middle whitespace-nowrap">
                      {order.courier_name ? (
                        <div className="flex flex-col gap-1.5">
                          {/* Provider & Live Status */}
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              order.courier_name.toLowerCase() === 'steadfast'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : order.courier_name.toLowerCase() === 'pathao'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}>
                              <Truck size={10} className="shrink-0" />
                              {order.courier_name}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 capitalize bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                              {order.courier_status || 'Sent'}
                            </span>
                          </div>

                          {/* Courier Consignment ID / Order ID with 1-click Copy */}
                          {(order.courier_consignment_id || order.courier_tracking_code) ? (
                            <div className="flex flex-wrap items-center gap-1">
                              <div className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 transition-colors">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">CID:</span>
                                <code className="text-[11px] font-mono font-black text-slate-900">
                                  {order.courier_consignment_id || order.courier_tracking_code}
                                </code>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const cid = order.courier_consignment_id || order.courier_tracking_code || '';
                                    navigator.clipboard.writeText(cid);
                                    toast.success(`Courier Order ID Copied: ${cid}`);
                                  }}
                                  className="text-slate-400 hover:text-primary transition-colors cursor-pointer p-0.5"
                                  title="Copy Courier Order ID"
                                >
                                  <Copy size={11} />
                                </button>
                              </div>

                              {/* Separate Tracking Code (e.g. Steadfast) */}
                              {order.courier_tracking_code && order.courier_consignment_id && order.courier_tracking_code !== order.courier_consignment_id && (
                                <div className="inline-flex items-center gap-1 bg-amber-50/80 border border-amber-200/80 rounded px-1.5 py-0.5" title="Tracking Code">
                                  <span className="text-[9px] font-bold text-amber-600 uppercase">TRK:</span>
                                  <code className="text-[10px] font-mono font-bold text-amber-800">
                                    {order.courier_tracking_code}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(order.courier_tracking_code || '');
                                      toast.success(`Tracking Code Copied: ${order.courier_tracking_code}`);
                                    }}
                                    className="text-amber-500 hover:text-amber-700 transition-colors cursor-pointer p-0.5"
                                    title="Copy Tracking Code"
                                  >
                                    <Copy size={10} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-medium italic">No Courier ID</span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                          Not Dispatched
                        </span>
                      )}
                    </td>

                    <td className="p-4 align-middle whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        order.order_source?.toLowerCase() === 'facebook' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        order.order_source?.toLowerCase() === 'tiktok' ? 'bg-slate-900 text-white border border-slate-950' :
                        'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {order.order_source || 'organic'}
                      </span>
                    </td>

                    <td className="p-4 align-middle whitespace-nowrap text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>

                    <td className="p-4 align-middle whitespace-nowrap">
                      <select
                        value={order.status}
                        onChange={(e) => requestStatusUpdate(order.id, e.target.value)}
                        className={`pr-7 pl-3 py-1.5 rounded-full text-xs font-bold uppercase cursor-pointer border-0 ring-1 ring-inset focus:ring-2 focus:ring-inset focus:ring-offset-1 appearance-none transition-colors ${
                          order.status === 'pending' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20 focus:ring-yellow-600 hover:bg-yellow-100' :
                          order.status === 'call_verified' ? 'bg-teal-50 text-teal-800 ring-teal-600/20 focus:ring-teal-600 hover:bg-teal-100' :
                          order.status === 'processing' ? 'bg-primary/10 text-primary ring-primary/20 focus:ring-primary hover:bg-primary/20' :
                          order.status === 'hold' ? 'bg-orange-50 text-orange-800 ring-orange-600/20 focus:ring-orange-600 hover:bg-orange-100' :
                          order.status === 'shipped' ? 'bg-indigo-50 text-indigo-800 ring-indigo-600/20 focus:ring-indigo-600 hover:bg-indigo-100' :
                          order.status === 'delivered' ? 'bg-green-50 text-green-800 ring-green-600/20 focus:ring-green-600 hover:bg-green-100' :
                          order.status === 'cancelled' ? 'bg-red-50 text-red-800 ring-red-600/20 focus:ring-red-600 hover:bg-red-100' :
                          'bg-gray-50 text-gray-800 ring-gray-600/20 focus:ring-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="call_verified">Call Verified</option>
                        <option value="processing">Processing</option>
                        <option value="hold">Hold</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    <td className="p-4 align-middle whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenPrintModal(order)}
                          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-lg transition-colors cursor-pointer"
                          title="Print Thermal Slip / Invoice (প্রিন্ট স্লিপ)"
                        >
                          <Printer size={18} />
                        </button>
                        <button
                          onClick={() => copyOrderDetails(order)}
                          className="text-slate-500 hover:bg-slate-50 p-2 rounded-lg transition-colors"
                          title="Copy Order Details"
                        >
                          <Copy size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(order)}
                          className="text-amber-600 hover:bg-amber-50 p-2 rounded-lg transition-colors"
                          title="Edit Order"
                        >
                          <Pencil size={18} />
                        </button>

                        <button
                          onClick={() => {
                            const addressLines = (order.shipping_address || '').split('\n');
                            const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '';
                            const matchIp = (order.shipping_address || '').match(/\[IP:\s*([^\]]+)\]/);
                            const ipLine = matchIp ? matchIp[1].trim() : '';
                            setBlockUserDialog({ isOpen: true, phone: getCleanPhoneNumber(phoneLine) || phoneLine, ip: ipLine });
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Block User"
                        >
                          <ShieldAlert size={18} />
                        </button>

                        <button
                          onClick={() => { setSelectedOrder(order); loadOrderDetails(order); }}
                          className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    No orders found matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </motion.div>

      {/* SINGLE ORDER DETAILS MODAL */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Order Details" maxWidth="max-w-2xl">
        <div className="p-4 md:p-6 text-sm md:text-base space-y-4">
          {selectedOrder && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700">Courier Status:</span>
                {selectedOrder.courier_name ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary uppercase">
                    {selectedOrder.courier_name}: {selectedOrder.courier_status || 'Sent'}
                  </span>
                ) : (
                  <span className="text-xs text-gray-500 font-medium">Not Dispatched</span>
                )}
              </div>
              
              {selectedOrder.admin_note && (
                <div className="w-full mt-2 bg-amber-50 p-2 rounded border border-amber-100 flex gap-2 text-amber-800">
                  <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs block mb-1">Admin Note:</span>
                    <p className="text-sm">{selectedOrder.admin_note}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
                <button
                  onClick={() => handleSendToSteadfast(selectedOrder)}
                  disabled={sendingCourier !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Truck size={14} className={sendingCourier === 'steadfast' ? 'animate-bounce' : ''} />
                  {sendingCourier === 'steadfast' ? 'Sending to Steadfast...' : selectedOrder.courier_name === 'steadfast' ? 'Re-send to Steadfast' : 'Send to Steadfast'}
                </button>

                <button
                  onClick={() => handleSendToPathao(selectedOrder)}
                  disabled={sendingCourier !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Store size={14} className={sendingCourier === 'pathao' ? 'animate-bounce' : ''} />
                  {sendingCourier === 'pathao' ? 'Sending to Pathao...' : selectedOrder.courier_name === 'pathao' ? 'Re-send to Pathao' : 'Send to Pathao'}
                </button>

                <button
                  onClick={() => handleOpenEditModal(selectedOrder)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-all"
                >
                  <Pencil size={14} /> Edit Order
                </button>
                
                <button
                  onClick={() => handleOpenPrintModal(selectedOrder)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Print POS Thermal Slip or A4 Invoice"
                >
                  <Printer size={14} /> Print Slip
                </button>

                <button
                  onClick={() => copyOrderDetails(selectedOrder)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all"
                >
                  <Copy size={14} /> Copy
                </button>
                
                <button
                  onClick={() => handleFraudCheck(selectedOrder, !!fraudResult)}
                  disabled={checkingFraud}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all disabled:opacity-70 ${
                    fraudResult 
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200' 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title={fraudResult ? "Re-check live data from BD Courier (Consumes 1 Token)" : "Check customer delivery history"}
                >
                  <ShieldAlert size={14} className={checkingFraud ? "animate-pulse" : ""} /> 
                  {checkingFraud ? 'Checking...' : fraudResult ? 'Re-check Fraud (1 Token)' : 'Check Fraud'}
                </button>

                <button
                  onClick={() => {
                    const addressLines = (selectedOrder.shipping_address || '').split('\n');
                    const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '';
                    const matchIp = (selectedOrder.shipping_address || '').match(/\[IP:\s*([^\]]+)\]/);
                    const ipLine = matchIp ? matchIp[1].trim() : '';
                    setBlockUserDialog({ isOpen: true, phone: getCleanPhoneNumber(phoneLine) || phoneLine, ip: ipLine });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all"
                  title="Block customer phone & IP"
                >
                  <ShieldAlert size={14} /> Block Customer
                </button>
              </div>
            </div>
          )}

          {/* COURIER DISPATCH INFORMATION CARD */}
          {selectedOrder?.courier_name && (
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                    selectedOrder.courier_name.toLowerCase() === 'steadfast'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : selectedOrder.courier_name.toLowerCase() === 'pathao'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-primary/20 text-primary border border-primary/30'
                  }`}>
                    <Truck size={13} />
                    {selectedOrder.courier_name} Courier
                  </span>
                  <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 capitalize">
                    Live Status: {selectedOrder.courier_status || 'Dispatched'}
                  </span>
                </div>
                {selectedOrder.courier_sent_at && (
                  <span className="text-xs text-slate-500 font-medium">
                    Dispatched: {new Date(selectedOrder.courier_sent_at).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Courier Order / Consignment ID */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider mb-0.5">
                      Courier Order / Consignment ID (CID)
                    </span>
                    <code className="text-sm font-mono font-black text-slate-900 select-all">
                      {selectedOrder.courier_consignment_id || selectedOrder.courier_tracking_code || 'N/A'}
                    </code>
                  </div>
                  {(selectedOrder.courier_consignment_id || selectedOrder.courier_tracking_code) && (
                    <button
                      type="button"
                      onClick={() => {
                        const cid = selectedOrder.courier_consignment_id || selectedOrder.courier_tracking_code || '';
                        navigator.clipboard.writeText(cid);
                        toast.success(`Courier Order ID Copied: ${cid}`);
                      }}
                      className="p-2 text-slate-500 hover:text-primary hover:bg-slate-50 rounded-lg border border-slate-200 transition-all cursor-pointer"
                      title="Copy Courier Order ID"
                    >
                      <Copy size={15} />
                    </button>
                  )}
                </div>

                {/* Courier Tracking Code */}
                {selectedOrder.courier_tracking_code && (
                  <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-600 block tracking-wider mb-0.5">
                        Courier Tracking Code (TRK)
                      </span>
                      <code className="text-sm font-mono font-black text-amber-900 select-all">
                        {selectedOrder.courier_tracking_code}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedOrder.courier_tracking_code || '');
                        toast.success(`Tracking Code Copied: ${selectedOrder.courier_tracking_code}`);
                      }}
                      className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg border border-amber-200 transition-all cursor-pointer"
                      title="Copy Tracking Code"
                    >
                      <Copy size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DUPLICATE ORDER ALERT BANNER */}
          {selectedOrder && orderIntelligenceMap[selectedOrder.id]?.isDuplicate && (() => {
            const intel = orderIntelligenceMap[selectedOrder.id];
            return (
              <div className="bg-rose-50/90 border-2 border-rose-300 rounded-2xl p-4 shadow-sm animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-xl flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <h4 className="font-black text-rose-900 text-sm flex items-center gap-1.5">
                        ⚠️ সম্ভাব্য ডুপ্লিকেট অর্ডার শনাক্ত হয়েছে!
                      </h4>
                      <span className="text-xs font-black bg-rose-200 text-rose-800 px-2.5 py-0.5 rounded-full">
                        মোট {intel.duplicateClusterCount}টি অর্ডার
                      </span>
                    </div>
                    <p className="text-xs font-medium text-rose-700 mt-1">
                      {intel.duplicateReason || 'একই ফোন নম্বর থেকে স্বল্প সময়ের ব্যবধানে একাধিক অর্ডার করা হয়েছে।'}
                    </p>

                    <div className="mt-3 pt-3 border-t border-rose-200 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                        একই কাস্টমারের অন্যান্য অর্ডারসমূহ (ক্লিক করে বিস্তারিত দেখুন):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {intel.duplicateOrders.map((dup) => (
                          <button
                            key={dup.id}
                            type="button"
                            onClick={() => {
                              setSelectedOrder(dup);
                              loadOrderDetails(dup);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-rose-100/70 border border-rose-300 rounded-xl text-xs font-mono font-bold text-rose-900 transition-all shadow-xs cursor-pointer"
                            title="এই অর্ডারের বিস্তারিত দেখতে ক্লিক করুন"
                          >
                            <span className="text-primary font-bold">{getPremiumOrderId(dup)}</span>
                            <span className="text-[10px] font-sans font-bold px-1.5 py-0.2 rounded-md bg-slate-100 border border-slate-200 text-slate-700 uppercase">
                              {dup.status}
                            </span>
                            <span className="text-[11px] font-sans font-black text-emerald-700">
                              ৳{dup.total_amount}
                            </span>
                            <span className="text-[10px] font-sans text-gray-500">
                              {new Date(dup.created_at).toLocaleDateString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* CUSTOMER LOYALTY & REPEAT ORDER INTELLIGENCE */}
          {selectedOrder && orderIntelligenceMap[selectedOrder.id] && (() => {
            const intel = orderIntelligenceMap[selectedOrder.id];
            return (
              <div className={`p-4 rounded-2xl border shadow-xs ${
                intel.isRepeatCustomer 
                  ? 'bg-purple-50/70 border-purple-200' 
                  : 'bg-emerald-50/50 border-emerald-100'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-slate-200/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    {intel.isRepeatCustomer ? (
                      <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                        <History className="w-4 h-4 text-purple-600" />
                      </div>
                    ) : (
                      <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">
                        {intel.isRepeatCustomer ? 'পুরাতন কাস্টমার হিস্ট্রি (Repeat Customer)' : 'নতুন কাস্টমার (First-Time Buyer)'}
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium">
                        {intel.isRepeatCustomer 
                          ? `এই কাস্টমার ইতিপূর্বে আমাদের থেকে অর্ডার করেছেন।` 
                          : 'এই কাস্টমারের এটি প্রথম অর্ডার।'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                      intel.isRepeatCustomer
                        ? 'bg-purple-200 text-purple-800'
                        : 'bg-emerald-200 text-emerald-800'
                    }`}>
                      {intel.isRepeatCustomer 
                        ? `${intel.orderSequenceNumber}ম অর্ডার (মোট ${intel.totalOrdersCount}টি)` 
                        : '১ম অর্ডার'}
                    </span>
                    {intel.isRepeatCustomer && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrder(null);
                          setSearchTerm(intel.cleanPhone);
                        }}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors shadow-2xs cursor-pointer"
                        title="এই কাস্টমারের সব অর্ডার টেবিলে ফিল্টার করুন"
                      >
                        সব অর্ডার দেখুন ↗
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">মোট অর্ডার</div>
                    <div className="text-lg font-black text-slate-800 mt-0.5">{intel.totalOrdersCount}টি</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">সফল ডেলিভারি</div>
                    <div className="text-lg font-black text-emerald-600 mt-0.5">{intel.deliveredOrdersCount}টি</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                    <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">বাতিল অর্ডার</div>
                    <div className="text-lg font-black text-rose-600 mt-0.5">{intel.cancelledOrdersCount}টি</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider">লাইফটাইম কেনাকাটা</div>
                    <div className="text-lg font-black text-primary mt-0.5">৳{intel.totalSpent.toFixed(0)}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Customer Info</h3>
              <p className="text-gray-600">{selectedOrder?.profiles?.email || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">Order Info</h3>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-500 text-sm">ID:</span>
                <code className="bg-primary/10 text-primary px-2 py-1 rounded-md font-mono text-xs font-bold border border-primary/20">
                  {selectedOrder ? getPremiumOrderId(selectedOrder) : ''}
                </code>
              </div>
              <p className="text-gray-600 mb-1"><span className="text-gray-500 text-sm">Date:</span> {selectedOrder?.created_at && new Date(selectedOrder.created_at).toLocaleString()}</p>
              <p className="text-gray-600"><span className="text-gray-500 text-sm">Total:</span> <span className="font-bold text-primary text-lg">৳{selectedOrder?.total_amount?.toFixed(2)}</span></p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Shipping Address</h3>
            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-line border border-gray-100">
              {cleanShippingAddress(selectedOrder?.shipping_address || 'No address provided')}
            </p>
          </div>
          
          {/* Fraud Check Result display inside order modal */}
          {fraudResult && (() => {
            const courierBreakdowns = extractCourierBreakdowns(fraudResult);
            const fraudReports = extractFraudReports(fraudResult);
            const summaryRatio = Number(fraudResult.data?.summary?.success_ratio ?? (fraudResult.data?.summary?.total_parcel ? Math.round(((fraudResult.data.summary.success_parcel || 0) / fraudResult.data.summary.total_parcel) * 100) : 100));

            // Group reports by courier
            const groupedReports = fraudReports.reduce((acc: any, report) => {
              const courier = report.courierName || 'Unknown Courier';
              if (!acc[courier]) acc[courier] = [];
              acc[courier].push(report);
              return acc;
            }, {});

            return (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4 animate-fadeIn">
                <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-slate-700" />
                    Fraud Check Result
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      Saved Result
                    </span>
                  </h3>
                  {fraudResult.checkedAt && (
                    <span className="text-[11px] text-gray-500 font-medium">
                      Checked: {new Date(fraudResult.checkedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                
                {fraudResult.error ? (
                  <div className="text-red-600 text-sm font-medium">
                    {fraudResult.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Overall Summary Bar */}
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">Overall Success Ratio:</span>
                        <span className="text-xs text-gray-400">(All Couriers Combined)</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                        summaryRatio >= 80 ? 'bg-green-100 text-green-800' :
                        summaryRatio >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {summaryRatio}%
                      </span>
                    </div>
                    
                    {/* KPI Stat Boxes */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100 text-center shadow-xs">
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">Total Parcels</div>
                        <div className="text-lg font-black text-primary">{fraudResult.data?.summary?.total_parcel ?? 0}</div>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100 text-center shadow-xs">
                        <div className="text-[10px] text-emerald-600 font-bold uppercase mb-0.5">Success Delivered</div>
                        <div className="text-lg font-black text-emerald-600">{fraudResult.data?.summary?.success_parcel ?? 0}</div>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100 text-center shadow-xs">
                        <div className="text-[10px] text-red-500 font-bold uppercase mb-0.5">Cancelled / Return</div>
                        <div className="text-lg font-black text-red-600">{fraudResult.data?.summary?.cancelled_parcel ?? 0}</div>
                      </div>
                    </div>

                    {/* COURIER-WISE BREAKDOWN */}
                    {courierBreakdowns.length > 0 && (
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2.5">
                          <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-primary" />
                            কুরিয়ার ভিত্তিক ডেলিভারি হিসাব ({courierBreakdowns.length} Couriers)
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {courierBreakdowns.map((courier, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200/90 shadow-xs hover:border-primary/40 transition-all">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-gray-900 truncate flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-primary" />
                                  {courier.name}
                                </span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  courier.success_ratio >= 80 ? 'bg-green-100 text-green-800' :
                                  courier.success_ratio >= 50 ? 'bg-amber-100 text-amber-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {courier.success_ratio}%
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-1 text-center bg-gray-50/80 p-1.5 rounded-lg text-xs">
                                <div>
                                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Total</span>
                                  <span className="font-bold text-gray-800">{courier.total_parcel}</span>
                                </div>
                                <div>
                                  <span className="text-emerald-600 block text-[9px] uppercase font-bold">Success</span>
                                  <span className="font-bold text-emerald-600">{courier.success_parcel}</span>
                                </div>
                                <div>
                                  <span className="text-red-500 block text-[9px] uppercase font-bold">Cancel</span>
                                  <span className="font-bold text-red-600">{courier.cancelled_parcel}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Fraud Reports Beautiful Section */}
                    {fraudReports.length > 0 && (
                      <div className="mt-5 pt-5 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                            <MessageSquareWarning className="w-4 h-4 text-red-500" /> 
                            Fraud Reports History
                          </h4>
                          <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-red-200 shadow-sm flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                            {fraudReports.length} Record{fraudReports.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          {Object.entries(groupedReports).map(([courier, reports]: [string, any], idx) => (
                            <div key={idx} className="bg-white rounded-xl border border-red-100 overflow-hidden shadow-xs">
                              <div className="bg-red-50/70 px-3 py-2 border-b border-red-100 flex justify-between items-center">
                                <h5 className="font-bold text-red-800 flex items-center gap-1.5 text-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                  {courier}
                                </h5>
                                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                                  {reports.length} Report{reports.length > 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="divide-y divide-gray-100">
                                {reports.map((report: any, rIdx: number) => {
                                  let dateStr = 'Unknown Date';
                                  try {
                                    const d = new Date(report.created_at);
                                    if (!isNaN(d.getTime())) {
                                      dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                    }
                                  } catch(e) {}
                                  
                                  return (
                                    <div key={rIdx} className="p-3 hover:bg-gray-50/80 transition-colors">
                                      <div className="flex items-start justify-between mb-1.5">
                                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                          {dateStr}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-700 font-medium leading-relaxed pl-2.5 border-l-2 border-red-200">
                                        "{report.details}"
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Items</h3>
            {selectedOrder?.order_items ? (
              <div className="border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-100">
                {selectedOrder.order_items.map(item => (
                  <div key={item.id} className="flex gap-4 p-3 bg-white items-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                      {item.product?.image || item.product?.images?.[0] ? (
                        <img src={item.product.image || item.product.images[0]} alt={item.product.title || item.product.name} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{item.product?.title || item.product?.name || 'Unknown Product'}</p>
                      {item.variant_options && typeof item.variant_options === 'object' && (
                        <p className="text-[11px] font-bold text-primary bg-primary/10 inline-block px-1.5 py-0.5 rounded mt-0.5">
                          {Object.entries(item.variant_options).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                        </p>
                      )}
                      <p className="text-gray-500 text-sm mt-0.5">Qty: {item.quantity} × ৳{item.price}</p>
                    </div>
                    <div className="font-bold text-gray-800">
                      ৳{(item.quantity * item.price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Loading items...</p>
            )}
          </div>
        </div>
      </Modal>

      {/* MANUAL CREATE NEW ORDER MODAL */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Manual Order" maxWidth="max-w-xl">
        <form onSubmit={handleCreateOrder} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Customer Full Name *</label>
              <input
                type="text"
                required
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder="e.g. Rahim Ahmed"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={createPhone}
                onChange={e => setCreatePhone(e.target.value)}
                placeholder="e.g. 01700000000"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Full Shipping Address *</label>
            <textarea
              required
              rows={2}
              value={createAddress}
              onChange={e => setCreateAddress(e.target.value)}
              placeholder="House/Road, Area, City/Thana"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Delivery Area</label>
              <select
                value={createDeliveryArea}
                onChange={e => {
                  const area = e.target.value as any;
                  setCreateDeliveryArea(area);
                  setCreateShippingFee(area === 'Inside Dhaka' ? 60 : 120);
                }}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="Inside Dhaka">Inside Dhaka (৳60)</option>
                <option value="Outside Dhaka">Outside Dhaka (৳120)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Shipping Fee (৳)</label>
              <input
                type="number"
                value={createShippingFee}
                onChange={e => setCreateShippingFee(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <label className="block text-xs font-bold text-gray-700 mb-1">Select Product</label>
            <select
              value={createProductId}
              onChange={e => handleProductSelectChange(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none mb-3"
            >
              {productsList.map(p => (
                <option key={p.id} value={p.id}>{p.title || p.name} — ৳{p.price}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={createQuantity}
                  onChange={e => setCreateQuantity(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Unit Price (৳)</label>
                <input
                  type="number"
                  value={createPrice}
                  onChange={e => setCreatePrice(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 flex items-center justify-between text-sm font-bold text-primary-hover">
            <span>Total Payable Amount:</span>
            <span className="text-base font-mono text-primary-hover">
              ৳{((Number(createPrice || 0) * Number(createQuantity || 1)) + Number(createShippingFee || 0)).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={savingOrder}
              className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow transition-all disabled:opacity-50"
            >
              {savingOrder ? 'Saving Order...' : 'Create Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT EXISTING ORDER MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Order Details" maxWidth="max-w-xl">
        <form onSubmit={handleSaveEditOrder} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Shipping Address</label>
            <textarea
              required
              rows={3}
              value={editAddress}
              onChange={e => setEditAddress(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Total Amount (৳)</label>
              <input
                type="number"
                required
                value={editTotalAmount}
                onChange={e => setEditTotalAmount(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase text-sm font-bold"
              >
                <option value="pending">Pending</option>
                <option value="call_verified">Call Verified</option>
                <option value="processing">Processing</option>
                <option value="hold">Hold</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-500" /> 
              Admin Note (Private)
            </label>
            <textarea
              value={editAdminNote}
              onChange={(e) => setEditAdminNote(e.target.value)}
              rows={2}
              placeholder="Private note for admins..."
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-amber-500 bg-amber-50/30 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={savingOrder}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition-all disabled:opacity-50"
            >
              {savingOrder ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM STATUS CHANGE MODAL */}
      <ConfirmModal
        isOpen={!!orderAction}
        onClose={() => setOrderAction(null)}
        onConfirm={confirmStatusUpdate}
        title="Update Order Status"
        message={`Are you sure you want to update status to '${orderAction?.status}'?`}
      />

      {blockUserDialog && (
        <BlockUserDialog
          isOpen={blockUserDialog.isOpen}
          onClose={() => setBlockUserDialog(null)}
          phone={blockUserDialog.phone || ''}
          initialIp={blockUserDialog.ip}
          onSuccess={() => fetchOrders()}
        />
      )}

      {/* ORDER PRINT MODAL (THERMAL & INVOICE) */}
      <OrderPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        orders={printModalOrders}
      />
    </motion.div>
  );
}
