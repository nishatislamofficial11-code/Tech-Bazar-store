import React from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../ui/ProductCard';
import { motion } from 'motion/react';

interface ProductSectionProps {
  title?: string;
  badge?: React.ReactNode;
  actionText?: string;
  products: any[];
  showRating?: boolean;
  isLoading?: boolean;
}

export const ProductSection: React.FC<ProductSectionProps> = ({ 
  title, 
  badge,
  actionText = 'View All \u2192', 
  products,
  showRating = false,
  isLoading = false
}) => {
  if (!isLoading && products.length === 0) return null;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <section className="mb-8 md:mb-12 max-w-7xl mx-auto">
      {(title || badge) && (
        <div className="flex items-center justify-between mb-5 px-4 sm:px-6">
          <div className="flex items-center gap-3">
             {badge && (
                <div className="bg-red-500 text-white px-3 sm:px-4 py-1.5 rounded-full flex items-center font-black text-[13px] sm:text-[15px] gap-1.5 shadow-md shadow-red-500/20 tracking-wide uppercase">
                  {badge}
                </div>
             )}
             {title && (
               <div className="flex items-center gap-3 sm:gap-4 group">
                 {!badge && (
                   <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center transition-all duration-500 group-hover:bg-primary group-hover:text-white shadow-inner group-hover:scale-105 group-hover:-rotate-3 group-hover:shadow-primary/30">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-7 sm:h-7 transition-transform duration-500 group-hover:scale-110"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                   </div>
                 )}
                 <div>
                   <h2 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-none mb-1.5 sm:mb-2">
                     {title}
                   </h2>
                   {!badge && (
                     <div className="flex gap-1">
                       <div className="w-8 sm:w-12 h-1.5 bg-primary rounded-full"></div>
                       <div className="w-2 h-1.5 bg-primary/30 rounded-full"></div>
                       <div className="w-1 h-1.5 bg-primary/20 rounded-full"></div>
                     </div>
                   )}
                 </div>
               </div>
             )}
          </div>
          <Link 
            to="/shop" 
            aria-label={`View all ${title || 'products'}`}
            className="text-[13px] sm:text-sm font-bold text-primary hover:text-primary-hover transition-colors flex items-center gap-1 group"
          >
            {actionText.replace('\u2192', '')}
            <span className="group-hover:translate-x-1 transition-transform inline-block">&rarr;</span>
          </Link>
        </div>
      )}
      
      <div className="px-4 sm:px-6">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5"
        >
          {isLoading
            ? products.map((product, idx) => (
                <div key={product.id || idx} className="bg-white rounded-2xl border border-slate-100/60 overflow-hidden flex flex-col h-full shadow-sm">
                  <div className="skeleton-shimmer aspect-[4/4] w-full" />
                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    <div className="space-y-2.5 mb-4">
                      <div className="skeleton-shimmer h-3.5 rounded-md w-11/12" />
                      <div className="skeleton-shimmer h-3.5 rounded-md w-3/4" />
                    </div>
                    <div className="mt-auto">
                      <div className="skeleton-shimmer h-4 sm:h-5 rounded-md w-1/2" />
                    </div>
                  </div>
                  <div className="px-3 pb-3 sm:px-4 sm:pb-4 mt-auto">
                    <div className="skeleton-shimmer w-full h-10 sm:h-11 rounded-xl" />
                  </div>
                </div>
              ))
            : products.map(product => (
                <motion.div variants={item} key={product.id} className="h-full">
                  <ProductCard product={product} showRating={showRating} />
                </motion.div>
              ))}
        </motion.div>
      </div>
    </section>
  );
};
