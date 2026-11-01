import React from 'react';
import { SEO } from '../SEO';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
}

/** A quiet status indicator that keeps loading feedback unobtrusive. */
export function LoadingSpinner({ message, fullScreen = false, title, size = 'md' }: LoadingSpinnerProps) {
  const spinnerClasses = size === 'sm' 
    ? 'h-4 w-4 border-2' 
    : size === 'lg' 
    ? 'h-8 w-8 border-4' 
    : 'h-6 w-6 border-[3px]';

  const content = (
    <div className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 px-6 text-center" role="status" aria-live="polite">
      {title && <SEO title={title} exactTitle={true} />}
      <div className={`${spinnerClasses} animate-spin rounded-full border-slate-200 border-t-slate-900`} aria-hidden="true" />
      {message && <p className="max-w-xs text-sm font-medium text-slate-500">{message}</p>}
      <span className="sr-only">{message || 'Loading'}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[45vh] w-full grid place-items-center px-6">{content}</div>
    );
  }

  return content;
}
