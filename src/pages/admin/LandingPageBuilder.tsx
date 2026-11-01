import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Save, ArrowLeft, Eye, Settings, LayoutTemplate, Star, HelpCircle, ShieldCheck, Box, ListChecks, Image as ImageIcon, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminPageSkeleton } from '../../components/ui/AdminPageSkeleton';
import GlassMultiProductTemplateForm from '../../components/landing/builder/GlassMultiProductTemplateForm';
import UltimateSalesTemplateForm from '../../components/landing/builder/UltimateSalesTemplateForm';

interface LandingPage {
  id: string;
  title: string;
  slug: string;
  product_id: string | null;
  blocks: any[];
  is_published: boolean;
}

const DEFAULT_ULTIMATE_CONFIG = {
  productTitle: 'Special Product',
  regularPrice: '',
  discountPrice: '',
  deliveryText: 'সারা বাংলাদেশে ফ্রি ডেলিভারি',
  heroImageUrls: [],
  secondImageUrl: '',
  buttonText: 'অর্ডার করতে চাই',
  buttonColor: '#ff0000',
  accentColor: '#d6a848',
  backgroundColor: '#f5e8d8',
  featuresTitle: 'কেন এই প্রোডাক্টটি ব্যবহার করবেন?',
  features: [
    'উন্নত ও প্রিমিয়াম কোয়ালিটি',
    'সময় ও পরিশ্রম বাঁচাবে',
    'সহজে ও দীর্ঘস্থায়ীভাবে ব্যবহারযোগ্য',
    '১০০% অরিজিনাল ও কার্যকরী'
  ],
  showStickyButton: true,
  whatsappNumber: '',
  phoneNumber: '',
  contactFooterText: 'আমাদের সাথে যোগাযোগ করুন:',
  productIds: [],
  urgencyText: 'অফারটি সীমিত সময়ের জন্য!'
};

const DEFAULT_GLASS_CONFIG = {
  themeColor: '#16a34a',
  stickyHeaderTitle: 'এক্সক্লুসিভ অফার',
  stickyHeaderButtonText: 'শপ নাউ',
  whatsappNumber: '',
  phoneNumber: '',
  contactBannerText: 'অর্ডার করতে যোগাযোগ করুন',
  stockAlertText: 'স্টক সীমিত তাই দ্রুত আপনারটি নিয়ে নিন',
  deliveryChargeText: 'ডেলিভারি চার্জ - ৮০/ ১৩০ টাকা',
  benefitsTitle: 'আমাদের কাছে কেনো কিনবেন?',
  benefits: [
    'পণ্য হাতে পেয়ে চেক করে পেমেন্ট করার সুবিধা।',
    'সমস্যা থাকলে সাথে সাথে রিটার্ন করতে পারবেন।',
    'সর্বোচ্চ কোয়ালিটি সম্পন্ন এবং অরিজিনাল প্রোডাক্ট।',
    'আমাদের রয়েছে ফাস্ট হোম ডেলিভারি সার্ভিস।'
  ],
  heroHeadline: '',
  heroSubheadline: 'আপনার পছন্দের প্রোডাক্টগুলো বেছে নিন এবং নিশ্চিন্তে অর্ডার করুন।',
  heroImageUrl: '',
  featuresTitle: '',
  features: [
    { id: '1', title: 'ফ্রি শিপিং', subtitle: '১০০০ টাকার উপরের সব অর্ডারে', icon: 'truck' },
    { id: '2', title: 'নিরাপদ পেমেন্ট', subtitle: '১০০% ক্যাশ অন ডেলিভারি', icon: 'shield' },
    { id: '3', title: 'ফাস্ট ডেলিভারি', subtitle: 'দ্রুততম সময়ে প্রোডাক্ট হাতে পান', icon: 'zap' }
  ],
  productIds: [],
  reviewsTitle: 'আমাদের সম্মানিত কাস্টমারদের মতামত',
  reviews: [
    { id: '1', name: 'মোঃ রহিম', review: 'অসাধারণ কোয়ালিটি, ডেলিভারিও অনেক ফাস্ট ছিল।', rating: 5 }
  ],
  buttonText: 'অর্ডার করুন',
  actionButtonColor: '#dc2626',
  showHeroOrderButton: true
};

const DEFAULT_PREMIUM_CONFIG = DEFAULT_GLASS_CONFIG;
const DEFAULT_CLASSIC_CONFIG = DEFAULT_GLASS_CONFIG;

type TabType = string;

export default function LandingPageBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<LandingPage | null>(null);
  
  const [templateType, setTemplateType] = useState<string>('premium_template');
  const [config, setConfig] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [previewKey, setPreviewKey] = useState(Date.now());

  useEffect(() => {
    if (id) fetchPage();
  }, [id]);

  async function fetchPage() {
    try {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setPage(data);
      
      // Initialize or load config
      if (data.blocks && data.blocks.length > 0) {
        const block = data.blocks[0];
        setTemplateType(block.type || 'glass_multi_template');
        setConfig(block.data);
      } else {
        setTemplateType('glass_multi_template');
        setConfig(DEFAULT_GLASS_CONFIG);
      }
    } catch (error) {
      console.error('Error fetching page:', error);
      toast.error('Failed to load landing page');
      navigate('/admin/landing-pages');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!page || !config) return;
    setSaving(true);
    
    const blocksToSave = [{
      id: 'template_1',
      type: templateType,
      data: config
    }];

    try {
      const { error } = await supabase
        .from('landing_pages')
        .update({
          title: page.title,
          slug: page.slug,
          product_id: page.product_id, // ensure product is saved
          blocks: blocksToSave,
          is_published: page.is_published,
        })
        .eq('id', page.id);

      if (error) throw error;
      toast.success('Landing page saved successfully');
      setPreviewKey(Date.now()); // Force iframe refresh
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error('Failed to save landing page');
    } finally {
      setSaving(false);
    }
  }

  const updateConfig = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateChange = (newType: string) => {
    if (newType === templateType) return;
    if (window.confirm('Changing the template will reset your current design settings. Are you sure?')) {
      setTemplateType(newType);
      if (newType === 'premium_template') {
        setConfig(DEFAULT_PREMIUM_CONFIG);
        setActiveTab('general');
      } else if (newType === 'classic_sales_template') {
        setConfig(DEFAULT_CLASSIC_CONFIG);
        setActiveTab('general');
      } else if (newType === 'glass_multi_template') {
        setConfig(DEFAULT_GLASS_CONFIG);
        setActiveTab('general');
      } else if (newType === 'ultimate_sales_template') {
        setConfig(DEFAULT_ULTIMATE_CONFIG);
        setActiveTab('general');
      }
    }
  };

  if (loading) return <AdminPageSkeleton variant="form" />;
  if (!page || !config) return <div>Page not found</div>;

  const tabs = [
    { id: 'general', label: 'General Settings', icon: Settings },
    { id: 'hero', label: 'Hero Section', icon: LayoutTemplate },
    { id: 'features', label: 'Features', icon: Star },
    { id: 'products', label: 'Select Products', icon: Box },
    { id: 'testimonials', label: 'Reviews', icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] -m-4 sm:-m-6 lg:-m-8">
      {/* Builder Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/landing-pages')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <input 
              type="text" 
              value={page.title}
              onChange={(e) => setPage({ ...page, title: e.target.value })}
              className="text-xl font-bold text-gray-900 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-primary px-1"
              placeholder="Page Title"
            />
            <div className="flex items-center gap-2 mt-1 px-1">
              <span className="text-sm text-gray-500">/l/</span>
              <input 
                type="text" 
                value={page.slug}
                onChange={(e) => setPage({ ...page, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                className="text-sm text-gray-500 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-primary"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <select
              value={templateType}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 outline-none hover:bg-gray-200 cursor-pointer"
            >
              <option value="glass_multi_template">Apple Glass Multi-Product Template</option>
              <option value="ultimate_sales_template">Ultimate Sales Template (New & High Converting!)</option>
              <option value="premium_template">Premium Single Product</option>
              <option value="classic_sales_template">Classic Long-form Sales</option>
            </select>
          </div>
          
          <div className="h-8 w-px bg-gray-300 mx-2"></div>
          
          <a
            href={`/l/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            <Eye className="w-4 h-4" />
            Preview
          </a>
          <button
            onClick={() => setPage({ ...page, is_published: !page.is_published })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
              page.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {page.is_published ? 'Published' : 'Draft'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tabs */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-1">
            <h2 className="font-bold text-gray-900 mb-4 px-2 uppercase text-xs tracking-wider">Customize Template</h2>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Area - Form & Preview */}
        <div className="flex-1 bg-white overflow-hidden flex">
          {/* Form */}
          <div className="w-1/2 min-w-[400px] border-r border-gray-100 p-8 overflow-y-auto custom-scrollbar">
            <h2 className="font-bold text-gray-900 mb-4 px-2 uppercase text-xs tracking-wider">Customize Template</h2>
            
            {templateType === 'ultimate_sales_template' ? (
              <UltimateSalesTemplateForm 
                config={config} 
                updateConfig={updateConfig} 
                activeTab={activeTab} 
                page={page} 
                setPage={setPage} 
              />
            ) : (
              <GlassMultiProductTemplateForm 
                config={config} 
                updateConfig={updateConfig} 
                activeTab={activeTab} 
                page={page} 
                setPage={setPage} 
              />
            )}
          </div>

          {/* Minimal Preview Frame */}
          <div className="flex-1 bg-gray-100 p-8 overflow-y-auto flex flex-col">
            <div className="flex-1 max-w-md w-full mx-auto bg-white rounded-[2rem] shadow-2xl overflow-hidden border-[8px] border-gray-900 flex flex-col relative min-h-[700px]">
              <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-xl z-20 w-32 mx-auto"></div>
              
              {/* iframe pointing to preview url */}
              <iframe 
                key={previewKey}
                src={`/l/${page.slug}`} 
                className="w-full h-full flex-1 border-none"
                title="Live Preview"
              />
              
              {/* Overlay blocking clicks to prevent navigation inside preview */}
              <div className="absolute inset-0 z-10 bg-transparent"></div>
              
              <div className="absolute bottom-2 inset-x-0 mx-auto w-1/3 h-1 bg-gray-900 rounded-full z-20"></div>
            </div>
            <p className="text-center text-gray-500 text-sm mt-4">Save changes to update live preview</p>
          </div>
        </div>
      </div>
    </div>
  );
}
