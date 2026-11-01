import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Upload, Download, ArrowLeft, FileText, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import Papa from 'papaparse';
import { useSettings } from '../../contexts/SettingsContext';

interface ProductCSVData {
  title: string;
  slug?: string;
  price: string;
  buy_price?: string;
  original_price: string;
  discount?: string;
  stock?: string;
  image?: string;
  images?: string; // Comma separated
  description?: string;
  category_id?: string;
  is_flash_sale?: string;
  is_best_deal?: string;
  is_delivery_free?: string;
  meta_title?: string;
  meta_keywords?: string;
  meta_description?: string;
  variants?: string; // JSON string representation
}

export default function BulkProductUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const { settings } = useSettings();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error('Error parsing CSV file');
          console.error(results.errors);
          return;
        }
        setCsvData(results.data);
        toast.success(`Loaded ${results.data.length} products from CSV`);
      },
      error: (err: any) => {
        toast.error(`Parse Error: ${err.message}`);
      }
    });
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.floor(Math.random() * 1000);
  };

  const uploadToCloudinary = async (imageUrl: string) => {
    if (!imageUrl) return '';
    const cloudName = settings?.cloudinary_cloud_name;
    const uploadPreset = settings?.cloudinary_upload_preset;

    if (!cloudName || !uploadPreset) {
      // Cloudinary not configured, return the original URL
      return imageUrl;
    }

    try {
      // Check if it's already a cloudinary URL
      if (imageUrl.includes('res.cloudinary.com')) return imageUrl;

      const formData = new FormData();
      formData.append('file', imageUrl); // Cloudinary accepts URL directly
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return data.secure_url;
      }
      return imageUrl;
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      return imageUrl; // Fallback to original url
    }
  };

  const processImport = async () => {
    if (csvData.length === 0) {
      toast.error('Please upload a CSV file with products');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    const toastId = toast.loading(`Importing 0 / ${csvData.length} products...`);

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i] as ProductCSVData;
      
      try {
        if (!row.title || !row.price) {
          errorCount++;
          continue;
        }

        const price = Number(row.price) || 0;
        const original_price = Number(row.original_price) || price;
        let discount = Number(row.discount) || 0;

        if (original_price > price && discount === 0) {
          discount = Math.round(((original_price - price) / original_price) * 100);
        }

        // Process Image to Cloudinary if URL is provided
        let mainImage = row.image || '';
        if (mainImage && mainImage.startsWith('http')) {
          mainImage = await uploadToCloudinary(mainImage);
        }

        // Process Multiple Images
        let imagesArray: string[] = [];
        if (row.images) {
          const rawImages = row.images.split(',').map(url => url.trim()).filter(url => url);
          for (const url of rawImages) {
            if (url.startsWith('http')) {
              const cloudUrl = await uploadToCloudinary(url);
              imagesArray.push(cloudUrl);
            } else {
              imagesArray.push(url);
            }
          }
        }

        // Parse Variants safely
        let variants = [];
        try {
          if (row.variants) variants = JSON.parse(row.variants);
        } catch (e) {
          console.warn('Invalid variants JSON for', row.title);
        }

        const newProduct = {
          title: row.title,
          slug: row.slug || generateSlug(row.title),
          price: price,
          buy_price: Number(row.buy_price) || 0,
          original_price: original_price,
          discount: discount,
          stock: Number(row.stock) || 100,
          image: mainImage,
          images: imagesArray,
          description: row.description || '',
          category_id: row.category_id || null,
          is_flash_sale: row.is_flash_sale === 'true' || row.is_flash_sale === '1',
          is_best_deal: row.is_best_deal === 'true' || row.is_best_deal === '1',
          is_delivery_free: row.is_delivery_free === 'true' || row.is_delivery_free === '1',
          meta_title: row.meta_title || '',
          meta_keywords: row.meta_keywords || '',
          meta_description: row.meta_description || '',
          variants: variants,
        };

        const { error } = await supabase.from('products').insert([newProduct]);

        if (error) {
          console.error('Error inserting product:', error);
          errorCount++;
        } else {
          successCount++;
        }

        toast.loading(`Importing ${i + 1} / ${csvData.length} products...`, { id: toastId });
      } catch (err) {
        console.error('Row import error', err);
        errorCount++;
      }
    }

    setLoading(false);
    toast.success(`Import Complete: ${successCount} Successful, ${errorCount} Failed`, { id: toastId, duration: 5000 });
    if (successCount > 0) {
      setTimeout(() => navigate('/admin/products'), 1500);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const toastId = toast.loading('Fetching products for export...');

    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No products found to export', { id: toastId });
        setExporting(false);
        return;
      }

      // Format data for CSV
      const formattedData = data.map(p => ({
        title: p.title,
        slug: p.slug,
        price: p.price,
        buy_price: p.buy_price || 0,
        original_price: p.original_price,
        discount: p.discount,
        stock: p.stock,
        image: p.image || '',
        images: Array.isArray(p.images) ? p.images.join(', ') : '',
        description: p.description || '',
        category_id: p.category_id || '',
        is_flash_sale: p.is_flash_sale ? '1' : '0',
        is_best_deal: p.is_best_deal ? '1' : '0',
        is_delivery_free: p.is_delivery_free ? '1' : '0',
        meta_title: p.meta_title || '',
        meta_keywords: p.meta_keywords || '',
        meta_description: p.meta_description || '',
        variants: p.variants ? JSON.stringify(p.variants) : '[]'
      }));

      const csv = Papa.unparse(formattedData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Successfully exported ${data.length} products`, { id: toastId });
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`, { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        title: "Sample Product",
        slug: "sample-product",
        price: "1000",
        buy_price: "800",
        original_price: "1200",
        discount: "16",
        stock: "50",
        image: "https://example.com/image.jpg",
        images: "https://example.com/img2.jpg,https://example.com/img3.jpg",
        description: "<p>Sample description</p>",
        category_id: "",
        is_flash_sale: "0",
        is_best_deal: "1",
        is_delivery_free: "0",
        meta_title: "Sample Meta Title",
        meta_keywords: "sample, product",
        meta_description: "Sample Meta Description",
        variants: "[]"
      }
    ];
    
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'product_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xl shadow-slate-200/40">
        <div>
          <button 
            onClick={() => navigate('/admin/products')}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Products
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Bulk Upload & Export</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Import multiple products at once via CSV or export your current catalog.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* IMPORT SECTION */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Import CSV</h2>
              <p className="text-xs text-slate-500 font-medium">Upload a CSV file to add new products.</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-bold mb-1">How it works:</p>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>Download the sample template and follow the format.</li>
                <li>Image URLs will be automatically uploaded to your configured Cloudinary account.</li>
                <li>Do NOT change the column headers.</li>
              </ul>
              <button 
                onClick={downloadTemplate}
                className="mt-3 text-blue-700 font-bold text-xs hover:underline inline-flex items-center gap-1"
              >
                <FileText className="w-4 h-4" /> Download Template
              </button>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
            <input 
              type="file" 
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label 
              htmlFor="csv-upload" 
              className="cursor-pointer flex flex-col items-center"
            >
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-slate-700 mb-1">
                {csvData.length > 0 ? `Selected file with ${csvData.length} products` : 'Click to select CSV file'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {csvData.length > 0 ? 'Click Import Products to proceed.' : 'or drag and drop it here'}
              </span>
            </label>
          </div>

          <button
            onClick={processImport}
            disabled={loading || csvData.length === 0}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</>
            ) : (
              <><Upload className="w-4 h-4" /> Import {csvData.length > 0 ? csvData.length : ''} Products</>
            )}
          </button>
        </div>

        {/* EXPORT SECTION */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Export Catalog</h2>
              <p className="text-xs text-slate-500 font-medium">Download all your products to a CSV file.</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700">
              <p className="font-bold mb-1">Export Note:</p>
              <p className="text-xs">
                Exporting will download all products currently in your store. This is useful for backups or making bulk edits in Excel before re-importing.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mb-6 relative">
              <Download className="w-10 h-10 text-emerald-500" />
              <div className="absolute top-0 right-0 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-700 mb-2">Ready to export</p>
            <p className="text-xs text-slate-500 mb-6 text-center max-w-xs">
              Generate a comprehensive CSV file containing all your product details.
            </p>
            
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {exporting ? (
                <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Preparing Export...</>
              ) : (
                <><Download className="w-4 h-4" /> Export All Products</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
