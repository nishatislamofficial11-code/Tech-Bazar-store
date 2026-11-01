import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Copy,
  Search,
  ExternalLink,
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
  Flame,
  Star,
  Truck,
  Box,
  TrendingUp,
  AlertTriangle,
  Layers,
  CheckCircle2,
  X,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { AdminPageSkeleton } from '../../components/ui/AdminPageSkeleton';

interface Variant {
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  color: string;
  size: string;
  sku: string;
  price: number;
  compare_price: number;
  cost_price: number;
  delivery_charge?: number;
  stock: number;
  weight: number;
  image?: string;
}

interface Product {
  id: string;
  title: string;
  image: string;
  images?: string[];
  price: number;
  buy_price?: number;
  original_price: number;
  discount: number;
  description?: string;
  category_id?: string;
  is_flash_sale?: boolean;
  is_best_deal?: boolean;
  is_delivery_free?: boolean;
  delivery_charge?: number | null;
  variants?: Variant[];
  stock: number;
  meta_title?: string;
  meta_keywords?: string;
  meta_description?: string;
  slug: string;
  related_product_ids?: string[];
  created_at?: string;
}

interface Category {
  id: string;
  name: string;
}

import { Pagination } from '../../components/ui/Pagination';

export default function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dbError, setDbError] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // Filters & View State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'flash_sale' | 'best_deal' | 'free_delivery'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'stock_desc'>('newest');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, stockFilter, badgeFilter, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setDbError(false);
    try {
      const [
        { data: productsData, error: productsError },
        { data: categoriesData, error: categoriesError }
      ] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').order('name')
      ]);

      if (categoriesData) setCategories(categoriesData);

      if (productsError) {
        if (
          productsError.code === '42703' ||
          productsError.message.includes('column') ||
          productsError.message.includes('is_flash_sale') ||
          productsError.message.includes('schema cache')
        ) {
          setDbError(true);
        } else {
          toast.error(`Failed to fetch products: ${productsError.message}`);
        }
      } else {
        setProducts(productsData || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await supabase.from('order_items').update({ product_id: null }).eq('product_id', productToDelete);
      await supabase.from('reviews').delete().eq('product_id', productToDelete);
    } catch (err) {
      console.warn('Could not cascade delete references', err);
    }

    const { error } = await supabase.from('products').delete().eq('id', productToDelete);
    if (error) {
      toast.error('Failed to delete product: ' + error.message);
    } else {
      toast.success('Product deleted successfully');
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete));
    }
    setProductToDelete(null);
  };

  const handleDuplicate = async (prod: Product) => {
    try {
      const duplicated = {
        ...prod,
        id: undefined,
        title: `${prod.title} (Copy)`,
        slug: `${prod.slug || 'product'}-copy-${Math.floor(Math.random() * 1000)}`,
        created_at: new Date().toISOString()
      };
      delete (duplicated as any).id;

      const { data, error } = await supabase.from('products').insert([duplicated]).select('id').single();
      if (error) throw error;
      toast.success('Product duplicated successfully! 🎉');
      fetchProducts();
    } catch (err: any) {
      toast.error('Duplicate failed: ' + (err.message || 'Error'));
    }
  };

  const [reordering, setReordering] = useState(false);

  const moveProduct = async (index: number, direction: 'up' | 'down') => {
    if (reordering) return;

    // If currently sorting by another field, switch to default Custom / Newest order
    if (sortBy !== 'newest') {
      setSortBy('newest');
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredProducts.length) return;

    const currentProd = filteredProducts[index];
    const targetProd = filteredProducts[targetIndex];
    if (!currentProd || !targetProd) return;

    const fullCurrentIdx = products.findIndex((p) => p.id === currentProd.id);
    const fullTargetIdx = products.findIndex((p) => p.id === targetProd.id);
    if (fullCurrentIdx === -1 || fullTargetIdx === -1) return;

    setReordering(true);

    // Reorder the products array
    const reordered = [...products];
    const [movedItem] = reordered.splice(fullCurrentIdx, 1);
    const newTargetIdx = reordered.findIndex((p) => p.id === targetProd.id);
    const insertAt = direction === 'up' ? newTargetIdx : newTargetIdx + 1;
    reordered.splice(insertAt, 0, movedItem);

    // Calculate clean, distinct descending timestamps
    const now = Date.now();
    const existingTimes = products
      .map((p) => (p.created_at ? new Date(p.created_at).getTime() : 0))
      .filter((t) => !isNaN(t) && t > 0);
    const maxTime = existingTimes.length > 0 ? Math.max(now, ...existingTimes) : now;
    const baseTime = maxTime + 60000;
    const stepMs = 60000; // 1 minute interval per position

    const reorderedWithTimes = reordered.map((prod, idx) => ({
      ...prod,
      created_at: new Date(baseTime - idx * stepMs).toISOString()
    }));

    // Identify which items have a modified created_at
    const changedItems = reorderedWithTimes.filter((item) => {
      const existing = products.find((p) => p.id === item.id);
      return !existing || existing.created_at !== item.created_at;
    });

    // Optimistically update UI
    setProducts(reorderedWithTimes);

    try {
      if (changedItems.length > 0) {
        const updatePromises = changedItems.map((item) =>
          supabase
            .from('products')
            .update({ created_at: item.created_at })
            .eq('id', item.id)
        );

        const results = await Promise.all(updatePromises);
        const hasError = results.find((r) => r.error);
        if (hasError?.error) {
          throw hasError.error;
        }
      }

      toast.success(
        `Position updated: "${currentProd.title.substring(0, 24)}..." moved ${direction === 'up' ? 'up' : 'down'}`
      );
    } catch (err: any) {
      console.error('Failed to move product:', err);
      toast.error('Failed to update product position: ' + (err.message || 'Error'));
      fetchProducts();
    } finally {
      setReordering(false);
    }
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search term
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          const matchTitle = p.title?.toLowerCase().includes(s);
          const matchSlug = p.slug?.toLowerCase().includes(s);
          if (!matchTitle && !matchSlug) return false;
        }

        // Category filter
        if (selectedCategory !== 'all') {
          if (p.category_id !== selectedCategory) return false;
        }

        // Stock filter
        const currentStock = Number(p.stock ?? 0);
        if (stockFilter === 'in_stock' && currentStock <= 0) return false;
        if (stockFilter === 'low_stock' && (currentStock <= 0 || currentStock >= 10)) return false;
        if (stockFilter === 'out_of_stock' && currentStock > 0) return false;

        // Badge filter
        if (badgeFilter === 'flash_sale' && !p.is_flash_sale) return false;
        if (badgeFilter === 'best_deal' && !p.is_best_deal) return false;
        if (badgeFilter === 'free_delivery' && !p.is_delivery_free) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
        if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
        if (sortBy === 'stock_desc') return Number(b.stock ?? 0) - Number(a.stock ?? 0);
        // Default newest
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [products, searchTerm, selectedCategory, stockFilter, badgeFilter, sortBy]);

  // Analytics summary counts
  const totalCount = products.length;
  const inStockCount = products.filter((p) => Number(p.stock ?? 0) > 0).length;
  const lowOrOutStockCount = products.filter((p) => Number(p.stock ?? 0) < 10).length;
  const featuredPromosCount = products.filter((p) => p.is_flash_sale || p.is_best_deal).length;

  const ITEMS_PER_PAGE = 25;
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const initDbSql = `
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_best_deal BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 100;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_keywords TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS related_product_ids UUID[] DEFAULT '{}'::UUID[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_delivery_free BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(12,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS buy_price INTEGER DEFAULT 0;
`;

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xl shadow-slate-200/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Inventory & Catalog Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Products Studio</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Create, edit, track inventory, and optimize product catalog.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/products/bulk"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-3 rounded-2xl transition-all text-xs sm:text-sm font-bold shadow-sm"
          >
            <Box className="w-4 h-4" /> Bulk Upload/Export
          </Link>
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover active:scale-[0.98] text-white px-6 py-3 rounded-2xl transition-all text-xs sm:text-sm font-bold shadow-lg shadow-primary/25"
          >
            <Plus className="w-4 h-4" /> Add New Product
          </Link>
        </div>
      </div>

      {/* KPI METRIC CARDS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Catalog</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Active Products</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Stock</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{inStockCount}</div>
            <div className="text-[11px] text-emerald-600/80 font-medium mt-0.5">Ready for dispatch</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low / Out Stock</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{lowOrOutStockCount}</div>
            <div className="text-[11px] text-amber-600/80 font-medium mt-0.5">Needs restocking</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Featured Deals</div>
            <div className="text-2xl font-black text-orange-600 mt-1">{featuredPromosCount}</div>
            <div className="text-[11px] text-orange-600/80 font-medium mt-0.5">Flash Sale & Best Deals</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Flame className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* DB ERROR NOTICE IF SCHEMA CACHE ISSUE */}
      {dbError && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-base font-bold text-orange-800">Database Schema Update Required</h3>
          <p className="text-xs text-orange-700 font-medium">
            To unlock variants, buy prices, flash sales, and free delivery columns, execute this SQL script in Supabase:
          </p>
          <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-x-auto">
            {initDbSql}
          </pre>
          <button
            onClick={() => fetchProducts()}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition-colors"
          >
            I've run the SQL, Recheck Schema
          </button>
        </div>
      )}

      {/* SEARCH & FILTERS TOOLBAR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/70 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product title, slug, or keywords..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & View Mode */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Stock Dropdown */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
            >
              <option value="all">All Stock Status</option>
              <option value="in_stock">In Stock (&gt;0)</option>
              <option value="low_stock">Low Stock (&lt;10)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>

            {/* Badge Filter */}
            <select
              value={badgeFilter}
              onChange={(e) => setBadgeFilter(e.target.value as any)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
            >
              <option value="all">All Promotions</option>
              <option value="flash_sale">Flash Sale</option>
              <option value="best_deal">Best Deal</option>
              <option value="free_delivery">Free Delivery</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
            >
              <option value="newest">Sort: Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="stock_desc">Stock: Highest</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-white text-primary shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-primary shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN PRODUCTS CONTENT */}
      {loading ? (
        <div className="py-16 bg-white rounded-3xl border border-slate-200/70 shadow-sm flex flex-col items-center justify-center">
          <AdminPageSkeleton variant="table" compact />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 px-6 bg-white rounded-3xl border border-slate-200/70 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center">
            <Box className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No products found</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Try adjusting your search query or filters, or add a brand new product.
            </p>
          </div>
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Product
          </Link>
        </div>
      ) : viewMode === 'table' ? (
        /* ENTERPRISE TABLE VIEW */
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-4 px-3 text-center w-20">Order</th>
                  <th className="py-4 px-6">Product</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Pricing</th>
                  <th className="py-4 px-6">Inventory</th>
                  <th className="py-4 px-6">Promotions & Badges</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProducts.map((prod, index) => {
                  const stockNum = Number(prod.stock ?? 0);
                  const isOutOfStock = stockNum <= 0;
                  const isLowStock = stockNum > 0 && stockNum < 10;
                  const catName = categories.find((c) => c.id === prod.category_id)?.name;

                  return (
                    <tr
                      key={prod.id}
                      onClick={() => navigate(`/admin/products/edit/${prod.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Order Up / Down Reordering */}
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5 bg-slate-100/90 py-1 px-2 rounded-xl border border-slate-200/60 shadow-xs">
                          <span className="text-[11px] font-mono font-bold text-slate-500 min-w-4 text-center">
                            #{index + 1}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={reordering || index === 0}
                              onClick={() => moveProduct(index, 'up')}
                              className="p-1 text-slate-600 hover:text-primary hover:bg-white rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transition-all shadow-xs disabled:shadow-none"
                              title="Move Product Up (উপরে নিন)"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={reordering || index === filteredProducts.length - 1}
                              onClick={() => moveProduct(index, 'down')}
                              className="p-1 text-slate-600 hover:text-primary hover:bg-white rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transition-all shadow-xs disabled:shadow-none"
                              title="Move Product Down (নিচে নিন)"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Product Thumbnail & Title */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.title}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    'https://via.placeholder.com/100?text=No+Img';
                                }}
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <span
                              className="font-bold text-slate-900 text-sm truncate block group-hover:text-primary transition-colors"
                              title={prod.title}
                            >
                              {prod.title}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 block truncate">
                              /product/{prod.slug || prod.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-6 font-semibold text-slate-600">
                        {catName ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                            {catName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Uncategorized</span>
                        )}
                      </td>

                      {/* Pricing */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-extrabold text-slate-900 text-sm">
                            ৳{Number(prod.price).toLocaleString()}
                          </span>
                          {prod.original_price > prod.price && (
                            <span className="text-slate-400 line-through text-[11px]">
                              ৳{Number(prod.original_price).toLocaleString()}
                            </span>
                          )}
                          {prod.discount > 0 && (
                            <span className="text-red-600 font-extrabold text-[10px] bg-red-50 px-1.5 py-0.5 rounded">
                              -{prod.discount}%
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Inventory */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span className="font-bold text-slate-800">{stockNum} in stock</span>
                          {prod.variants && prod.variants.length > 0 && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
                              {prod.variants.length} Variants
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Badges */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                          {prod.is_flash_sale && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-orange-100 text-orange-800 text-[10px] font-bold rounded-md">
                              <Flame className="w-2.5 h-2.5 text-orange-600" /> Flash Sale
                            </span>
                          )}
                          {prod.is_best_deal && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-md">
                              <Star className="w-2.5 h-2.5 text-purple-600" /> Best Deal
                            </span>
                          )}
                          {prod.is_delivery_free && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                              <Truck className="w-2.5 h-2.5 text-emerald-600" /> Free Delivery
                            </span>
                          )}
                          {!prod.is_flash_sale && !prod.is_best_deal && !prod.is_delivery_free && (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {prod.slug && (
                            <a
                              href={`/product/${prod.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                              title="View in Storefront"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(prod)}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                            title="Duplicate Product"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/admin/products/edit/${prod.id}`}
                            className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all"
                            title="Edit Product"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(prod.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MODERN CARD GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {paginatedProducts.map((prod) => {
            const stockNum = Number(prod.stock ?? 0);
            const isOutOfStock = stockNum <= 0;
            const isLowStock = stockNum > 0 && stockNum < 10;
            const catName = categories.find((c) => c.id === prod.category_id)?.name;

            return (
              <motion.div
                key={prod.id}
                layout
                className="bg-white rounded-3xl border border-slate-200/70 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all overflow-hidden flex flex-col group cursor-pointer"
                onClick={() => navigate(`/admin/products/edit/${prod.id}`)}
              >
                {/* Card Image Cover */}
                <div className="relative aspect-4/3 bg-slate-100 overflow-hidden flex items-center justify-center">
                  {prod.image ? (
                    <img
                      src={prod.image}
                      alt={prod.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                  )}

                  {/* Badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                    {prod.discount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                        -{prod.discount}%
                      </span>
                    )}
                    {prod.is_flash_sale && (
                      <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5" /> Flash
                      </span>
                    )}
                    {prod.is_best_deal && (
                      <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" /> Best Deal
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs ${
                        isOutOfStock
                          ? 'bg-red-600 text-white'
                          : isLowStock
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isOutOfStock ? '0 Stock' : `${stockNum} left`}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {catName || 'General'}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mt-0.5 group-hover:text-primary transition-colors">
                      {prod.title}
                    </h3>
                  </div>

                  <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-base font-black text-slate-900">
                        ৳{Number(prod.price).toLocaleString()}
                      </span>
                      {prod.original_price > prod.price && (
                        <span className="text-xs text-slate-400 line-through ml-1.5">
                          ৳{Number(prod.original_price).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg mr-1 border border-slate-200/60">
                        <button
                          type="button"
                          disabled={reordering || filteredProducts.indexOf(prod) === 0}
                          onClick={() => moveProduct(filteredProducts.indexOf(prod), 'up')}
                          className="p-1 text-slate-600 hover:text-primary hover:bg-white rounded disabled:opacity-20 transition-all"
                          title="Move Product Up (উপরে নিন)"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={reordering || filteredProducts.indexOf(prod) === filteredProducts.length - 1}
                          onClick={() => moveProduct(filteredProducts.indexOf(prod), 'down')}
                          className="p-1 text-slate-600 hover:text-primary hover:bg-white rounded disabled:opacity-20 transition-all"
                          title="Move Product Down (নিচে নিন)"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <Link
                        to={`/admin/products/edit/${prod.id}`}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setProductToDelete(prod.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        className="rounded-xl border-t-0 border border-slate-200 shadow-sm mt-6"
      />

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message="Are you sure you want to permanently delete this product? This action cannot be undone."
        confirmText="Delete Product"
      />
    </div>
  );
}
