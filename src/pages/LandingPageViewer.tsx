import React, { Component, type ReactNode, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { SEO } from '../components/SEO';
import GlassMultiProductTemplate from '../components/landing/GlassMultiProductTemplate';
import UltimateSalesTemplate from '../components/landing/UltimateSalesTemplate';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-red-50 text-red-600 font-mono text-sm break-all">
          <h1>Error Occurred</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children; 
  }
}

export default function LandingPageViewer() {
  const { slug } = useParams();
  const { profile } = useAuth();
  
  // 1. Initialize state instantly from local cache if available (0ms load)
  const [page, setPage] = useState<any>(() => {
    if (!slug) return null;
    const cached = localStorage.getItem(`lp_cache_${slug}`);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { return null; }
    }
    return null;
  });
  
  // If we already have a cached page, we don't need to show a loading screen
  const [loading, setLoading] = useState(!page);

  // Prevent double-fetching if profile changes but we already have the data
  useEffect(() => {
    if (slug) {
      fetchPage(slug);
    }
  }, [slug]); // Removed profile to prevent double network waterfall

  async function fetchPage(slug: string) {
    try {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      
      // Update cache instantly
      localStorage.setItem(`lp_cache_${slug}`, JSON.stringify(data));
      setPage(data);
    } catch (error) {
      console.error('Error fetching landing page:', error);
      if (!page) setPage(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !page) {
    // Return a blank container matching the template's background instead of a spinning loader.
    // Since Supabase fetches take ~100ms, a blank screen feels instantaneous, whereas a spinner flashes and feels "laggy".
    return <div className="min-h-screen w-full bg-[#fdfbf7]"></div>;
  }
  
  if (!page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600">This page does not exist or is not published yet.</p>
      </div>
    );
  }

  // Security check: Only admins/managers can view unpublished pages
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'demo';
  if (!page.is_published && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600">This page does not exist or is not published yet.</p>
      </div>
    );
  }

  const hasBlocks = page.blocks && page.blocks.length > 0;
  const templateType = hasBlocks ? page.blocks[0].type : null;
  const config = hasBlocks ? page.blocks[0].data : null;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f4f4f5] relative overflow-hidden">
        {/* Subtle Background Pattern for Desktop */}
        <div className="hidden md:block absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <SEO title={page.title} exactTitle={false} />
        <h1 className="sr-only">{page.title}</h1>

        {!page.is_published && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-center text-xs py-1.5 font-medium shadow-sm">
            You are viewing a Draft landing page. Public users will see a 404 error until published.
          </div>
        )}

        <div className="relative z-10 w-full">
          {!config ? (
            <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 max-w-xl mx-auto bg-white shadow-xl">
              <p>No content has been added to this landing page yet.</p>
              <p className="text-sm mt-2">Open the Builder in Admin Panel and save changes to generate the template.</p>
            </div>
          ) : templateType === 'ultimate_sales_template' ? (
            <UltimateSalesTemplate config={config} />
          ) : (
            <GlassMultiProductTemplate config={config} />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
