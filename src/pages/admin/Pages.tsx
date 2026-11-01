import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Plus, Pencil, Trash2, X, FileText } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

interface SitePage {
  id: string;
  slug: string;
  title: string;
  content: string;
}

const REQUIRED_PAGES = [
  { slug: 'returns', title: 'Returns & Refunds' },
  { slug: 'shipping', title: 'Shipping Info' },
  { slug: 'contact', title: 'Contact Us' },
  { slug: 'about', title: 'About Us' },
  { slug: 'terms', title: 'Terms & Conditions' },
  { slug: 'privacy', title: 'Privacy Policy' },
];

export default function AdminPages() {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<SitePage | null>(null);
  const [pageToDelete, setPageToDelete] = useState<{id: string, title: string} | null>(null);
  const [formData, setFormData] = useState({ slug: '', title: '', content: '' });
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase.from('pages').select('*').order('created_at', { ascending: true });
      if (error) {
        if (error.code === '42P01' || error.message.includes('schema cache') || error.message.includes('relation "public.pages" does not exist')) {
          setDbError(true);
        } else {
          toast.error(`Failed to load pages: ${error.message}`);
        }
        setPages([]);
      } else {
        setPages((data || []).filter((p: any) => !p.slug.startsWith('__system_')));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPage) {
      const { error } = await supabase.from('pages').update(formData).eq('id', editingPage.id);
      if (error) toast.error(`Failed to update page: ${error.message}`);
      else toast.success('Page updated successfully');
    } else {
      const { error } = await supabase.from('pages').insert([formData]);
      if (error) toast.error(`Failed to add page: ${error.message}`);
      else toast.success('Page added successfully');
    }
    closeModal();
    fetchPages();
  };

  const handleDeleteRequest = (id: string, title: string) => {
    setPageToDelete({ id, title });
  };

  const confirmDelete = async () => {
    if (!pageToDelete) return;
    const { error } = await supabase.from('pages').delete().eq('id', pageToDelete.id);
    if (error) toast.error('Failed to delete page');
    else {
      toast.success('Page deleted successfully');
      fetchPages();
    }
    setPageToDelete(null);
  };

  const openModal = (page: SitePage | null = null, defaultData?: { slug: string; title: string }) => {
    if (page) {
      setEditingPage(page);
      setFormData({ slug: page.slug, title: page.title, content: page.content || '' });
    } else {
      setEditingPage(null);
      setFormData({ slug: defaultData?.slug || '', title: defaultData?.title || '', content: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPage(null);
    setFormData({ slug: '', title: '', content: '' });
  };

  const initDbSql = `
CREATE TABLE public.pages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    slug text UNIQUE NOT NULL,
    title text NOT NULL,
    content text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pages" ON public.pages FOR SELECT USING (true);
CREATE POLICY "Admins full access pages" ON public.pages FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Pages</h1>
        <button
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Page
        </button>
      </div>

      {dbError ? (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-md">
          <h3 className="text-lg font-bold text-orange-800 mb-2">Database Setup Required</h3>
          <p className="text-orange-700 mb-4">To enable page management, please run this SQL query in your Supabase SQL Editor:</p>
          <pre className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
            {initDbSql}
          </pre>
          <button 
            onClick={() => { setDbError(false); fetchPages(); }}
            className="mt-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md font-medium"
          >
            I've run the SQL, Check Again
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="py-3 px-6">Title</th>
                  <th className="py-3 px-6">Slug/URL</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={3} className="py-8"><LoadingSpinner message="Loading pages..." /></td></tr>
                ) : (
                  <>
                    {/* Render predefined required pages */}
                    {REQUIRED_PAGES.map((reqPage) => {
                      const existingPage = pages.find((p) => p.slug === reqPage.slug);
                      if (existingPage) {
                        return (
                          <tr key={existingPage.id} className="hover:bg-gray-50">
                            <td className="py-3 px-6 font-medium text-gray-900">{existingPage.title}</td>
                            <td className="py-3 px-6 text-gray-500">/pages/{existingPage.slug}</td>
                            <td className="py-3 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => openModal(existingPage)} className="p-1.5 text-primary hover:bg-primary/10 rounded" title="Edit">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteRequest(existingPage.id, existingPage.title)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      } else {
                        return (
                          <tr key={reqPage.slug} className="bg-gray-50/50">
                            <td className="py-3 px-6 font-medium text-gray-600">{reqPage.title} <span className="text-xs ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-semibold">Not Configured</span></td>
                            <td className="py-3 px-6 text-gray-400">/pages/{reqPage.slug}</td>
                            <td className="py-3 px-6 text-right">
                              <button 
                                onClick={() => openModal(null, reqPage)}
                                className="text-sm text-primary font-medium hover:underline"
                              >
                                Setup Content
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    })}

                    {/* Render any additional custom pages */}
                    {pages.filter(p => !REQUIRED_PAGES.some(rp => rp.slug === p.slug)).map((page) => (
                      <tr key={page.id} className="hover:bg-gray-50">
                        <td className="py-3 px-6 font-medium text-gray-900">{page.title} <span className="text-xs ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Custom</span></td>
                        <td className="py-3 px-6 text-gray-500">/pages/{page.slug}</td>
                        <td className="py-3 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openModal(page)} className="p-1.5 text-primary hover:bg-primary/10 rounded">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteRequest(page.id, page.title)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPage ? 'Edit Page' : 'Add Page'} maxWidth="max-w-4xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
                  <input 
                    type="text" required
                    value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Terms & Conditions"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Page Slug (URL)</label>
                  <input 
                    type="text" required
                    value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. terms-conditions"
                    disabled={!!REQUIRED_PAGES.find(rp => rp.slug === formData.slug)}
                  />
                  <p className="text-xs text-gray-500 mt-1">This will be the URL: /pages/{formData.slug || '...'}</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Content (HTML allowed)</label>
                <textarea 
                  required
                  value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary flex-1 min-h-[300px]"
                  placeholder="Enter your content here. Paragraphs and line breaks will be preserved. You can also use HTML tags like <h2>Heading</h2>, <b>bold</b>, etc."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg">
                  {editingPage ? 'Update Page' : 'Save Page'}
                </button>
              </div>
            </form>
      </Modal>

      <ConfirmModal
        isOpen={!!pageToDelete}
        onClose={() => setPageToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Page"
        message={`Are you sure you want to delete "${pageToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}
