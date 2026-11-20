import { useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, RefreshCcw, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { currentStoreSlug } from '../../lib/currentStore';
import { useSettings } from '../../contexts/SettingsContext';

function newToken() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}

/** Shows the webhook URL + secret the shop owner pastes into Steadfast / Pathao, so delivery status updates by itself. */
export default function CourierWebhookCard() {
  const { settings, refreshSettings } = useSettings();
  const token = String((settings as any)?.courier_webhook_token || '');
  const [busy, setBusy] = useState(false);
  const url = `${window.location.origin}/api/courier-webhook?store=${encodeURIComponent(currentStoreSlug || '')}`;

  const copy = (v: string) => navigator.clipboard.writeText(v).then(() => toast.success('কপি হয়েছে'), () => toast.error('কপি হয়নি'));

  const generate = async () => {
    if (token && !window.confirm('নতুন টোকেন বানালে পুরনো টোকেন আর কাজ করবে না। কুরিয়ার প্যানেলে নতুনটা বসাতে হবে। চালিয়ে যাবেন?')) return;
    setBusy(true);
    const { error } = await supabase.from('settings').upsert({ key: 'courier_webhook_token', value: newToken() }, { onConflict: 'store_id,key' });
    setBusy(false);
    if (error) return toast.error(error.message);
    await refreshSettings();
    toast.success('Webhook টোকেন তৈরি হয়েছে');
  };

  const row = (label: string, value: string) => (
    <div>
      <p className="text-xs font-bold text-gray-600 mb-1">{label}</p>
      <div className="flex gap-2">
        <input readOnly value={value} className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono bg-gray-50" />
        <button type="button" onClick={() => copy(value)} className="shrink-0 px-3 rounded-xl border border-gray-200 hover:bg-gray-50" aria-label="Copy">
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Zap className="w-5 h-5" /></div>
        <div>
          <h3 className="font-bold text-gray-900">অটো স্ট্যাটাস আপডেট (Webhook)</h3>
          <p className="text-xs text-gray-500">পার্সেল ডেলিভারি/ক্যান্সেল হলে অর্ডারের স্ট্যাটাস নিজে থেকেই বদলে যাবে।</p>
        </div>
      </div>

      {token ? (
        <>
          {row('Webhook URL / Callback URL', url)}
          {row('Secret / Auth Token', token)}
          <ol className="text-xs text-gray-600 list-decimal pl-5 space-y-1">
            <li><b>Steadfast:</b> portal.packzy.com → Settings → Webhook → উপরের URL আর Auth Token (Bearer) বসান।</li>
            <li><b>Pathao:</b> merchant.pathao.com → Developers API → Webhook → উপরের URL আর Secret বসান, সব event চালু করুন।</li>
          </ol>
          <button type="button" onClick={generate} disabled={busy} className="text-xs font-bold text-gray-500 hover:text-red-600 flex items-center gap-1 disabled:opacity-50">
            <RefreshCcw className="w-3.5 h-3.5" /> নতুন টোকেন বানান
          </button>
        </>
      ) : (
        <button type="button" onClick={generate} disabled={busy} className="bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-xl disabled:opacity-50">
          {busy ? 'তৈরি হচ্ছে...' : 'Webhook চালু করুন'}
        </button>
      )}
    </div>
  );
}
