import React, { useState } from 'react';
import { ShieldAlert, AlertCircle, PhoneCall, RefreshCw, Copy, Check, Lock } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface BlockedVisitorProps {
  clientIp?: string;
  reason?: string;
}

export function BlockedVisitor({ clientIp, reason }: BlockedVisitorProps) {
  const { settings } = useSettings();
  const [copied, setCopied] = useState(false);
  const whatsapp = settings.whatsapp_number || settings.call_order_number;
  const siteName = settings.siteName || 'Niyo Shop';

  const handleCopyIp = () => {
    if (clientIp) {
      navigator.clipboard.writeText(clientIp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999999] bg-[#f8fafc] text-slate-800 flex items-center justify-center p-4 sm:p-6 overflow-y-auto select-none">
      {/* Background Decorative Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-red-100/60 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-lg w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-slate-200/60 text-center">
        {/* Brand Logo / Name */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {settings.site_logo ? (
            <img 
              src={settings.site_logo} 
              alt={siteName} 
              className="h-9 w-auto object-contain max-w-[160px]" 
            />
          ) : (
            <div className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
              {siteName}
            </div>
          )}
        </div>

        {/* Shield Icon Badge */}
        <div className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-md shadow-red-100/50 mb-5">
          <ShieldAlert className="w-10 h-10" />
        </div>

        {/* 403 Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200/80 mb-3 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
          403 • ACCESS RESTRICTED
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          প্রবেশাধিকার স্থগিত করা হয়েছে
        </h1>

        <p className="text-slate-600 text-sm mt-2.5 leading-relaxed">
          নিরাপত্তাজনিত কারণে আপনার নেটওয়ার্ক আইপি অ্যাড্রেস থেকে এই ওয়েবসাইটে প্রবেশ সাময়িকভাবে বন্ধ রাখা হয়েছে।
        </p>

        {/* Network & IP Details Card */}
        <div className="mt-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left divide-y divide-slate-200/60 text-xs">
          {clientIp && (
            <div className="pb-3 flex justify-between items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Your Network IP:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200/90 shadow-2xs">
                  {clientIp}
                </span>
                <button
                  onClick={handleCopyIp}
                  className="p-1 hover:bg-slate-200/70 rounded-md text-slate-500 transition-colors"
                  title="Copy IP"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          <div className={`${clientIp ? 'pt-3' : ''} flex justify-between items-center`}>
            <span className="text-slate-500 font-medium">Access Status:</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              Blacklisted / Restricted
            </span>
          </div>

          {reason ? (
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Reason:</span>
              <span className="text-slate-700 font-medium">{reason}</span>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
          {whatsapp ? (
            <a
              href={`https://wa.me/880${whatsapp.replace(/\D/g, '').slice(-10)}?text=Hello,%20my%20IP%20(${clientIp})%20is%20blocked%20on%20${encodeURIComponent(siteName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex-1 px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
            >
              <PhoneCall className="w-4 h-4" />
              হোয়াটসঅ্যাপে যোগাযোগ করুন
            </a>
          ) : null}

          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            রিলোড দিন
          </button>
        </div>

        {/* Assistance Note */}
        <div className="mt-6 flex items-start gap-2 bg-amber-50/60 border border-amber-200/70 rounded-xl p-3 text-left">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-relaxed">
            যদি মনে করেন এটি অনিচ্ছাকৃত বা ভুলবশত হয়েছে, অনুগ্রহ করে আপনার আইপি অ্যাড্রেসটি উল্লেখ করে আমাদের কাস্টমার সাপোর্টে যোগাযোগ করুন।
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
          Protected by {siteName} Security Defense System
        </div>
      </div>
    </div>
  );
}
