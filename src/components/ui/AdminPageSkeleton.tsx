import React from 'react';

type SkeletonVariant = 'analytics' | 'table' | 'form';

interface AdminPageSkeletonProps {
  variant?: SkeletonVariant;
  compact?: boolean;
}

const Block = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={`skeleton-shimmer ${className || ''}`} {...props} />;

/** Layout-aware placeholders for admin routes while their data is being fetched. */
export function AdminPageSkeleton({ variant = 'table', compact = false }: AdminPageSkeletonProps) {
  const cards = variant === 'analytics' ? 4 : 3;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12" role="status" aria-label="Loading page">
      {!compact && <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3"><Block className="h-7 w-48 rounded-lg" /><Block className="h-4 w-72 max-w-full rounded" /></div>
          <Block className="h-10 w-32 rounded-xl" />
        </div>
        {variant !== 'form' && <Block className="mt-6 h-11 w-full rounded-xl" />}
      </section>}

      {variant === 'analytics' && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: cards }).map((_, i) => <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><Block className="h-4 w-24 rounded" /><Block className="mt-5 h-8 w-28 rounded-md" /></div>)}
        </div>
      )}

      {variant === 'form' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="space-y-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="space-y-2"><Block className="h-3 w-24 rounded" /><Block className="h-11 w-full rounded-xl" /></div>)}</section>
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><Block className="h-5 w-28 rounded" /><Block className="mt-6 h-48 w-full rounded-2xl" /></section>
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-6 ${variant === 'analytics' ? 'lg:grid-cols-3' : ''}`}>
          {variant === 'analytics' && <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2"><Block className="h-5 w-40 rounded" /><Block className="mt-3 h-4 w-56 rounded" /><Block className="mt-8 h-72 w-full rounded-2xl" /></section>}
          <section className={`rounded-3xl border border-slate-100 bg-white p-6 shadow-sm ${variant === 'analytics' ? '' : 'overflow-hidden'}`}>
            <Block className="h-5 w-36 rounded" />
            <div className="mt-6 space-y-4">{Array.from({ length: 6 }).map((_, i) => <Block key={i} className="h-12 w-full rounded-xl" />)}</div>
          </section>
        </div>
      )}
      <span className="sr-only">Loading content</span>
    </div>
  );
}
