import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Plus, Pencil, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  image_url?: string | null;
  is_featured?: boolean;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: '', image_url: '', is_featured: true });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to fetch categories');
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = { 
      name: formData.name, 
      icon: formData.icon,
      image_url: formData.image_url,
      is_featured: formData.is_featured
    };

    if (editingCat) {
      const { error } = await supabase.from('categories').update(dataToSave).eq('id', editingCat.id);
      if (error) toast.error(`Failed to update category: ${error.message}`);
      else toast.success('Category updated successfully');
    } else {
      const { error } = await supabase.from('categories').insert([dataToSave]);
      if (error) toast.error(`Failed to add category: ${error.message}`);
      else toast.success('Category added successfully');
    }
    closeModal();
    fetchCategories();
  };

  const handleDeleteRequest = (id: string) => {
    setCategoryToDelete(id);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    const { error } = await supabase.from('categories').delete().eq('id', categoryToDelete);
    if (error) toast.error('Failed to delete category');
    else {
      toast.success('Category deleted');
      fetchCategories();
    }
    setCategoryToDelete(null);
  };

  const openModal = (cat: Category | null = null) => {
    if (cat) {
        setEditingCat(cat);
        setFormData({ 
          name: cat.name, 
          icon: cat.icon || '',
          image_url: cat.image_url || '',
          is_featured: cat.is_featured !== false 
        });
    } else {
        setEditingCat(null);
        setFormData({ name: '', icon: '', image_url: '', is_featured: true });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingCat(null);
      setFormData({ name: '', icon: '', image_url: '', is_featured: true });
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-6 pb-12"
    >
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Categories</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Organize your store catalog effectively.</p>
        </div>
        <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-primary-hover transition-colors text-sm font-bold shadow-sm"
        >
            <Plus className="w-4 h-4" /> Add Category
        </button>
      </motion.div>

      <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
                      <tr>
                          <th className="py-3 px-6">Image</th>
                          <th className="py-3 px-6">Name</th>
                          <th className="py-3 px-6">Featured</th>
                          <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {loading ? (
                          <tr><td colSpan={4} className="py-8"><LoadingSpinner message="Loading categories..." /></td></tr>
                      ) : categories.length === 0 ? (
                          <tr><td colSpan={4} className="py-4 text-center text-gray-500">No categories found</td></tr>
                      ) : (
                          categories.map((cat) => (
                              <tr key={cat.id} className="hover:bg-gray-50">
                                  <td className="py-3 px-6">
                                    <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                                      {cat.image_url ? (
                                        <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <ImageIcon className="w-5 h-5 text-gray-400" />
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-6 font-medium text-gray-900">{cat.name}</td>
                                  <td className="py-3 px-6">
                                    {cat.is_featured !== false ? (
                                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Yes</span>
                                    ) : (
                                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">No</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-6 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                          <button onClick={() => openModal(cat)} className="p-1.5 text-primary hover:bg-primary/10 rounded"><Pencil className="w-4 h-4" /></button>
                                          <button onClick={() => handleDeleteRequest(cat.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                      </div>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </motion.div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCat ? 'Edit Category' : 'Add Category'} maxWidth="max-w-md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input 
                            type="text" required 
                            value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <CloudinaryUpload 
                        label="Image URL"
                        value={formData.image_url} 
                        onChange={(url) => setFormData({...formData, image_url: url})}
                        placeholder="https://example.com/icon.png"
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Icon Identifier (Optional, e.g., Smartphone)</label>
                        <input 
                            type="text" 
                            value={formData.icon} onChange={(e) => setFormData({...formData, icon: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="is_featured"
                            checked={formData.is_featured} onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                        <label htmlFor="is_featured" className="text-sm font-medium text-gray-700">Display in Featured Categories</label>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg">Save</button>
                    </div>
                </form>
      </Modal>

      <ConfirmModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmText="Delete"
      />
    </motion.div>
  );
}
