import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, ArrowLeft, Search } from 'lucide-react';
import { StorefrontPageSkeleton } from '../components/ui/StorefrontPageSkeleton';
import { SEO } from '../components/SEO';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { motion } from 'motion/react';

interface SitePage {
  title: string;
  content: string;
}

export default function SitePageViewer() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<SitePage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      if (slug?.startsWith('__system_')) {
        setPage(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('pages')
          .select('title, content')
          .eq('slug', slug)
          .single();
        
        if (data) {
          setPage(data);
        } else {
          setPage(null);
        }
      } catch (err) {
        setPage(null);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPage();
    }
  }, [slug]);

  if (loading) {
    const tempTitle = slug ? `${slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}` : 'Loading Page...';
    return <><SEO title={tempTitle} exactTitle /><StorefrontPageSkeleton variant="content" /></>;
  }

  if (!page) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden py-16">
        <SEO title="Page Not Found" />
        {/* Background decorative blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>
        
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
            <FileText size={40} className="text-slate-300 relative z-10" strokeWidth={2.5} />
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-slate-200 rounded-full"
            />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 tracking-tight">Page Not Found</h1>
          <p className="text-slate-500 mb-8 text-[15px] leading-relaxed">The page you are looking for has not been set up or does not exist.</p>
          <Link to="/" className="w-full bg-primary text-white px-8 py-4 rounded-2xl font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/25 active:scale-[0.98] flex items-center justify-center gap-2">
            <ArrowLeft size={18} strokeWidth={2.5} />
            Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <SEO title={page.title} />
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-8 md:px-12 md:py-10 border-b border-gray-100 bg-gray-50/50">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{page.title}</h1>
        </div>
        <div className="px-6 py-8 md:px-12 md:py-10">
          <div 
            className="prose prose-blue max-w-none text-gray-700 whitespace-pre-wrap
                       prose-h2:text-2xl prose-h2:font-bold prose-h2:text-gray-900 prose-h2:mb-4 prose-h2:mt-8
                       prose-h3:text-xl prose-h3:font-semibold prose-h3:text-gray-800 prose-h3:mb-3 prose-h3:mt-6
                       prose-p:mb-4 prose-p:leading-relaxed
                       prose-ul:list-disc prose-ul:pl-5 prose-ul:mb-4
                       prose-ol:list-decimal prose-ol:pl-5 prose-ol:mb-4
                       prose-li:mb-2"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }} 
          />
        </div>
      </div>
    </div>
  );
}
