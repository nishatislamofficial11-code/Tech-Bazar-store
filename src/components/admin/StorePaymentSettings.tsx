import { useEffect, useState } from 'react';
import { Save, LockKeyhole } from 'lucide-react';
import { PaymentButton } from '../ui/PaymentButton';
import { defaultPaymentSettings, paymentRequest, readPaymentSettings } from '../../lib/storePaymentApi';
import { gatewayNames, paymentMethods, paymentLabels } from '../../lib/paymentRules';

const credentialFields = {
  sslcommerz: ['store_id', 'store_passwd'],
  eps: ['username', 'password', 'hash_key', 'merchant_id', 'store_id'],
  aamarpay: ['store_id', 'signature_key'],
};
export function StorePaymentSettings() {
  const [settings, setSettings] = useState(defaultPaymentSettings);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { let active = true; readPaymentSettings().then(value => { if (active) { setSettings(value); setReady(true); } }).catch(error => { if (active) setMessage(error.message); }); return () => { active = false; }; }, []);
  async function save() {
    if (!ready || busy) return;
    setBusy(true); setMessage('');
    try {
      if (settings.methods.length === 0) throw new Error('অন্তত একটি পেমেন্ট পদ্ধতি রাখুন');
      if (!Number.isFinite(settings.fixedAdvance) || settings.fixedAdvance < 0) throw new Error('সঠিক অগ্রিম টাকার পরিমাণ দিন');
      const result = await paymentRequest<typeof settings>('save-settings', { ...settings, credentials });
      setSettings(result); setCredentials({}); setMessage('পেমেন্ট সেটিংস সংরক্ষিত হয়েছে');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'সংরক্ষণ করা যায়নি'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-6 py-6 text-payment-text">
    {message && <p role="status" className="flex items-center gap-2 border-b border-payment-border pb-4 text-sm"><LockKeyhole size={18} />{message}</p>}
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-bold">পেমেন্ট পদ্ধতি</legend>
      {paymentMethods.map(method => <label key={method} className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={settings.methods.includes(method)} onChange={event => setSettings(previous => ({ ...previous, methods: event.target.checked ? [...previous.methods, method] : previous.methods.filter(m => m !== method) }))} />{paymentLabels[method]}
      </label>)}
    </fieldset>
    <label className="block max-w-md space-y-2 text-sm"><span>নির্দিষ্ট অগ্রিম (টাকা)</span><input aria-label="নির্দিষ্ট অগ্রিম" type="number" min="0" step="0.01" value={settings.fixedAdvance} onChange={event => setSettings({ ...settings, fixedAdvance: Number(event.target.value) })} className="w-full rounded-lg border border-payment-border bg-payment-surface px-3 py-2" /></label>
    <div className="grid max-w-xl gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm"><span>পেমেন্ট গেটওয়ে</span><select aria-label="পেমেন্ট গেটওয়ে" value={settings.gateway} onChange={event => { const gateway = gatewayNames.find(g => g === event.target.value); if (gateway) { setSettings({ ...settings, gateway, configured: false }); setCredentials({}); } }} className="w-full rounded-lg border border-payment-border bg-payment-surface px-3 py-2">{gatewayNames.map(gateway => <option key={gateway} value={gateway}>{gateway === 'sslcommerz' ? 'SSLCommerz' : gateway === 'eps' ? 'EPS' : 'aamarPay'}</option>)}</select></label>
      <label className="space-y-2 text-sm"><span>পেমেন্ট পরিবেশ</span><select value={settings.environment} onChange={event => setSettings({ ...settings, environment: event.target.value === 'live' ? 'live' : 'sandbox' })} className="w-full rounded-lg border border-payment-border bg-payment-surface px-3 py-2"><option value="sandbox">Test</option><option value="live">Live</option></select></label>
    </div>
    <fieldset disabled={!ready} className="grid max-w-xl gap-4 sm:grid-cols-2">
      <legend className="mb-3 text-sm font-bold">নিজের merchant account {settings.configured ? '— সংযুক্ত' : '— সংযুক্ত নয়'}</legend>
      {credentialFields[settings.gateway].map(field => <label key={field} className="space-y-2 text-sm"><span>{field.replaceAll('_', ' ')}</span><input aria-label={field} type="password" autoComplete="new-password" value={credentials[field] || ''} placeholder={settings.configured ? 'সংরক্ষিত — বদলাতে নতুনটি দিন' : ''} onChange={event => setCredentials({ ...credentials, [field]: event.target.value })} className="w-full rounded-lg border border-payment-border bg-payment-surface px-3 py-2 disabled:opacity-50" /></label>)}
    </fieldset>
    <PaymentButton type="button" disabled={!ready || busy} onClick={save}><Save size={16} />{busy ? 'সংরক্ষণ হচ্ছে…' : 'পেমেন্ট সেটিংস সংরক্ষণ'}</PaymentButton>
  </section>;
}