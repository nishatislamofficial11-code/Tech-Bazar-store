import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../contexts/SettingsContext';

export const Footer = () => {
  const [socialLinks, setSocialLinks] = useState({
    facebook: '#',
    instagram: '#',
    youtube: '#'
  });
  const [copyright, setCopyright] = useState('');
  const { settings } = useSettings();
  
  const footerStyle = settings?.theme_footer_style || 'light';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('settings').select('*').in('key', ['facebook_url', 'instagram_url', 'youtube_url', 'copyright_text']);
        if (data) {
          const links = { ...socialLinks };
          data.forEach(item => {
            if (item.key === 'facebook_url') links.facebook = item.value || '#';
            if (item.key === 'instagram_url') links.instagram = item.value || '#';
            if (item.key === 'youtube_url') links.youtube = item.value || '#';
            if (item.key === 'copyright_text' && item.value) setCopyright(item.value);
          });
          setSocialLinks(links);
        }
      } catch (err) {
        // silently fail for footer
      }
    };
    fetchSettings();
  }, []);

  return (
    <footer className={`pt-10 pb-20 md:pb-10 mt-8 ${
      footerStyle === 'dark' 
        ? 'bg-slate-900 border-t border-slate-800 text-slate-400' 
        : footerStyle === 'colored'
          ? 'bg-primary border-t border-primary-hover text-white/80'
          : 'bg-gray-50 border-t border-gray-200 text-gray-600'
    }`}>
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-3 gap-8">
        
        <div>
          <h3 className={`font-bold mb-4 ${footerStyle === 'light' ? 'text-gray-900' : 'text-white'}`}>Customer Service</h3>
          <ul className={`flex flex-col gap-2 text-sm ${footerStyle === 'colored' ? 'text-white/80' : ''}`}>
            <li><Link to="/pages/returns" className={`hover:text-primary ${footerStyle === 'colored' ? 'hover:text-white' : ''}`}>Returns &amp; Refunds</Link></li>
            <li><Link to="/pages/shipping" className={`hover:text-primary ${footerStyle === 'colored' ? 'hover:text-white' : ''}`}>Shipping Info</Link></li>
            <li><Link to="/pages/contact" className={`hover:text-primary ${footerStyle === 'colored' ? 'hover:text-white' : ''}`}>Contact Us</Link></li>
          </ul>
        </div>

        <div>
          <h3 className={`font-bold mb-4 ${footerStyle === 'light' ? 'text-gray-900' : 'text-white'}`}>Quick Links</h3>
          <ul className={`flex flex-col gap-2 text-sm ${footerStyle === 'colored' ? 'text-white/80' : ''}`}>
            <li><Link to="/pages/about" className={`hover:text-primary ${footerStyle === 'colored' ? 'hover:text-white' : ''}`}>About Us</Link></li>
            <li><Link to="/pages/terms" className={`hover:text-primary ${footerStyle === 'colored' ? 'hover:text-white' : ''}`}>Terms &amp; Conditions</Link></li>
            <li><Link to="/pages/privacy" className={`hover:text-primary ${footerStyle === 'colored' ? 'hover:text-white' : ''}`}>Privacy Policy</Link></li>
          </ul>
        </div>

        <div>
          <h3 className={`font-bold mb-4 ${footerStyle === 'light' ? 'text-gray-900' : 'text-white'}`}>Payment Methods</h3>
          <p className={`text-sm mb-4 ${footerStyle === 'colored' ? 'text-white/80' : ''}`}>
            Cash on Delivery
          </p>

          <h3 className={`font-bold mb-4 ${footerStyle === 'light' ? 'text-gray-900' : 'text-white'}`}>Follow Us</h3>
          <div className={`flex gap-3 text-sm ${footerStyle === 'colored' ? 'text-white/80' : ''}`}>
            <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className={`hover:text-primary ${footerStyle === 'colored' ? 'hover:text-white' : ''}`}>Facebook</a>
            <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className={`hover:text-primary ${footerStyle === 'colored' ? 'hover:text-white' : ''}`}>Instagram</a>
            <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className={`hover:text-primary ${footerStyle === 'colored' ? 'hover:text-white' : ''}`}>YouTube</a>
          </div>
        </div>
      </div>

      <div className={`max-w-7xl mx-auto px-4 mt-8 pt-8 text-center ${
        footerStyle === 'dark' ? 'border-t border-slate-800' : footerStyle === 'colored' ? 'border-t border-white/20' : 'border-t border-gray-200'
      }`}>
        {copyright && <p className={`text-sm mb-2 ${footerStyle === 'light' ? 'text-gray-500' : footerStyle === 'colored' ? 'text-white/80' : 'text-slate-400'}`}>{copyright}</p>}
        <p className={`text-xs ${footerStyle === 'light' ? 'text-gray-600' : footerStyle === 'colored' ? 'text-white/80' : 'text-slate-400'}`}>
          Developed by Nishat
        </p>
      </div>
    </footer>
  );
};
