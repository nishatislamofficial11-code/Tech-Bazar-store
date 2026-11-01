import React, { useEffect, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getProductImage } from '../../lib/productImage';
import { trackSearch } from '../../lib/fbPixel';
import { trackTiktokSearch } from '../../lib/ttPixel';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    const searchProducts = async () => {
      if (!query.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
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
  }, [isOpen, query]);

  const closeSearch = () => {
    onClose();
    setResults([]);
    setIsLoading(false);
  };

  const submitSearch = () => {
    if (!query.trim()) return;

    trackSearch(query.trim());
    trackTiktokSearch(query.trim());
    navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    setQuery('');
    closeSearch();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch();
  };

  const handleSelect = (product: any) => {
    navigate(`/product/${product.slug || product.id}`);
    setQuery('');
    closeSearch();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeSearch}
      />

      <div className="absolute top-0 left-0 right-0 bg-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-[15px]">Search Products</h2>
          <button
            onClick={closeSearch}
            aria-label="Close search"
            className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="p-4">
          <form onSubmit={handleSubmit} className="flex w-full">
            <input
              type="text"
              placeholder="Search in..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitSearch();
                }
              }}
              className="flex-1 border border-gray-300 rounded-l-md px-3 py-2.5 text-[15px] outline-none focus:border-primary placeholder:text-gray-400"
              autoFocus
            />
            <button 
              type="submit" 
              aria-label="Submit search"
              className="bg-primary text-white px-5 rounded-r-md flex items-center justify-center flex-shrink-0 hover:bg-primary-hover transition-colors border border-primary"
            >
              <Search size={22} strokeWidth={2} />
            </button>
          </form>

          {query.trim() && (
            <div className="mt-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-5 text-gray-400">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                  <span className="text-sm font-medium">Searching...</span>
                </div>
              ) : results.length > 0 ? (
                <>
                  <ul className="divide-y divide-gray-50">
                    {results.map((product) => {
                      const image = getProductImage(product);

                      return (
                        <li key={product.id}>
                          <button
                            type="button"
                            onClick={() => handleSelect(product)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                              {image ? (
                                <img src={image} alt={product.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Search size={18} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-gray-900 truncate">{product.title}</h4>
                              <p className="text-xs text-gray-500 font-medium mt-0.5">&#2547;{product.price.toLocaleString()}</p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    onClick={submitSearch}
                    className="w-full border-t border-gray-50 py-3 text-center text-sm font-bold text-primary hover:bg-gray-50 transition-colors"
                  >
                    View all results
                  </button>
                </>
              ) : (
                <div className="py-6 px-4 text-center">
                  <div className="w-11 h-11 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="text-gray-400" size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">No products found</h4>
                  <p className="text-xs text-gray-500 mt-1">Try another search term</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
