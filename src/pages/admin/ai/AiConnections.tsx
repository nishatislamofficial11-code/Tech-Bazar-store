import { Clock, MessageCircle } from 'lucide-react';

const CHANNELS = [
  { name: 'Facebook Messenger', desc: 'পেজের ইনবক্সে AI উত্তর দেবে, কমেন্টের উত্তরও দেবে', color: 'bg-blue-50 text-blue-600' },
  { name: 'Instagram', desc: 'Instagram ডাইরেক্ট মেসেজ আর কমেন্টে AI উত্তর দেবে', color: 'bg-pink-50 text-pink-600' },
  { name: 'WhatsApp', desc: 'WhatsApp Business নম্বরে আসা মেসেজে AI উত্তর দেবে', color: 'bg-emerald-50 text-emerald-600' },
];

export default function AiConnections() {
  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
        <p className="text-sm text-gray-500">আপনার Facebook পেজ, Instagram আর WhatsApp এখানে যুক্ত করবেন।</p>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3">
        <Clock className="h-5 w-5 shrink-0 mt-0.5" />
        <p>সংযোগের ব্যবস্থা শীঘ্রই চালু হবে। ততক্ষণ Knowledge Base আর AI Settings সাজিয়ে রাখুন, আর AI Settings-এর টেস্ট চ্যাটে AI পরীক্ষা করে দেখুন।</p>
      </div>
      <div className="space-y-3">
        {CHANNELS.map((c) => (
          <div key={c.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}><MessageCircle className="h-5 w-5" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-500">{c.desc}</p>
            </div>
            <button disabled className="shrink-0 text-xs font-bold px-3 py-2 rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed">শীঘ্রই</button>
          </div>
        ))}
      </div>
    </div>
  );
}
