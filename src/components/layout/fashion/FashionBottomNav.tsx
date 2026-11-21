import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Menu, ShoppingBag, ShoppingCart, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useCart } from '../../../contexts/CartContext';

/** Fashion theme bottom menu (phones): Home, Categories, Shop, Cart, Account. */
export function FashionBottomNav({ onCategoriesClick }: { onCategoriesClick: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, profile } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();
  const isStaff = profile?.role === 'admin' || profile?.role === 'demo';

  const items = [
    { label: 'Home', icon: Home, active: pathname === '/', go: () => navigate('/') },
    { label: 'Categories', icon: Menu, active: pathname.startsWith('/category'), go: onCategoriesClick },
    { label: 'Shop', icon: ShoppingBag, active: pathname === '/shop', go: () => navigate('/shop') },
    { label: 'Cart', icon: ShoppingCart, active: false, go: () => setIsCartOpen(true), badge: true },
    isStaff
      ? { label: 'Admin', icon: ShieldCheck, active: pathname.startsWith('/admin'), go: () => navigate('/admin') }
      : { label: 'Account', icon: User, active: pathname === '/profile' || pathname === '/signin', go: () => navigate(user ? '/profile' : '/signin') },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white border-t border-slate-200" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex h-16 max-w-[520px] mx-auto">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button key={it.label} onClick={it.go} aria-label={it.label}
              className={`flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition ${it.active ? 'text-primary' : 'text-slate-500'}`}>
              <span className="relative">
                <Icon size={24} strokeWidth={it.active ? 2.2 : 1.8} />
                {it.badge && (
                  <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </span>
              <span className={`text-[12px] ${it.active ? 'font-semibold' : 'font-medium'}`}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
