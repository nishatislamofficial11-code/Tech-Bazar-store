import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Building2, FileText, Home, LayoutDashboard, Mail, PackageCheck, ShieldCheck, ShoppingCart, Store, Tag, Users, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { supabase } from '../../lib/supabase';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ isOpen, onClose }) => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'categories' | 'menu'>('menu');
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && user) {
      refreshProfile();
    }
  }, [isOpen, user, refreshProfile]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name').order('name');
      if (data) {
        setCategories(data);
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const generateSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const goTo = (path: string) => {
    onClose();
    navigate(path);
  };

  const menuItems = [
    ...(profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'demo' ? [{ label: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard }] : []),
    ...(user && profile?.role !== 'admin' && profile?.role !== 'manager' && profile?.role !== 'demo' ? [{ label: 'My Account', path: '/profile', icon: Users }] : []),
    ...(!user ? [{ label: 'Login / Sign Up', path: '/signin', icon: Users }] : []),
    { label: 'Home', path: '/', icon: Home },
    { label: 'Order Tracking', path: '/track-order', icon: ShoppingCart },
    { label: 'Shop', path: '/shop', icon: Building2 },
    { label: 'About Us', path: '/pages/about', icon: Users },
    { label: 'Contact Us', path: '/pages/contact', icon: Mail },
    { label: 'Privacy Policy', path: '/pages/privacy', icon: ShieldCheck },
    { label: 'Terms & Conditions', path: '/pages/terms', icon: FileText },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 transition-opacity backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div 
        style={{ width: 270, minWidth: 270, maxWidth: '86vw' }}
        className={`fixed inset-y-0 left-0 bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto no-scrollbar flex flex-col bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0 cursor-pointer" onClick={() => { onClose(); navigate('/'); }}>
              {settings?.site_logo ? (
                <img
                  src={settings.site_logo}
                  alt={settings.siteName || 'Site logo'}
                  className="h-6 max-w-[130px] object-contain"
                />
              ) : (
                <span className="block truncate text-[13px] font-extrabold text-primary">
                  {settings?.siteName || 'NittoNoton'}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors"
              aria-label="Close menu"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="px-4 pt-1">
            <div className="grid grid-cols-2 rounded-md overflow-hidden bg-gray-100 text-[12px] font-bold uppercase">
              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className={`h-8 transition-colors ${
                  activeTab === 'categories'
                    ? 'bg-white text-primary border border-primary rounded-md'
                    : 'text-gray-500 hover:text-primary'
                }`}
              >
                Categories
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('menu')}
                className={`h-8 transition-colors ${
                  activeTab === 'menu'
                    ? 'bg-white text-primary border border-primary rounded-md'
                    : 'text-gray-500 hover:text-primary'
                }`}
              >
                Menu
              </button>
            </div>
          </div>

          {/* Actions & Links */}
          <div className="px-8 py-4">
            <div className="flex flex-col gap-1">
              {activeTab === 'menu' ? (
                menuItems.map(({ label, path, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    className="flex items-center gap-3.5 py-2.5 text-left cursor-pointer text-black hover:text-primary transition-colors"
                    onClick={() => goTo(path)}
                  >
                    <Icon size={15} strokeWidth={1.35} className="text-gray-500" />
                    <span className="text-[13px] font-medium">{label}</span>
                  </button>
                ))
              ) : (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-3.5 py-2.5 text-left cursor-pointer text-black hover:text-primary transition-colors"
                    onClick={() => goTo('/shop')}
                  >
                    <Store size={15} strokeWidth={1.35} className="text-gray-500" />
                    <span className="text-[13px] font-medium">All Categories</span>
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className="flex items-center gap-3.5 py-2.5 text-left cursor-pointer text-black hover:text-primary transition-colors"
                      onClick={() => goTo(`/category/${generateSlug(category.name)}`)}
                    >
                      <Tag size={15} strokeWidth={1.35} className="text-gray-500" />
                      <span className="text-[13px] font-medium">{category.name}</span>
                    </button>
                  ))}
                  {categories.length === 0 && (
                    <div className="flex items-center gap-3.5 py-2.5 text-gray-400">
                      <PackageCheck size={15} strokeWidth={1.35} />
                      <span className="text-[13px] font-medium">No categories found</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
