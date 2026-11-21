import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search, ShoppingCart } from 'lucide-react';
import { useCart } from '../../../contexts/CartContext';
import { useSettings } from '../../../contexts/SettingsContext';
import { buildCloudinaryUrl } from '../../../lib/cloudinary';

/** Fashion theme header: menu, logo, search and cart. */
export function FashionHeader({ onMenuClick, onSearchClick }: { onMenuClick: () => void; onSearchClick: () => void }) {
  const { cartCount, setIsCartOpen } = useCart();
  const { settings } = useSettings();
  const sticky = settings?.theme_header_sticky !== 'false';
  const btn = 'p-2.5 rounded-full text-slate-900 hover:bg-slate-100 active:scale-95 transition';

  return (
    <header className={`${sticky ? 'sticky top-0' : 'relative'} z-40 bg-white/95 backdrop-blur border-b border-slate-200`}>
      <div className="max-w-7xl mx-auto h-16 sm:h-[72px] px-2 sm:px-4 flex items-center gap-1">
        <button onClick={onMenuClick} className={btn} aria-label="Open menu"><Menu size={26} strokeWidth={2} /></button>
        <Link to="/" className="ml-2 min-w-0 flex items-center" aria-label="Home">
          {settings?.site_logo ? (
            <img src={buildCloudinaryUrl(settings.site_logo, 'w_432,h_112,c_limit,f_auto,q_auto')} alt={settings?.siteName || settings?.site_title || 'Logo'} className="h-8 sm:h-10 w-auto object-contain" fetchPriority="high" />
          ) : (
            <span className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-primary truncate">{settings?.siteName || settings?.site_title || ''}</span>
          )}
        </Link>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button onClick={onSearchClick} className={btn} aria-label="Search"><Search size={24} strokeWidth={2} /></button>
          <button onClick={() => setIsCartOpen(true)} className={`${btn} relative`} aria-label="Cart">
            <ShoppingCart size={24} strokeWidth={2} />
            <span className="absolute top-0.5 right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
