import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { ProductCard } from '../components/ui/ProductCard';
import { StorefrontPageSkeleton } from '../components/ui/StorefrontPageSkeleton';
import { SlidersHorizontal, ChevronDown, X, Check, Search } from 'lucide-react';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { motion } from 'motion/react';

const generateSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

export default function Shop() {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = categorySlug || searchParams.get('category');
  const searchParam = searchParams.get('search');
  
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(categoryParam);
  const [searchQuery, setSearchQuery] = useState(searchParam || '');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  useEffect(() => {
    if (categoryParam !== selectedCategorySlug) {
      setSelectedCategorySlug(categoryParam);
    }
  }, [categoryParam]);

  useEffect(() => {
    if (searchParam !== null && searchParam !== searchQuery) {
      setSearchQuery(searchParam);
    }
  }, [searchParam]);

  const selectedCategory = useMemo(() => {
    if (!selectedCategorySlug || !categories.length) return null;
    const category = categories.find(c => generateSlug(c.name) === selectedCategorySlug);
    return category ? category.id : null;
  }, [selectedCategorySlug, categories]);

  const handleCategorySelect = (categoryId: string | null) => {
    // Preserve existing search params like 'search'
    const currentParams = new URLSearchParams(searchParams);
    currentParams.delete('category'); // Remove query param if we're migrating away from it
    
    if (categoryId) {
      const cat = categories.find(c => c.id === categoryId);
      if (cat) {
        navigate({
          pathname: `/category/${generateSlug(cat.name)}`,
          search: currentParams.toString() ? `?${currentParams.toString()}` : ''
        });
      }
    } else {
      navigate({
        pathname: '/shop',
        search: currentParams.toString() ? `?${currentParams.toString()}` : ''
      });
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name')
      ]);
        
      if (productsRes.data) setProducts(productsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      setLoading(false);
    };
    fetchInitialData();
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.category_id) {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    let result = products;
    
    if (selectedCategory) {
      result = result.filter(p => p.category_id === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
    }

    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  const sortOptions = [
    { value: 'newest', label: 'Newest Arrivals' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' }
  ];

  const tempCatName = categoryParam ? categoryParam.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;
  const seoTitle = selectedCategory ? `${categories.find(c => c.id === selectedCategory)?.name || 'Shop'}` : (tempCatName ? `${tempCatName} - Shop` : 'Shop All Products');
  const seoDesc = selectedCategory ? `Browse our collection of ${categories.find(c => c.id === selectedCategory)?.name || 'premium gadgets and accessories'}.` : (tempCatName ? `Browse our collection of ${tempCatName}.` : 'Browse our collection of premium gadgets and accessories.');

  return (
    <main className="min-h-screen pb-20">
      <h1 className="sr-only">{seoTitle}</h1>
      <SEO 
        title={seoTitle}
        description={seoDesc}
      />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Premium Header Region */}
        <div className="pt-4 sm:pt-8 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <nav className="flex items-center gap-2 text-[13px] text-slate-500 mb-4 font-bold tracking-wide uppercase">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900">Collection</span>
            </nav>
          </div>
          <div className="w-full md:w-80">
            <div className="relative group">
              <input 
                type="text" 
                placeholder="Search..." 
                aria-label="Search collection"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setSearchParams(prev => {
                    const newParams = new URLSearchParams(prev);
                    if (e.target.value) newParams.set('search', e.target.value);
                    else newParams.delete('search');
                    return newParams;
                  }, { replace: true });
                }}
                className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition-all text-[15px] font-medium outline-none shadow-sm shadow-slate-200/50"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Toolbar (Mobile Filters / Sorting) */}
        <div className="flex items-center justify-between py-3 mb-6 sticky top-0 md:static bg-slate-50/90 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none z-30 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="hidden md:flex items-center gap-2 text-[15px] text-slate-500 font-medium">
            <span className="text-slate-900 font-bold">{filteredAndSortedProducts.length}</span> Items
          </div>
          
          <button 
            onClick={() => setIsMobileFilterOpen(true)}
            aria-label="Open filters"
            className="flex md:hidden flex-1 justify-center items-center gap-2 text-[14px] font-bold text-slate-800 bg-white border border-slate-200 shadow-sm hover:border-primary/50 px-5 py-2.5 rounded-full transition-all mr-2"
          >
            <SlidersHorizontal size={18} strokeWidth={2.5} /> Filters
          </button>
          
          <div className="relative w-1/2 md:w-auto">
            <button 
              onClick={() => setIsSortOpen(!isSortOpen)}
              aria-label="Sort products"
              className="flex items-center justify-between md:justify-center w-full gap-2 text-[14px] font-bold text-slate-800 bg-white border border-slate-200 shadow-sm hover:border-primary/50 px-5 py-2.5 rounded-full transition-all md:min-w-[190px]"
            >
              <span className="truncate">{sortOptions.find(o => o.value === sortBy)?.label || 'Sort by'}</span>
              <ChevronDown size={18} strokeWidth={2.5} className={`flex-shrink-0 transition-transform duration-300 ${isSortOpen ? 'rotate-180 text-primary' : 'text-slate-400'}`} />
            </button>
            
            {isSortOpen && (
              <>
                <div 
                  className="fixed inset-0 z-30"
                  onClick={() => setIsSortOpen(false)}
                />
                <div className="absolute right-0 mt-3 w-[220px] sm:w-[240px] bg-white rounded-2xl shadow-[0_12px_40px_rgb(0,0,0,0.12)] border border-slate-100 py-3 z-40 overflow-hidden transform origin-top animate-in fade-in slide-in-from-top-2">
                  <div className="px-5 pb-2 mb-2 border-b border-slate-50">
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Sort By</p>
                  </div>
                  {sortOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value as any);
                        setIsSortOpen(false);
                      }}
                      className="w-full text-left px-5 py-2.5 hover:bg-slate-50 flex items-center justify-between transition-colors group"
                    >
                      <span className={`text-[13.5px] tracking-wide ${sortBy === option.value ? 'font-bold text-primary' : 'font-medium text-slate-600 group-hover:text-slate-900'}`}>
                        {option.label}
                      </span>
                      {sortBy === option.value && <Check size={16} className="text-primary" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          {/* Desktop Sidebar Planner */}
          <div className="hidden md:block w-[280px] flex-shrink-0">
            <div className="sticky top-24 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50 min-h-[50vh]">
              <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-5 ml-2">Categories</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => handleCategorySelect(null)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[14.5px] transition-all duration-300 ${selectedCategory === null ? 'bg-primary text-white font-bold shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'}`}
                  >
                    All Collection
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${selectedCategory === null ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                      {products.length}
                    </span>
                  </button>
                </li>
                {categories.map(category => (
                  <li key={category.id}>
                    <button
                      onClick={() => handleCategorySelect(category.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[14.5px] transition-all duration-300 ${selectedCategory === category.id ? 'bg-primary text-white font-bold shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold group'}`}
                    >
                      {category.name}
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${selectedCategory === category.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                        {categoryCounts[category.id] || 0}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Mobile Filter Drawer */}
          {isMobileFilterOpen && (
            <div className="fixed inset-0 z-[60] flex md:hidden">
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileFilterOpen(false)} />
              <div className="relative ml-auto w-[85%] max-w-sm bg-white h-full shadow-2xl flex flex-col pt-6 pb-safe animate-in slide-in-from-right duration-300 rounded-l-3xl">
                <div className="px-6 flex items-center justify-between pb-6 border-b border-slate-100">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Filters</h2>
                  <button onClick={() => setIsMobileFilterOpen(false)} aria-label="Close filters" className="p-2.5 -mr-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-colors">
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-8">
                  <h3 className="font-bold text-slate-400 mb-5 tracking-widest uppercase text-xs ml-1">Categories</h3>
                  <ul className="space-y-2">
                    <li>
                      <button
                        onClick={() => { handleCategorySelect(null); setIsMobileFilterOpen(false); }}
                        className={`text-[15px] transition-colors flex items-center justify-between w-full px-4 py-3 rounded-2xl ${selectedCategory === null ? 'font-bold bg-primary text-white shadow-md shadow-primary/20' : 'font-semibold text-slate-600 hover:bg-slate-50'}`}
                      >
                        All Collection
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${selectedCategory === null ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {products.length}
                        </span>
                      </button>
                    </li>
                    {categories.map(category => (
                      <li key={category.id}>
                        <button
                          onClick={() => { handleCategorySelect(category.id); setIsMobileFilterOpen(false); }}
                          className={`text-[15px] transition-colors flex items-center justify-between w-full px-4 py-3 rounded-2xl ${selectedCategory === category.id ? 'font-bold bg-primary text-white shadow-md shadow-primary/20' : 'font-semibold text-slate-600 hover:bg-slate-50'}`}
                        >
                          {category.name}
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${selectedCategory === category.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {categoryCounts[category.id] || 0}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-6 border-t border-slate-100 bg-white">
                   <button onClick={() => setIsMobileFilterOpen(false)} className="w-full bg-primary text-white font-bold text-[15px] tracking-wide py-4 rounded-2xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 active:scale-[0.98]">
                      Show {filteredAndSortedProducts.length} Results
                   </button>
                </div>
              </div>
            </div>
          )}

          {/* Product Grid */}
          <div className="flex-1">
            {loading ? (
              <StorefrontPageSkeleton compact />
            ) : (
              <motion.div 
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05 }
                  }
                }}
                className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 lg:gap-6"
              >
                {filteredAndSortedProducts.map(product => (
                  <motion.div 
                    key={product.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                    }}
                    className="h-full"
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
                {filteredAndSortedProducts.length === 0 && (
                  <div className="col-span-full py-32 flex flex-col justify-center items-center text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                       <Search size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">No products found</h3>
                    <p className="text-slate-500 max-w-sm text-base">Try adjusting your filters or search terms to see more products.</p>
                    <button 
                      onClick={() => {
                        handleCategorySelect(null);
                        setSearchQuery('');
                      }}
                      className="mt-8 text-[15px] font-bold tracking-wide text-white bg-primary hover:bg-primary-hover px-8 py-3.5 rounded-full transition-all shadow-lg shadow-primary/20 active:scale-95"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
