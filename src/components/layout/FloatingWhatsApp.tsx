import { useEffect, useRef, useState } from 'react';
import { Camera, MessageCircle, Send, Sparkles, UserRound, X } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { createWhatsAppUrl } from '../../lib/whatsapp';
import { currentStoreSlug } from '../../lib/currentStore';
import { buildCloudinaryUrl } from '../../lib/cloudinary';
import type { ChatAttachment, ProductCard } from '../../lib/aiApi';

interface ChatMsg { id: string; role: 'customer' | 'ai' | 'agent'; content: string; attachments?: ChatAttachment[] | null }

export function ProductCards({ cards: all }: { cards?: ChatAttachment[] | null }) {
  const photos = (all || []).filter((a): a is { type: 'image'; url: string } => a?.type === 'image');
  const cards = (all || []).filter((a): a is ProductCard => a?.type === 'product');
  if (photos.length) {
    return (
      <div className="mt-2 flex flex-wrap gap-2 justify-end">
        {photos.map((p) => (
          <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer">
            <img src={buildCloudinaryUrl(p.url, 'w_300,c_limit,f_auto,q_auto')} alt="পাঠানো ছবি" loading="lazy" className="h-32 max-w-[180px] rounded-xl object-cover border border-gray-200" />
          </a>
        ))}
      </div>
    );
  }
  if (!cards.length) return null;
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
      {cards.map((c) => (
        <a key={c.path} href={c.path} className="w-36 shrink-0 rounded-xl border border-gray-200 bg-white overflow-hidden text-gray-900 hover:shadow-md transition">
          {c.image
            ? <img src={buildCloudinaryUrl(c.image, 'w_300,h_300,c_fill,f_auto,q_auto')} alt={c.title} loading="lazy" className="h-28 w-full object-cover bg-gray-100" />
            : <div className="h-28 w-full bg-gray-100" />}
          <div className="p-2">
            <p className="text-xs font-semibold line-clamp-2 leading-snug">{c.title}</p>
            <p className="mt-1 text-xs font-bold">৳{Number(c.price).toLocaleString('en-US')}</p>
            <p className="mt-1 text-[11px] font-bold text-blue-600">দেখুন / কিনুন →</p>
          </div>
        </a>
      ))}
    </div>
  );
}

const WA_ICON = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';
const WaIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={`fill-current ${className}`} aria-hidden="true"><path d={WA_ICON} /></svg>
);

const FAB = 'fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4';

function visitorId() {
  const make = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
  try {
    const key = `cc_chat_visitor_${currentStoreSlug || 'shop'}`;
    let id = localStorage.getItem(key);
    if (!id) { id = make(); localStorage.setItem(key, id); }
    return id;
  } catch { return make(); }
}

async function widgetApi(visitor: string, body: Record<string, unknown>) {
  const res = await fetch('/api/ai-widget', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ store: currentStoreSlug, visitor, ...body }),
  });
  const out = await res.json().catch(() => null);
  if (!res.ok || !out?.ok) throw new Error(out?.error || 'এখন উত্তর দেওয়া যাচ্ছে না');
  return out;
}

function AiChatPanel({ shopName, onClose, upload }: { shopName: string; onClose: () => void; upload: { cloud: string; preset: string } | null }) {
  const visitor = useRef(visitorId()).current;
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState('ai');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadHistory = async () => {
    try {
      const out = await widgetApi(visitor, { action: 'history' });
      setMessages(out.messages || []);
      setStatus(out.status || 'ai');
    } catch { /* keep what we have */ }
  };

  useEffect(() => { loadHistory(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // While a person is handling the chat, check for their replies
  useEffect(() => {
    if (status !== 'needs_human' && status !== 'assigned') return;
    const t = setInterval(loadHistory, 8000);
    return () => clearInterval(t);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages.length, busy]);

  const send = async (photo?: string) => {
    const msg = text.trim();
    if ((!msg && !photo) || busy) return;
    setText('');
    setNote('');
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: 'customer', content: msg || '📷 ছবি পাঠিয়েছেন', attachments: photo ? [{ type: 'image', url: photo }] : null }]);
    setBusy(true);
    try {
      const out = await widgetApi(visitor, { action: 'send', message: msg, photos: photo ? [photo] : [] });
      setStatus(out.status || 'ai');
      if (out.reply) setMessages((m) => [...m, { id: `ai-${Date.now()}`, role: 'ai', content: out.reply, attachments: out.attachments }]);
      else setNote(out.status === 'ai' ? 'আপনার মেসেজ পৌঁছেছে, শীঘ্রই উত্তর দেওয়া হবে।' : 'আপনার মেসেজ আমাদের প্রতিনিধির কাছে পৌঁছেছে, তিনি শীঘ্রই উত্তর দেবেন।');
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'এখন উত্তর দেওয়া যাচ্ছে না');
    } finally { setBusy(false); }
  };

  // Photos go to the shop's own Cloudinary (the same place product photos are kept)
  const sendPhoto = async (file: File | undefined) => {
    if (!file || !upload || busy) return;
    if (!file.type.startsWith('image/')) { setNote('শুধু ছবি পাঠানো যাবে'); return; }
    if (file.size > 8 * 1024 * 1024) { setNote('ছবিটা অনেক বড় (৮ MB-এর কম দিন)'); return; }
    setBusy(true);
    setNote('ছবি আপলোড হচ্ছে…');
    let url = '';
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', upload.preset);
      form.append('folder', 'chat');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${upload.cloud}/image/upload`, { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.secure_url) throw new Error();
      url = data.secure_url;
    } catch {
      setNote('ছবি পাঠানো যায়নি, আবার চেষ্টা করুন');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
    if (url) await send(url);
  };

  const askHuman = async () => {
    try {
      await widgetApi(visitor, { action: 'human' });
      setStatus('needs_human');
      setNote('একজন প্রতিনিধিকে জানানো হয়েছে, কিছুক্ষণের মধ্যেই উত্তর দেবেন।');
    } catch (err) { setNote(err instanceof Error ? err.message : 'হয়নি'); }
  };

  return (
    <div role="dialog" aria-label={shopName ? `${shopName}-কে জিজ্ঞাসা করুন` : 'আমাদের জিজ্ঞাসা করুন'}
      className="fixed z-50 inset-x-3 bottom-24 md:inset-x-auto md:right-6 md:bottom-24 md:w-[380px] h-[min(70vh,560px)] flex flex-col rounded-3xl bg-white text-gray-900 shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <p className="font-bold truncate">{shopName ? `${shopName}-কে জিজ্ঞাসা করুন` : 'আমাদের জিজ্ঞাসা করুন'}</p>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100" aria-label="বন্ধ করুন"><X className="h-5 w-5 text-gray-500" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-sm">হ্যালো! কীভাবে সাহায্য করতে পারি? 😊</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'customer' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] min-w-0">
              <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                m.role === 'customer' ? 'bg-gray-900 text-white rounded-br-md' : 'bg-gray-100 rounded-bl-md'}`}>{m.content}</div>
              <ProductCards cards={m.attachments} />
            </div>
          </div>
        ))}
        {busy && <div className="w-14 rounded-2xl bg-gray-100 px-4 py-3 text-xs text-gray-400 animate-pulse">•••</div>}
        {note && <p className="text-center text-xs text-gray-500">{note}</p>}
        {messages.length > 0 && status === 'ai' && (
          <button onClick={askHuman} className="flex items-center gap-1.5 text-xs text-gray-600 underline underline-offset-4 hover:text-gray-900">
            <UserRound className="h-3.5 w-3.5" />একজন মানুষের সাথে কথা বলুন
          </button>
        )}
        <div ref={bottom} />
      </div>
      <div className="flex gap-2 p-3 border-t border-gray-100">
        {upload && (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => sendPhoto(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={busy} aria-label="ছবি পাঠান"
              className="h-11 w-11 shrink-0 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center disabled:opacity-40"><Camera className="h-5 w-5" /></button>
          </>
        )}
        <input value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="প্রশ্ন লিখুন…" aria-label="প্রশ্ন লিখুন"
          className="flex-1 min-w-0 rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400" />
        <button onClick={() => send()} disabled={busy || !text.trim()} aria-label="পাঠান"
          className="h-11 w-11 shrink-0 rounded-full bg-gray-900 text-white flex items-center justify-center disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

/** Floating chat button: WhatsApp, AI chat, or a small menu with both (each switched on by the shop admin). */
export function FloatingWhatsApp() {
  const { settings, loading } = useSettings();
  const [menu, setMenu] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const waUrl = settings.floating_whatsapp_enabled === 'true'
    ? createWhatsAppUrl(settings.whatsapp_number, 'Hello, I need help with an order.') : null;
  const aiOn = settings.ai_web_chat_enabled === 'true';
  const upload = settings.cloudinary_cloud_name && settings.cloudinary_upload_preset
    ? { cloud: settings.cloudinary_cloud_name, preset: settings.cloudinary_upload_preset } : null;
  const shopName = settings.siteName || (settings as Record<string, string | undefined>).site_title || '';

  if (loading || (!waUrl && !aiOn)) return null;

  if (waUrl && !aiOn) {
    return (
      <a href={waUrl} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
        className={`${FAB} bg-[#25D366] shadow-[0_10px_25px_rgba(37,211,102,0.35)] hover:bg-[#20ba59] focus:ring-[#25D366]/25`}>
        <WaIcon className="w-8 h-8" />
        <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white bg-emerald-400"></span>
        </span>
      </a>
    );
  }

  const open = aiOpen || menu;
  return (
    <>
      {aiOpen && <AiChatPanel shopName={shopName} onClose={() => setAiOpen(false)} upload={upload} />}
      {menu && !aiOpen && (
        <div className="fixed z-50 bottom-40 right-4 md:bottom-24 md:right-6 flex flex-col items-end gap-2">
          <a href={waUrl || '#'} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)}
            className="flex items-center gap-2 rounded-full bg-white pl-4 pr-2 py-2 shadow-lg border border-gray-100 text-sm font-bold text-gray-800">
            WhatsApp<span className="h-9 w-9 rounded-full bg-[#25D366] text-white flex items-center justify-center"><WaIcon className="w-5 h-5" /></span>
          </a>
          <button onClick={() => { setMenu(false); setAiOpen(true); }}
            className="flex items-center gap-2 rounded-full bg-white pl-4 pr-2 py-2 shadow-lg border border-gray-100 text-sm font-bold text-gray-800">
            AI চ্যাট<span className="h-9 w-9 rounded-full bg-gray-900 text-white flex items-center justify-center"><Sparkles className="w-4 h-4" /></span>
          </button>
        </div>
      )}
      <button
        onClick={() => { if (open) { setMenu(false); setAiOpen(false); } else if (waUrl) setMenu(true); else setAiOpen(true); }}
        aria-label={open ? 'চ্যাট বন্ধ করুন' : 'চ্যাট করুন'} aria-expanded={open}
        className={`${FAB} bg-gray-900 shadow-[0_10px_25px_rgba(0,0,0,0.3)] focus:ring-gray-900/25`}>
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
      </button>
    </>
  );
}
