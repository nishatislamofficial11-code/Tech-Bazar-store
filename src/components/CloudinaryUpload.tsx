import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Image as ImageIcon, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  label?: string;
}

export function CloudinaryUpload({ value, onChange, placeholder = "https://...", label }: Props) {
  const { settings } = useSettings();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!settings.cloudinary_cloud_name || !settings.cloudinary_upload_preset) {
      toast.error('Cloudinary is not configured. Please add Cloud Name and Upload Preset in Settings.');
      return;
    }

    setIsUploading(true);
    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', settings.cloudinary_upload_preset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${settings.cloudinary_cloud_name}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onChange(data.secure_url);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      toast.error('Failed to upload image to Cloudinary.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="flex items-stretch gap-2 w-full">
        <div className="relative flex-1">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium placeholder:text-slate-400"
          />
        </div>
        
        <div className="relative shrink-0 w-[46px] sm:w-auto h-[46px]">
          <input 
            type="file" 
            accept="image/*"
            onChange={handleUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            disabled={isUploading}
            title={settings.cloudinary_cloud_name ? "Upload directly to Cloudinary" : "Cloudinary not configured in settings"}
          />
          <div className={`px-4 py-3 h-full font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0
            ${settings.cloudinary_cloud_name && settings.cloudinary_upload_preset 
              ? 'bg-primary hover:bg-primary-hover text-white' 
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
          >
            {isUploading ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
            ) : (
              <><ImageIcon className="w-4 h-4" /> <span className="hidden sm:inline">Upload</span></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
