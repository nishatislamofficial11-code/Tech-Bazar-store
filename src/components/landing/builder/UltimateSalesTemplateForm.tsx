import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Trash2 } from 'lucide-react';
import { CloudinaryUpload } from '../../CloudinaryUpload';

export default function UltimateSalesTemplateForm({ config, updateConfig, activeTab }: any) {
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) console.error('Error fetching products:', error);
      if (data) {
        setAvailableProducts(data);
      }
    }
    fetchProducts();
  }, []);

  return (
    <>
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Theme Accent Color</label>
              <div className="flex gap-2">
                <input type="color" value={config.accentColor || '#e8ba35'} onChange={e => updateConfig('accentColor', e.target.value)} className="w-10 h-10 p-0 rounded border cursor-pointer"/>
                <input type="text" value={config.accentColor || '#e8ba35'} onChange={e => updateConfig('accentColor', e.target.value)} className="flex-1 px-2 border rounded-md text-sm"/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
              <div className="flex gap-2">
                <input type="color" value={config.backgroundColor || '#f9f4ea'} onChange={e => updateConfig('backgroundColor', e.target.value)} className="w-10 h-10 p-0 rounded border cursor-pointer"/>
                <input type="text" value={config.backgroundColor || '#f9f4ea'} onChange={e => updateConfig('backgroundColor', e.target.value)} className="flex-1 px-2 border rounded-md text-sm"/>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Button Color</label>
            <div className="flex gap-2">
              <input type="color" value={config.buttonColor || '#dc2626'} onChange={e => updateConfig('buttonColor', e.target.value)} className="w-10 h-10 p-0 rounded border cursor-pointer"/>
              <input type="text" value={config.buttonColor || '#dc2626'} onChange={e => updateConfig('buttonColor', e.target.value)} className="flex-1 px-2 border rounded-md text-sm"/>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Global Button Text (CTA)</label>
            <input 
              type="text" 
              value={config.buttonText} 
              onChange={e => updateConfig('buttonText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g. অর্ডার করতে চাই"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
              <input 
                type="text" 
                value={config.whatsappNumber || ''} 
                onChange={e => updateConfig('whatsappNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="e.g. 8801XXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input 
                type="text" 
                value={config.phoneNumber || ''} 
                onChange={e => updateConfig('phoneNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="e.g. 017XXXXXXXX"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Contact Banner Text</label>
            <input 
              type="text" 
              value={config.contactFooterText || ''} 
              onChange={e => updateConfig('contactFooterText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g. আমাদের সাথে যোগাযোগ করুন:"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-800 block">Sticky Mobile Button</span>
                <span className="text-xs text-gray-500 block">মোবাইলের নিচে সবসময় একটি অর্ডার বাটন ভাসমান রাখুন (Highly Recommended)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showStickyButton !== false} 
                  onChange={e => updateConfig('showStickyButton', e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hero' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Title / Headline</label>
            <textarea 
              value={config.productTitle} 
              onChange={e => updateConfig('productTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-bold"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Regular Price</label>
              <input 
                type="text" 
                value={config.regularPrice || ''} 
                onChange={e => updateConfig('regularPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="e.g. 750"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Price (Offer)</label>
              <input 
                type="text" 
                value={config.discountPrice || ''} 
                onChange={e => updateConfig('discountPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-green-700"
                placeholder="e.g. 690"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery / Extra Text (Under Price)</label>
            <input 
              type="text" 
              value={config.deliveryText || ''} 
              onChange={e => updateConfig('deliveryText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g. সারা বাংলাদেশে ফ্রি ডেলিভারি"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Top Bar Text</label>
            <input 
              type="text" 
              value={config.urgencyText || ''} 
              onChange={e => updateConfig('urgencyText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g. অফারটি সীমিত সময়ের জন্য!"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Hero Image URLs</label>
            <div className="space-y-4 mb-2">
              {(config.heroImageUrls || []).map((url: string, index: number) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <CloudinaryUpload 
                      value={url} 
                      onChange={(newUrl) => {
                        const newUrls = [...(config.heroImageUrls || [])];
                        newUrls[index] = newUrl;
                        updateConfig('heroImageUrls', newUrls);
                      }}
                      placeholder="https://"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const newUrls = (config.heroImageUrls || []).filter((_: any, i: number) => i !== index);
                      updateConfig('heroImageUrls', newUrls);
                    }}
                    className="p-2 mt-1 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={() => {
                updateConfig('heroImageUrls', [...(config.heroImageUrls || []), '']);
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-2 mb-4"
            >
              <Plus className="w-4 h-4" /> Add Hero Image
            </button>

            <div className="pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image Badge / Tag (Optional)</label>
              <input 
                type="text" 
                value={config.imageBadgeText !== undefined ? config.imageBadgeText : "100% Original"} 
                onChange={e => updateConfig('imageBadgeText', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="e.g. 100% Original (Leave empty to hide)"
              />
              <p className="text-xs text-gray-500 mt-1">Appears as a floating badge on the top right of the hero images.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Second Optional Image (Shows at bottom)</label>
            <CloudinaryUpload 
              value={config.secondImageUrl || ''} 
              onChange={newUrl => updateConfig('secondImageUrl', newUrl)}
              placeholder="https://"
            />
          </div>
        </div>
      )}

      {activeTab === 'features' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Features Section Title</label>
            <input 
              type="text" 
              value={config.featuresTitle || ''} 
              onChange={e => updateConfig('featuresTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold"
              placeholder="e.g. কেন 5 IN 1 Vegetable Slicer ব্যবহার করবেন?"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Checklist Items</label>
            {(config.features || []).map((feature: string, index: number) => (
              <div key={index} className="flex gap-2">
                <input 
                  type="text" 
                  value={feature}
                  onChange={(e) => {
                    const newFeatures = [...(config.features || [])];
                    newFeatures[index] = e.target.value;
                    updateConfig('features', newFeatures);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g. ৫ IN ১ মাল্টিফাংশন কাটিং"
                />
                <button 
                  onClick={() => {
                    const newFeatures = (config.features || []).filter((_: any, i: number) => i !== index);
                    updateConfig('features', newFeatures);
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button 
              onClick={() => {
                updateConfig('features', [...(config.features || []), '']);
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Feature Item
            </button>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selected Product for Checkout</label>
            <p className="text-xs text-gray-500 mb-4">This product will be added to cart when the user clicks 'Order Now'.</p>
            
            <div className="space-y-3">
              {(config.productIds || []).map((id: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <div className="flex-1">
                    <select
                      value={id}
                      onChange={e => {
                        const newIds = [...config.productIds];
                        newIds[i] = e.target.value;
                        updateConfig('productIds', newIds);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                    >
                      <option value="">Select a product...</option>
                      {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name || p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => updateConfig('productIds', (config.productIds || []).filter((_: any, idx: number) => idx !== i))} className="text-red-500 px-2 bg-gray-50 border rounded-md hover:bg-red-50 transition-colors">✕</button>
                </div>
              ))}
              {(config.productIds || []).length === 0 && (
                <button 
                  onClick={() => updateConfig('productIds', [...(config.productIds || []), ''])} 
                  className="w-full py-2 border-2 border-dashed border-gray-300 text-blue-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium"
                >
                  + Add Product Link
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'testimonials' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reviews Section Title</label>
            <input 
              type="text" 
              value={config.reviewsTitle || ''} 
              onChange={e => updateConfig('reviewsTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. কাস্টমার রিভিউ"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">Customer Reviews</label>
              <button 
                onClick={() => {
                  const newReview = { id: Date.now().toString(), name: '', text: '', image: '' };
                  updateConfig('reviews', [...(config.reviews || []), newReview]);
                }}
                className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Review
              </button>
            </div>
            
            <div className="space-y-4">
              {(config.reviews || []).map((review: any, index: number) => (
                <div key={review.id || index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg relative group">
                  <button 
                    onClick={() => {
                      const newReviews = (config.reviews || []).filter((_: any, i: number) => i !== index);
                      updateConfig('reviews', newReviews);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white text-red-500 hover:bg-red-50 rounded-md border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Customer Name</label>
                      <input 
                        type="text" 
                        value={review.name || ''} 
                        onChange={e => {
                          const newReviews = [...config.reviews];
                          newReviews[index].name = e.target.value;
                          updateConfig('reviews', newReviews);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="e.g. Abul Hasan"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Review Text</label>
                      <textarea 
                        value={review.text || ''} 
                        onChange={e => {
                          const newReviews = [...config.reviews];
                          newReviews[index].text = e.target.value;
                          updateConfig('reviews', newReviews);
                        }}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Excellent product, highly recommended!"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Review Image (Optional: Upload or Link)</label>
                      <CloudinaryUpload 
                        value={review.image || ''} 
                        onChange={newUrl => {
                          const newReviews = [...config.reviews];
                          newReviews[index].image = newUrl;
                          updateConfig('reviews', newReviews);
                        }}
                        placeholder="https://"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {(!config.reviews || config.reviews.length === 0) && (
                <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  No reviews added yet. Click "Add Review" to start.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
