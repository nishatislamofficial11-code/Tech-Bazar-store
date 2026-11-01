import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Play, Heart, ShieldCheck, Truck, ArrowLeft, Plus, Minus, Search, RefreshCcw, Banknote, MessageCircle, Home, ChevronRight as ChevronRightIcon, X, ShoppingBag, Phone, Timer, Package, Clock, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProductCard } from '../components/ui/ProductCard';
import { CheckoutPopup } from '../components/ui/CheckoutPopup';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { StorefrontPageSkeleton } from '../components/ui/StorefrontPageSkeleton';
import { motion, AnimatePresence } from 'motion/react';
import { SEO } from '../components/SEO';
import { useSettings } from '../contexts/SettingsContext';
import { createWhatsAppUrl } from '../lib/whatsapp';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { trackViewContent, trackAddToCart } from '../lib/fbPixel';
import { trackTiktokViewContent, trackTiktokAddToCart } from '../lib/ttPixel';
import { trackEvent } from '../lib/analytics';
import { buildCloudinaryUrl } from '../lib/cloudinary';
import { getYouTubeVideoId } from '../lib/youtube';

const stripHtml = (value?: string) => {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const truncateAtWord = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  const trimmed = value.slice(0, maxLength).trim();
  return trimmed.replace(/\s+\S*$/, '').trim();
};

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [activeImage, setActiveImage] = useState(0);
  const [activeMedia, setActiveMedia] = useState<'video' | number>(0);
  const youtubeVideoId = getYouTubeVideoId(product?.video_url);

  useEffect(() => {
    if (product?.video_url) {
      const vid = getYouTubeVideoId(product.video_url);
      if (vid) {
        setActiveMedia('video');
      } else {
        setActiveMedia(0);
      }
    } else {
      setActiveMedia(0);
    }
  }, [product?.id, product?.video_url]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();

  // Swipe/drag state for gallery
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: '', name: '', email: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deliveryServices, setDeliveryServices] = useState<any[]>([
    { id: 'standard', icon: 'Truck', title: 'Standard Delivery', desc: '3-5 working days. Shipping calculated at checkout.', enabled: true },
    { id: 'cod', icon: 'Banknote', title: 'Cash on Delivery', desc: 'Available for all orders inside Dhaka.', enabled: true },
    { id: 'return', icon: 'RefreshCcw', title: '7 Days Return', desc: 'If product is defective or not as described.', enabled: true },
    { id: 'warranty', icon: 'ShieldCheck', title: 'Warranty Setup', desc: '1 Year official manufacturer warranty.', enabled: true }
  ]);
  const [isCheckoutPopupOpen, setIsCheckoutPopupOpen] = useState(false);
  const { user, profile } = useAuth();
  
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

  useEffect(() => {
    if (!product?.offer_time) return;

    const calculateTimeLeft = () => {
      const difference = new Date(product.offer_time).getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [product?.offer_time]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('settings').select('*').eq('key', 'delivery_services').single();
        if (data && data.value) {
          const parsed = JSON.parse(data.value);
          if (Array.isArray(parsed)) {
            setDeliveryServices(parsed);
          }
        }
      } catch (e) {
        // Ignore errors if table doesn't exist yet
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      if (id) {
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
        let query = supabase.from('products').select('*');
        if (isUuid) {
          query = query.eq('id', id);
        } else {
          query = query.eq('slug', id);
        }

        const { data } = await query.single();
        if (data) {
          setProduct(data);
          trackViewContent(data);
          // trackTiktokViewContent is handled by trackViewContent
          setRelatedProducts([]);

          if (data.category_id) {
            const { data: catData } = await supabase.from('categories').select('name').eq('id', data.category_id).single();
            if (catData) setCategoryName(catData.name);
          } else {
            setCategoryName('');
          }

          const manualRelatedIds = Array.isArray(data.related_product_ids)
            ? data.related_product_ids.filter((productId: string) => productId && productId !== data.id)
            : [];

          if (manualRelatedIds.length > 0) {
            const { data: related } = await supabase.from('products')
              .select('*')
              .in('id', manualRelatedIds);
            if (related) {
              const sortedRelated = manualRelatedIds
                .map((productId: string) => related.find((item: any) => item.id === productId))
                .filter(Boolean);
              setRelatedProducts(sortedRelated);
            }
          } else if (data.category_id) {
            const { data: related } = await supabase.from('products')
              .select('*')
              .eq('category_id', data.category_id)
              .neq('id', data.id)
              .limit(6);
            if (related) {
              setRelatedProducts(related);
            }
          } else {
             const { data: related } = await supabase.from('products')
               .select('*')
               .neq('id', data.id)
               .limit(6);
             if (related) {
               setRelatedProducts(related);
             }
          }

          if (data.variants && data.variants.length > 0) {
            const initialVars: Record<string, string> = {};
            const firstCombination = data.variants.find((v: any) =>
              (v.option1_value || v.color) || (v.option2_value || v.size)
            );
            if (firstCombination) {
              const option1Name = firstCombination.option1_name || 'Color';
              const option2Name = firstCombination.option2_name || (firstCombination.size ? 'Size' : '');
              const option1Value = firstCombination.option1_value || firstCombination.color || '';
              const option2Value = firstCombination.option2_value || firstCombination.size || '';
              if (option1Value) initialVars[option1Name] = option1Value;
              if (option2Name && option2Value) initialVars[option2Name] = option2Value;
            } else {
              data.variants.forEach((v: any) => {
                const opts = v.options.split(',').map((o: string) => o.trim()).filter(Boolean);
                if (opts.length > 0) initialVars[v.name] = opts[0];
              });
            }
            setSelectedVariants(initialVars);
          } else {
            setSelectedVariants({});
          }
        }
      }

      setLoading(false);
    };

    fetchProduct();
  }, [id]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (product?.id) {
        setReviewsLoading(true);
        const { data } = await supabase.from('reviews').select('*').eq('product_id', product.id).eq('status', 'approved').order('created_at', { ascending: false });
        if (data) setReviews(data);
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [product?.id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.content.trim()) {
      toast.error('Please enter a review message.');
      return;
    }
    if (!user) {
      if (!reviewForm.name.trim() || !reviewForm.email.trim()) {
        toast.error('Name and email are required for guests.');
        return;
      }
    }

    setSubmittingReview(true);
    try {
      const payload = {
        product_id: product.id,
        user_id: user ? user.id : null,
        name: user ? (profile?.full_name || 'Verified User') : reviewForm.name,
        email: user ? user.email : reviewForm.email,
        rating: reviewForm.rating,
        content: reviewForm.content,
        status: 'pending'
      };

      const { error } = await supabase.from('reviews').insert([payload]);
      if (error) {
         if (error.code === '42P01') {
            toast.error('Reviews table does not exist. Please create it in the admin panel.');
         } else throw error;
      } else {
         toast.success('Review submitted successfully! It will be visible after admin approval.');
         setReviewForm({ rating: 5, content: '', name: '', email: '' });
         setIsReviewModalOpen(false);
      }
    } catch (err: any) {
      toast.error('Error submitting review: ' + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '0.0';
  const ratingCounts = [5, 4, 3, 2, 1].map(star => {
    const count = reviews.filter(r => r.rating === star).length;
    return {
      star,
      count,
      percentage: reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
    };
  });

  if (loading) {
    const tempTitle = id ? `Product ${id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}` : 'Loading Product...';
    return <><SEO title={tempTitle} exactTitle /><StorefrontPageSkeleton variant="product" /></>;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
        {/* Background decorative blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
          className="bg-white p-10 sm:p-14 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center max-w-md w-[90%] relative z-10"
        >
          <motion.div 
            initial={{ rotate: -10 }}
            animate={{ rotate: [10, -10, 10, 0] }}
            transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
            className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 relative"
          >
            <Search size={40} className="text-slate-300 relative z-10" strokeWidth={2.5} />
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-slate-200 rounded-full"
            />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 tracking-tight">Product Not Found</h2>
          <p className="text-slate-500 mb-8 text-[15px] leading-relaxed">The product you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
          <Link to="/" className="w-full bg-primary text-white px-8 py-4 rounded-2xl font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/25 active:scale-[0.98] flex items-center justify-center gap-2">
            <ArrowLeft size={18} strokeWidth={2.5} />
            Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  const gallery = [product.image, ...(product.images || [])].filter(Boolean);
  if (gallery.length === 0) {
    gallery.push('https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80');
  }

  // Swipe handlers for main image
  const handlePointerDown = (e: React.PointerEvent) => {
    if (gallery.length <= 1) return;
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragOffset(0);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || gallery.length <= 1) return;
    const delta = e.clientX - dragStartX;
    // Add edge resistance when at boundaries
    let resistance = 1;
    if ((activeImage === 0 && delta > 0) || (activeImage === gallery.length - 1 && delta < 0)) {
      resistance = 0.3;
    }
    setDragOffset(delta * resistance);
  };

  const handlePointerUp = () => {
    if (!isDragging || gallery.length <= 1) return;
    setIsDragging(false);
    const threshold = 50; // px to trigger nav
    if (dragOffset > threshold && activeImage > 0) {
      setActiveImage(prev => prev - 1);
    } else if (dragOffset < -threshold && activeImage < gallery.length - 1) {
      setActiveImage(prev => prev + 1);
    }
    setDragOffset(0);
  };

  const productTitle = product.meta_title || product.title || product.name;
  const cleanProductDescription = stripHtml(product.description);
  const productDescription = product.meta_description
    || truncateAtWord(cleanProductDescription || `Buy ${product.title || product.name} at the best price in Bangladesh.`, 160);
  const productKeywords = product.meta_keywords
    || [product.title || product.name, categoryName, 'online shop', 'Bangladesh']
      .filter(Boolean)
      .join(', ');
  const productUrl = `${window.location.origin}/product/${product.slug || product.id}`;
  const productWhatsAppUrl = createWhatsAppUrl(
    settings.whatsapp_number,
    `Hello, I want to know more about ${product.title || product.name}.\n${productUrl}`
  );
  const callOrderNumber = settings.call_order_number || settings.whatsapp_number;
  const getVariantOptions = (variant: any) => [
    {
      name: variant.option1_name || (variant.color ? 'Color' : ''),
      value: variant.option1_value || variant.color || ''
    },
    {
      name: variant.option2_name || (variant.size ? 'Size' : ''),
      value: variant.option2_value || variant.size || ''
    }
  ].filter(option => option.name && option.value);
  const combinationVariants = (product.variants || []).filter((variant: any) => getVariantOptions(variant).length > 0);
  const selectedVariant = combinationVariants.find((variant: any) =>
    getVariantOptions(variant).every(option => selectedVariants[option.name] === option.value)
  );
  const displayProduct = selectedVariant ? {
    ...product,
    price: Number(selectedVariant.price || 0),
    original_price: Number(selectedVariant.compare_price || selectedVariant.price || 0),
    discount_price: Number(selectedVariant.price || 0),
    stock: Number(selectedVariant.stock || 0),
    sku: selectedVariant.sku,
    weight: Number(selectedVariant.weight || 0),
    delivery_charge: Number(selectedVariant.delivery_charge ?? product.delivery_charge ?? 0)
  } : product;
  const isDeliveryFree = Boolean(product.is_delivery_free);
  const displayPrice = displayProduct.discount_price || displayProduct.price;
  const displayComparePrice = displayProduct.original_price || displayProduct.price;
  const displayStock = Number(displayProduct.stock || 0);
  const variantGroups = Array.from(new Set(combinationVariants.flatMap((variant: any) => getVariantOptions(variant).map(option => option.name))))
    .map((name) => ({
      name,
      options: Array.from(new Set(combinationVariants
        .filter((variant: any) => getVariantOptions(variant).every(option => option.name === name || !selectedVariants[option.name] || selectedVariants[option.name] === option.value))
        .map((variant: any) => getVariantOptions(variant).find(option => option.name === name)?.value)
        .filter(Boolean)))
    }))
    .filter(group => group.options.length > 0);
  const legacyVariants = combinationVariants.length === 0 ? product.variants || [] : [];

  return (
    <main className="bg-[#f7f8fa] min-h-screen pb-20 pt-2 lg:pt-6">
      <SEO
        title={productTitle}
        exactTitle={true}
        description={productDescription}
        keywords={productKeywords}
        image={gallery[0]}
        url={productUrl}
        type="product"
        schema={[
          {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": productTitle,
            "image": gallery,
            "description": productDescription,
            "brand": {
              "@type": "Brand",
              "name": (product as any)?.store || settings?.siteName || "Store"
            },
            ...(reviews.length > 0 ? {
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": avgRating,
                "reviewCount": reviews.length
              }
            } : {}),
            "offers": {
              "@type": "Offer",
              "url": productUrl,
              "priceCurrency": "BDT",
              "price": displayPrice,
              "availability": displayStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              "itemCondition": "https://schema.org/NewCondition"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": window.location.origin
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": categoryName || "Products",
                "item": categoryName ? `${window.location.origin}/category/${encodeURIComponent(categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}` : `${window.location.origin}/shop`
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": productTitle,
                "item": productUrl
              }
            ]
          }
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm text-gray-500 py-3 mb-2 md:mb-4 whitespace-nowrap overflow-x-auto hide-scrollbar">
           <Link to="/" className="flex items-center gap-1.5 hover:text-primary transition-colors"><Home size={14} /> Home</Link>
           <ChevronRightIcon size={14} className="mx-2 text-gray-300" />
           {categoryName ? (
             <>
               <span className="text-gray-600">{categoryName}</span>
               <ChevronRightIcon size={14} className="mx-2 text-gray-300" />
             </>
           ) : (
             <>
               <span className="text-gray-600">Product</span>
               <ChevronRightIcon size={14} className="mx-2 text-gray-300" />
             </>
           )}
           <span className="text-gray-900 font-medium truncate max-w-[200px] md:max-w-md">{product.title || product.name}</span>
        </nav>

        <div className="overflow-hidden mb-8" style={{ boxSizing: 'border-box', maxWidth: '100%' }}>
          <div className="flex flex-col md:flex-row" style={{ minWidth: 0 }}>
            {/* Image Gallery */}
            <div className="w-full md:w-1/2 lg:w-[45%] px-0 py-3 md:p-6 lg:p-8 md:border-r border-gray-100" style={{ minWidth: 0, boxSizing: 'border-box' }}>
              {/* Main Image Frame */}
              <div
                className="relative w-[calc(100%+2rem)] max-w-none -mx-4 sm:w-full sm:max-w-[360px] sm:mx-auto md:max-w-none aspect-square rounded-[18px] overflow-hidden border border-[#ECECEC] bg-white shadow-[0_8px_30px_rgba(17,24,39,0.06)] mb-3 flex items-center justify-center"
                style={{ boxSizing: 'border-box' }}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (gallery.length > 1) {
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      setActiveImage(prev => prev > 0 ? prev - 1 : prev);
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      setActiveImage(prev => prev < gallery.length - 1 ? prev + 1 : prev);
                    }
                  }
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {product.discount > 0 && (
                  <span className="absolute top-4 left-4 z-10 bg-[#e82524] text-white text-sm font-bold xl:text-base px-3 py-1.5 rounded-lg shadow-sm">
                    -{product.discount}% OFF
                  </span>
                )}

                {isDeliveryFree && (
                  <span className="absolute top-4 right-4 z-10 bg-emerald-600 text-white text-xs md:text-sm font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
                    <Truck size={14} /> Free Delivery
                  </span>
                )}

                {/* Main Media Content: Embedded YouTube Video or Image */}
                {activeMedia === 'video' && youtubeVideoId ? (
                  <div className="relative w-full h-full bg-black flex items-center justify-center">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0&modestbranding=1&autoplay=1&enablejsapi=1`}
                      title={product.title || product.name || 'Product video'}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <>
                    {/* Image with crossfade and drag transform */}
                    <div className="relative w-full h-full flex items-center justify-center p-0 md:p-4">
                      {gallery.map((img: string, idx: number) => {
                        const srcSet = [
                          `${buildCloudinaryUrl(img, 'w_480,h_480,c_limit,f_auto,q_auto')} 480w`,
                          `${buildCloudinaryUrl(img, 'w_720,h_720,c_limit,f_auto,q_auto')} 720w`,
                          `${buildCloudinaryUrl(img, 'w_960,h_960,c_limit,f_auto,q_auto')} 960w`
                        ].join(', ');
                        const isCurrent = activeMedia === idx;
                        return (
                          <img
                            key={idx}
                            src={buildCloudinaryUrl(img, 'w_720,h_720,c_limit,f_auto,q_auto')}
                            srcSet={srcSet}
                            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 600px"
                            width={600}
                            height={600}
                            loading={idx === 0 ? 'eager' : 'lazy'}
                            fetchPriority={idx === 0 ? 'high' : 'auto'}
                            decoding="async"
                            className={`absolute max-w-full max-h-full object-contain transition-all duration-300 ease-out ${
                              isCurrent
                                ? 'opacity-100 scale-100'
                                : 'opacity-0 scale-[1.03] pointer-events-none'
                            }`}
                            alt={`${product.title || product.name || 'Product'} image ${idx + 1}`}
                            style={{
                              borderRadius: '14px',
                              transform: isCurrent && isDragging
                                ? `scale(1) translateX(${dragOffset}px)`
                                : undefined
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Hover zoom overlay for desktop - only when not dragging */}
                    {!isDragging && typeof activeMedia === 'number' && gallery[activeMedia] && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `url(${buildCloudinaryUrl(gallery[activeMedia], 'w_1200,h_1200,c_limit,f_auto,q_auto')}) no-repeat center/contain`,
                          opacity: 0,
                          transition: 'opacity 200ms',
                          borderRadius: '18px'
                        }}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {(gallery.length > 1 || Boolean(youtubeVideoId)) && (
                <div
                  className="flex gap-[10px] overflow-x-auto scroll-snap-x-mandatory pb-[6px] px-[6px]"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {/* YouTube Video Thumbnail (First Item) */}
                  {youtubeVideoId && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMedia('video');
                      }}
                      aria-label="View product video"
                      className="relative flex-shrink-0 w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-[11px] border bg-slate-900 overflow-hidden transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
                      style={{
                        scrollSnapAlign: 'start',
                        border: activeMedia === 'video' ? '2px solid var(--color-primary)' : '1px solid #ECECEC',
                        transform: activeMedia === 'video' ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: activeMedia === 'video' ? '0 2px 8px rgba(0,102,255,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                        padding: '2px'
                      }}
                      onMouseEnter={(e) => {
                        if (activeMedia !== 'video') {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeMedia !== 'video') {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                        }
                      }}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                        loading="lazy"
                        decoding="async"
                        width={72}
                        height={72}
                        className="w-full h-full object-cover rounded-[9px]"
                        alt="Product Video Thumbnail"
                      />
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-600/95 text-white flex items-center justify-center shadow-md">
                          <Play size={13} fill="currentColor" className="ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-1 right-1 text-[8px] font-bold bg-black/75 text-white px-1 py-0.2 rounded leading-none">
                        VIDEO
                      </span>
                    </button>
                  )}

                  {/* Image Thumbnails */}
                  {gallery.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveImage(idx);
                        setActiveMedia(idx);
                      }}
                      aria-label={`View image ${idx + 1}`}
                      className="flex-shrink-0 w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-[11px] border bg-white overflow-hidden transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
                      style={{
                        scrollSnapAlign: 'start',
                        border: activeMedia === idx ? '2px solid var(--color-primary)' : '1px solid #ECECEC',
                        transform: activeMedia === idx ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: activeMedia === idx ? '0 2px 8px rgba(0,102,255,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                        padding: '2px'
                      }}
                      onMouseEnter={(e) => {
                        if (activeMedia !== idx) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeMedia !== idx) {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                        }
                      }}
                    >
                      <img 
                        src={buildCloudinaryUrl(img, 'w_140,h_140,c_fill,f_auto,q_auto')} 
                        loading="lazy" 
                        decoding="async"
                        width={72}
                        height={72}
                        className="w-full h-full object-cover rounded-[9px]" 
                        alt={`${product.title || product.name || 'Product'} thumbnail ${idx + 1}`} 
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info - Buy Box */}
            <div className="w-full md:w-1/2 lg:w-[55%] p-0 md:p-0 lg:px-0 lg:py-0 flex flex-col max-w-[560px]" style={{ containerType: 'inline-size', minWidth: 0, boxSizing: 'border-box' }}>
              {/* Title */}
              <h1 className="text-[clamp(26px,4.2vw,34px)] font-[700_800] text-[#111827] leading-[1.2] mb-[10px]" style={{ fontWeight: 750 }}>
                {product.title || product.name}
              </h1>

              {/* Badges: Stock & Free Delivery */}
              <div className="flex items-center gap-2 flex-wrap mb-[14px]">
                {displayStock > 0 ? (
                  <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-green-200">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    In Stock ({displayStock})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-red-200">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Out of Stock
                  </span>
                )}

                {isDeliveryFree && (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-emerald-200">
                    <Truck size={13} />
                    Free Delivery
                  </span>
                )}
              </div>

              {/* Offer Countdown Timer */}
              {timeLeft && (
                <div className="mb-5 bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-3 sm:p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-2 text-red-600 font-bold whitespace-nowrap">
                      <Timer className="w-5 h-5 animate-pulse" />
                      <span className="text-[13px] md:text-[15px] tracking-wide">🔥 অফার শেষ হতে বাকি:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {timeLeft.days > 0 && (
                        <>
                          <div className="flex flex-col items-center justify-center bg-white shadow-sm border border-red-100 w-12 h-12 rounded-lg">
                            <span className="text-lg font-black text-red-600 leading-none">{String(timeLeft.days).padStart(2, '0')}</span>
                            <span className="text-[10px] text-red-400 font-semibold mt-0.5">দিন</span>
                          </div>
                          <span className="text-red-300 font-bold">:</span>
                        </>
                      )}
                      <div className="flex flex-col items-center justify-center bg-white shadow-sm border border-red-100 w-12 h-12 rounded-lg">
                        <span className="text-lg font-black text-red-600 leading-none">{String(timeLeft.hours).padStart(2, '0')}</span>
                        <span className="text-[10px] text-red-400 font-semibold mt-0.5">ঘণ্টা</span>
                      </div>
                      <span className="text-red-300 font-bold">:</span>
                      <div className="flex flex-col items-center justify-center bg-white shadow-sm border border-red-100 w-12 h-12 rounded-lg">
                        <span className="text-lg font-black text-red-600 leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span>
                        <span className="text-[10px] text-red-400 font-semibold mt-0.5">মিনিট</span>
                      </div>
                      <span className="text-red-300 font-bold">:</span>
                      <div className="flex flex-col items-center justify-center bg-white shadow-sm border border-red-100 w-12 h-12 rounded-lg">
                        <span className="text-lg font-black text-red-600 leading-none">{String(timeLeft.seconds).padStart(2, '0')}</span>
                        <span className="text-[10px] text-red-400 font-semibold mt-0.5">সেকেন্ড</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Price - inline row */}
              <div className="flex items-center gap-[10px] mb-[16px]">
                {displayComparePrice > displayPrice && (
                  <span className="text-[15px] text-slate-500 line-through font-medium">৳{displayComparePrice.toLocaleString('en-IN')}</span>
                )}
                <span className="text-[clamp(20px,3vw,24px)] font-[700] text-primary" style={{ fontWeight: 700 }}>৳{displayPrice.toLocaleString('en-IN')}</span>
              </div>

              {/* Variant selector label */}
              {combinationVariants.length > 0 && (
                <>
                  {/* Variant pills */}
                  <div className="flex flex-col" style={{ gap: 'clamp(12px, 2.5vw, 16px)', marginBottom: 'clamp(8px, 2vw, 12px)', minWidth: 0 }}>
                    {variantGroups.map((variant: any, idx: number) => (
                      <div key={idx}>
                        <p className="text-[13px] md:text-[14px] font-[600_700] text-[#374151] mb-2" style={{ fontWeight: 650 }}>
                          <span>{variant.name}</span>
                        </p>
                        <div className="flex flex-wrap w-full" style={{ gap: 'clamp(10px, 2.4vw, 12px)', minWidth: 0 }}>
                          {variant.options.map((opt: string) => (
                            <button
                              key={opt}
                              onClick={() => setSelectedVariants(prev => {
                                const next = { ...prev, [variant.name]: opt };
                                const matched = combinationVariants.find((item: any) =>
                                  getVariantOptions(item).every(option => option.name === variant.name ? option.value === opt : !next[option.name] || next[option.name] === option.value)
                                );
                                if (matched) {
                                  getVariantOptions(matched).forEach(option => {
                                    next[option.name] = option.value;
                                  });
                                }
                                return next;
                              })}
                              className={`transition-all duration-150 border ${selectedVariants[variant.name] === opt ? 'bg-white' : 'bg-white'} text-[#374151]`}
                              style={{
                                padding: `clamp(8px, 2vw, 11px) clamp(14px, 3vw, 20px)`,
                                borderRadius: '6px',
                                fontSize: 'clamp(13px, 2.6vw, 15px)',
                                fontWeight: 650,
                                borderWidth: selectedVariants[variant.name] === opt ? '2px' : '1px',
                                borderColor: selectedVariants[variant.name] === opt ? 'var(--color-primary)' : '#E5E7EB',
                                boxShadow: selectedVariants[variant.name] === opt ? 'none' : '0 1px 3px rgba(17,24,39,.08)',
                                color: selectedVariants[variant.name] === opt ? '#111827' : '#374151'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedVariants[variant.name] !== opt) {
                                  e.currentTarget.style.boxShadow = '0 3px 8px rgba(17,24,39,.12)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedVariants[variant.name] !== opt) {
                                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(17,24,39,.08)';
                                }
                              }}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {legacyVariants.length > 0 && (
                <>
                  <div className="flex flex-col" style={{ gap: 'clamp(12px, 2.5vw, 16px)', marginBottom: 'clamp(8px, 2vw, 12px)', minWidth: 0 }}>
                    {legacyVariants.map((variant: any, idx: number) => {
                      const options = variant.options.split(',').map((o: string) => o.trim()).filter(Boolean);
                      if (options.length === 0) return null;
                      return (
                        <div key={idx}>
                          <p className="text-[13px] md:text-[14px] font-[600_700] text-[#374151] mb-2" style={{ fontWeight: 650 }}>
                            <span>{variant.name}</span>
                          </p>
                          <div className="flex flex-wrap w-full" style={{ gap: 'clamp(10px, 2.4vw, 12px)', minWidth: 0 }}>
                          {options.map((opt: string) => (
                            <button
                              key={opt}
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [variant.name]: opt }))}
                              className={`transition-all duration-150 border ${selectedVariants[variant.name] === opt ? 'bg-white' : 'bg-white'} text-[#374151]`}
                              style={{
                                padding: `clamp(8px, 2vw, 11px) clamp(14px, 3vw, 20px)`,
                                borderRadius: '6px',
                                fontSize: 'clamp(13px, 2.6vw, 15px)',
                                fontWeight: 650,
                                borderWidth: selectedVariants[variant.name] === opt ? '2px' : '1px',
                                borderColor: selectedVariants[variant.name] === opt ? 'var(--color-primary)' : '#E5E7EB',
                                boxShadow: selectedVariants[variant.name] === opt ? 'none' : '0 1px 3px rgba(17,24,39,.08)',
                                color: selectedVariants[variant.name] === opt ? '#111827' : '#374151'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedVariants[variant.name] !== opt) {
                                  e.currentTarget.style.boxShadow = '0 3px 8px rgba(17,24,39,.12)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedVariants[variant.name] !== opt) {
                                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(17,24,39,.08)';
                                }
                              }}
                            >
                              {opt}
                            </button>
                          ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Stepper on its own row */}
              <div className="flex items-center gap-[clamp(8px,2vw,12px)] mb-[clamp(14px,3.4vw,20px)]">
                <button
                  aria-label="Decrease quantity"
                  className={`transition-colors flex items-center justify-center rounded-[6px] border border-[#E5E7EB] bg-white ${quantity <= 1 ? 'text-[#D1D5DB] cursor-not-allowed' : 'text-[#6B7280] hover:bg-[#F9FAFB]'}`}
                  style={{ width: 'clamp(40px, 9vw, 46px)', height: 'clamp(40px, 9vw, 46px)' }}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <svg width="clamp(16px, 3.4vw, 20px)" height="clamp(16px, 3.4vw, 20px)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <span className="flex items-center justify-center rounded-[6px] border border-[#E5E7EB] bg-white text-[#374151]" style={{ width: 'clamp(40px, 9vw, 46px)', height: 'clamp(40px, 9vw, 46px)', fontSize: 'clamp(14px, 3vw, 16px)', fontWeight: 550 }}>{quantity}</span>
                <button
                  aria-label="Increase quantity"
                  className="flex items-center justify-center rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
                  style={{ width: 'clamp(40px, 9vw, 46px)', height: 'clamp(40px, 9vw, 46px)' }}
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <svg width="clamp(16px, 3.4vw, 20px)" height="clamp(16px, 3.4vw, 20px)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>

              {/* Button grid - 2 columns, 2 rows - ALWAYS 2 columns at every width */}
              <style>{`
                @media (max-width: 768px) {
                  .flex-col.md\\:flex-row { flex-direction: column !important; }
                  .w-full.md\\:w-1\\/2, .w-full.md\\:w-1\\/2.lg\\:w-\\[45\\%\\], .w-full.md\\:w-1\\/2.lg\\:w-\\[55\\%\\] { width: 100% !important; }
                  .mobile-product-image-container {
                    width: 100% !important;
                    margin-left: 15px !important;
                    margin-right: 15px !important;
                    aspect-ratio: 4/5 !important;
                  }
                  .mobile-product-image-container img {
                    object-fit: cover !important;
                    border-radius: 12px !important;
                  }
                }
                .btn-grid { display:grid; grid-template-columns:1fr 1fr; gap: clamp(10px, 2.4vw, 14px); min-width: 0; }
                .btn-grid button, .btn-grid a {
                  min-height: clamp(46px, 11vw, 52px);
                  height: auto;
                  padding: clamp(11px, 2.4vw, 14px) clamp(10px, 2.4vw, 16px);
                  font-size: clamp(13.5px, 3vw, 16px);
                  font-weight: 650;
                  line-height: 1.25;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  gap: clamp(6px, 1.4vw, 8px);
                  border-radius: 6px;
                  cursor: pointer;
                  white-space: normal;
                  text-align: center;
                  min-width: 0;
                  width: 100%;
                  box-sizing: border-box;
                }
                .btn-grid button svg, .btn-grid a svg {
                  width: clamp(16px, 3.4vw, 19px);
                  height: clamp(16px, 3.4vw, 19px);
                  flex: 0 0 auto;
                }
              `}</style>
              <div className="btn-grid">
                {/* Row 1 left - Add to Cart outline */}
                <button
                  onClick={() => {
                    trackEvent('add_to_cart', { product_id: product?.id });
                    addToCart({ ...displayProduct, selectedVariants, selectedVariant }, quantity);
                    trackAddToCart(displayProduct, quantity);
                  }}
                  disabled={displayStock <= 0}
                  className="rounded-[6px] border-[1.5px] border-[#111827] bg-white text-[#111827] hover:brightness-[0.96] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden text-ellipsis"
                >
                  কার্টে যোগ করুন
                </button>

                {/* Row 1 right - Order blue with bag icon */}
                <button
                  onClick={() => {
                    trackEvent('buy_now', { product_id: product?.id });
                    trackAddToCart(displayProduct, quantity);
                    setIsCheckoutPopupOpen(true);
                  }}
                  disabled={displayStock <= 0}
                  className="rounded-[6px] bg-primary text-white flex items-center justify-center gap-[clamp(6px,1.4vw,8px)] hover:brightness-[0.96] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden text-ellipsis"
                >
                  <svg width="clamp(16px, 3.4vw, 19px)" height="clamp(16px, 3.4vw, 19px)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  অর্ডার করুন
                </button>

                {/* Row 2 left - WhatsApp green */}
                {settings.product_whatsapp_enabled === 'true' && productWhatsAppUrl && (
                  <a
                    href={productWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-[6px] bg-[#25D366] text-white flex items-center justify-center gap-[clamp(6px,1.4vw,8px)] hover:brightness-[0.96] active:scale-[0.98] transition-all overflow-hidden text-ellipsis"
                  >
                    <svg width="clamp(16px, 3.4vw, 19px)" height="clamp(16px, 3.4vw, 19px)" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    হোয়াটসঅ্যাপে অর্ডার করুন
                  </a>
                )}

                {/* Row 2 right - Call order outline */}
                {settings.call_order_enabled !== 'false' && callOrderNumber && (
                  <a
                    href={`tel:${callOrderNumber}`}
                    className="rounded-[6px] border-[1.5px] border-[#111827] bg-white text-[#111827] flex items-center justify-center gap-[clamp(6px,1.4vw,8px)] hover:brightness-[0.96] active:scale-[0.98] transition-all overflow-hidden text-ellipsis"
                  >
                    কল অর্ডার: {callOrderNumber}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details & Specifications Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-5 pb-4 border-b border-gray-100">Product Description</h2>
              <div className="prose prose-sm md:prose-base max-w-none text-gray-600">
                {product.description ? (
                  <div
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                  />
                ) : (
                  <>
                    <p className="mb-4">
                      Experience the ultimate {product.title} with premium features. Brought to you with a focus on high performance, durability, and a sleek modern design. Perfect for your everyday needs, this product delivers exceptional value and reliability.
                    </p>
                    <p className="mb-4">
                      Constructed with high-quality materials, guaranteeing longevity and extended use. Designed to fit seamlessly into your lifestyle, providing comfort and ease of use in every interaction.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 marker:text-primary font-medium text-gray-700">
                      <li>Premium build quality and aesthetic finish</li>
                      <li>Incredible performance for everyday tasks</li>
                      <li>Long-lasting durability and reliability</li>
                      <li>Ergonomic and user-friendly experience</li>
                    </ul>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900 text-base">Product Reviews</h2>
                </div>
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Write a Review
                </button>
              </div>

              {/* Single line summary for stars & total reviews */}
              <div className="flex items-center gap-2 text-sm pb-4 border-b border-gray-100 mb-4">
                <span className="font-extrabold text-gray-900 text-lg">{avgRating}</span>
                <div className="flex text-amber-400 text-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < Math.round(Number(avgRating)) ? "text-amber-400" : "text-gray-300"}>★</span>
                  ))}
                </div>
                <span className="text-gray-500 font-medium text-xs ml-1">({reviews.length} জন রিভিউ দিয়েছেন)</span>
              </div>

              {/* Reviews list line by line */}
              {reviewsLoading ? (
                <div className="py-4 text-center text-xs text-gray-500">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-500 font-medium mb-0.5">No reviews yet.</p>
                  <p className="text-[11px] text-gray-400">Be the first to review this product!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-600 uppercase">
                            {review.name.substring(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 text-xs">{review.name}</span>
                            {review.user_id && (
                              <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 bg-green-50 text-green-700 rounded border border-green-200">Verified Buyer</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>

                      <div className="flex text-amber-400 text-xs mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={i < review.rating ? "text-amber-400" : "text-gray-300"}>★</span>
                        ))}
                      </div>

                      <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap">{review.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {deliveryServices.filter(s => s.enabled).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-3">Delivery & Services</h2>
                <div className="space-y-5">
                  {deliveryServices.filter(s => s.enabled).map(service => {
                    const SERVICE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
                      Truck,
                      Banknote,
                      RefreshCcw,
                      ShieldCheck,
                      Package,
                      Timer,
                      Phone,
                      MessageCircle,
                      Star,
                      Clock
                    };
                    const DynamicIcon = SERVICE_ICONS[service.icon] || Truck;

                    return (
                      <div key={service.id} className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <DynamicIcon size={20} className="text-primary" />
                        </div>
                        <div>
                          <span className="text-[15px] block font-bold text-gray-900">{service.title}</span>
                          <span className="text-sm text-gray-500 mt-1 block">{service.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="pt-8 border-t border-gray-200 mt-8">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="font-extrabold text-2xl text-gray-900 mb-1">You May Also Like</h2>
                <p className="text-gray-500">Customers who viewed this item also viewed</p>
              </div>
              <Link className="hidden sm:inline-flex items-center gap-1 font-bold text-primary hover:underline" to="/">
                Explore More <ChevronRightIcon size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-5 pb-4">
              {relatedProducts.map((p) => (
                 <ProductCard key={p.id} product={p} showRating />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[500px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
               <h3 className="text-[20px] font-bold text-[#0a1a3a]">Write a Review</h3>
               <button 
                 onClick={() => setIsReviewModalOpen(false)} 
                 aria-label="Close review modal"
                 className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full transition-colors"
               >
                 <X size={18} />
               </button>
             </div>

             <div className="px-6 py-6">
               <form onSubmit={handleSubmitReview} className="space-y-5">
                 {!user && (
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-bold text-[#0a1a3a] mb-1.5">Name</label>
                       <input required type="text" value={reviewForm.name} onChange={e => setReviewForm(prev => ({ ...prev, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-primary focus:border-primary outline-none" placeholder="John Doe" />
                     </div>
                     <div>
                       <label className="block text-sm font-bold text-[#0a1a3a] mb-1.5">Email</label>
                       <input required type="email" value={reviewForm.email} onChange={e => setReviewForm(prev => ({ ...prev, email: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-primary focus:border-primary outline-none" placeholder="john@example.com" />
                     </div>
                   </div>
                 )}

                 <div>
                   <label className="block text-sm font-bold text-[#0a1a3a] mb-1.5">Rating</label>
                   <div className="flex gap-2">
                     {[1, 2, 3, 4, 5].map(star => (
                       <button
                         key={star}
                         type="button"
                         aria-label={`Rate ${star} out of 5 stars`}
                         onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                         className={`text-3xl focus:outline-none transition-transform hover:scale-110 ${star <= reviewForm.rating ? 'text-[#facc15]' : 'text-gray-200 hover:text-yellow-100'}`}
                       >
                         ★
                       </button>
                     ))}
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-[#0a1a3a] mb-1.5">Your Review</label>
                   <textarea required rows={4} value={reviewForm.content} onChange={e => setReviewForm(prev => ({ ...prev, content: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary outline-none resize-none" placeholder="Tell us what you think..."></textarea>
                 </div>

                 <button type="submit" disabled={submittingReview} className="w-full py-3.5 mt-2 bg-[#0a1a3a] text-white font-bold rounded-xl shadow-lg hover:bg-[#0f2856] transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                   {submittingReview ? 'Submitting...' : 'Submit Review'}
                 </button>
               </form>
             </div>
          </div>
        </div>
      )}

      {/* Checkout Popup */}
      <CheckoutPopup
        isOpen={isCheckoutPopupOpen}
        onClose={() => setIsCheckoutPopupOpen(false)}
        initialProduct={{ ...displayProduct, selectedVariants, selectedVariant }}
        initialQuantity={quantity}
      />
    </main>
  );
}
