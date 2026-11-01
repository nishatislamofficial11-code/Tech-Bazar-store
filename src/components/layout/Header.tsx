import React from 'react';
import { Menu, ShoppingCart, MapPin } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { GlobalSearch } from './GlobalSearch';
import { useSettings } from '../../contexts/SettingsContext';
import { buildCloudinaryUrl } from '../../lib/cloudinary';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { cartCount, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const isColored = settings?.theme_header_style === 'colored';
  const isFloating = settings?.theme_header_style === 'floating';
  const isSticky = settings?.theme_header_sticky !== 'false';

  const headerClasses = isFloating
    ? `bg-white/80 backdrop-blur-2xl px-6 py-2.5 sm:py-3.5 z-40 shadow-xl shadow-slate-200/50 rounded-full mx-4 max-w-7xl xl:mx-auto border border-white/50 ${isSticky ? 'sticky top-4' : 'relative mt-4'}`
    : isColored
      ? `bg-primary text-white px-4 py-2.5 sm:py-3.5 z-40 shadow-md ${isSticky ? 'sticky top-0' : 'relative'}`
      : `bg-white/80 backdrop-blur-2xl px-4 py-3 sm:py-4 z-40 border-b border-white/40 shadow-sm shadow-slate-200/50 ${isSticky ? 'sticky top-0' : 'relative'}`;

  const iconClasses = isColored 
    ? "text-white hover:bg-white/10 active:scale-95 rounded-full" 
    : "text-slate-700 hover:text-primary hover:bg-primary/5 rounded-full active:scale-95";

  return (
    <div className={headerClasses}>
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
        {/* Menu Icon and Logo */}
        <div className="flex items-center gap-2 lg:gap-4 md:w-1/3">
          <button 
            onClick={onMenuClick}
            className={`flex-shrink-0 transition-all p-2.5 -ml-2 ${iconClasses}`}
            aria-label="Toggle navigation menu"
          >
            <Menu size={24} strokeWidth={2} className={isColored ? "text-white" : ""} />
          </button>
          {settings?.site_logo && (
            <div className="cursor-pointer flex-shrink-0" onClick={() => navigate('/')}>
              <img
                src={buildCloudinaryUrl(settings.site_logo, 'w_432,h_112,c_limit,f_auto,q_auto')}
                alt={`${settings?.siteName || 'Store'} logo`}
                width={144}
                height={36}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-8 sm:h-9 object-contain"
              />
            </div>
          )}
        </div>

        {/* Search Bar - Center */}
        <div className="hidden md:flex flex-1 justify-center">
          <GlobalSearch />
        </div>

        {/* Right Icons */}
        <div className="flex items-center justify-end gap-1 sm:gap-2 md:w-1/3">
          <button 
            onClick={() => navigate('/track-order')}
            className={`flex-shrink-0 relative transition-all p-2.5 ${iconClasses}`}
            title="Track Order"
            aria-label="Track Order"
          >
            <MapPin size={22} strokeWidth={2} className={isColored ? "text-white" : ""} />
          </button>
          
          <button 
            onClick={() => setIsCartOpen(true)}
            className={`flex-shrink-0 relative transition-all p-2.5 ${iconClasses}`}
            title="Cart"
            aria-label="Shopping Cart"
          >
            <ShoppingCart size={22} strokeWidth={2} className={isColored ? "text-white" : ""} />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm animate-in zoom-in">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
