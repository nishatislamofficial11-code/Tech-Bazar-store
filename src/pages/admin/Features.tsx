import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { 
  Save, Plus, Trash2, ArrowUp, ArrowDown, LayoutTemplate,
  ShieldCheck, Truck, RefreshCcw, Headset, Banknote, Package,
  Star, Clock, CreditCard, Zap, Award, CheckCircle2, Gift,
  Heart, Lock, MapPin, Percent, PhoneCall, ShoppingBag,
  Sparkles, ThumbsUp, BadgePercent, ShieldAlert, Globe,
  Smile, Flame, CircleDollarSign, Layers, Box, Send, Wallet,
  BadgeCheck, RotateCcw, HelpCircle, X, Search, Smartphone,
  Monitor, Check, Eye
} from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

// Icon Registry with categories for the Visual Icon Picker
const ICON_REGISTRY: Array<{
  name: string;
  label: string;
  category: 'delivery' | 'trust' | 'payment' | 'support';
  icon: React.ComponentType<any>;
}> = [
  // Delivery & Shipping
  { name: 'Truck', label: 'Fast Delivery', category: 'delivery', icon: Truck },
  { name: 'Package', label: 'Package Box', category: 'delivery', icon: Package },
  { name: 'Box', label: 'Parcel Box', category: 'delivery', icon: Box },
  { name: 'Send', label: 'Express Dispatch', category: 'delivery', icon: Send },
  { name: 'Clock', label: 'Fast Time', category: 'delivery', icon: Clock },
  { name: 'MapPin', label: 'Location Tracking', category: 'delivery', icon: MapPin },
  { name: 'Zap', label: 'Instant / Express', category: 'delivery', icon: Zap },
  { name: 'Globe', label: 'Nationwide Delivery', category: 'delivery', icon: Globe },

  // Trust, Quality & Security
  { name: 'ShieldCheck', label: '100% Authentic / Secure', category: 'trust', icon: ShieldCheck },
  { name: 'BadgeCheck', label: 'Verified Seller', category: 'trust', icon: BadgeCheck },
  { name: 'CheckCircle2', label: 'Quality Guarantee', category: 'trust', icon: CheckCircle2 },
  { name: 'Award', label: 'Top Rated Award', category: 'trust', icon: Award },
  { name: 'Star', label: 'Premium Quality', category: 'trust', icon: Star },
  { name: 'Lock', label: 'Safe & Secure', category: 'trust', icon: Lock },
  { name: 'ThumbsUp', label: 'Customer Satisfaction', category: 'trust', icon: ThumbsUp },
  { name: 'ShieldAlert', label: 'Buyer Protection', category: 'trust', icon: ShieldAlert },
  { name: 'Sparkles', label: 'Exclusive Items', category: 'trust', icon: Sparkles },

  // Payment & Pricing
  { name: 'Banknote', label: 'Cash on Delivery', category: 'payment', icon: Banknote },
  { name: 'CreditCard', label: 'Card Payment', category: 'payment', icon: CreditCard },
  { name: 'Wallet', label: 'Digital Wallet', category: 'payment', icon: Wallet },
  { name: 'CircleDollarSign', label: 'Best Price', category: 'payment', icon: CircleDollarSign },
  { name: 'BadgePercent', label: 'Special Discount', category: 'payment', icon: BadgePercent },
  { name: 'Percent', label: 'Percentage Off', category: 'payment', icon: Percent },
  { name: 'Gift', label: 'Gift Offers', category: 'payment', icon: Gift },
  { name: 'ShoppingBag', label: 'Authentic Shopping', category: 'payment', icon: ShoppingBag },
  { name: 'Flame', label: 'Hot Deals', category: 'payment', icon: Flame },

  // Support & Returns
  { name: 'RefreshCcw', label: 'Easy Returns', category: 'support', icon: RefreshCcw },
  { name: 'RotateCcw', label: '7-Day Return', category: 'support', icon: RotateCcw },
  { name: 'Headset', label: '24/7 Support', category: 'support', icon: Headset },
  { name: 'PhoneCall', label: 'Call Assistance', category: 'support', icon: PhoneCall },
  { name: 'Heart', label: 'Customer Care', category: 'support', icon: Heart },
  { name: 'Smile', label: 'Happy Customers', category: 'support', icon: Smile },
];

const ICON_MAP = ICON_REGISTRY.reduce((acc, curr) => {
  acc[curr.name] = curr.icon;
  return acc;
}, {} as Record<string, React.ComponentType<any>>);

export default function AdminFeatures() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tab: 'store' (Home Page) | 'delivery' (Product Page) | 'preview' (Live Simulation)
  const [activeTab, setActiveTab] = useState<'store' | 'delivery' | 'preview'>('store');

  // Preview device mode
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Icon Picker Modal State
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ listType: 'store' | 'delivery'; index: number } | null>(null);
  const [searchIconQuery, setSearchIconQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'delivery' | 'trust' | 'payment' | 'support'>('all');
  
  const defaultDeliveryServices = [
    { id: 'standard', icon: 'Truck', title: 'Standard Delivery', desc: '3-5 working days. Shipping calculated at checkout.', enabled: true },
    { id: 'cod', icon: 'Banknote', title: 'Cash on Delivery', desc: 'Available for all orders across Bangladesh.', enabled: true },
    { id: 'return', icon: 'RefreshCcw', title: '7 Days Return', desc: 'If product is defective or not as described.', enabled: true },
    { id: 'warranty', icon: 'ShieldCheck', title: 'Warranty Setup', desc: '1 Year official manufacturer warranty.', enabled: true }
  ];

  const defaultStoreFeatures = [
    { id: 'authentic', icon: 'ShieldCheck', title: '100% Authentic', desc: 'Verified sellers only', enabled: true },
    { id: 'fast', icon: 'Truck', title: 'Fast Delivery', desc: 'Across Bangladesh', enabled: true },
    { id: 'returns', icon: 'RefreshCcw', title: 'Easy Returns', desc: '7-day return policy', enabled: true },
    { id: 'support', icon: 'Headset', title: '24/7 Support', desc: 'Always here to help', enabled: true }
  ];
  
  const [deliveryServices, setDeliveryServices] = useState<any[]>(defaultDeliveryServices);
  const [storeFeatures, setStoreFeatures] = useState<any[]>(defaultStoreFeatures);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('settings').select('*').in('key', ['delivery_services', 'store_features']);
      
      if (!error && data) {
        data.forEach((item) => {
          try {
            if (item.key === 'delivery_services' && item.value) {
              setDeliveryServices(JSON.parse(item.value));
            }
            if (item.key === 'store_features' && item.value) {
              setStoreFeatures(JSON.parse(item.value));
            }
          } catch (e) {}
        });
      }
    } catch (err) {
      console.error('Error fetching features:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    
    try {
      const itemsToSave = [
        { key: 'delivery_services', value: JSON.stringify(deliveryServices) },
        { key: 'store_features', value: JSON.stringify(storeFeatures) }
      ];
      
      for (const item of itemsToSave) {
        const { data: existing } = await supabase.from('settings').select('id').eq('key', item.key).single();
        
        if (existing) {
          await supabase.from('settings').update({ value: item.value }).eq('key', item.key);
        } else {
          await supabase.from('settings').insert([item]);
        }
      }
      
      toast.success('Site features and services saved successfully!');
    } catch (err: any) {
      toast.error(`Failed to save features: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const addItem = (listType: 'store' | 'delivery') => {
    const newItem = {
      id: Date.now().toString(),
      icon: listType === 'store' ? 'ShieldCheck' : 'Truck',
      title: 'New Feature Title',
      desc: 'Short descriptive guarantee',
      enabled: true
    };
    if (listType === 'store') {
      setStoreFeatures([...storeFeatures, newItem]);
    } else {
      setDeliveryServices([...deliveryServices, newItem]);
    }
    toast.success('New feature item added!');
  };

  const removeItem = (listType: 'store' | 'delivery', index: number) => {
    if (listType === 'store') {
      const copy = [...storeFeatures];
      copy.splice(index, 1);
      setStoreFeatures(copy);
    } else {
      const copy = [...deliveryServices];
      copy.splice(index, 1);
      setDeliveryServices(copy);
    }
  };

  const updateItem = (listType: 'store' | 'delivery', index: number, key: string, value: any) => {
    if (listType === 'store') {
      const copy = [...storeFeatures];
      copy[index][key] = value;
      setStoreFeatures(copy);
    } else {
      const copy = [...deliveryServices];
      copy[index][key] = value;
      setDeliveryServices(copy);
    }
  };

  const moveItem = (listType: 'store' | 'delivery', index: number, direction: 'up' | 'down') => {
    const list = listType === 'store' ? [...storeFeatures] : [...deliveryServices];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    if (listType === 'store') setStoreFeatures(list);
    else setDeliveryServices(list);
  };

  const openIconPicker = (listType: 'store' | 'delivery', index: number) => {
    setPickerTarget({ listType, index });
    setSearchIconQuery('');
    setSelectedCategory('all');
    setIconPickerOpen(true);
  };

  const selectIcon = (iconName: string) => {
    if (pickerTarget) {
      updateItem(pickerTarget.listType, pickerTarget.index, 'icon', iconName);
      toast.success(`Selected "${iconName}" icon!`);
    }
    setIconPickerOpen(false);
  };

  const filteredIcons = useMemo(() => {
    return ICON_REGISTRY.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchIconQuery.toLowerCase()) ||
                            item.label.toLowerCase().includes(searchIconQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchIconQuery, selectedCategory]);

  const activeStoreCount = storeFeatures.filter(f => f.enabled).length;
  const activeDeliveryCount = deliveryServices.filter(f => f.enabled).length;

  return (
    <div className="max-w-6xl mx-auto pb-16 px-4 sm:px-6">
      
      {/* 1. Header & Actions */}
      <div className="pt-2 pb-6 border-b border-slate-200/80 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admin Workspace</span>
            <span className="text-slate-300">/</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Storefront Features Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Site Features & Trust Badges
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Visually manage homepage service badges, warranty guarantees, and product page delivery policies.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => addItem(activeTab === 'delivery' ? 'delivery' : 'store')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>Add Feature</span>
          </button>

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16">
          <LoadingSpinner message="Loading feature studio..." />
        </div>
      ) : (
        <div className="space-y-8">

          {/* 2. Telemetry Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-blue-200 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Home Features</div>
                <div className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  {activeStoreCount} Active / {storeFeatures.length} Total
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-emerald-200 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Product Services</div>
                <div className="text-sm font-black text-emerald-700">
                  {activeDeliveryCount} Active / {deliveryServices.length} Total
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-purple-200 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Visual Icon Catalog</div>
                <div className="text-sm font-black text-slate-800">
                  {ICON_REGISTRY.length}+ Icons Ready
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5 hover:border-amber-200 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Storefront Status</div>
                <div className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  Dynamic Sync
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Branded Segmented Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => setActiveTab('store')}
              className={`text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                activeTab === 'store'
                  ? 'bg-blue-50/70 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <LayoutTemplate className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {activeStoreCount} Badges
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900">Store Features (Home Page)</div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">Trust strip below the hero slider</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('delivery')}
              className={`text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                activeTab === 'delivery'
                  ? 'bg-emerald-50/70 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  {activeDeliveryCount} Services
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900">Delivery & Services (Product Page)</div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">Guarantee cards on product details</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-purple-50/70 border-purple-500 shadow-md shadow-purple-500/10 ring-1 ring-purple-500'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Eye className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  Live View
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900">Live Customer View Simulation</div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">Preview badges on Desktop & Mobile</p>
            </button>
          </div>

          {/* TAB 1: STORE FEATURES (HOME PAGE) */}
          {activeTab === 'store' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Home Page Trust Badges</h3>
                  <p className="text-xs text-slate-500">Rendered in a 4-column strip across your storefront home page.</p>
                </div>
                <button
                  type="button"
                  onClick={() => addItem('store')}
                  className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Badge
                </button>
              </div>

              <div className="space-y-3.5">
                {storeFeatures.map((item, index) => {
                  const ItemIcon = ICON_MAP[item.icon] || HelpCircle;
                  return (
                    <div
                      key={item.id || index}
                      className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center gap-5 ${
                        item.enabled ? 'border-slate-200/80' : 'border-slate-200/40 opacity-60 bg-slate-50/50'
                      }`}
                    >
                      {/* Left: Reorder & Status */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveItem('store', index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem('store', index, 'down')}
                            disabled={index === storeFeatures.length - 1}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Visual Icon Button (Click to Pick) */}
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openIconPicker('store', index)}
                            className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/30 hover:border-primary flex items-center justify-center text-primary transition-all group relative cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            title="Click to choose a different icon"
                          >
                            <ItemIcon className="w-7 h-7 transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                              Change
                            </div>
                          </button>
                          <span className="text-[10px] font-mono text-slate-400 font-bold truncate max-w-[70px]">
                            {item.icon}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Title & Description Inputs */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Badge Title
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => updateItem('store', index, 'title', e.target.value)}
                            placeholder="e.g. 100% Authentic"
                            className="w-full bg-slate-50/60 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Short Subtitle / Description
                          </label>
                          <input
                            type="text"
                            value={item.desc}
                            onChange={(e) => updateItem('store', index, 'desc', e.target.value)}
                            placeholder="e.g. Verified sellers only"
                            className="w-full bg-slate-50/60 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                          />
                        </div>
                      </div>

                      {/* Right: Enable Switch & Delete */}
                      <div className="flex items-center justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) => updateItem('store', index, 'enabled', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-600">
                            {item.enabled ? 'Active' : 'Hidden'}
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => removeItem('store', index)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="Delete Feature"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {storeFeatures.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No store features configured</p>
                    <button
                      type="button"
                      onClick={() => addItem('store')}
                      className="mt-3 text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add First Feature
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DELIVERY & SERVICES (PRODUCT PAGE) */}
          {activeTab === 'delivery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Product Page Delivery Policies</h3>
                  <p className="text-xs text-slate-500">Displayed in the guarantees section under product descriptions.</p>
                </div>
                <button
                  type="button"
                  onClick={() => addItem('delivery')}
                  className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Service
                </button>
              </div>

              <div className="space-y-3.5">
                {deliveryServices.map((item, index) => {
                  const ItemIcon = ICON_MAP[item.icon] || HelpCircle;
                  return (
                    <div
                      key={item.id || index}
                      className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center gap-5 ${
                        item.enabled ? 'border-slate-200/80' : 'border-slate-200/40 opacity-60 bg-slate-50/50'
                      }`}
                    >
                      {/* Left: Reorder & Visual Icon */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveItem('delivery', index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem('delivery', index, 'down')}
                            disabled={index === deliveryServices.length - 1}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Visual Icon Button (Click to Pick) */}
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openIconPicker('delivery', index)}
                            className="w-14 h-14 rounded-2xl bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-500 flex items-center justify-center text-emerald-600 transition-all group relative cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            title="Click to choose a different icon"
                          >
                            <ItemIcon className="w-7 h-7 transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                              Change
                            </div>
                          </button>
                          <span className="text-[10px] font-mono text-slate-400 font-bold truncate max-w-[70px]">
                            {item.icon}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Title & Description Inputs */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Service Title
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => updateItem('delivery', index, 'title', e.target.value)}
                            placeholder="e.g. Cash on Delivery"
                            className="w-full bg-slate-50/60 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Policy Details / Guarantee
                          </label>
                          <input
                            type="text"
                            value={item.desc}
                            onChange={(e) => updateItem('delivery', index, 'desc', e.target.value)}
                            placeholder="e.g. Available for all orders across BD"
                            className="w-full bg-slate-50/60 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                          />
                        </div>
                      </div>

                      {/* Right: Enable Switch & Delete */}
                      <div className="flex items-center justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) => updateItem('delivery', index, 'enabled', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-600">
                            {item.enabled ? 'Active' : 'Hidden'}
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => removeItem('delivery', index)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="Delete Service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {deliveryServices.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                    <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No delivery services configured</p>
                    <button
                      type="button"
                      onClick={() => addItem('delivery')}
                      className="mt-3 text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add First Service
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE STOREFRONT SIMULATION */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Live Customer Storefront Simulation</h3>
                    <p className="text-xs text-slate-500">Shows real-time appearance of your trust badges as seen by visitors.</p>
                  </div>

                  <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                        previewDevice === 'desktop' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" /> Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                        previewDevice === 'mobile' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" /> Mobile
                    </button>
                  </div>
                </div>

                <div className="p-6 sm:p-10 bg-slate-100/70 flex justify-center">
                  <div className={`w-full transition-all duration-300 ${
                    previewDevice === 'mobile' ? 'max-w-md bg-white p-4 rounded-3xl shadow-xl border border-slate-300' : 'max-w-5xl'
                  }`}>
                    <div className="mb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                      Homepage Trust Strip
                    </div>

                    <div className={`grid gap-4 ${
                      previewDevice === 'mobile' ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'
                    }`}>
                      {storeFeatures.filter(f => f.enabled).map((feature, idx) => {
                        const IconComponent = ICON_MAP[feature.icon] || HelpCircle;
                        return (
                          <div
                            key={idx}
                            className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center sm:items-start lg:flex-row lg:items-center gap-3.5 transition-all hover:shadow-md"
                          >
                            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <IconComponent className="w-5 h-5" strokeWidth={2} />
                            </div>
                            <div className="text-center sm:text-left">
                              <h4 className="font-bold text-xs sm:text-sm text-slate-800 leading-tight mb-1">
                                {feature.title}
                              </h4>
                              <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-snug">
                                {feature.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 4. VISUAL ICON PICKER MODAL */}
      {iconPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Select an Icon</h3>
                  <p className="text-xs text-slate-500">Pick from 30+ curated eCommerce trust and service icons.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIconPickerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="p-6 border-b border-slate-100 space-y-3 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchIconQuery}
                  onChange={(e) => setSearchIconQuery(e.target.value)}
                  placeholder="Search icons (e.g. truck, shield, delivery, return, card)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  autoFocus
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { id: 'all', label: 'All Icons' },
                  { id: 'delivery', label: 'Shipping & Delivery' },
                  { id: 'trust', label: 'Trust & Quality' },
                  { id: 'payment', label: 'Payment & Offers' },
                  { id: 'support', label: 'Customer Support' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-primary text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Grid */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-96 custom-scrollbar">
              {filteredIcons.map((item) => {
                const CurrentIcon = item.icon;
                const isCurrent = pickerTarget && (
                  (pickerTarget.listType === 'store' && storeFeatures[pickerTarget.index]?.icon === item.name) ||
                  (pickerTarget.listType === 'delivery' && deliveryServices[pickerTarget.index]?.icon === item.name)
                );

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => selectIcon(item.name)}
                    className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all group cursor-pointer text-center relative ${
                      isCurrent
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs'
                        : 'border-slate-200/80 hover:border-primary/50 hover:bg-slate-50 hover:scale-105'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                    <CurrentIcon className={`w-7 h-7 transition-transform group-hover:scale-110 ${
                      isCurrent ? 'text-primary' : 'text-slate-700 group-hover:text-primary'
                    }`} />
                    <span className="text-[11px] font-bold text-slate-800 line-clamp-1">
                      {item.name}
                    </span>
                    <span className="text-[9.5px] text-slate-400 line-clamp-1 leading-none">
                      {item.label}
                    </span>
                  </button>
                );
              })}

              {filteredIcons.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 text-xs font-semibold">
                  No icons matching "{searchIconQuery}"
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredIcons.length} icons</span>
              <button
                type="button"
                onClick={() => setIconPickerOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
