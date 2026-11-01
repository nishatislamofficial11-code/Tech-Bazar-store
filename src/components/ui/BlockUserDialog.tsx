import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, AlertTriangle, Search, CheckCircle2 } from 'lucide-react';
import { addToBlacklist } from '../../lib/blacklist';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface BlockUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  phone?: string;
  initialIp?: string;
  onSuccess?: () => void;
}

export function BlockUserDialog({ isOpen, onClose, phone = '', initialIp = '', onSuccess }: BlockUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(phone);
  const [reason, setReason] = useState('');
  const [detectedIp, setDetectedIp] = useState<string | null>(initialIp || null);
  const [searchingIp, setSearchingIp] = useState(false);
  const [strictIp, setStrictIp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhoneNumber(phone);
      setReason('');
      if (initialIp && initialIp !== 'Unknown' && initialIp !== 'N/A') {
        setDetectedIp(initialIp);
      } else if (phone) {
        searchForIp(phone);
      } else {
        setDetectedIp(null);
      }
    }
  }, [isOpen, phone, initialIp]);

  const searchForIp = async (rawPhone: string) => {
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return;

    setSearchingIp(true);
    try {
      // 1. Search in orders shipping_address
      const { data: orderData } = await supabase
        .from('orders')
        .select('shipping_address')
        .ilike('shipping_address', `%${cleanPhone}%`)
        .ilike('shipping_address', '%[IP:%')
        .limit(5);

      let foundIp: string | null = null;
      if (orderData && orderData.length > 0) {
        for (const order of orderData) {
          const match = (order.shipping_address || '').match(/\[IP:(.+?)\]/);
          if (match && match[1] && match[1] !== 'Unknown') {
            foundIp = match[1].trim();
            break;
          }
        }
      }

      // 2. Search in incomplete_orders customer_address
      if (!foundIp) {
        const { data: incData } = await supabase
          .from('incomplete_orders')
          .select('customer_address')
          .eq('customer_phone', cleanPhone)
          .ilike('customer_address', '%[IP:%')
          .limit(1);

        if (incData && incData.length > 0) {
          const match = (incData[0].customer_address || '').match(/\[IP:(.+?)\]/);
          if (match && match[1] && match[1] !== 'Unknown') {
            foundIp = match[1].trim();
          }
        }
      }

      setDetectedIp(foundIp);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingIp(false);
    }
  };

  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 11) {
      searchForIp(clean);
    } else {
      setDetectedIp(null);
    }
  };

  const handleBlock = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanPhone && !detectedIp) {
      toast.error('Please provide a phone number or IP address to block.');
      return;
    }

    setLoading(true);
    try {
      await addToBlacklist(cleanPhone, detectedIp || undefined, reason, { strictIp });
      toast.success(
        cleanPhone 
          ? `User blocked! Phone (${cleanPhone}) and Device Fingerprint locked down.`
          : `IP (${detectedIp}) added to blacklist!`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to block user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-red-50/70">
            <h3 className="font-bold text-red-900 flex items-center gap-2 text-base">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              Block User (IP & Phone)
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-red-100 rounded-lg text-red-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Status / Alert banner */}
            <div className="p-3 bg-red-50/60 rounded-xl border border-red-100 text-red-900 text-xs font-medium space-y-1">
              <div className="flex items-center gap-2 font-bold text-red-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                Automatic Fraud Defense
              </div>
              <div>
                Blocked users will be instantly prevented from submitting orders or checkout forms.
              </div>

              {searchingIp ? (
                <div className="text-xs text-amber-700 font-bold pt-2 flex items-center gap-1.5 border-t border-red-100">
                  <Search className="w-3.5 h-3.5 animate-pulse" /> Searching database for past IP with this number...
                </div>
              ) : detectedIp && detectedIp !== 'Unknown' ? (
                <div className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 font-bold pt-2 flex items-center gap-1.5 mt-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Associated IP found ({detectedIp})! Both Phone and IP will be blocked.
                </div>
              ) : phoneNumber ? (
                <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 font-bold pt-2 flex items-center gap-1.5 mt-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  No IP record found for this number in past orders. Only Phone will be blocked.
                </div>
              ) : null}
            </div>

            {/* Phone Number Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number to Block <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="e.g. 017xxxxxxxx"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm font-mono"
              />
            </div>

            {/* IP Address Field */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Target IP Address
                </label>
                {detectedIp && (
                  <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded">
                    Auto-Detected
                  </span>
                )}
              </div>
              <input
                type="text"
                value={detectedIp || ''}
                onChange={(e) => setDetectedIp(e.target.value)}
                placeholder="Auto-detected from order history, or enter manually"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm font-mono bg-slate-50"
              />
              {detectedIp && (
                <label className="flex items-start gap-2 mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={strictIp}
                    onChange={(e) => setStrictIp(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Strict IP Block (কঠোর আইপি ব্লক)</span>
                    <p className="text-[11px] text-slate-500">
                      সতর্কতা: বাংলাদেশে CGNAT-এর কারণে একই মোবাইল ডাটা আইপি শত শত ইউজার শেয়ার করে। শুধুমাত্র ডেটাসেন্টার বা ফিক্সড বট আইপি হলে এটি চেক দিন।
                    </p>
                  </div>
                </label>
              )}
            </div>

            {/* CGNAT Safe Notice */}
            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 text-blue-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-800">
                <span>🛡️</span> Bangladesh CGNAT Safe Protection
              </div>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                সিস্টেমটি কাস্টমারকে ভেরিফায়েড মোবাইল নম্বর এবং ব্রাউজার/ডিভাইস ফিঙ্গারপ্রিন্ট দিয়ে লকডাউন করবে। ফলে মোবাইল ডাটা (GP/Robi/Banglalink) অথবা লোকাল ব্রডব্যান্ডের অন্যান্য নিরীহ কাস্টমাররা ভুলবশত ব্লক হবেন না।
              </p>
            </div>

            {/* Reason Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Blocking</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Fake order, repeated returns, scammer..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 p-4 border-t bg-slate-50">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBlock}
              disabled={loading || searchingIp || !phoneNumber.trim()}
              type="button"
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md shadow-red-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Block User Now
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
