import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShoppingBag } from 'lucide-react';
import { CheckoutPopup } from '../ui/CheckoutPopup';
import DOMPurify from 'dompurify';

interface ProductHighlightData {
  title: string;
  product_id: string;
}

export default function ProductHighlightBlock({ data }: { data: ProductHighlightData }) {
  const [product, setProduct] = useState<any>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data.product_id) {
      fetchProduct();
    } else {
      setLoading(false);
    }
  }, [data.product_id]);

  async function fetchProduct() {
    try {
      const { data: p, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', data.product_id)
        .single();
        
      if (error) throw error;
      setProduct(p);
    } catch (err) {
      console.error('Error fetching product for highlight block:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="py-20 text-center text-gray-500">Loading Product...</div>;
  if (!product) return null;

  const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
  const mainImage = Array.isArray(images) && images.length > 0 ? images[0] : null;
  const discountAmount = (product.original_price || product.price) - product.price;
  const discountPercentage = Math.round((discountAmount / (product.original_price || product.price)) * 100);

  return (
    <div id="buy" className="py-20 bg-white border-y border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">{data.title}</h2>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center gap-12 bg-gray-50 rounded-3xl p-6 lg:p-12 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-full lg:w-1/2">
            {mainImage ? (
              <div className="relative rounded-2xl overflow-hidden shadow-lg bg-white p-4 aspect-square flex items-center justify-center group">
                <img 
                  src={mainImage} 
                  alt={product.title} 
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                />
                {discountPercentage > 0 && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white font-bold px-3 py-1.5 rounded-full text-sm shadow-lg">
                    {discountPercentage}% OFF
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square bg-gray-200 rounded-2xl flex items-center justify-center">
                <ShoppingBag className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="w-full lg:w-1/2 space-y-6">
            <h3 className="text-2xl lg:text-4xl font-bold text-gray-900">{product.title}</h3>
            
            <div className="flex items-center gap-4">
              <span className="text-4xl font-extrabold text-primary">৳{product.price}</span>
              {product.original_price && (
                <span className="text-xl text-gray-400 line-through font-medium">৳{product.original_price}</span>
              )}
            </div>
            
            <div className="prose prose-sm text-gray-600 line-clamp-4">
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description || '') }} />
            </div>
            
            <div className="pt-6">
              <button
                onClick={() => setShowCheckout(true)}
                className="w-full sm:w-auto px-12 py-4 bg-primary hover:bg-primary-hover text-white text-xl font-bold rounded-xl shadow-lg shadow-primary/30 transition-transform hover:-translate-y-1 hover:shadow-xl active:translate-y-0 flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-6 h-6" />
                অর্ডার করুন (Order Now)
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {showCheckout && (
        <CheckoutPopup isOpen={showCheckout} product={product} onClose={() => setShowCheckout(false)} />
      )}
    </div>
  );
}
