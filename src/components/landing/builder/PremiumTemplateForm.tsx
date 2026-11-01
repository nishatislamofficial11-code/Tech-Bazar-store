import React from 'react';

export default function PremiumTemplateForm({ config, updateConfig, activeTab, page, setPage }: any) {
  return (
    <>
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theme Color</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                value={config.themeColor} 
                onChange={e => updateConfig('themeColor', e.target.value)}
                className="w-10 h-10 rounded border border-gray-300 cursor-pointer p-0"
              />
              <input 
                type="text" 
                value={config.themeColor} 
                onChange={e => updateConfig('themeColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product ID (Required for Checkout)</label>
            <input 
              type="text" 
              value={page.product_id || ''} 
              onChange={e => setPage({ ...page, product_id: e.target.value })}
              placeholder="Enter UUID of the product"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Customers will buy this product when clicking Order Now.</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-900">Sales Elements</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Show Countdown Timer</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.showCountdown} onChange={e => updateConfig('showCountdown', e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {config.showCountdown && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Countdown Minutes (Default reset)</label>
                <input 
                  type="number" 
                  value={config.countdownMinutes} 
                  onChange={e => updateConfig('countdownMinutes', parseInt(e.target.value) || 15)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Charge Text</label>
              <input 
                type="text" 
                value={config.deliveryCharge} 
                onChange={e => updateConfig('deliveryCharge', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guarantee Text</label>
              <input 
                type="text" 
                value={config.guaranteeText} 
                onChange={e => updateConfig('guaranteeText', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hero' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
            <textarea 
              value={config.heroHeadline} 
              onChange={e => updateConfig('heroHeadline', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-xl font-bold"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subheadline</label>
            <textarea 
              value={config.heroSubheadline} 
              onChange={e => updateConfig('heroSubheadline', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
            <input 
              type="text" 
              value={config.buttonText} 
              onChange={e => updateConfig('buttonText', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none font-bold"
            />
          </div>
          <div className="bg-blue-50 p-4 rounded-xl space-y-4">
            <h3 className="font-semibold text-blue-900 text-sm">Media (Image or Video)</h3>
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Image URL</label>
              <input 
                type="text" 
                value={config.heroImageUrl} 
                onChange={e => updateConfig('heroImageUrl', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-blue-200 rounded-lg outline-none text-sm"
              />
            </div>
            <div className="text-center text-xs text-blue-600 font-medium">OR</div>
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">YouTube Video ID</label>
              <input 
                type="text" 
                value={config.heroVideoUrl} 
                onChange={e => updateConfig('heroVideoUrl', e.target.value)}
                placeholder="e.g. dQw4w9WgXcQ"
                className="w-full px-3 py-2 border border-blue-200 rounded-lg outline-none text-sm"
              />
              <p className="text-[11px] text-blue-600 mt-1">If video ID is provided, it will replace the image.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'benefits' && (
        <div className="space-y-4">
          {config.benefits.map((item: any, i: number) => (
            <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative group">
              <button 
                onClick={() => {
                  const newItems = config.benefits.filter((_: any, index: number) => index !== i);
                  updateConfig('benefits', newItems);
                }}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
              <div className="space-y-3">
                <select
                  value={item.icon}
                  onChange={e => {
                    const newItems = [...config.benefits];
                    newItems[i].icon = e.target.value;
                    updateConfig('benefits', newItems);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none bg-white"
                >
                  <option value="check">Checkmark</option>
                  <option value="star">Star</option>
                  <option value="truck">Truck</option>
                  <option value="headset">Headset / Support</option>
                  <option value="shield">Shield / Secure</option>
                  <option value="zap">Zap / Fast</option>
                </select>
                <input 
                  type="text" 
                  value={item.title} 
                  onChange={e => {
                    const newItems = [...config.benefits];
                    newItems[i].title = e.target.value;
                    updateConfig('benefits', newItems);
                  }}
                  placeholder="Title"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none font-bold"
                />
                <textarea 
                  value={item.description} 
                  onChange={e => {
                    const newItems = [...config.benefits];
                    newItems[i].description = e.target.value;
                    updateConfig('benefits', newItems);
                  }}
                  placeholder="Description"
                  rows={2}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none"
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => updateConfig('benefits', [...config.benefits, { id: crypto.randomUUID(), title: '', description: '', icon: 'check' }])}
            className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-primary hover:text-primary transition-colors text-sm font-medium"
          >
            + Add Benefit
          </button>
        </div>
      )}

      {activeTab === 'testimonials' && (
        <div className="space-y-4">
          {config.testimonials.map((item: any, i: number) => (
            <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative group">
              <button 
                onClick={() => {
                  const newItems = config.testimonials.filter((_: any, index: number) => index !== i);
                  updateConfig('testimonials', newItems);
                }}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
              <div className="space-y-3">
                <input 
                  type="text" 
                  value={item.name} 
                  onChange={e => {
                    const newItems = [...config.testimonials];
                    newItems[i].name = e.target.value;
                    updateConfig('testimonials', newItems);
                  }}
                  placeholder="Customer Name"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none font-bold"
                />
                <select
                  value={item.rating}
                  onChange={e => {
                    const newItems = [...config.testimonials];
                    newItems[i].rating = parseInt(e.target.value);
                    updateConfig('testimonials', newItems);
                  }}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none bg-white"
                >
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                </select>
                <textarea 
                  value={item.review} 
                  onChange={e => {
                    const newItems = [...config.testimonials];
                    newItems[i].review = e.target.value;
                    updateConfig('testimonials', newItems);
                  }}
                  placeholder="Review Text"
                  rows={3}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none"
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => updateConfig('testimonials', [...config.testimonials, { id: crypto.randomUUID(), name: '', review: '', rating: 5 }])}
            className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-primary hover:text-primary transition-colors text-sm font-medium"
          >
            + Add Testimonial
          </button>
        </div>
      )}

      {activeTab === 'faqs' && (
        <div className="space-y-4">
          {config.faqs.map((item: any, i: number) => (
            <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative group">
              <button 
                onClick={() => {
                  const newItems = config.faqs.filter((_: any, index: number) => index !== i);
                  updateConfig('faqs', newItems);
                }}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
              <div className="space-y-3">
                <input 
                  type="text" 
                  value={item.question} 
                  onChange={e => {
                    const newItems = [...config.faqs];
                    newItems[i].question = e.target.value;
                    updateConfig('faqs', newItems);
                  }}
                  placeholder="Question"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none font-medium"
                />
                <textarea 
                  value={item.answer} 
                  onChange={e => {
                    const newItems = [...config.faqs];
                    newItems[i].answer = e.target.value;
                    updateConfig('faqs', newItems);
                  }}
                  placeholder="Answer"
                  rows={2}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none"
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => updateConfig('faqs', [...config.faqs, { id: crypto.randomUUID(), question: '', answer: '' }])}
            className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-primary hover:text-primary transition-colors text-sm font-medium"
          >
            + Add FAQ
          </button>
        </div>
      )}
    </>
  );
}
