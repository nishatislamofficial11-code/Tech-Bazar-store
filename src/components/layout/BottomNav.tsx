import React from 'react';
import { Home, Search, User, ShieldCheck, Store, Truck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useSettings } from '../../contexts/SettingsContext';

interface BottomNavProps {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onMenuClick, onSearchClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { setIsCartOpen, cartCount } = useCart();
  const { settings } = useSettings();

  const isFloating = settings?.theme_bottom_nav_style === 'floating';

  const navClasses = isFloating
    ? "fixed bottom-3 inset-x-4 z-50 md:hidden bg-white/95 backdrop-blur-xl border border-gray-200/60 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 pb-0"
    : "fixed bottom-0 inset-x-0 z-50 md:hidden bg-white/92 backdrop-blur-xl border-t border-gray-200/60 shadow-[0_-8px_30px_rgba(0,0,0,0.07)] transition-all duration-300";

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Store, label: 'Shop', path: '/shop' },
    { icon: Search, label: 'Search' },
    { icon: Truck, label: 'Tracking', path: '/track-order' },
    (profile?.role === 'admin' || profile?.role === 'demo')
      ? { icon: ShieldCheck, label: 'Admin', path: '/admin' }
      : { icon: User, label: 'Account', path: '/profile' }
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.label === 'Menu') {
      onMenuClick?.();
      return;
    }
    if (item.label === 'Search') {
      onSearchClick?.();
      return;
    }
    if (item.label === 'Cart') {
      setIsCartOpen(true);
      return;
    }
    if (item.label === 'Account' || item.label === 'Admin') {
      if (user) {
        if (profile?.role === 'admin' || profile?.role === 'demo') {
          navigate('/admin');
        } else {
          navigate('/profile');
        }
      } else {
        navigate('/signin');
      }
      return;
    }
    if (item.path && item.path !== '/cart') {
      navigate(item.path);
    }
  };

  return (
    <nav 
      className={navClasses}
      style={!isFloating ? { paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))' } : {}}
    >
      <div className={`flex justify-between items-center h-14 px-2 max-w-[500px] mx-auto ${isFloating ? 'px-4' : ''}`}>
        {navItems.map((item, index) => {
          const Icon = item.icon;
          let isActive = false;

          if (item.path && item.path !== '/cart' && location.pathname === item.path) {
            isActive = true;
          } else if (
            (item.label === 'Account' || item.label === 'Admin') &&
            (location.pathname === '/signin' || location.pathname.startsWith('/admin') || location.pathname === '/profile')
          ) {
            isActive = true;
          }

          return (
            <button
              key={index}
              onClick={() => handleNavClick(item)}
              aria-label={item.label}
              className="relative flex-1 flex flex-col items-center justify-center h-full group py-1 transition-all active:scale-95 cursor-pointer outline-none"
            >
              {/* Active top line highlight (only for default style) */}
              {isActive && !isFloating && (
                <span className="absolute top-0 inset-x-3 h-[3px] bg-primary rounded-b-full transition-all duration-300" />
              )}

              {/* Icon Container with subtle background pill when active */}
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'text-primary bg-primary/10 scale-105'
                    : 'text-gray-500 group-hover:text-gray-800'
                }`}
              >
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.75} />
                
                {/* Cart Counter Badge */}
                {item.label === 'Cart' && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm transition-transform scale-100">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10.5px] font-medium tracking-tight mt-0.5 transition-colors duration-200 ${
                  isActive 
                    ? 'text-primary font-bold' 
                    : 'text-gray-500 group-hover:text-gray-700'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};


