import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { ShieldAlert, Save, Phone, Search, Info, Truck, MessageSquareWarning, ShieldCheck } from 'lucide-react';
import { getBlacklist, removeFromBlacklist } from '../../lib/blacklist';
import { AdminPageSkeleton } from '../../components/ui/AdminPageSkeleton';
import { getLocalFraudCache, checkFraudFromApi, extractCourierBreakdowns, extractFraudReports, getCleanPhoneNumber } from '../../lib/fraudCheck';

export default function FraudCheck() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [activeTab, setActiveTab] = useState<'check' | 'blacklist'>('check');
  const [blacklist, setBlacklist] = useState<any[]>([]);
  
  const [apiKey, setApiKey] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [checkResult, setCheckResult] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
    getBlacklist().then(setBlacklist);
  }, []);

  const handleRemoveBlacklist = async (id: string) => {
    if (window.confirm(`Unblock this entry?`)) {
      await removeFromBlacklist(id);
      setBlacklist(prev => prev.filter(i => i.id !== id));
    }
  };


  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('settings').select('*').eq('key', 'bd_courier_api_key').single();
      
      if (error && error.code !== 'PGRST116') {
        toast.error(`Failed to load settings: ${error.message}`);
      } else if (data) {
        setApiKey(data.value);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { data: existing } = await supabase.from('settings').select('id').eq('key', 'bd_courier_api_key').single();
        
      if (existing) {
        await supabase.from('settings').update({ value: apiKey }).eq('key', 'bd_courier_api_key');
      } else {
        await supabase.from('settings').insert([{ key: 'bd_courier_api_key', value: apiKey }]);
      }
      
      toast.success('BD Courier API Key saved successfully');
    } catch (err: any) {
      toast.error(`Failed to save settings: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleManualCheck = async (e: React.FormEvent, forceRecheck: boolean = false) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      toast.error('Please enter a phone number to test');
      return;
    }

    // Check local cache first if not forced
    if (!forceRecheck) {
      const cached = getLocalFraudCache(testPhone);
      if (cached) {
        setCheckResult(cached);
        toast.success('Loaded saved result for this number (0 tokens used)');
        return;
      }
    }

    if (!apiKey) {
      toast.error('Please save your BD Courier API Key first');
      return;
    }

    setChecking(true);
    setCheckResult(null);

    try {
      const result = await checkFraudFromApi(testPhone, apiKey);
      setCheckResult(result);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Fraud check completed successfully');
      }
    } catch (err: any) {
      toast.error(`Error connecting to BD Courier API: ${err.message}`);
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return <AdminPageSkeleton variant="form" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-500" /> 
          Fraud Check API
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden self-start">
          <form onSubmit={handleSaveSettings} className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2">BD Courier API Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BD Courier API Key (Bearer Token)</label>
                <input 
                  type="text" 
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  placeholder="Enter your API Key here..."
                />
                <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  You can get this key from your bdcourier.com dashboard.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                type="submit" 
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition disabled:opacity-70"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Manual Test Tool */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2">Test Fraud Check</h2>
            
            <form onSubmit={handleManualCheck} className="flex gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex-1 relative min-w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="block w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="017XXXXXXXX"
                />
              </div>

              <div className="flex gap-2">
                <button 
                  type="submit" 
                  disabled={checking}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition disabled:opacity-70 text-sm whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  {checking ? 'Checking...' : 'Check'}
                </button>

                {checkResult && (
                  <button 
                    type="button"
                    onClick={(e) => handleManualCheck(e, true)}
                    disabled={checking || !apiKey}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 font-medium rounded-lg hover:bg-amber-100 transition disabled:opacity-70 text-xs shrink-0 whitespace-nowrap"
                    title="Force API Re-check (Consumes 1 Token)"
                  >
                    Re-check
                  </button>
                )}
              </div>
            </form>

            {/* Results Display */}
            {checkResult && (
              <div className="mt-6 p-5 rounded-xl bg-gray-50 border border-gray-200">
                {checkResult.checkedAt && (
                  <div className="mb-4 flex items-center justify-between text-xs text-gray-500 border-b border-gray-200 pb-3">
                    <span className="bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Result Loaded
                    </span>
                    <span className="font-medium">Checked: {new Date(checkResult.checkedAt).toLocaleString()}</span>
                  </div>
                )}
                {checkResult.error ? (
                  <div className="text-red-600 flex items-center gap-3 font-medium bg-red-50 p-4 rounded-lg border border-red-100">
                    <ShieldAlert className="w-6 h-6 shrink-0" />
                    {checkResult.error}
                  </div>
                ) : (() => {
                  const courierBreakdowns = extractCourierBreakdowns(checkResult);
                  const fraudReports = extractFraudReports(checkResult);
                  const summaryRatio = Number(checkResult.data?.summary?.success_ratio ?? (checkResult.data?.summary?.total_parcel ? Math.round(((checkResult.data.summary.success_parcel || 0) / checkResult.data.summary.total_parcel) * 100) : 100));

                  // Group reports by courier
                  const groupedReports = fraudReports.reduce((acc: any, report) => {
                    const courier = report.courierName || 'Unknown Courier';
                    if (!acc[courier]) acc[courier] = [];
                    acc[courier].push(report);
                    return acc;
                  }, {});

                  return (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Overall Delivery</h3>
                        <div className={`px-4 py-1.5 rounded-full text-sm font-black shadow-sm ${
                          summaryRatio >= 80 ? 'bg-green-100 text-green-800 border border-green-200' :
                          summaryRatio >= 50 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          Success: {summaryRatio}%
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 text-center shadow-sm">
                          <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">Total Parcels</div>
                          <div className="text-2xl font-black text-primary">{checkResult.data?.summary?.total_parcel || 0}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 text-center shadow-sm">
                          <div className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider mb-1.5">Delivered</div>
                          <div className="text-2xl font-black text-emerald-600">{checkResult.data?.summary?.success_parcel || 0}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 text-center shadow-sm">
                          <div className="text-[11px] text-red-500 font-bold uppercase tracking-wider mb-1.5">Returned</div>
                          <div className="text-2xl font-black text-red-600">{checkResult.data?.summary?.cancelled_parcel || 0}</div>
                        </div>
                      </div>

                      {/* Courier-wise Breakdown */}
                      {courierBreakdowns.length > 0 && (
                        <div className="mt-5 pt-5 border-t border-gray-200">
                          <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-xs uppercase tracking-wider">
                            <Truck className="w-4 h-4 text-primary" />
                            Courier Breakdown ({courierBreakdowns.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {courierBreakdowns.map((courier, idx) => (
                              <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-primary/40 hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-50">
                                  <span className="text-sm font-bold text-gray-900 truncate flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                                    {courier.name}
                                  </span>
                                  <span className={`text-xs font-black px-2.5 py-1 rounded-md border ${
                                    courier.success_ratio >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                                    courier.success_ratio >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                    {courier.success_ratio}%
                                  </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 p-2 rounded-lg text-xs">
                                  <div>
                                    <span className="text-gray-400 block text-[10px] uppercase font-bold mb-0.5">Total</span>
                                    <span className="font-bold text-gray-800">{courier.total_parcel}</span>
                                  </div>
                                  <div>
                                    <span className="text-emerald-500 block text-[10px] uppercase font-bold mb-0.5">Success</span>
                                    <span className="font-bold text-emerald-600">{courier.success_parcel}</span>
                                  </div>
                                  <div>
                                    <span className="text-red-400 block text-[10px] uppercase font-bold mb-0.5">Cancel</span>
                                    <span className="font-bold text-red-600">{courier.cancelled_parcel}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fraud Reports Beautiful Section */}
                      {fraudReports.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                              <MessageSquareWarning className="w-5 h-5 text-red-500" /> 
                              Fraud Reports History
                            </h4>
                            <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1.5 rounded-full border border-red-200 shadow-sm flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                              {fraudReports.length} Record{fraudReports.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          <div className="space-y-4">
                            {Object.entries(groupedReports).map(([courier, reports]: [string, any], idx) => (
                              <div key={idx} className="bg-white rounded-xl border border-red-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className="bg-red-50/70 px-4 py-3 border-b border-red-100 flex justify-between items-center">
                                  <h5 className="font-bold text-red-800 flex items-center gap-2 text-sm">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    {courier}
                                  </h5>
                                  <span className="text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">
                                    {reports.length} Report{reports.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                  {reports.map((report: any, rIdx: number) => {
                                    // Parse date cleanly
                                    let dateStr = 'Unknown Date';
                                    try {
                                      const d = new Date(report.created_at);
                                      if (!isNaN(d.getTime())) {
                                        dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                      }
                                    } catch(e) {}
                                    
                                    return (
                                      <div key={rIdx} className="p-4 hover:bg-gray-50/80 transition-colors">
                                        <div className="flex items-start justify-between mb-2">
                                          <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                                            {dateStr}
                                          </span>
                                        </div>
                                        <div className="text-sm text-gray-700 font-medium leading-relaxed pl-3 border-l-2 border-red-200">
                                          "{report.details}"
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

          </div>
  );
}