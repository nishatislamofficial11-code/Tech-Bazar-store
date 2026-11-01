import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const CategoryNav = () => {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  return (
    <div className="bg-white border-b border-gray-100 sticky top-[60px] md:top-[68px] z-30">
      <div className="max-w-7xl mx-auto overflow-x-auto no-scrollbar py-2 px-4">
        <div className="flex items-center gap-2 w-max pr-8">
          <button
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors bg-primary text-white"
            >
              All Products
          </button>

          {categories.map((category) => {
             const Icon = category.icon ? (Icons as any)[category.icon] : null;
             return (
              <button
                key={category.id}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors bg-transparent text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-200"
              >
                {Icon && <Icon size={14} className="text-gray-600" />}
                {category.name}
              </button>
             )
          })}
        </div>
      </div>
      {/* Visual bottom border for active tab (All Products) - optional detail, approximating screenshot */}
      <div className="absolute bottom-0 left-4 w-[100px] h-[3px] bg-gray-300 rounded-t-sm"></div>
    </div>
  );
};
