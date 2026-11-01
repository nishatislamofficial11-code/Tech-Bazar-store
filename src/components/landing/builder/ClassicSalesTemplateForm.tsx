import React from 'react';

export default function ClassicSalesTemplateForm({ config, updateConfig, activeTab, page, setPage }: any) {
  return (
    <>
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product ID (Required for Checkout)</label>
            <input 
              type="text" 
              value={page.product_id || ''} 
              onChange={e => setPage({ ...page, product_id: e.target.value })}
              placeholder="Enter UUID of the product"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input type="color" value={config.themeColor} onChange={e => updateConfig('themeColor', e.target.value)} className="w-10 h-10 p-0 rounded border cursor-pointer"/>
                <input type="text" value={config.themeColor} onChange={e => updateConfig('themeColor', e.target.value)} className="flex-1 px-2 border rounded-md text-sm"/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
              <div className="flex gap-2">
                <input type="color" value={config.themeSecondaryColor} onChange={e => updateConfig('themeSecondaryColor', e.target.value)} className="w-10 h-10 p-0 rounded border cursor-pointer"/>
                <input type="text" value={config.themeSecondaryColor} onChange={e => updateConfig('themeSecondaryColor', e.target.value)} className="flex-1 px-2 border rounded-md text-sm"/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button Color</label>
              <div className="flex gap-2">
                <input type="color" value={config.buttonColor} onChange={e => updateConfig('buttonColor', e.target.value)} className="w-10 h-10 p-0 rounded border cursor-pointer"/>
                <input type="text" value={config.buttonColor} onChange={e => updateConfig('buttonColor', e.target.value)} className="flex-1 px-2 border rounded-md text-sm"/>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Helpline Phone Number</label>
            <input 
              type="text" 
              value={config.helplineNumber} 
              onChange={e => updateConfig('helplineNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Helpline Title Text</label>
            <input 
              type="text" 
              value={config.helplineText} 
              onChange={e => updateConfig('helplineText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      )}

      {activeTab === 'hero' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Top Banner Text</label>
            <textarea 
              value={config.topBannerText} 
              onChange={e => updateConfig('topBannerText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subheadline</label>
            <textarea 
              value={config.subheadline} 
              onChange={e => updateConfig('subheadline', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Global Button Text (CTA)</label>
            <input 
              type="text" 
              value={config.ctaText} 
              onChange={e => updateConfig('ctaText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      )}

      {activeTab === 'problems' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
            <input 
              type="text" 
              value={config.problemsTitle} 
              onChange={e => updateConfig('problemsTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Pain Points (Problems)</label>
            {config.problems.map((prob: string, i: number) => (
              <div key={i} className="flex gap-2">
                <input 
                  type="text" 
                  value={prob}
                  onChange={e => {
                    const newProbs = [...config.problems];
                    newProbs[i] = e.target.value;
                    updateConfig('problems', newProbs);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <button onClick={() => updateConfig('problems', config.problems.filter((_: any, idx: number) => idx !== i))} className="text-red-500 px-2">✕</button>
              </div>
            ))}
            <button onClick={() => updateConfig('problems', [...config.problems, ''])} className="text-sm text-blue-600 font-medium">+ Add Problem</button>
          </div>

          <div className="space-y-2 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700">Problem Images (URLs)</label>
            {config.problemImages.map((img: string, i: number) => (
              <div key={i} className="flex gap-2">
                <input 
                  type="text" 
                  value={img}
                  onChange={e => {
                    const newImgs = [...config.problemImages];
                    newImgs[i] = e.target.value;
                    updateConfig('problemImages', newImgs);
                  }}
                  placeholder="https://"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <button onClick={() => updateConfig('problemImages', config.problemImages.filter((_: any, idx: number) => idx !== i))} className="text-red-500 px-2">✕</button>
              </div>
            ))}
            <button onClick={() => updateConfig('problemImages', [...config.problemImages, ''])} className="text-sm text-blue-600 font-medium">+ Add Image URL</button>
          </div>
        </div>
      )}

      {activeTab === 'product' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
            <input 
              type="text" 
              value={config.productIntroTitle} 
              onChange={e => updateConfig('productIntroTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Subtitle/Description</label>
            <textarea 
              value={config.productIntroSubtitle} 
              onChange={e => updateConfig('productIntroSubtitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Image URL</label>
            <input 
              type="text" 
              value={config.productImageUrl} 
              onChange={e => updateConfig('productImageUrl', e.target.value)}
              placeholder="https://"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Product Benefits (Checkmarks)</label>
            {config.productBenefits.map((ben: string, i: number) => (
              <div key={i} className="flex gap-2">
                <input 
                  type="text" 
                  value={ben}
                  onChange={e => {
                    const newBens = [...config.productBenefits];
                    newBens[i] = e.target.value;
                    updateConfig('productBenefits', newBens);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <button onClick={() => updateConfig('productBenefits', config.productBenefits.filter((_: any, idx: number) => idx !== i))} className="text-red-500 px-2">✕</button>
              </div>
            ))}
            <button onClick={() => updateConfig('productBenefits', [...config.productBenefits, ''])} className="text-sm text-blue-600 font-medium">+ Add Benefit</button>
          </div>
        </div>
      )}

      {activeTab === 'packages' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Packages Section Title</label>
            <input 
              type="text" 
              value={config.packageTitle} 
              onChange={e => updateConfig('packageTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="space-y-4">
            {config.packages.map((pkg: any, i: number) => (
              <div key={pkg.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative group">
                <button 
                  onClick={() => {
                    const newPkgs = config.packages.filter((_: any, index: number) => index !== i);
                    updateConfig('packages', newPkgs);
                  }}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    value={pkg.title} 
                    onChange={e => {
                      const newPkgs = [...config.packages];
                      newPkgs[i].title = e.target.value;
                      updateConfig('packages', newPkgs);
                    }}
                    placeholder="Package Title (e.g., 1 Bottle)"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none font-bold"
                  />
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Regular Price</label>
                      <input 
                        type="number" 
                        value={pkg.originalPrice} 
                        onChange={e => {
                          const newPkgs = [...config.packages];
                          newPkgs[i].originalPrice = Number(e.target.value);
                          updateConfig('packages', newPkgs);
                        }}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Discount Price (Actual)</label>
                      <input 
                        type="number" 
                        value={pkg.price} 
                        onChange={e => {
                          const newPkgs = [...config.packages];
                          newPkgs[i].price = Number(e.target.value);
                          updateConfig('packages', newPkgs);
                        }}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-red-600"
                      />
                    </div>
                  </div>
                  <input 
                    type="text" 
                    value={pkg.description} 
                    onChange={e => {
                      const newPkgs = [...config.packages];
                      newPkgs[i].description = e.target.value;
                      updateConfig('packages', newPkgs);
                    }}
                    placeholder="Description (Optional)"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => updateConfig('packages', [...config.packages, { id: crypto.randomUUID(), title: '', originalPrice: 0, price: 0, description: '' }])}
              className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-primary hover:text-primary transition-colors text-sm font-medium"
            >
              + Add Package
            </button>
          </div>
        </div>
      )}

      {activeTab === 'features' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Features Section Title</label>
            <input 
              type="text" 
              value={config.featuresTitle} 
              onChange={e => updateConfig('featuresTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="space-y-4">
            {config.features.map((feat: any, i: number) => (
              <div key={feat.id} className="flex gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex-1 space-y-2">
                  <input 
                    type="text" 
                    value={feat.title}
                    onChange={e => {
                      const newF = [...config.features];
                      newF[i].title = e.target.value;
                      updateConfig('features', newF);
                    }}
                    placeholder="Feature Title"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  />
                  <input 
                    type="text" 
                    value={feat.imageUrl}
                    onChange={e => {
                      const newF = [...config.features];
                      newF[i].imageUrl = e.target.value;
                      updateConfig('features', newF);
                    }}
                    placeholder="Image URL"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <button onClick={() => updateConfig('features', config.features.filter((_: any, idx: number) => idx !== i))} className="text-red-500 px-2">✕</button>
              </div>
            ))}
            <button onClick={() => updateConfig('features', [...config.features, { id: crypto.randomUUID(), title: '', imageUrl: '' }])} className="text-sm text-blue-600 font-medium">+ Add Feature</button>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Instructions Section</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions Title</label>
              <input 
                type="text" 
                value={config.instructionsTitle} 
                onChange={e => updateConfig('instructionsTitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instruction Image URL</label>
              <input 
                type="text" 
                value={config.instructionImageUrl} 
                onChange={e => updateConfig('instructionImageUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Steps</label>
              {config.instructions.map((inst: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <input 
                    type="text" 
                    value={inst}
                    onChange={e => {
                      const newInsts = [...config.instructions];
                      newInsts[i] = e.target.value;
                      updateConfig('instructions', newInsts);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <button onClick={() => updateConfig('instructions', config.instructions.filter((_: any, idx: number) => idx !== i))} className="text-red-500 px-2">✕</button>
                </div>
              ))}
              <button onClick={() => updateConfig('instructions', [...config.instructions, ''])} className="text-sm text-blue-600 font-medium">+ Add Step</button>
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
              value={config.reviewsTitle} 
              onChange={e => updateConfig('reviewsTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="space-y-4">
            {config.reviews.map((item: any, i: number) => (
              <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative group">
                <button 
                  onClick={() => {
                    const newItems = config.reviews.filter((_: any, index: number) => index !== i);
                    updateConfig('reviews', newItems);
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
                      const newItems = [...config.reviews];
                      newItems[i].name = e.target.value;
                      updateConfig('reviews', newItems);
                    }}
                    placeholder="Customer Name"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none font-bold"
                  />
                  <textarea 
                    value={item.review} 
                    onChange={e => {
                      const newItems = [...config.reviews];
                      newItems[i].review = e.target.value;
                      updateConfig('reviews', newItems);
                    }}
                    placeholder="Review Text"
                    rows={3}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => updateConfig('reviews', [...config.reviews, { id: crypto.randomUUID(), name: '', review: '' }])}
              className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-primary hover:text-primary transition-colors text-sm font-medium"
            >
              + Add Testimonial
            </button>
          </div>
        </div>
      )}
    </>
  );
}
