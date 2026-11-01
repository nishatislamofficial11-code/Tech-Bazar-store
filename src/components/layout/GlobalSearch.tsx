import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search, X, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getProductImage } from '../../lib/productImage';
import { motion, AnimatePresence } from 'motion/react';

export const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = wrapperRef.current?.querySelector('input');
        if (input) {
          input.focus();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const searchProducts = async () => {
      if (!query.trim()) {
        setResults([]);
        setIsOpen(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setIsOpen(true);
      const q = query.toLowerCase();
      const { data } = await supabase
        .from('products')
        .select('*')
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(5);

      setResults(data || []);
      setIsLoading(false);
    };

    const debounceFn = window.setTimeout(searchProducts, 300);
    return () => window.clearTimeout(debounceFn);
  }, [query]);

  const handleSelect = (product: any) => {
    navigate(`/product/${product.slug || product.id}`);
    setIsOpen(false);
    setQuery('');
  };

  const submitSearch = () => {
    if (!query.trim()) return;

    navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    setIsOpen(false);
    setQuery('');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch();
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md hidden md:block">
      <form onSubmit={handleSearchSubmit} className="relative group">
        <input
          type="text"
          placeholder="Search products..."
          aria-label="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitSearch();
            }
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-full py-2.5 pl-12 pr-16 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-none shadow-sm shadow-slate-200/50"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} strokeWidth={2.5} />
        
        {/* Ctrl+K Hint */}
        {!query && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1 px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-400 text-[10px] font-bold tracking-widest pointer-events-none">
            <Command size={12} strokeWidth={3} /> K
          </div>
        )}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={16} />
          </button>
        )}
      </form>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden z-50 py-3"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <div className="mr-3 h-5 w-5 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
                <span className="text-[15px] font-bold tracking-wide">Searching...</span>
              </div>
            ) : results.length > 0 ? (
              <ul>
                {results.map((product) => {
                  const image = getProductImage(product);

                  return (
                    <li key={product.id}>
                      <button
                        onClick={() => handleSelect(product)}
                        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors text-left group"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                          {image ? (
                            <img src={image} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Search size={20} strokeWidth={2.5} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[15px] font-bold text-slate-900 truncate group-hover:text-primary transition-colors">{product.title}</h4>
                          <p className="text-[13px] text-slate-500 font-semibold mt-0.5">&#2547;{product.price.toLocaleString()}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
                <div className="px-5 pt-3 mt-2 border-t border-slate-100">
                  <button
                    onClick={submitSearch}
                    className="w-full flex items-center justify-center text-[14px] font-bold text-primary hover:text-white bg-primary/5 hover:bg-primary py-3 rounded-2xl transition-all active:scale-[0.98]"
                  >
                    View all results
                  </button>
                </div>
              </ul>
            ) : (
              <div className="py-10 px-5 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Search className="text-slate-300" size={28} strokeWidth={2.5} />
                </div>
                <h4 className="text-[16px] font-black text-slate-900 tracking-tight">No products found</h4>
                <p className="text-[14px] text-slate-500 mt-1">Try another search term</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
