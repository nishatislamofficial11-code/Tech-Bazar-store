import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Pencil, Trash2, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminPageSkeleton } from '../../components/ui/AdminPageSkeleton';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';

interface Banner {
  id: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ image_url: '', link_url: '', is_active: true });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase.from('banners').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error fetching banners:', error);
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingBanner) {
        const { error } = await supabase.from('banners').update(formData).eq('id', editingBanner.id);
        if (error) throw error;
        toast.success('Banner updated successfully');
      } else {
        const { error } = await supabase.from('banners').insert([formData]);
        if (error) throw error;
        toast.success('Banner added successfully');
      }
      setIsModalOpen(false);
      fetchBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Failed to save banner');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = (id: string) => {
    setBannerToDelete(id);
  };

  const confirmDelete = async () => {
    if (!bannerToDelete) return;
    try {
      const { error } = await supabase.from('banners').delete().eq('id', bannerToDelete);
      if (error) throw error;
      toast.success('Banner deleted');
      fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error('Failed to delete banner');
    }
    setBannerToDelete(null);
  };

  const openModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({ image_url: banner.image_url || '', link_url: banner.link_url || '', is_active: banner.is_active });
    } else {
      setEditingBanner(null);
      setFormData({ image_url: '', link_url: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  if (loading) {
    return <AdminPageSkeleton variant="table" />;
  }

  return (
    <div>
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ImageIcon className="text-[#0ea5e9]" />
          Manage Banners
        </h1>
        <button
          onClick={() => openModal()}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm md:text-base"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Add Banner</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="aspect-[21/9] relative bg-gray-100 flex items-center justify-center">
              {banner.image_url ? (
                <img src={banner.image_url} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="text-gray-400 w-10 h-10" />
              )}
              {!banner.is_active && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="bg-white text-gray-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Inactive</span>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-between items-center">
               <div className="text-sm text-gray-500 truncate mr-4">
                 {banner.link_url ? <a href={banner.link_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{banner.link_url}</a> : 'No link'}
               </div>
               <div className="flex gap-2">
                <button
                  onClick={() => openModal(banner)}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleDeleteRequest(banner.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {banners.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
             No banners found. Add one to show it on the homepage.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBanner ? 'Edit Banner' : 'Add Banner'} maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
              <CloudinaryUpload 
                label="Image URL"
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                placeholder="https://example.com/image.jpg"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link URL (Optional)</label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="https://example.com/page"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active (visible on homepage)
                </label>
              </div>
              <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-white bg-primary hover:bg-primary-hover disabled:bg-primary/40 disabled:text-white/70 rounded-lg transition-colors font-medium"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
      </Modal>

      <ConfirmModal
        isOpen={!!bannerToDelete}
        onClose={() => setBannerToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Banner"
        message="Are you sure you want to delete this banner? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}
