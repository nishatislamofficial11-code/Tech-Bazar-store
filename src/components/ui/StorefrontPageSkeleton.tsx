import React from 'react';

type StorefrontSkeletonVariant = 'product' | 'catalog' | 'content';

const Block = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={`skeleton-shimmer ${className || ''}`} {...props} />;

/** Customer-facing loading layouts that preserve the page shape while data arrives. */
export function StorefrontPageSkeleton({ variant = 'catalog', compact = false }: { variant?: StorefrontSkeletonVariant; compact?: boolean }) {
  if (variant === 'product') {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10" role="status" aria-label="Loading product">
        <Block className="mb-6 h-4 w-48 rounded" />
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-4"><Block className="aspect-square w-full rounded-3xl" /><div className="flex gap-3">{Array.from({ length: 4 }).map((_, i) => <Block key={i} className="h-16 w-16 rounded-xl sm:h-20 sm:w-20" />)}</div></div>
          <div className="space-y-6 pt-2"><Block className="h-5 w-24 rounded-full" /><Block className="h-10 w-4/5 rounded-lg" /><Block className="h-5 w-32 rounded" /><Block className="h-8 w-44 rounded-lg" /><div className="space-y-3 border-y border-slate-100 py-6"><Block className="h-4 w-full rounded" /><Block className="h-4 w-11/12 rounded" /><Block className="h-4 w-3/4 rounded" /></div><Block className="h-14 w-full rounded-2xl" /><Block className="h-12 w-full rounded-2xl" /></div>
        </div>
        <div className="mt-14 space-y-5"><Block className="h-7 w-44 rounded" /><Block className="h-32 w-full rounded-3xl" /></div>
        <span className="sr-only">Loading product details</span>
      </main>
    );
  }

  const cardCount = compact ? 8 : 10;
  return (
    <section className={`${compact ? '' : 'mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10'} space-y-6`} role="status" aria-label="Loading products">
      {!compact && <><Block className="h-8 w-52 rounded-lg" /><Block className="h-11 w-full max-w-md rounded-xl" /></>}
      {variant === 'content' ? <div className="space-y-4 rounded-3xl bg-white p-6"><Block className="h-8 w-2/3 rounded" /><Block className="h-4 w-full rounded" /><Block className="h-4 w-11/12 rounded" /><Block className="h-64 w-full rounded-2xl" /></div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: cardCount }).map((_, i) => <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 bg-white"><Block className="aspect-square w-full rounded-none" /><div className="space-y-3 p-3 sm:p-4"><Block className="h-4 w-11/12 rounded" /><Block className="h-4 w-3/4 rounded" /><Block className="mt-5 h-5 w-1/2 rounded" /><Block className="h-10 w-full rounded-xl" /></div></div>)}</div>}
      <span className="sr-only">Loading products</span>
    </section>
  );
}
