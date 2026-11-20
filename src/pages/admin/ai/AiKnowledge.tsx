import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Entry { id: string; category: string; title: string; content: string; is_active: boolean }
const CATEGORIES = ['Delivery Policy', 'Return Policy', 'Payment', 'FAQ', 'Order Problems', 'About Shop'];
const EXAMPLES: Omit<Entry, 'id' | 'is_active'>[] = [
  { category: 'Delivery Policy', title: 'ডেলিভারি সময়', content: 'ঢাকার ভিতরে ১-২ দিন, ঢাকার বাইরে ৩-৫ দিনের মধ্যে ডেলিভারি হয়। ক্যাশ অন ডেলিভারি আছে।' },
  { category: 'Return Policy', title: 'রিটার্ন ও এক্সচেঞ্জ', content: 'প্রোডাক্ট হাতে পেয়ে সমস্যা থাকলে ৩ দিনের মধ্যে জানালে এক্সচেঞ্জ করে দেওয়া হয়।' },
];

export default function AiKnowledge() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Partial<Entry> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from('ai_knowledge').select('id, category, title, content, is_active').order('category').order('title');
    if (error) toast.error(error.message);
    setEntries((data || []) as Entry[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => ['All', ...Array.from(new Set([...CATEGORIES, ...entries.map((e) => e.category)]))], [entries]);
  const shown = entries.filter((e) => (filter === 'All' || e.category === filter)
    && (!query.trim() || `${e.title} ${e.content}`.toLowerCase().includes(query.trim().toLowerCase())));

  const save = async () => {
    if (!editing?.title?.trim() || !editing.content?.trim()) { toast.error('শিরোনাম আর উত্তর দুটোই লিখুন'); return; }
    setSaving(true);
    const row = { category: editing.category?.trim() || 'FAQ', title: editing.title.trim(), content: editing.content.trim(), is_active: editing.is_active ?? true, updated_at: new Date().toISOString() };
    const { error } = editing.id
      ? await supabase.from('ai_knowledge').update(row).eq('id', editing.id)
      : await supabase.from('ai_knowledge').insert(row);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('সেভ হয়েছে');
    setEditing(null);
    load();
  };

  const remove = async (e: Entry) => {
    if (!window.confirm(`"${e.title}" মুছে ফেলবেন?`)) return;
    const { error } = await supabase.from('ai_knowledge').delete().eq('id', e.id);
    if (error) return toast.error(error.message);
    setEntries((list) => list.filter((x) => x.id !== e.id));
  };

  const toggle = async (e: Entry) => {
    const { error } = await supabase.from('ai_knowledge').update({ is_active: !e.is_active }).eq('id', e.id);
    if (error) return toast.error(error.message);
    setEntries((list) => list.map((x) => (x.id === e.id ? { ...x, is_active: !e.is_active } : x)));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500">দোকানের নীতি আর সাধারণ প্রশ্নের উত্তর। AI এখান থেকে উত্তর দেয়। প্রোডাক্টের দাম আর স্টক AI নিজেই Products থেকে দেখে নেয়, এখানে লিখতে হবে না।</p>
        </div>
        <button onClick={() => setEditing({ category: 'FAQ', is_active: true })} className="shrink-0 flex items-center justify-center gap-2 bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-xl">
          <Plus className="h-4 w-4" />নতুন যোগ করুন
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="খুঁজুন…" className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${filter === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>{c === 'All' ? 'সব' : c}</button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-center text-sm text-gray-400 py-10">লোড হচ্ছে…</p> : shown.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4">
          <BookOpen className="h-10 w-10 mx-auto text-gray-300" />
          <p className="text-sm text-gray-500">এখনো কিছু লেখা নেই। ডেলিভারি সময়, রিটার্ন নীতি, পেমেন্টের নিয়ম লিখে রাখলে AI সঠিক উত্তর দিতে পারবে।</p>
          {entries.length === 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex.title} onClick={() => setEditing({ ...ex, is_active: true })} className="text-xs font-bold border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50">+ {ex.title} (উদাহরণ)</button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((e) => (
            <div key={e.id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 ${e.is_active ? '' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-primary">{e.category}</span>
                  <p className="font-bold text-gray-900">{e.title}</p>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap line-clamp-3">{e.content}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggle(e)} className={`text-[10px] font-bold px-2 py-1 rounded-full ${e.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{e.is_active ? 'চালু' : 'বন্ধ'}</button>
                  <button onClick={() => setEditing(e)} className="p-2 rounded-lg hover:bg-gray-100" aria-label="এডিট"><Pencil className="h-4 w-4 text-gray-500" /></button>
                  <button onClick={() => remove(e)} className="p-2 rounded-lg hover:bg-red-50" aria-label="মুছুন"><Trash2 className="h-4 w-4 text-red-500" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditing(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{editing.id ? 'এডিট করুন' : 'নতুন যোগ করুন'}</h2>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="বন্ধ"><X className="h-5 w-5" /></button>
            </div>
            <label className="block text-xs font-bold text-gray-600">ক্যাটাগরি
              <input list="kb-cats" value={editing.category || ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal" />
              <datalist id="kb-cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
            <label className="block text-xs font-bold text-gray-600">শিরোনাম / প্রশ্ন
              <input value={editing.title || ''} maxLength={200} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="যেমন: ডেলিভারি কতদিনে হয়?" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="block text-xs font-bold text-gray-600">উত্তর / বিস্তারিত
              <textarea value={editing.content || ''} maxLength={5000} rows={6} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder="AI এই তথ্য দেখে কাস্টমারকে উত্তর দেবে" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal" />
            </label>
            <button onClick={save} disabled={saving} className="w-full bg-primary text-white font-bold py-2.5 rounded-xl disabled:opacity-50">{saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
