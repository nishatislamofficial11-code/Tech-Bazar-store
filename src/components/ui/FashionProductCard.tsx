import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { buildCloudinaryUrl } from '../../lib/cloudinary';

export interface FashionCardProduct {
  id: string;
  slug?: string;
  title: string;
  image: string;
  price: number;
  original_price?: number | null;
  originalPrice?: number | null;
  is_flash_sale?: boolean;
  is_best_deal?: boolean;
  created_at?: string;
  /** Badge chosen in the product editor: new | hot | sale | exclusive | none (empty = automatic) */
  badge?: string | null;
  /** Average of approved reviews, when known */
  rating?: number;
  reviews?: number;
}

const NEW_DAYS = 14;

export const BADGE_LABELS: Record<string, string> = { new: 'নতুন', hot: 'হট', sale: 'সেল', exclusive: 'এক্সক্লুসিভ' };

function badgeOf(p: FashionCardProduct): string | null {
  if (p.badge === 'none') return null;
  if (p.badge && BADGE_LABELS[p.badge]) return BADGE_LABELS[p.badge];
  if (p.created_at && Date.now() - Date.parse(p.created_at) < NEW_DAYS * 86400000) return 'নতুন';
  if (p.is_best_deal) return 'হট';
  if (p.is_flash_sale) return 'সেল';
  return null;
}

const money = (n: number) => `${Number(n || 0).toLocaleString('en-US')} ৳`;

/** Fashion theme product card: tall photo, badges, name, rating, price and a "View Details" button. */
export function FashionProductCard({ product }: { product: FashionCardProduct }) {
  const url = `/product/${product.slug || product.id}`;
  const op = Number(product.original_price || product.originalPrice || 0);
  const off = op > product.price ? Math.round((1 - product.price / op) * 100) : 0;
  const badge = badgeOf(product);

  return (
    <div className="group flex flex-col h-full">
      <Link to={url} className="relative block aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100">
        {product.image && (
          <img src={buildCloudinaryUrl(product.image, 'w_500,h_667,c_fill,f_auto,q_auto')} alt={product.title} loading="lazy" decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        )}
        {badge && <span className="absolute top-3 left-3 rounded-md bg-primary px-2.5 py-1 text-[12px] sm:text-[13px] font-semibold text-white">{badge}</span>}
        {off > 0 && <span className="absolute top-3 right-3 rounded-md bg-rose-600 px-2 py-1 text-[12px] sm:text-[13px] font-bold text-white">-{off}%</span>}
      </Link>
      <Link to={url} className="mt-3 text-[15px] sm:text-base font-medium text-slate-900 leading-snug line-clamp-2 min-h-[2.75em] hover:text-primary">{product.title}</Link>
      {product.rating ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-slate-500">
          <Star size={15} className="fill-amber-400 text-amber-400" /> {product.rating.toFixed(1)} <span className="text-slate-400">({product.reviews || 0})</span>
        </p>
      ) : null}
      <p className="mt-2 flex items-baseline gap-2 flex-wrap">
        <span className="text-lg sm:text-xl font-extrabold text-slate-900">{money(product.price)}</span>
        {op > product.price && <span className="text-sm text-slate-400 line-through">{money(op)}</span>}
      </p>
      <Link to={url} className="mt-auto pt-3 block">
        <span className="block w-full rounded-xl border-2 border-primary py-2.5 text-center text-[15px] font-bold text-primary hover:bg-primary hover:text-white transition-colors">View Details</span>
      </Link>
    </div>
  );
}
