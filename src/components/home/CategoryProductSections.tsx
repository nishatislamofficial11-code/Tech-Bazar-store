// Classic home page: after Best Deals, products grouped by category (in the order set in
// Admin → Categories). Each category shows 8 products with "Load More"; more categories
// appear with the button at the bottom. Categories without products are skipped.
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ProductSection } from './ProductSection';
import { categoryPath } from './useHomeData';

const PER_CATEGORY = 8;
const CATEGORIES_STEP = 3;

interface Cat { id: string; name: string; total: number }

const CategoryBlock: React.FC<{ cat: Cat }> = ({ cat }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (from: number) => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').eq('category_id', cat.id)
      .order('created_at', { ascending: false }).range(from, from + PER_CATEGORY - 1);
    setProducts((list) => (from === 0 ? data || [] : [...list, ...(data || [])]));
    setLoading(false);
  };
  useEffect(() => { load(0); }, [cat.id]);

  const placeholders = Array.from({ length: Math.min(4, cat.total) }).map((_, i) => ({ id: `ph-${cat.id}-${i}`, title: '', image: '', price: 0, discount: 0 }));
  const first = loading && products.length === 0;

  return (
    <div>
      <ProductSection title={cat.name} actionLink={categoryPath(cat.name)} products={first ? placeholders : products} isLoading={first} />
      {!first && products.length < cat.total && (
        <div className="-mt-4 mb-10 flex justify-center">
          <button onClick={() => load(products.length)} disabled={loading}
            className="rounded-full border-2 border-primary/30 px-8 py-2.5 text-sm font-bold text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50">
            {loading ? 'লোড হচ্ছে…' : `Load More (${cat.total - products.length})`}
          </button>
        </div>
      )}
    </div>
  );
};

export function CategoryProductSections() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [shown, setShown] = useState(CATEGORIES_STEP);

  useEffect(() => {
    (async () => {
      const [{ data: categories }, { data: rows }] = await Promise.all([
        supabase.from('categories').select('id, name').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('products').select('category_id').not('category_id', 'is', null).limit(10000),
      ]);
      const counts: Record<string, number> = {};
      for (const r of rows || []) counts[r.category_id] = (counts[r.category_id] || 0) + 1;
      setCats((categories || []).filter((c) => counts[c.id]).map((c) => ({ id: c.id, name: c.name, total: counts[c.id] })));
    })();
  }, []);

  if (!cats.length) return null;
  return (
    <>
      {cats.slice(0, shown).map((c) => <CategoryBlock key={c.id} cat={c} />)}
      {shown < cats.length && (
        <div className="mb-10 flex justify-center px-4">
          <button onClick={() => setShown((n) => n + CATEGORIES_STEP)}
            className="w-full sm:w-auto rounded-2xl bg-primary px-10 py-3.5 text-sm sm:text-base font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition-colors">
            আরও ক্যাটাগরি দেখুন ({cats.length - shown})
          </button>
        </div>
      )}
    </>
  );
}
