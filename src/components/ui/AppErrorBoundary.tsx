import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isChunkError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const msg = error?.message || '';
    const isChunk =
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Strict MIME type') ||
      msg.includes('Failed to load module') ||
      msg.includes('error loading dynamically imported module');

    return {
      hasError: true,
      error,
      isChunkError: isChunk,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary caught an error:', error, errorInfo);

    const msg = error?.message || '';
    const isChunk =
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Strict MIME type') ||
      msg.includes('Failed to load module') ||
      msg.includes('error loading dynamically imported module');

    if (isChunk) {
      const reloadKey = 'chunk_reload_lock';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900 font-sans">
                {this.state.isChunkError
                  ? 'নতুন সংস্করণ আপডেট হচ্ছে...'
                  : 'সাময়িক সমস্যা দেখা দিয়েছে'}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed font-sans">
                {this.state.isChunkError
                  ? 'ওয়েবসাইটটির নতুন সংস্করণ প্রস্তুত হয়েছে। পেজটি রিফ্রেশ করা হচ্ছে...'
                  : 'পেজটি লোড করতে সাময়িক সমস্যা হয়েছে। দয়া করে পেজটি রিফ্রেশ করুন।'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                পেজ রিফ্রেশ করুন
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-all active:scale-95"
              >
                <Home className="w-4 h-4" />
                হোমে যান
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
