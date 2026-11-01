import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, Search, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { motion } from 'framer-motion';
import { Pagination } from '../../components/ui/Pagination';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [reviewAction, setReviewAction] = useState<{id: string, status: 'approved' | 'rejected'} | null>(null);

  useEffect(() => {
    setCurrentPage(1);
    fetchReviews();
  }, [filter]);

  const fetchReviews = async () => {
    setLoading(true);
    let query = supabase
      .from('reviews')
      .select('*, products(title)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01') {
         // table doesn't exist yet, that's fine
         setReviews([]);
      } else {
        toast.error('Error fetching reviews: ' + error.message);
      }
    } else {
      setReviews(data || []);
    }
    setLoading(false);
  };

  const requestStatusUpdate = (id: string, status: 'approved' | 'rejected') => {
    setReviewAction({ id, status });
  };

  const confirmStatusUpdate = async () => {
    if (!reviewAction) return;
    const { id, status: newStatus } = reviewAction;
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Review ${newStatus} successfully!`);
      fetchReviews();
    } catch (e: any) {
      toast.error('Error updating status: ' + e.message);
    }
    setReviewAction(null);
  };

  const initDbSql = `
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Allow public insert
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.reviews;
CREATE POLICY "Enable read access for all users" ON public.reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.reviews;
CREATE POLICY "Enable insert access for all users" ON public.reviews
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for admins" ON public.reviews;
CREATE POLICY "Enable update for admins" ON public.reviews
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
`;

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
      className="space-y-6 pb-12 max-w-7xl mx-auto"
    >
      <motion.div variants={item} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Manage Reviews</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Approve or reject customer reviews</p>
        </div>
      </motion.div>

      <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex bg-gray-100 p-1 rounded-lg">
                {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>
        </div>

        {loading ? (
           <div className="p-8"><LoadingSpinner message="Loading reviews..." /></div>
        ) : reviews.length === 0 ? (
           <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">No reviews found.</p>
              <details className="mt-4 text-xs text-left text-gray-400 bg-gray-50 p-4 rounded max-h-60 overflow-auto">
                <summary className="cursor-pointer font-bold mb-2">DB Initialization SQL (if table missing)</summary>
                <pre className="whitespace-pre-wrap">{initDbSql}</pre>
              </details>
           </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 tracking-wider">
                    <th className="p-4 font-medium">Review Info</th>
                    <th className="p-4 font-medium">Product</th>
                    <th className="p-4 font-medium">Rating</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                   {(() => {
                      const ITEMS_PER_PAGE = 25;
                      const totalPages = Math.ceil(reviews.length / ITEMS_PER_PAGE);
                      const paginatedReviews = reviews.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
                      return paginatedReviews.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                         <td className="p-4">
                            <div className="font-medium text-gray-900 text-sm">{row.name}</div>
                            {row.email && <div className="text-xs text-gray-500 mt-0.5">{row.email}</div>}
                            <div className="text-sm text-gray-700 mt-2 line-clamp-2 max-w-xs">{row.content}</div>
                         </td>
                         <td className="p-4 text-sm text-gray-600 max-w-[200px]">
                            <span className="truncate block">{row.products?.title || 'Unknown'}</span>
                         </td>
                         <td className="p-4">
                            <div className="flex items-center gap-0.5 text-yellow-400 text-sm">
                               {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} size={14} className={i < row.rating ? "fill-current text-yellow-400" : "text-gray-300"} />
                               ))}
                            </div>
                         </td>
                         <td className="p-4">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                               row.status === 'approved' ? 'bg-green-100 text-green-800' :
                               row.status === 'rejected' ? 'bg-red-100 text-red-800' :
                               'bg-orange-100 text-orange-800'
                            }`}>
                                {row.status.toUpperCase()}
                            </span>
                         </td>
                         <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                               {row.status !== 'approved' && (
                                   <button onClick={() => requestStatusUpdate(row.id, 'approved')} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Approve">
                                       <Check className="w-4 h-4" />
                                   </button>
                               )}
                               {row.status !== 'rejected' && (
                                   <button onClick={() => requestStatusUpdate(row.id, 'rejected')} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Reject">
                                       <X className="w-4 h-4" />
                                   </button>
                               )}
                            </div>
                         </td>
                      </tr>
                   ));
                   })()}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(reviews.length / 25)}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </motion.div>

      <ConfirmModal
        isOpen={!!reviewAction}
        onClose={() => setReviewAction(null)}
        onConfirm={confirmStatusUpdate}
        title={reviewAction?.status === 'approved' ? 'Approve Review' : 'Reject Review'}
        message={`Are you sure you want to ${reviewAction?.status} this review?`}
        confirmText={reviewAction?.status === 'approved' ? 'Approve' : 'Reject'}
        isDestructive={reviewAction?.status === 'rejected'}
      />
    </motion.div>
  );
}
