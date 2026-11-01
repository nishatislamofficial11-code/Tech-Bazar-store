import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Trash2 } from 'lucide-react';

export default function GlassMultiProductTemplateForm({ config, updateConfig, activeTab }: any) {
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theme Accent Color</label>
            <div className="flex gap-2">
              <input type="color" value={config.themeColor} onChange={e => updateConfig('themeColor', e.target.value)} className="w-10 h-10 p-0 rounded border cursor-pointer"/>
              <input type="text" value={config.themeColor} onChange={e => updateConfig('themeColor', e.target.value)} className="flex-1 px-2 border rounded-md text-sm"/>
            </div>
            <p className="text-xs text-gray-500 mt-1">Used for elements like text color, background, and icons</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Button Color</label>
            <div className="flex gap-2">
              <input type="color" value={config.actionButtonColor || '#dc2626'} onChange={e => updateConfig('actionButtonColor', e.target.value)} className="w-10 h-10 p-0 rounded border cursor-pointer"/>
              <input type="text" value={config.actionButtonColor || '#dc2626'} onChange={e => updateConfig('actionButtonColor', e.target.value)} className="flex-1 px-2 border rounded-md text-sm"/>
            </div>
            <p className="text-xs text-gray-500 mt-1">Used for the extra 'Order Now' buttons (defaults to red)</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sticky Header Title</label>
              <input 
                type="text" 
                value={config.stickyHeaderTitle || ''} 
                onChange={e => updateConfig('stickyHeaderTitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="e.g. এক্সক্লুসিভ অফার"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sticky Header Button</label>
              <input 
                type="text" 
                value={config.stickyHeaderButtonText || ''} 
                onChange={e => updateConfig('stickyHeaderButtonText', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="e.g. শপ নাউ"
              />
            </div>
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
              <p className="text-[10px] text-gray-500 mt-1">Include country code (e.g. 880)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input 
                type="text" 
                value={config.phoneNumber || ''} 
                onChange={e => updateConfig('phoneNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="e.g. 01XXXXXXXXX"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Global Button Text (CTA)</label>
            <input 
              type="text" 
              value={config.buttonText} 
              onChange={e => updateConfig('buttonText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g. অর্ডার করুন"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-800 block">হিরো সেকশন অর্ডার বাটন (Hero Order Button)</span>
                <span className="text-xs text-gray-500 block">স্লাইডার বা ছবির নিচের 'অর্ডার করুন' বাটনটি চালু বা বন্ধ করুন</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showHeroOrderButton !== false} 
                  onChange={e => updateConfig('showHeroOrderButton', e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">Benefits / Why Buy From Us Title</label>
            <input 
              type="text" 
              value={config.benefitsTitle || ''} 
              onChange={e => updateConfig('benefitsTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
              placeholder="e.g. আমাদের কাছে কেনো কিনবেন?"
            />
            <div className="space-y-2">
              {(config.benefits || []).map((benefit: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <input 
                    type="text" 
                    value={benefit}
                    onChange={(e) => {
                      const newBenefits = [...(config.benefits || [])];
                      newBenefits[index] = e.target.value;
                      updateConfig('benefits', newBenefits);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g. পণ্য হাতে পেয়ে চেক করে..."
                  />
                  <button 
                    onClick={() => {
                      const newBenefits = (config.benefits || []).filter((_: any, i: number) => i !== index);
                      updateConfig('benefits', newBenefits);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => {
                  updateConfig('benefits', [...(config.benefits || []), '']);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Benefit
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4">Extra Banners & Texts</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Banner Text</label>
                <input 
                  type="text" 
                  value={config.contactBannerText || ''} 
                  onChange={e => updateConfig('contactBannerText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g. অর্ডার করতে যোগাযোগ করুন"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Alert Text</label>
                <input 
                  type="text" 
                  value={config.stockAlertText || ''} 
                  onChange={e => updateConfig('stockAlertText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g. স্টক সীমিত তাই দ্রুত আপনারটি নিয়ে নিন"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Charge Text</label>
                <input 
                  type="text" 
                  value={config.deliveryChargeText || ''} 
                  onChange={e => updateConfig('deliveryChargeText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g. ডেলিভারি চার্জ - ৮০/ ১৩০ টাকা"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hero' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Headline</label>
            <textarea 
              value={config.heroHeadline} 
              onChange={e => updateConfig('heroHeadline', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-bold"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Subheadline</label>
            <textarea 
              value={config.heroSubheadline} 
              onChange={e => updateConfig('heroSubheadline', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URLs</label>
            <div className="space-y-2 mb-2">
              {((config.heroImageUrls && config.heroImageUrls.length > 0) ? config.heroImageUrls : (config.heroImageUrl ? [config.heroImageUrl] : [])).map((url: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <input 
                    type="text" 
                    value={url} 
                    onChange={e => {
                      const newUrls = [...((config.heroImageUrls && config.heroImageUrls.length > 0) ? config.heroImageUrls : (config.heroImageUrl ? [config.heroImageUrl] : []))];
                      newUrls[index] = e.target.value;
                      updateConfig('heroImageUrls', newUrls);
                      updateConfig('heroImageUrl', newUrls[0] || ''); // Keep backward compatibility
                    }}
                    placeholder="https://"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button 
                    onClick={() => {
                      const newUrls = ((config.heroImageUrls && config.heroImageUrls.length > 0) ? config.heroImageUrls : (config.heroImageUrl ? [config.heroImageUrl] : [])).filter((_: any, i: number) => i !== index);
                      updateConfig('heroImageUrls', newUrls);
                      updateConfig('heroImageUrl', newUrls[0] || '');
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={() => {
                const currentUrls = ((config.heroImageUrls && config.heroImageUrls.length > 0) ? config.heroImageUrls : (config.heroImageUrl ? [config.heroImageUrl] : []));
                updateConfig('heroImageUrls', [...currentUrls, '']);
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Another Image
            </button>
            <p className="text-xs text-gray-500 mt-2">Add multiple images to create an auto-sliding carousel</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-800 block">হিরো সেকশন অর্ডার বাটন (Hero Order Button)</span>
                <span className="text-xs text-gray-500 block">স্লাইডার বা ছবির ঠিক নিচের 'অর্ডার করুন' বাটনটি চালু বা বন্ধ করুন</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showHeroOrderButton !== false} 
                  onChange={e => updateConfig('showHeroOrderButton', e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selected Products</label>
            <p className="text-xs text-gray-500 mb-4">Select the products you want to showcase on this landing page.</p>
            
            <div className="space-y-3">
              {config.productIds.map((id: string, i: number) => (
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
                  <button onClick={() => updateConfig('productIds', config.productIds.filter((_: any, idx: number) => idx !== i))} className="text-red-500 px-2 bg-gray-50 border rounded-md hover:bg-red-50 transition-colors">✕</button>
                </div>
              ))}
              <button 
                onClick={() => updateConfig('productIds', [...config.productIds, ''])} 
                className="w-full py-2 border-2 border-dashed border-gray-300 text-blue-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium"
              >
                + Add Another Product
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'features' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">Add glassmorphism feature cards below the hero section.</p>
          {config.features.map((feat: any, i: number) => (
            <div key={feat.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative group">
              <button 
                onClick={() => updateConfig('features', config.features.filter((_: any, idx: number) => idx !== i))}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-opacity"
              >
                ✕
              </button>
              <div className="space-y-3">
                <select
                  value={feat.icon}
                  onChange={e => {
                    const newF = [...config.features];
                    newF[i].icon = e.target.value;
                    updateConfig('features', newF);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none bg-white"
                >
                  <option value="check">Checkmark</option>
                  <option value="star">Star</option>
                  <option value="truck">Truck / Delivery</option>
                  <option value="shield">Shield / Secure</option>
                  <option value="zap">Zap / Fast</option>
                  <option value="bag">Shopping Bag</option>
                </select>
                <input 
                  type="text" 
                  value={feat.title} 
                  onChange={e => {
                    const newF = [...config.features];
                    newF[i].title = e.target.value;
                    updateConfig('features', newF);
                  }}
                  placeholder="Feature Title"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold"
                />
                <textarea 
                  value={feat.subtitle} 
                  onChange={e => {
                    const newF = [...config.features];
                    newF[i].subtitle = e.target.value;
                    updateConfig('features', newF);
                  }}
                  placeholder="Short Description"
                  rows={2}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => updateConfig('features', [...config.features, { id: crypto.randomUUID(), title: '', subtitle: '', icon: 'check' }])}
            className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-colors text-sm font-medium"
          >
            + Add Feature
          </button>
        </div>
      )}

      {activeTab === 'testimonials' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reviews Section Title</label>
            <input 
              type="text" 
              value={config.reviewsTitle} 
              onChange={e => updateConfig('reviewsTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="space-y-4">
            {config.reviews.map((item: any, i: number) => (
              <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative group">
                <button 
                  onClick={() => updateConfig('reviews', config.reviews.filter((_: any, idx: number) => idx !== i))}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                >
                  ✕
                </button>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    value={item.name} 
                    onChange={e => {
                      const newItems = [...config.reviews];
                      newItems[i].name = e.target.value;
                      updateConfig('reviews', newItems);
                    }}
                    placeholder="Customer Name"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold"
                  />
                  <select
                    value={item.rating}
                    onChange={e => {
                      const newItems = [...config.reviews];
                      newItems[i].rating = parseInt(e.target.value);
                      updateConfig('reviews', newItems);
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                  </select>
                  <textarea 
                    value={item.review} 
                    onChange={e => {
                      const newItems = [...config.reviews];
                      newItems[i].review = e.target.value;
                      updateConfig('reviews', newItems);
                    }}
                    placeholder="Review Text"
                    rows={3}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  />
                  <input 
                    type="text" 
                    value={item.imageUrl || ''} 
                    onChange={e => {
                      const newItems = [...config.reviews];
                      newItems[i].imageUrl = e.target.value;
                      updateConfig('reviews', newItems);
                    }}
                    placeholder="Review Image URL (Optional - replaces text with image)"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => updateConfig('reviews', [...config.reviews, { id: crypto.randomUUID(), name: '', review: '', rating: 5 }])}
              className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-colors text-sm font-medium"
            >
              + Add Testimonial
            </button>
          </div>
        </div>
      )}
    </>
  );
}
