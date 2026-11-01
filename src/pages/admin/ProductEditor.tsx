import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../contexts/SettingsContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Eye,
  Copy,
  Plus,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Layers,
  Globe,
  Search,
  X,
  ExternalLink,
  ChevronRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading3,
  Link as LinkIcon,
  Code,
  Percent,
  Box,
  ShoppingBag,
  Maximize2,
  RefreshCw,
  Flame,
  Truck,
  Tag,
  Star,
  FileText,
  CheckCircle2,
  Smartphone,
  Laptop,
  Share2,
  Check,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Youtube,
  Play
} from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import ImageCropperModal from '../../components/ui/ImageCropperModal';
import { getYouTubeVideoId, getYouTubeThumbnail } from '../../lib/youtube';
import { Crop } from 'lucide-react';

interface Variant {
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  color: string;
  size: string;
  sku: string;
  price: number;
  compare_price: number;
  cost_price: number;
  delivery_charge?: number;
  stock: number;
  weight: number;
  image?: string;
}

interface Product {
  id: string;
  title: string;
  image: string;
  images?: string[];
  price: number;
  buy_price?: number;
  original_price: number;
  discount: number;
  description?: string;
  category_id?: string;
  is_flash_sale?: boolean;
  is_best_deal?: boolean;
  is_delivery_free?: boolean;
  delivery_charge?: number | null;
  variants?: Variant[];
  stock: number;
  meta_title?: string;
  meta_keywords?: string;
  meta_description?: string;
  slug: string;
  related_product_ids?: string[];
  offer_time?: string;
  video_url?: string;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminProductEditor() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Active tabs / view modes
  const { settings } = useSettings();
  const [descViewMode, setDescViewMode] = useState<'visual' | 'html' | 'preview'>('visual');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [bulkImageUrlModal, setBulkImageUrlModal] = useState(false);
  const [bulkImageUrlsText, setBulkImageUrlsText] = useState('');
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);
  const [relatedProductSearch, setRelatedProductSearch] = useState('');
  const [cropModalState, setCropModalState] = useState<{ isOpen: boolean; imageSrc: string; index: number }>({ isOpen: false, imageSrc: '', index: -1 });
  const [originalImageMap, setOriginalImageMap] = useState<Record<string, string>>({});
  const [seoPreviewTab, setSeoPreviewTab] = useState<'desktop' | 'mobile' | 'social'>('desktop');
  const [focusKeyword, setFocusKeyword] = useState<string>('');
  const [showSeoChecklist, setShowSeoChecklist] = useState<boolean>(true);

  // Bulk variant values
  const [bulkVariantPrice, setBulkVariantPrice] = useState<string>('');
  const [bulkVariantStock, setBulkVariantStock] = useState<string>('');

  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const initialFormState = {
    title: '',
    image: '',
    images: [] as string[],
    price: 0,
    buy_price: 0,
    original_price: 0,
    discount: 0,
    description: '',
    category_id: '',
    is_flash_sale: false,
    is_best_deal: false,
    is_delivery_free: false,
    delivery_charge: 0,
    variants: [] as Variant[],
    stock: 100,
    meta_title: '',
    meta_keywords: '',
    meta_description: '',
    slug: '',
    related_product_ids: [] as string[],
    offer_time: '',
    video_url: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const slugify = (value: string = '') =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  const stripHtml = (value: string = '') => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const truncateAtWord = (value: string = '', maxLength: number = 150) => {
    if (value.length <= maxLength) return value;
    return value.slice(0, maxLength).trim().replace(/\s+\S*$/, '').trim();
  };

  // Keyboard shortcut for saving (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const form = document.getElementById('product-form') as HTMLFormElement | null;
        if (form) {
          form.requestSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Categories & All Products for Cross-sell
  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [{ data: cats }, { data: prods }] = await Promise.all([
          supabase.from('categories').select('id, name').order('name'),
          supabase.from('products').select('id, title, image, price, slug').order('created_at', { ascending: false })
        ]);
        if (cats) setCategories(cats);
        if (prods) setAllProducts(prods);
      } catch (e) {
        console.error('Failed to load initial data:', e);
      }
    };
    loadPrerequisites();
  }, []);

  // Fetch product if in edit mode
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error) {
          toast.error('Could not load product details: ' + error.message);
          navigate('/admin/products');
          return;
        }
        if (data) {
          let calculatedDiscount = data.discount;
          if (
            (!calculatedDiscount || calculatedDiscount === 0) &&
            data.original_price > data.price &&
            data.original_price > 0
          ) {
            calculatedDiscount = Math.round(((data.original_price - data.price) / data.original_price) * 100);
          }

          setFormData({
            title: data.title || '',
            image: data.image || '',
            images: Array.isArray(data.images) ? data.images : [],
            price: Number(data.price || 0),
            buy_price: Number(data.buy_price || 0),
            original_price: Number(data.original_price || 0),
            discount: calculatedDiscount || 0,
            description: data.description || '',
            category_id: data.category_id || '',
            is_flash_sale: Boolean(data.is_flash_sale),
            is_best_deal: Boolean(data.is_best_deal),
            is_delivery_free: Boolean(data.is_delivery_free),
            delivery_charge: Number(data.delivery_charge || 0),
            variants: normalizeVariants(data.variants || [], data),
            stock: Number(data.stock ?? 100),
            meta_title: data.meta_title || '',
            meta_keywords: data.meta_keywords || '',
            meta_description: data.meta_description || '',
            slug: data.slug || slugify(data.title || ''),
            related_product_ids: Array.isArray(data.related_product_ids) ? data.related_product_ids : [],
            offer_time: data.offer_time || '',
            video_url: data.video_url || ''
          });

          if (data.meta_keywords) {
            const firstKw = data.meta_keywords.split(',')[0]?.trim();
            if (firstKw) setFocusKeyword(firstKw);
          } else if (data.title) {
            setFocusKeyword(data.title);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const normalizeVariants = (variants: any[] = [], fallback = formData): Variant[] =>
    (Array.isArray(variants) ? variants : []).map((variant) => {
      if ('name' in variant && 'options' in variant) {
        return {
          option1_name: variant.name || 'Option 1',
          option1_value: variant.options || '',
          option2_name: '',
          option2_value: '',
          color: variant.name || '',
          size: variant.options || '',
          sku: '',
          price: Number(fallback.price || 0),
          compare_price: Number(fallback.original_price || 0),
          cost_price: 0,
          delivery_charge: Number(fallback.delivery_charge || 0),
          stock: Number(fallback.stock || 0),
          weight: 0,
          image: ''
        };
      }

      return {
        option1_name: variant.option1_name || variant.optionName1 || 'Color',
        option1_value: variant.option1_value || variant.optionValue1 || variant.color || '',
        option2_name: variant.option2_name || variant.optionName2 || (variant.size ? 'Size' : ''),
        option2_value: variant.option2_value || variant.optionValue2 || variant.size || '',
        color: variant.color || '',
        size: variant.size || '',
        sku: variant.sku || '',
        price: Number(variant.price || 0),
        compare_price: Number(variant.compare_price || variant.original_price || 0),
        cost_price: Number(variant.cost_price ?? 0),
        delivery_charge: Number(variant.delivery_charge ?? 0),
        stock: Number(variant.stock || 0),
        weight: Number(variant.weight || 0),
        image: variant.image || ''
      };
    });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setIsDirty(true);

    setFormData((prev) => {
      const val = type === 'checkbox' ? checked : type === 'number' ? Number(value) : value;
      const newData = {
        ...prev,
        [name]: val
      };

      if (name === 'title' && !isEditMode) {
        newData.slug = slugify(value);
      }

      if (name === 'price' || name === 'original_price') {
        const p = name === 'price' ? Number(value) : Number(prev.price || 0);
        const op = name === 'original_price' ? Number(value) : Number(prev.original_price || 0);

        if (op > 0 && op > p) {
          newData.discount = Math.round(((op - p) / op) * 100);
        } else {
          newData.discount = 0;
        }
      }

      return newData;
    });
  };

  // Rich description helper formatting
  const insertFormatting = (prefix: string, suffix: string = '') => {
    setIsDirty(true);
    const textarea = descriptionTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = formData.description || '';
    const selectedText = currentVal.substring(start, end);

    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    setFormData((prev) => ({ ...prev, description: newVal }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 50);
  };

  // Image helpers
  const allImagesList = [
    ...(formData.image ? [formData.image] : []),
    ...(Array.isArray(formData.images) ? formData.images : [])
  ].filter(Boolean);

  const handleAddImage = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setIsDirty(true);

    if (!formData.image) {
      setFormData((prev) => ({ ...prev, image: trimmed }));
    } else {
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), trimmed]
      }));
    }
    setNewImageUrl('');
  };

  const handleCloudinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!settings.cloudinary_cloud_name || !settings.cloudinary_upload_preset) {
      toast.error('Cloudinary is not configured. Please add Cloud Name and Upload Preset in Settings.');
      return;
    }

    setIsUploading(true);
    let uploadedUrls: string[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', settings.cloudinary_upload_preset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${settings.cloudinary_cloud_name}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        uploadedUrls.push(data.secure_url);
      }

      // Add uploaded images to form data
      let currentMain = formData.image;
      let currentOthers = [...(formData.images || [])];

      for (const url of uploadedUrls) {
        if (!currentMain) {
          currentMain = url;
        } else {
          currentOthers.push(url);
        }
      }

      setFormData((prev) => ({
        ...prev,
        image: currentMain,
        images: Array.from(new Set(currentOthers))
      }));
      setIsDirty(true);
      toast.success(`Successfully uploaded ${uploadedUrls.length} images`);
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      toast.error('Failed to upload images to Cloudinary.');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleBulkAddImages = () => {
    const lines = bulkImageUrlsText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http://') || l.startsWith('https://') || l.startsWith('data:image/'));

    if (lines.length === 0) {
      toast.error('No valid image URLs found');
      return;
    }

    setIsDirty(true);
    let currentMain = formData.image;
    let currentOthers = [...(formData.images || [])];

    if (!currentMain) {
      currentMain = lines[0];
      currentOthers = [...currentOthers, ...lines.slice(1)];
    } else {
      currentOthers = [...currentOthers, ...lines];
    }

    setFormData((prev) => ({
      ...prev,
      image: currentMain,
      images: Array.from(new Set(currentOthers))
    }));

    setBulkImageUrlsText('');
    setBulkImageUrlModal(false);
    toast.success(`Added ${lines.length} images!`);
  };

  const handleSetCoverImage = (index: number) => {
    setIsDirty(true);
    const targetUrl = allImagesList[index];
    const remaining = allImagesList.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      image: targetUrl,
      images: remaining
    }));
    toast.success('Cover image updated');
  };

  const handleRemoveImage = (index: number) => {
    setIsDirty(true);
    const remaining = allImagesList.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      image: remaining[0] || '',
      images: remaining.slice(1)
    }));
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (cropModalState.index === -1) return;
    
    if (!settings.cloudinary_cloud_name || !settings.cloudinary_upload_preset) {
      toast.error('Cloudinary is not configured. Cannot upload cropped image.');
      setCropModalState({ isOpen: false, imageSrc: '', index: -1 });
      return;
    }

    setIsUploading(true);
    setCropModalState(prev => ({ ...prev, isOpen: false }));
    
    try {
      const formDataObj = new FormData();
      const randomName = `cropped-${Math.random().toString(36).substring(2, 9)}.jpg`;
      formDataObj.append('file', croppedBlob, randomName);
      formDataObj.append('upload_preset', settings.cloudinary_upload_preset);
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${settings.cloudinary_cloud_name}/image/upload`, {
        method: 'POST',
        body: formDataObj,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      const newUrl = data.secure_url;
      
      setIsDirty(true);
      
      setFormData(prev => {
        const currentImages = [prev.image, ...(prev.images || [])].filter(Boolean);
        currentImages[cropModalState.index] = newUrl;
        
        return {
          ...prev,
          image: currentImages[0] || '',
          images: currentImages.slice(1)
        };
      });
      
      setOriginalImageMap(map => ({ ...map, [newUrl]: cropModalState.imageSrc }));
      toast.success('Image cropped successfully!');
      
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload cropped image');
    } finally {
      setIsUploading(false);
      setCropModalState({ isOpen: false, imageSrc: '', index: -1 });
    }
  };

  // Variant Helpers
  const addVariant = () => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          option1_name: 'Color',
          option1_value: '',
          option2_name: 'Size',
          option2_value: '',
          color: '',
          size: '',
          sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          price: Number(prev.price || 0),
          compare_price: Number(prev.original_price || 0),
          cost_price: 0,
          delivery_charge: Number(prev.delivery_charge || 0),
          stock: Number(prev.stock || 50),
          weight: 0,
          image: ''
        }
      ]
    }));
  };

  const handleVariantChange = (index: number, field: keyof Variant, value: string | number) => {
    setIsDirty(true);
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData((prev) => ({ ...prev, variants: newVariants }));
  };

  const removeVariant = (index: number) => {
    setIsDirty(true);
    const newVariants = [...formData.variants];
    newVariants.splice(index, 1);
    setFormData((prev) => ({ ...prev, variants: newVariants }));
  };

  const applyBulkVariantPrice = () => {
    if (!bulkVariantPrice || isNaN(Number(bulkVariantPrice))) return;
    const priceVal = Number(bulkVariantPrice);
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => ({ ...v, price: priceVal }))
    }));
    toast.success(`Updated price to ৳${priceVal} for all variants`);
    setBulkVariantPrice('');
  };

  const applyBulkVariantStock = () => {
    if (!bulkVariantStock || isNaN(Number(bulkVariantStock))) return;
    const stockVal = Number(bulkVariantStock);
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => ({ ...v, stock: stockVal }))
    }));
    toast.success(`Updated stock to ${stockVal} for all variants`);
    setBulkVariantStock('');
  };

  // SEO Helpers
  const generateSeoWithAI = () => {
    setIsDirty(true);
    const hostBrand = typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname.replace(/^www\./i, '').split('.')[0]
      : 'Store';
    const storeName = settings?.siteName || (hostBrand !== 'localhost' ? hostBrand.charAt(0).toUpperCase() + hostBrand.slice(1) : 'Store');
    const cleanTitle = (formData.title || '').trim();
    const autoTitle = cleanTitle ? `${cleanTitle} Price in Bangladesh | 100% Original - ${storeName}` : '';
    const categoryName = categories.find((c) => c.id === formData.category_id)?.name || 'Products';
    const cleanDesc = stripHtml(formData.description || '');
    const priceText = formData.price ? `৳${formData.price}` : 'best price';
    const autoDesc = cleanDesc
      ? truncateAtWord(`Buy ${cleanTitle || 'this product'} online at ${priceText} in Bangladesh. 100% authentic quality, fast delivery & cash on delivery at ${storeName}. ${cleanDesc}`, 155)
      : `Buy ${cleanTitle || 'this product'} online at ${priceText} in Bangladesh. 100% authentic quality, fast home delivery & cash on delivery at ${storeName}.`;

    const generatedKeywords = [
      cleanTitle,
      `${cleanTitle} price in bangladesh`,
      `${cleanTitle} bd`,
      categoryName,
      'online shopping bd',
      'cash on delivery',
      storeName
    ]
      .filter(Boolean)
      .join(', ');

    const newSlug = slugify(cleanTitle || 'product');
    setFocusKeyword(cleanTitle);

    setFormData((prev) => ({
      ...prev,
      meta_title: autoTitle,
      meta_description: autoDesc,
      meta_keywords: generatedKeywords,
      slug: prev.slug || newSlug
    }));

    toast.success('Pro SEO metadata generated!', { icon: '✨' });
  };

  // Auto SKU generator for main product
  const generateAutoSku = () => {
    setIsDirty(true);
    const prefix = formData.title ? formData.title.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD') : 'PRD';
    const rand = Math.floor(100000 + Math.random() * 900000);
    const sku = `${prefix}-${rand}`;
    toast.success(`Generated SKU: ${sku}`);
  };

  // Related products helper
  const selectedRelatedProducts = allProducts.filter((prod) => (formData.related_product_ids || []).includes(prod.id));
  const availableRelatedProducts = allProducts
    .filter((prod) => prod.id !== id)
    .filter((prod) => !(formData.related_product_ids || []).includes(prod.id))
    .filter((prod) => (prod.title || '').toLowerCase().includes(relatedProductSearch.toLowerCase().trim()))
    .slice(0, 6);

  const addRelatedProduct = (productId: string) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      related_product_ids: [...(prev.related_product_ids || []), productId]
    }));
    setRelatedProductSearch('');
  };

  const removeRelatedProduct = (productId: string) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      related_product_ids: (prev.related_product_ids || []).filter((pId) => pId !== productId)
    }));
  };

  // Profit calculations
  const unitProfit = Math.max(0, formData.price - (formData.buy_price || 0));
  const profitMargin = formData.price > 0 && formData.buy_price ? Math.round((unitProfit / formData.price) * 100) : 0;
  const markupPercent =
    formData.buy_price && formData.buy_price > 0 ? Math.round((unitProfit / formData.buy_price) * 100) : 0;

  // SEO previews
  const hostBrand = typeof window !== 'undefined' && window.location?.hostname
    ? window.location.hostname.replace(/^www\./i, '').split('.')[0]
    : 'Store';
  const storeBrand = settings?.siteName || (hostBrand !== 'localhost' ? hostBrand.charAt(0).toUpperCase() + hostBrand.slice(1) : 'Store');
  const seoTitle = (formData.meta_title || '').trim() || (formData.title ? `${formData.title} Price in Bangladesh | ${storeBrand}` : `Product Title | ${storeBrand}`);
  const seoSlug = (formData.slug || '').trim() || slugify(formData.title || '') || 'product-slug';
  const seoDescription =
    (formData.meta_description || '').trim() ||
    truncateAtWord(stripHtml(formData.description || ''), 155) ||
    `Buy ${formData.title || 'this product'} at best price in Bangladesh from ${storeBrand}. 100% authentic with fast home delivery.`;

  const hostName = typeof window !== 'undefined' ? (window.location.hostname || 'myshop.com') : 'myshop.com';

  // Live Focus Keyword Analysis & Rank Score
  const currentFocusKw = (focusKeyword || formData.meta_keywords?.split(',')[0]?.trim() || formData.title.split(' ').slice(0, 3).join(' ')).trim().toLowerCase();
  const rawDescText = stripHtml(formData.description || '').toLowerCase();
  const wordCount = rawDescText.split(/\s+/).filter(Boolean).length;

  const seoChecks = [
    {
      id: 'kw_title',
      label: 'Focus keyword in SEO Title',
      pass: Boolean(currentFocusKw && seoTitle.toLowerCase().includes(currentFocusKw)),
      weight: 15,
      hint: 'Include your main product keyword near the start of your SEO Title.'
    },
    {
      id: 'kw_desc',
      label: 'Focus keyword in Meta Description',
      pass: Boolean(currentFocusKw && seoDescription.toLowerCase().includes(currentFocusKw)),
      weight: 15,
      hint: 'Include your keyword naturally within the meta description snippet.'
    },
    {
      id: 'kw_slug',
      label: 'Focus keyword in URL Slug',
      pass: Boolean(currentFocusKw && seoSlug.toLowerCase().includes(slugify(currentFocusKw))),
      weight: 15,
      hint: 'Include the keyword in the clean product URL slug.'
    },
    {
      id: 'kw_content',
      label: 'Focus keyword in Product Description',
      pass: Boolean(currentFocusKw && rawDescText.includes(currentFocusKw)),
      weight: 15,
      hint: 'Mention your focus keyword inside the detailed product description.'
    },
    {
      id: 'title_len',
      label: 'Optimal Title Length (35 - 60 chars)',
      pass: seoTitle.length >= 35 && seoTitle.length <= 60,
      weight: 15,
      hint: `Current: ${seoTitle.length} chars. Google displays up to 60 characters before truncating.`
    },
    {
      id: 'desc_len',
      label: 'Optimal Description Length (110 - 160 chars)',
      pass: seoDescription.length >= 110 && seoDescription.length <= 160,
      weight: 15,
      hint: `Current: ${seoDescription.length} chars. Ideal is between 110 and 160 characters.`
    },
    {
      id: 'content_len',
      label: 'Description word count (30+ words)',
      pass: wordCount >= 30,
      weight: 10,
      hint: `Current: ${wordCount} words. Search engines require informative product descriptions.`
    }
  ];

  const totalSeoScore = seoChecks.reduce((acc, c) => acc + (c.pass ? c.weight : 0), 0);
  const scoreColor = totalSeoScore >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-300' : totalSeoScore >= 50 ? 'text-amber-700 bg-amber-50 border-amber-300' : 'text-rose-700 bg-rose-50 border-rose-300';
  const scoreBadgeText = totalSeoScore >= 80 ? 'Rank Ready (Pro)' : totalSeoScore >= 50 ? 'Needs Improvement' : 'Poor SEO';

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(formData.title || '').trim()) {
      toast.error('Product title is required');
      return;
    }

    if (!formData.price || formData.price <= 0) {
      toast.error('Sale price must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedVariants = normalizeVariants(formData.variants || []);
      const variantKeys = new Set<string>();

      for (const variant of normalizedVariants) {
        const opt1 = (variant.option1_value || variant.color || '').trim();
        const opt2 = (variant.option2_value || variant.size || '').trim();
        variant.color = opt1;
        variant.size = opt2;
        variant.compare_price = Number(variant.compare_price || variant.price || 0);

        if (!opt1 && !opt2) {
          toast.error('Every variant must have at least one option value (e.g. Color or Size).');
          setIsSubmitting(false);
          return;
        }

        const key = `${(variant.option1_name || '').toLowerCase()}::${opt1.toLowerCase()}::${(variant.option2_name || '').toLowerCase()}::${opt2.toLowerCase()}`;
        if (variantKeys.has(key)) {
          toast.error(`Duplicate variant combination: ${opt1} ${opt2}`);
          setIsSubmitting(false);
          return;
        }
        variantKeys.add(key);
      }

      const allImgs = [formData.image, ...(formData.images || [])].filter((img) => img && img.trim() !== '');
      const primaryImage = allImgs[0] || '';
      const additionalImages = allImgs.slice(1);

      const payload: any = {
        title: (formData.title || '').trim(),
        image: primaryImage,
        images: additionalImages,
        price: Number(formData.price || 0),
        buy_price: Number(formData.buy_price || 0),
        original_price: Number(formData.original_price || 0),
        discount: Number(formData.discount || 0),
        description: formData.description || '',
        stock: Number(formData.stock || 0),
        slug: (formData.slug || '').trim() || slugify(formData.title || ''),
        is_flash_sale: Boolean(formData.is_flash_sale),
        is_best_deal: Boolean(formData.is_best_deal),
        is_delivery_free: Boolean(formData.is_delivery_free),
        delivery_charge: formData.is_delivery_free ? null : Number(formData.delivery_charge || 0),
        variants: normalizedVariants,
        related_product_ids: formData.related_product_ids || [],
        meta_title: (formData.meta_title || '').trim() || null,
        meta_keywords: (formData.meta_keywords || '').trim() || null,
        meta_description: (formData.meta_description || '').trim() || null,
        offer_time: formData.offer_time || null,
        video_url: (formData.video_url || '').trim() || null
      };

      if (formData.category_id) {
        payload.category_id = formData.category_id;
      } else {
        payload.category_id = null;
      }

      let saveError: any = null;
      if (isEditMode && id) {
        const { error } = await supabase.from('products').update(payload).eq('id', id);
        saveError = error;
      } else {
        const { error } = await supabase.from('products').insert([payload]).select('id').single();
        saveError = error;
      }

      // If video_url column is not yet present in Supabase table, retry without video_url
      if (saveError && (saveError.code === '42703' || saveError.message?.includes('video_url'))) {
        const { video_url, ...fallbackPayload } = payload;
        const retryRes = isEditMode && id
          ? await supabase.from('products').update(fallbackPayload).eq('id', id)
          : await supabase.from('products').insert([fallbackPayload]).select('id').single();
        if (retryRes.error) throw retryRes.error;
        toast.success('Product saved! (ভিডিও লিংক সেভ করতে Supabase-এ video_url কলাম যোগ করুন)');
      } else if (saveError) {
        throw saveError;
      } else {
        toast.success(isEditMode ? 'Product updated successfully! 🚀' : 'Product created successfully! 🎉');
      }

      setIsDirty(false);
      navigate('/admin/products');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save product: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = () => {
    const duplicatedData = {
      ...formData,
      title: `${formData.title} (Copy)`,
      slug: `${formData.slug}-copy-${Math.floor(Math.random() * 1000)}`
    };
    setFormData(duplicatedData);
    setIsDirty(true);
    toast.success('Duplicated as a new draft! Click Save to publish.');
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner message="Loading Product Studio..." />
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] min-h-full pb-28">
      {/* STICKY GLASSMORPHIC TOP CONTROL BAR */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-6 md:px-10 py-4 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Navigation & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <Link
              to="/admin/products"
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all group"
              title="Return to Product List"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </Link>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Link to="/admin/products" className="hover:text-primary transition-colors">
                  Products
                </Link>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600 font-medium truncate max-w-[200px] sm:max-w-xs">
                  {isEditMode ? formData.title || 'Edit Product' : 'New Product'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                {isEditMode ? 'Edit Product' : 'Create Product'}
                {isDirty && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 animate-pulse">
                    Unsaved Changes
                  </span>
                )}
              </h1>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {isEditMode && formData.slug && (
              <a
                href={`/product/${formData.slug}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> Live View
              </a>
            )}

            {isEditMode && (
              <button
                type="button"
                onClick={handleDuplicate}
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" /> Duplicate
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
                  return;
                }
                navigate('/admin/products');
              }}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all"
            >
              Discard
            </button>

            <button
              form="product-form"
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-primary hover:bg-primary-hover active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-primary/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEditMode ? 'Save Changes' : 'Publish Product'}
              <span className="hidden lg:inline-block text-[10px] font-mono opacity-70 bg-white/20 px-1.5 py-0.5 rounded ml-1">
                Ctrl+S
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN 2-COLUMN STUDIO LAYOUT */}
      <form id="product-form" onSubmit={handleSubmit} className="max-w-7xl mx-auto px-6 md:px-10 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: CORE PRODUCT DETAILS (8 Columns) */}
          <div className="lg:col-span-8 space-y-6">
            {/* CARD 1: GENERAL INFORMATION */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">General Information</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Define title, slug, and comprehensive description.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="w-4 h-4" />
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                    Product Title <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">{(formData.title || '').length}/150</span>
                </div>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., Premium Wireless Noise-Cancelling Headphones"
                  className="w-full text-base font-bold text-slate-900 bg-white border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-3.5 py-2.5 transition-all outline-none placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Description with Visual Formatter & Preview */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-[13px] font-semibold text-slate-700">Product Description</label>

                  {/* Mode Toggles */}
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-start">
                    <button
                      type="button"
                      onClick={() => setDescViewMode('visual')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        descViewMode === 'visual'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Visual Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescViewMode('html')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        descViewMode === 'html'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      HTML Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescViewMode('preview')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        descViewMode === 'preview'
                          ? 'bg-white text-primary shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Live Preview
                    </button>
                  </div>
                </div>

                {/* Toolbar */}
                {descViewMode !== 'preview' && (
                  <div className="flex items-center gap-1 flex-wrap p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                    <button
                      type="button"
                      onClick={() => insertFormatting('<strong>', '</strong>')}
                      className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg text-xs font-bold transition-colors"
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<em>', '</em>')}
                      className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg text-xs font-bold transition-colors"
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <div className="h-4 w-px bg-slate-200 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertFormatting('<h3>', '</h3>')}
                      className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg text-xs font-bold transition-colors"
                      title="Heading 3"
                    >
                      <Heading3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>')}
                      className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg text-xs font-bold transition-colors"
                      title="Bullet List"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<ol>\n  <li>', '</li>\n</ol>')}
                      className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg text-xs font-bold transition-colors"
                      title="Numbered List"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <div className="h-4 w-px bg-slate-200 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertFormatting('<a href="https://" target="_blank">', '</a>')}
                      className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg text-xs font-bold transition-colors"
                      title="Insert Link"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<div className="highlight-box">\n  ', '\n</div>')}
                      className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg text-xs font-bold transition-colors"
                      title="Code Box"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Editor Content Area */}
                {descViewMode === 'preview' ? (
                  <div
                    className="min-h-[220px] max-h-[400px] overflow-y-auto p-5 bg-slate-50/50 border border-slate-200 rounded-xl prose prose-sm max-w-none text-slate-700 font-sans"
                    dangerouslySetInnerHTML={{
                      __html: formData.description || '<p class="text-slate-400 italic">No description written yet...</p>'
                    }}
                  />
                ) : (
                  <textarea
                    ref={descriptionTextareaRef}
                    name="description"
                    rows={8}
                    value={formData.description || ''}
                    onChange={handleInputChange}
                    placeholder="Write an engaging product description. HTML tags and bullet points are fully supported..."
                    className="w-full font-mono text-sm text-slate-800 bg-white border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl p-4 transition-all outline-none placeholder:font-sans placeholder:text-slate-400 resize-y"
                  />
                )}
              </div>
            </div>

            {/* CARD 2: MEDIA & GALLERY */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Product Media & Gallery</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Upload or link high-resolution product photos. First image is the primary cover.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkImageUrlModal(true)}
                    className="text-xs font-bold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    Bulk URL Add
                  </button>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Single Image URL Add Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="flex items-center gap-2.5 w-full">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImage(newImageUrl);
                        }
                      }}
                      placeholder="Paste image link (e.g. https://res.cloudinary.com/... or https://...)"
                      className="w-full text-xs sm:text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-3 transition-all outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddImage(newImageUrl)}
                    className="px-4 py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0 h-full"
                  >
                    <Plus className="w-4 h-4" /> Add URL
                  </button>
                </div>
                
                <div className="relative shrink-0 h-[46px]">
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple
                    onChange={handleCloudinaryUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isUploading}
                    title={settings.cloudinary_cloud_name ? "Upload directly to Cloudinary" : "Cloudinary not configured in settings"}
                  />
                  <div className={`px-4 py-3 h-full font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0
                    ${settings.cloudinary_cloud_name && settings.cloudinary_upload_preset 
                      ? 'bg-primary hover:bg-primary-hover text-white' 
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                  >
                    {isUploading ? (
                      <><div className="w-4 h-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" /> Uploading...</>
                    ) : (
                      <><ImageIcon className="w-4 h-4" /> Upload</>
                    )}
                  </div>
                </div>
              </div>

              {/* Interactive Image Gallery Grid */}
              {allImagesList.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 sm:p-12 text-center bg-slate-50/50 flex flex-col items-center justify-center space-y-3">
                  <div className="w-14 h-14 rounded-xl bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">No images added yet</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Paste an image URL above or use Bulk Add to import multiple images.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {allImagesList.map((url, idx) => {
                    const isCover = idx === 0;
                    return (
                      <motion.div
                        key={idx}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all bg-slate-50 flex items-center justify-center ${
                          isCover
                            ? 'border-primary ring-4 ring-primary/10 shadow-md'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Product thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://via.placeholder.com/400?text=Invalid+Image+URL';
                          }}
                        />

                        {/* Top badges */}
                        <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                          {isCover && (
                            <span className="bg-primary text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm">
                              Cover
                            </span>
                          )}
                          <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Hover Overlay Controls */}
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 z-20">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const original = originalImageMap[url] || url;
                                setCropModalState({ isOpen: true, imageSrc: original, index: idx });
                              }}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-white hover:text-slate-900 transition-colors backdrop-blur-sm"
                              title="Crop image"
                            >
                              <Crop className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewZoomImage(url)}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-white hover:text-slate-900 transition-colors backdrop-blur-sm"
                              title="Zoom view"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-600 text-white transition-colors"
                              title="Delete photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {!isCover && (
                            <button
                              type="button"
                              onClick={() => handleSetCoverImage(idx)}
                              className="w-full py-1.5 bg-white text-slate-900 text-xs font-bold rounded-lg shadow-sm hover:bg-primary hover:text-white transition-all text-center"
                            >
                              Set as Cover
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
                          {/* Product Video (YouTube / Shorts) Section */}
              <div className="pt-5 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                      <Youtube className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Product Video (YouTube / Shorts)</h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        প্রোডাক্টের ইউটিউব ভিডিও বা শর্টস লিংক দিন (কাস্টমার পেজে প্রথম থাম্বনেইলে ভিডিও চলবে)
                      </p>
                    </div>
                  </div>
                  {formData.video_url && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, video_url: '' }))}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                    >
                      Remove Video
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="url"
                    value={formData.video_url || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://www.youtube.com/watch?v=... বা https://youtube.com/shorts/..."
                    className="w-full text-xs sm:text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl px-4 py-3 transition-all outline-none placeholder:text-slate-400"
                  />
                </div>

                {/* Video Validation & Live Preview */}
                {formData.video_url && (() => {
                  const detectedVideoId = getYouTubeVideoId(formData.video_url);
                  if (detectedVideoId) {
                    return (
                      <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl flex items-center gap-3">
                        <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-red-200">
                          <img
                            src={getYouTubeThumbnail(detectedVideoId)}
                            alt="YouTube Thumbnail"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ইউটিউব ভিডিও সংযুক্ত হয়েছে</span>
                          </div>
                          <p className="text-[11px] text-slate-600 truncate mt-0.5">
                            Video ID: <span className="font-mono font-bold text-slate-800">{detectedVideoId}</span>
                          </p>
                        </div>
                        <a
                          href={`https://www.youtube.com/watch?v=${detectedVideoId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-white text-slate-700 hover:text-red-600 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1 shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" /> Test Link
                        </a>
                      </div>
                    );
                  } else {
                    return (
                      <p className="text-xs text-amber-600 font-medium">
                        সঠিক ইউটিউব ভিডিও বা শর্টস লিংক দিন (যেমন: https://youtube.com/shorts/... বা https://www.youtube.com/watch?v=...)
                      </p>
                    );
                  }
                })()}
              </div>
            </div>

            {/* CARD 3: PRICING & PROFIT ENGINE */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Pricing & Profit Analytics</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Set retail selling prices, strike-through discounts, and track real-time profit margins.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                  ৳
                </div>
              </div>

              {/* Pricing Input Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Sale Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Sale Price (৳) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      ৳
                    </span>
                    <input
                      type="number"
                      name="price"
                      required
                      min="0"
                      step="any"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="w-full pl-7 pr-3 py-2 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Customer checkout price</p>
                </div>

                {/* Compare / Original Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Original Price (৳)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      ৳
                    </span>
                    <input
                      type="number"
                      name="original_price"
                      min="0"
                      step="any"
                      value={formData.original_price}
                      onChange={handleInputChange}
                      className="w-full pl-7 pr-3 py-2 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Strike-through price</p>
                </div>

                {/* Buy / Cost Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Cost / Buy Price (৳)</span>
                    <span className="text-[10px] text-emerald-600 font-extrabold uppercase">Admin only</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      ৳
                    </span>
                    <input
                      type="number"
                      name="buy_price"
                      min="0"
                      step="any"
                      value={formData.buy_price}
                      onChange={handleInputChange}
                      className="w-full pl-7 pr-3 py-2 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Sourcing / unit cost</p>
                </div>

                {/* Calculated Discount Badge */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Discount Percentage</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="discount"
                      min="0"
                      max="100"
                      value={formData.discount}
                      onChange={handleInputChange}
                      className="w-full pr-8 pl-3 py-2 bg-white text-slate-900 text-sm rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Auto-calculated or custom</p>
                </div>
              </div>

              {/* LIVE PROFIT & MARGIN CALCULATOR STRIP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100/50 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Profit</div>
                    <div className="text-lg font-bold text-slate-900">
                      ৳ {unitProfit.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-5">
                  <div className="w-10 h-10 rounded-lg bg-blue-100/50 flex items-center justify-center text-blue-600">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profit Margin</div>
                    <div className="text-lg font-bold text-slate-900">{profitMargin}%</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-5">
                  <div className="w-10 h-10 rounded-lg bg-purple-100/50 flex items-center justify-center text-purple-600">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Markup Rate</div>
                    <div className="text-lg font-bold text-slate-900">{markupPercent}%</div>
                  </div>
                </div>
              </div>

              {/* Delivery Policy Configuration */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-start gap-3.5 p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    name="is_delivery_free"
                    checked={Boolean(formData.is_delivery_free)}
                    onChange={handleInputChange}
                    className="mt-1 w-5 h-5 text-emerald-600 rounded-lg border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-emerald-600" /> Free Delivery Eligible
                    </span>
                    <span className="block text-xs text-slate-500 font-medium mt-0.5">
                      Customers pay ৳0 delivery fee when purchasing this product.
                    </span>
                  </div>
                </label>

                <div className={`space-y-1.5 ${formData.is_delivery_free ? 'opacity-40 pointer-events-none' : ''}`}>
                  <label className="text-xs font-bold text-slate-700">Custom Delivery Charge (৳)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      ৳
                    </span>
                    <input
                      type="number"
                      name="delivery_charge"
                      min="0"
                      value={formData.delivery_charge || 0}
                      onChange={handleInputChange}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 font-bold text-slate-900 text-sm rounded-xl border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none"
                      placeholder="0 (uses default store rate)"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Set 0 to use standard courier settings</p>
                </div>
              </div>
            </div>

            {/* CARD 4: INVENTORY & STOCK MANAGEMENT */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Inventory & Stock</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Track unit availability and warehouse SKU identifiers.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Box className="w-4 h-4" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Stock Quantity</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        (formData.stock || 0) <= 0
                          ? 'bg-red-100 text-red-700'
                          : (formData.stock || 0) < 10
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {(formData.stock || 0) <= 0 ? 'Out of Stock' : (formData.stock || 0) < 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </label>
                  <input
                    type="number"
                    name="stock"
                    required
                    min="0"
                    value={formData.stock ?? 0}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 font-bold text-slate-900 text-base rounded-xl border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none"
                    placeholder="100"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">SKU / Barcode Code</label>
                    <button
                      type="button"
                      onClick={generateAutoSku}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    name="sku"
                    value={formData.slug ? `SKU-${formData.slug.substring(0, 10).toUpperCase()}` : ''}
                    readOnly
                    className="w-full px-4 py-3 bg-slate-100/70 font-mono text-sm font-semibold text-slate-600 rounded-xl border border-slate-200"
                    placeholder="e.g. SKU-94827"
                  />
                </div>
              </div>
            </div>

            {/* CARD 5: VARIANTS STUDIO & MATRIX */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Product Variants</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Configure multi-attribute combinations (Colors, Sizes, Models) with individual prices and inventory.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl transition-all self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" /> Add Variant
                </button>
              </div>

              {(formData.variants || []).length > 0 && (
                <div className="flex items-center gap-2 flex-wrap p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 mr-2">Bulk Quick-Apply:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="Price ৳"
                      value={bulkVariantPrice}
                      onChange={(e) => setBulkVariantPrice(e.target.value)}
                      className="w-24 px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={applyBulkVariantPrice}
                      className="px-2.5 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-black"
                    >
                      Apply Price
                    </button>
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    <input
                      type="number"
                      placeholder="Stock"
                      value={bulkVariantStock}
                      onChange={(e) => setBulkVariantStock(e.target.value)}
                      className="w-20 px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={applyBulkVariantStock}
                      className="px-2.5 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-black"
                    >
                      Apply Stock
                    </button>
                  </div>
                </div>
              )}

              {(formData.variants || []).length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50 flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">This product has no variants</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Add variants if this item comes in different colors, sizes, or configurations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create First Variant
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <div className="min-w-[1100px]">
                    {/* Header */}
                    <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_1fr_1fr_44px] gap-2 p-3 bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                      <span>{formData.variants?.[0]?.option1_name?.trim() || 'Option 1 (e.g. Color)'}</span>
                      <span>{formData.variants?.[0]?.option2_name?.trim() || 'Option 2 (e.g. Size)'}</span>
                      <span>Sale Price (৳)</span>
                      <span>Compare (৳)</span>
                      <span>Buy Price (৳)</span>
                      <span>Del. Charge (৳)</span>
                      <span>Stock Qty</span>
                      <span>SKU Code</span>
                      <span></span>
                    </div>

                    {/* Variant Rows */}
                    <div className="divide-y divide-slate-100 bg-white">
                      {(formData.variants || []).map((v, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_1fr_1fr_44px] gap-2 p-3 items-center hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Name (e.g. Color)"
                              value={v.option1_name || ''}
                              onChange={(e) => handleVariantChange(i, 'option1_name', e.target.value)}
                              className="flex-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:border-primary outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Val (e.g. Black)"
                              value={v.option1_value || v.color || ''}
                              onChange={(e) => handleVariantChange(i, 'option1_value', e.target.value)}
                              className="flex-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-800 focus:border-primary outline-none"
                            />
                          </div>

                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Name (e.g. Size)"
                              value={v.option2_name || ''}
                              onChange={(e) => handleVariantChange(i, 'option2_name', e.target.value)}
                              className="flex-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:border-primary outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Val (e.g. XL)"
                              value={v.option2_value || v.size || ''}
                              onChange={(e) => handleVariantChange(i, 'option2_value', e.target.value)}
                              className="flex-1 w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-800 focus:border-primary outline-none"
                            />
                          </div>

                          <input
                            required
                            min="0"
                            type="number"
                            value={v.price}
                            onChange={(e) => handleVariantChange(i, 'price', Number(e.target.value))}
                            className="w-full min-w-0 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-900 focus:border-primary outline-none"
                          />

                          <input
                            min="0"
                            type="number"
                            value={v.compare_price}
                            onChange={(e) => handleVariantChange(i, 'compare_price', Number(e.target.value))}
                            className="w-full min-w-0 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 focus:border-primary outline-none"
                          />

                          <input
                            min="0"
                            type="number"
                            value={v.cost_price || ''}
                            onChange={(e) => handleVariantChange(i, 'cost_price', Number(e.target.value))}
                            className="w-full min-w-0 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-emerald-600 focus:border-primary outline-none"
                          />

                          <input
                            min="0"
                            type="number"
                            value={v.delivery_charge || ''}
                            onChange={(e) => handleVariantChange(i, 'delivery_charge', Number(e.target.value))}
                            className="w-full min-w-0 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-amber-600 focus:border-primary outline-none"
                            placeholder="Def."
                          />

                          <input
                            required
                            min="0"
                            type="number"
                            value={v.stock}
                            onChange={(e) => handleVariantChange(i, 'stock', Number(e.target.value))}
                            className="w-full min-w-0 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-800 focus:border-primary outline-none"
                          />

                          <input
                            type="text"
                            placeholder="SKU"
                            value={v.sku || ''}
                            onChange={(e) => handleVariantChange(i, 'sku', e.target.value)}
                            className="w-full min-w-0 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-600 focus:border-primary outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => removeVariant(i)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove variant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 6: RELATED / CROSS-SELL PRODUCTS */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900">Recommended & Related Products</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Select upsell items to display under "You May Also Like" on the product detail page.
                </p>
              </div>

              {/* Selected Related Products */}
              {selectedRelatedProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedRelatedProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/80"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {prod.image ? (
                          <img src={prod.image} alt={prod.title} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900">{prod.title}</p>
                        <p className="text-[11px] font-bold text-emerald-600">৳{prod.price.toLocaleString()}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRelatedProduct(prod.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No cross-sell products selected yet.</p>
              )}

              {/* Search & Add Box */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-100">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="search"
                    value={relatedProductSearch}
                    onChange={(e) => setRelatedProductSearch(e.target.value)}
                    placeholder="Search product title to link..."
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {availableRelatedProducts.length > 0 ? (
                    availableRelatedProducts.map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => addRelatedProduct(prod.id)}
                        className="flex w-full items-center justify-between p-3 text-left hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {prod.image ? (
                              <img src={prod.image} alt={prod.title} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900">{prod.title}</p>
                            <p className="text-[11px] font-semibold text-slate-500">৳{prod.price.toLocaleString()}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-primary flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-lg">
                          <Plus className="w-3 h-3" /> Add
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">
                      {allProducts.length <= 1 ? 'Add more products first.' : 'No matching products found.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SIDEBAR METADATA & LIVE PREVIEWS (4 Columns) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[90px] lg:h-[calc(100vh-100px)] lg:overflow-y-auto custom-scrollbar lg:pr-2 lg:-mr-2 pb-10">
            {/* CARD 1: STATUS & ORGANIZATION */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Product Organization</h3>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Category</label>
                <select
                  name="category_id"
                  value={formData.category_id || ''}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-3 bg-slate-50 font-bold text-xs sm:text-sm text-slate-800 rounded-xl border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* URL Slug */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">URL Slug / Handle</label>
                <div className="relative">
                  <input
                    type="text"
                    name="slug"
                    required
                    value={formData.slug || ''}
                    onChange={handleInputChange}
                    placeholder="product-url-slug"
                    className="w-full px-3.5 py-2.5 bg-slate-50 font-mono text-xs font-semibold text-primary rounded-xl border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  /product/{formData.slug || 'product-slug'}
                </p>
              </div>

              {/* Badges & Flags */}
              <div className="pt-2 space-y-2.5">
                <label className="text-xs font-bold text-slate-700">Promotions & Badges</label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-orange-200/80 bg-orange-50/50 hover:bg-orange-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-xs">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Flash Sale Highlight</span>
                      <span className="block text-[10px] text-slate-500">Feature in countdown section</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    name="is_flash_sale"
                    checked={Boolean(formData.is_flash_sale)}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                  />
                </label>

                {formData.is_flash_sale && (
                  <div className="p-3 rounded-xl border border-orange-200/80 bg-white ml-2 mt-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Offer End Time</label>
                    <input
                      type="datetime-local"
                      name="offer_time"
                      value={formData.offer_time ? formData.offer_time.slice(0, 16) : ''}
                      onChange={handleInputChange}
                      className="w-full text-sm rounded-lg border-slate-200 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <span className="block text-[10px] text-slate-500 mt-1">Leave empty if no countdown timer is needed.</span>
                  </div>
                )}

                <label className="flex items-center justify-between p-3 rounded-xl border border-purple-200/80 bg-purple-50/50 hover:bg-purple-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                      <Star className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Best Deal Badge</span>
                      <span className="block text-[10px] text-slate-500">Show exclusive deal badge</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    name="is_best_deal"
                    checked={Boolean(formData.is_best_deal)}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>

            {/* CARD 2: REAL-TIME STOREFRONT CUSTOMER CARD PREVIEW */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" /> Live Card Preview
                </h3>
                <span className="text-[10px] font-bold text-slate-400">Customer View</span>
              </div>

              {/* Rendered Mock Product Card */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                <div className="bg-white rounded-xl overflow-hidden shadow-md border border-slate-100 flex flex-col">
                  {/* Card Image */}
                  <div className="relative aspect-square bg-slate-100 overflow-hidden flex items-center justify-center">
                    {formData.image ? (
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://via.placeholder.com/300?text=Preview';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-slate-300" />
                    )}

                    {/* Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                      {formData.discount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                          -{formData.discount}%
                        </span>
                      )}
                      {formData.is_flash_sale && (
                        <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5" /> Flash
                        </span>
                      )}
                    </div>

                    {formData.is_delivery_free && (
                      <span className="absolute bottom-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <Truck className="w-2.5 h-2.5" /> Free Delivery
                      </span>
                    )}
                  </div>

                  {/* Card Info */}
                  <div className="p-3.5 space-y-2">
                    <p className="text-xs font-extrabold text-slate-900 line-clamp-2 leading-snug">
                      {formData.title || 'Product Title'}
                    </p>

                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-black text-primary">
                        ৳{Number(formData.price || 0).toLocaleString()}
                      </span>
                      {formData.original_price > formData.price && (
                        <span className="text-xs font-medium text-slate-400 line-through">
                          ৳{Number(formData.original_price).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled
                      className="w-full py-2 bg-primary text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm cursor-default"
                    >
                      <ShoppingBag className="w-4 h-4" /> Order Now
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: GOOGLE SEARCH & SEO STUDIO (PRO RANK ENGINE) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
              
              {/* Header & Live SEO Score */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Pro SEO & Search Console Studio
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${scoreColor}`}>
                      {totalSeoScore}/100 • {scoreBadgeText}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Live Google SERP preview, Schema.org rich results, and ranking analysis
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={generateSeoWithAI}
                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors shadow-xs"
                    title="Generate high-converting e-commerce SEO metadata"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Magic AI SEO
                  </button>
                </div>
              </div>

              {/* Focus Keyword Input */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary" /> Primary Focus Keyword
                  </label>
                  <span className="text-[10px] text-slate-400">Target search query for Google</span>
                </div>
                <input
                  type="text"
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  placeholder="e.g. vegetable cutter price in bangladesh"
                  className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg focus:border-primary outline-none shadow-2xs"
                />
              </div>

              {/* Preview Mode Selector */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-600">SERP Snippet Preview:</span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setSeoPreviewTab('desktop')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${seoPreviewTab === 'desktop' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
                  >
                    <Laptop className="w-3 h-3" /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeoPreviewTab('mobile')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${seoPreviewTab === 'mobile' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
                  >
                    <Smartphone className="w-3 h-3" /> Mobile
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeoPreviewTab('social')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${seoPreviewTab === 'social' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
                  >
                    <Share2 className="w-3 h-3" /> Social
                  </button>
                </div>
              </div>

              {/* PREVIEW BOXES */}
              {seoPreviewTab === 'desktop' && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5 font-sans">
                  <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">{hostName}</span>
                    <span className="text-slate-300">›</span>
                    <span className="text-slate-500 font-mono">product › {seoSlug}</span>
                  </div>
                  <div className="text-base font-medium text-[#1a0dab] hover:underline cursor-pointer line-clamp-1 leading-snug">
                    {seoTitle}
                  </div>
                  {/* Rich Snippet Attributes */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 pt-0.5">
                    <span className="flex items-center gap-0.5 text-amber-500">
                      {'★'.repeat(5)} <span className="text-slate-700 font-bold ml-1">5.0</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-700">৳{formData.price || 0} BDT</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-600 font-bold">In stock</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 pt-0.5">
                    {seoDescription}
                  </p>
                </div>
              )}

              {seoPreviewTab === 'mobile' && (
                <div className="max-w-sm mx-auto p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2 font-sans">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                      N
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-800 leading-tight">{storeBrand}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{hostName}/product/{seoSlug}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-[#1a0dab] line-clamp-2 leading-snug">
                    {seoTitle}
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {seoDescription}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100 flex justify-between">
                    <span className="text-emerald-600 font-bold">৳{formData.price || 0} • In Stock</span>
                    <span>★ 5.0 (Google verified)</span>
                  </div>
                </div>
              )}

              {seoPreviewTab === 'social' && (
                <div className="max-w-sm mx-auto bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                  <div className="aspect-[1.91/1] bg-slate-200 relative overflow-hidden flex items-center justify-center">
                    {formData.image ? (
                      <img src={formData.image} alt={seoTitle} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="p-3 bg-white space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{hostName}</span>
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{seoTitle}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{seoDescription}</p>
                  </div>
                </div>
              )}

              {/* YOAST / RANKMATH STYLE CHECKLIST */}
              <div className="rounded-xl border border-slate-200/90 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSeoChecklist(!showSeoChecklist)}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition text-left"
                >
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    SEO Optimization Checklist ({seoChecks.filter(c => c.pass).length}/{seoChecks.length} Passed)
                  </span>
                  {showSeoChecklist ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showSeoChecklist && (
                  <div className="p-3 bg-white space-y-2.5 divide-y divide-slate-100">
                    {seoChecks.map((chk) => (
                      <div key={chk.id} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs">
                        <div className="flex items-start gap-2">
                          {chk.pass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className={`font-semibold ${chk.pass ? 'text-slate-800' : 'text-slate-700'}`}>
                              {chk.label}
                            </span>
                            <p className="text-[11px] text-slate-400 mt-0.5">{chk.hint}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${chk.pass ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {chk.pass ? 'Good' : 'Improve'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Meta Inputs */}
              <div className="space-y-4 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <label className="font-bold text-slate-700">Meta Title (Search Heading)</label>
                    <span className={`text-[11px] font-bold ${(formData.meta_title || '').length > 60 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {(formData.meta_title || '').length}/60 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    name="meta_title"
                    value={formData.meta_title || ''}
                    onChange={handleInputChange}
                    placeholder={formData.title ? `${formData.title} Price in Bangladesh | ${storeBrand}` : 'Product SEO Title'}
                    className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary outline-none shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <label className="font-bold text-slate-700">URL Slug</label>
                    <button
                      type="button"
                      onClick={() => {
                        const s = slugify(formData.title);
                        setFormData(prev => ({ ...prev, slug: s }));
                        toast.success('Slug generated from title!');
                      }}
                      className="text-[11px] text-primary font-semibold hover:underline"
                    >
                      Reset from Title
                    </button>
                  </div>
                  <div className="flex items-center">
                    <span className="px-2.5 py-2 text-[11px] font-mono text-slate-400 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl">
                      /product/
                    </span>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug || ''}
                      onChange={handleInputChange}
                      placeholder={slugify(formData.title || 'product-slug')}
                      className="w-full px-3 py-2 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-r-xl focus:bg-white focus:border-primary outline-none shadow-2xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Meta Keywords</label>
                  <input
                    type="text"
                    name="meta_keywords"
                    value={formData.meta_keywords || ''}
                    onChange={handleInputChange}
                    placeholder="keyword1, keyword2, bd online shop"
                    className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary outline-none shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <label className="font-bold text-slate-700">Meta Description</label>
                    <span className={`text-[11px] font-bold ${(formData.meta_description || '').length > 160 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {(formData.meta_description || '').length}/160 chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    name="meta_description"
                    value={formData.meta_description || ''}
                    onChange={handleInputChange}
                    placeholder="Persuasive search summary including price and delivery promise..."
                    className="w-full p-3 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary outline-none resize-none shadow-2xs"
                  />
                </div>
              </div>

              {/* FAST INDEXING TOOLS & SHORTCUTS */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Search Engine Indexing Shortcuts
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const canonical = `${window.location.origin}/product/${seoSlug}`;
                      navigator.clipboard.writeText(canonical);
                      toast.success('Canonical URL copied!');
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Product Link
                  </button>
                  <a
                    href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(`${window.location.origin}/product/${seoSlug}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Test Schema Rich Result <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(window.location.origin)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition"
                  >
                    <Globe className="w-3.5 h-3.5" /> Google Console <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      </form>

      {/* BULK IMAGE ADD MODAL */}
      <AnimatePresence>
        {bulkImageUrlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBulkImageUrlModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Bulk Add Image URLs</h3>
                <button
                  onClick={() => setBulkImageUrlModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Paste one image link per line (e.g. from Cloudinary, Imgur, or direct CDN links):
              </p>

              <textarea
                rows={6}
                value={bulkImageUrlsText}
                onChange={(e) => setBulkImageUrlsText(e.target.value)}
                placeholder="https://images.unsplash.com/photo-1&#10;https://images.unsplash.com/photo-2"
                className="w-full p-4 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary outline-none"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkImageUrlModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkAddImages}
                  className="px-5 py-2 text-xs font-bold bg-primary text-white hover:bg-primary-hover rounded-xl shadow-sm"
                >
                  Import Images
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL ZOOM IMAGE PREVIEW MODAL */}
      <AnimatePresence>
        {previewZoomImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewZoomImage(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-3xl max-h-[85vh] bg-transparent rounded-xl overflow-hidden z-10 flex items-center justify-center p-2"
            >
              <img
                src={previewZoomImage}
                alt="Zoom Preview"
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
              <button
                onClick={() => setPreviewZoomImage(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ImageCropperModal
        isOpen={cropModalState.isOpen}
        imageSrc={cropModalState.imageSrc}
        onClose={() => setCropModalState(prev => ({ ...prev, isOpen: false }))}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
