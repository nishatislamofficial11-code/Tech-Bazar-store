import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Bot, CheckCircle2, Hand, MessageSquare, Search, Send, UserRound } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { aiChatApi, AiConversation, AiMessage, CHANNEL_LABEL, CHANNEL_STYLE } from '../../../lib/aiApi';
import { ProductCards } from '../../../components/layout/FloatingWhatsApp';

type Tab = 'all' | 'needs_human' | 'mine' | 'ai' | 'resolved';
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'সব' },
  { id: 'needs_human', label: 'Human Need' },
  { id: 'mine', label: 'আমার চ্যাট' },
  { id: 'ai', label: 'AI চালাচ্ছে' },
  { id: 'resolved', label: 'সমাধান' },
];
const SENTIMENT: Record<string, { label: string; cls: string }> = {
  positive: { label: 'Positive', cls: 'bg-emerald-50 text-emerald-700' },
  neutral: { label: 'Neutral', cls: 'bg-slate-100 text-slate-600' },
  negative: { label: 'রাগী', cls: 'bg-red-50 text-red-700' },
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function AiInbox() {
  const { user, profile } = useAuth();
  const myName = profile?.full_name || user?.email || 'Agent';
  const [convs, setConvs] = useState<AiConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const { data, error } = await supabase.from('ai_conversations').select('*').order('last_message_at', { ascending: false }).limit(300);
    if (!error) setConvs((data || []) as AiConversation[]);
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    const { data } = await supabase.from('ai_messages').select('id, role, content, agent_name, attachments, created_at')
      .eq('conversation_id', id).order('created_at', { ascending: true }).limit(500);
    setMessages((data || []) as AiMessage[]);
  }, []);

  useEffect(() => {
    loadList();
    const t = setInterval(loadList, 10000);
    return () => clearInterval(t);
  }, [loadList]);

  useEffect(() => {
    if (!openId) return;
    loadMessages(openId);
    const t = setInterval(() => loadMessages(openId), 5000);
    return () => clearInterval(t);
  }, [openId, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);
  // On phones the open chat covers the screen; stop the page behind it from scrolling
  useEffect(() => {
    if (!openId || window.matchMedia('(min-width: 1024px)').matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [openId]);

  const counts = useMemo(() => ({
    needs_human: convs.filter((c) => c.status === 'needs_human').length,
    mine: convs.filter((c) => c.status === 'assigned' && c.assigned_to === user?.id).length,
  }), [convs, user?.id]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return convs.filter((c) => {
      if (tab === 'needs_human' && c.status !== 'needs_human') return false;
      if (tab === 'mine' && !(c.status === 'assigned' && c.assigned_to === user?.id)) return false;
      if (tab === 'ai' && c.status !== 'ai') return false;
      if (tab === 'resolved' && c.status !== 'resolved') return false;
      if (!q) return true;
      return [c.customer_name, c.customer_phone, c.last_message, c.summary].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [convs, tab, query, user?.id]);

  const open = convs.find((c) => c.id === openId) || null;

  const patch = async (id: string, values: Partial<AiConversation>, ok: string) => {
    const { error } = await supabase.from('ai_conversations').update(values).eq('id', id);
    if (error) return toast.error(error.message);
    setConvs((list) => list.map((c) => (c.id === id ? { ...c, ...values } : c)));
    toast.success(ok);
  };

  const join = (c: AiConversation) => patch(c.id, { status: 'assigned', assigned_to: user?.id || null, assigned_name: myName, unread: 0 }, 'চ্যাটটা আপনার নামে নেওয়া হয়েছে');
  const resolve = (c: AiConversation) => patch(c.id, { status: 'resolved', unread: 0 }, 'সমাধান হয়েছে, এরপর AI আবার উত্তর দেবে');
  const backToAi = (c: AiConversation) => patch(c.id, { status: 'ai', assigned_to: null, assigned_name: null, ai_paused: false }, 'চ্যাটটা আবার AI-এর হাতে');

  const send = async () => {
    if (!open || !draft.trim()) return;
    setSending(true);
    try {
      await aiChatApi({ action: 'agent_send', conversation_id: open.id, message: draft.trim() });
      setDraft('');
      await Promise.all([loadMessages(open.id), loadList()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'পাঠানো যায়নি');
    } finally { setSending(false); }
  };

  const openChat = (c: AiConversation) => {
    setShowInfo(false);
    setOpenId(c.id);
    setMessages([]);
    if (c.unread && c.status !== 'needs_human') supabase.from('ai_conversations').update({ unread: 0 }).eq('id', c.id).then(() => loadList());
  };

  const lockedByOther = open?.status === 'assigned' && open.assigned_to && open.assigned_to !== user?.id;

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Inbox</h1>
        <p className="text-sm text-gray-500">সব প্ল্যাটফর্মের চ্যাট এক জায়গায়। AI না পারলে চ্যাট "Human Need"-এ আসবে, সেখান থেকে Join করে উত্তর দিন।</p>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-4 lg:h-[calc(100vh-200px)] lg:min-h-[520px]">
        {/* List */}
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-0 ${openId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="নাম, নম্বর বা মেসেজ খুঁজুন"
                className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {TABS.map((t) => {
                const n = t.id === 'needs_human' ? counts.needs_human : t.id === 'mine' ? counts.mine : 0;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${tab === t.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {t.label}
                    {n > 0 && <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center ${t.id === 'needs_human' ? 'bg-red-500 text-white' : 'bg-white/90 text-primary'}`}>{n}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-[300px]">
            {loading ? (
              <p className="p-6 text-center text-sm text-gray-400">লোড হচ্ছে…</p>
            ) : shown.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                কোনো চ্যাট নেই। AI Settings পেজের "টেস্ট চ্যাট" থেকে AI পরীক্ষা করতে পারেন।
              </div>
            ) : shown.map((c) => (
              <button key={c.id} onClick={() => openChat(c)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition ${openId === c.id ? 'bg-primary/5' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-gray-900 truncate">{c.customer_name || 'অজানা কাস্টমার'}</span>
                  <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(c.last_message_at)}</span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{c.last_message || '—'}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CHANNEL_STYLE[c.channel]}`}>{CHANNEL_LABEL[c.channel]}</span>
                  {c.status === 'needs_human' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">Human Need</span>}
                  {c.status === 'assigned' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{c.assigned_name || 'Agent'}</span>}
                  {c.sentiment && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SENTIMENT[c.sentiment].cls}`}>{SENTIMENT[c.sentiment].label}</span>}
                  {c.unread > 0 && <span className="ml-auto text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white flex items-center justify-center">{c.unread}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation: full screen on phones, right column on large screens */}
        <div className={`${openId ? 'flex' : 'hidden lg:flex'} flex-col bg-white fixed inset-0 z-[70] lg:static lg:z-auto lg:rounded-2xl lg:border lg:border-gray-100 lg:shadow-sm lg:min-h-0`}>
          {!open ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">বাম পাশ থেকে একটা চ্যাট বেছে নিন</div>
          ) : (
            <>
              {/* Header: always visible */}
              <div className="shrink-0 flex items-center gap-2 px-2 py-2 lg:px-3 border-b border-gray-100 bg-white">
                <button onClick={() => setOpenId(null)} className="lg:hidden p-2 rounded-full hover:bg-gray-100" aria-label="ফিরে যান"><ArrowLeft className="h-5 w-5" /></button>
                <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                  {(open.customer_name || '?').trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-gray-900 truncate">{open.customer_name || 'অজানা কাস্টমার'}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {CHANNEL_LABEL[open.channel]}{open.customer_phone ? ` · ${open.customer_phone}` : ''}
                    {' · '}
                    <span className={open.status === 'needs_human' ? 'text-red-600 font-bold' : open.status === 'assigned' ? 'text-amber-600 font-bold' : ''}>
                      {open.status === 'needs_human' ? 'Human Need' : open.status === 'assigned' ? (open.assigned_name || 'Agent') : open.status === 'ai' ? 'AI' : 'সমাধান'}
                    </span>
                  </p>
                </div>
                {(open.status === 'assigned' || open.status === 'needs_human') && !lockedByOther && (
                  <button onClick={() => resolve(open)} className="shrink-0 flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-full">
                    <CheckCircle2 className="h-4 w-4" />Resolve
                  </button>
                )}
              </div>

              {/* Why a person is needed: one line, tap for more */}
              {(open.status === 'needs_human' && open.handoff_reason) || open.summary ? (
                <button onClick={() => setShowInfo((v) => !v)}
                  className={`shrink-0 text-left px-4 py-2 text-xs border-b ${open.status === 'needs_human' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                  <p className={showInfo ? '' : 'line-clamp-1'}>
                    {open.status === 'needs_human' && open.handoff_reason ? <><b>কারণ:</b> {open.handoff_reason}</> : <><b>সারাংশ:</b> {open.summary}</>}
                  </p>
                  {showInfo && open.status === 'needs_human' && open.summary && <p className="mt-1"><b>সারাংশ:</b> {open.summary}</p>}
                  <span className="text-[10px] opacity-70">{showInfo ? 'কম দেখান ▲' : 'বিস্তারিত ▼'}</span>
                </button>
              ) : null}

              {/* Messages: the only part that scrolls */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-2 bg-gray-50/60">
                {messages.map((m) => {
                  const mine = m.role !== 'customer';
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`min-w-0 max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                        m.role === 'customer' ? 'bg-white border border-gray-100 text-gray-900 rounded-bl-md'
                          : m.role === 'ai' ? 'bg-primary/10 text-gray-900 rounded-br-md'
                            : 'bg-primary text-white rounded-br-md'}`}>
                        {m.content}
                        <ProductCards cards={m.attachments} />
                        <p className={`mt-1 text-[10px] ${m.role === 'agent' ? 'text-white/70' : 'text-gray-400'}`}>
                          {m.role === 'ai' ? 'AI · ' : m.role === 'agent' ? `${m.agent_name || 'Agent'} · ` : ''}{timeAgo(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Bottom: the next thing to do */}
              <div className="shrink-0 p-2 lg:p-3 border-t border-gray-100 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                {lockedByOther ? (
                  <p className="text-center text-xs text-gray-500 py-2">{open.assigned_name || 'অন্য এজেন্ট'} এই চ্যাট দেখছেন</p>
                ) : open.status === 'assigned' ? (
                  <div className="flex items-end gap-2">
                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} placeholder="উত্তর লিখুন…"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                      className="flex-1 min-w-0 resize-none max-h-32 rounded-2xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                    <button onClick={send} disabled={sending || !draft.trim()} className="h-11 w-11 shrink-0 bg-primary text-white rounded-full flex items-center justify-center disabled:opacity-50" aria-label="পাঠান">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                ) : open.status === 'needs_human' ? (
                  <button onClick={() => join(open)} className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-bold py-3 rounded-xl">
                    <Hand className="h-5 w-5" />Join করে উত্তর দিন
                  </button>
                ) : open.status === 'ai' ? (
                  <button onClick={() => join(open)} className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm font-bold py-3 rounded-xl">
                    <UserRound className="h-5 w-5" />AI থামিয়ে নিজে উত্তর দিন
                  </button>
                ) : (
                  <button onClick={() => backToAi(open)} className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm font-bold py-3 rounded-xl">
                    <Bot className="h-5 w-5" />আবার AI চালু করুন
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
