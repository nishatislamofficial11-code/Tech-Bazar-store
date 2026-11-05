import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../contexts/SettingsContext';
import toast from 'react-hot-toast';
import { 
  Truck, Save, RefreshCcw, CheckCircle, AlertCircle, Building2, Store, 
  MapPin, DollarSign, Calculator, Send, Eye, ShieldCheck, Layers, Plus, Search, Copy, Settings as SettingsIcon
} from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { 
  createSteadfastOrder, getSteadfastStatus, getSteadfastBalance, 
  createSteadfastReturn, SteadfastConfig 
} from '../../lib/steadfastApi';
import { 
  getPathaoAccessToken, getPathaoStores, createPathaoStore, getPathaoCities, 
  getPathaoZones, getPathaoAreas, calculatePathaoPrice, createPathaoOrder, PathaoConfig 
} from '../../lib/pathaoApi';
import { autoResolveBDLocation } from '../../lib/bdLocationMatcher';
import { remainingBalance } from '../../lib/paymentRules';

export default function AdminCouriers() {
  const { settings, refreshSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'settings' | 'steadfast' | 'pathao' | 'bulk'>('settings');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // General Settings
  const [defaultCourier, setDefaultCourier] = useState('steadfast');

  // Steadfast Settings
  const [steadfastEnabled, setSteadfastEnabled] = useState(false);
  const [steadfastApiKey, setSteadfastApiKey] = useState('');
  const [steadfastSecretKey, setSteadfastSecretKey] = useState('');
  const [steadfastBaseUrl, setSteadfastBaseUrl] = useState('https://portal.packzy.com/api/v1');
  const [steadfastBalance, setSteadfastBalance] = useState<number | null>(null);
  const [testingSteadfast, setTestingSteadfast] = useState(false);

  // Pathao Settings
  const [pathaoEnabled, setPathaoEnabled] = useState(false);
  const [pathaoEnv, setPathaoEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [pathaoClientId, setPathaoClientId] = useState('');
  const [pathaoClientSecret, setPathaoClientSecret] = useState('');
  const [pathaoUsername, setPathaoUsername] = useState('');
  const [pathaoPassword, setPathaoPassword] = useState('');
  const [pathaoStoreId, setPathaoStoreId] = useState('');
  const [pathaoStores, setPathaoStores] = useState<any[]>([]);
  const [testingPathao, setTestingPathao] = useState(false);

  // Return Request Modal (Steadfast)
  const [returnConsignmentId, setReturnConsignmentId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Pathao Price Calculator State
  const [calcCityId, setCalcCityId] = useState<number | ''>('');
  const [calcZoneId, setCalcZoneId] = useState<number | ''>('');
  const [calcWeight, setCalcWeight] = useState<number>(0.5);
  const [calcCities, setCalcCities] = useState<any[]>([]);
  const [calcZones, setCalcZones] = useState<any[]>([]);
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);

  // Orders for Bulk Dispatch
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [dispatchingCourier, setDispatchingCourier] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setDefaultCourier(settings.default_courier || 'steadfast');

      // Steadfast
      setSteadfastEnabled(settings.steadfast_enabled === 'true');
      setSteadfastApiKey(settings.steadfast_api_key || '');
      setSteadfastSecretKey(settings.steadfast_secret_key || '');
      setSteadfastBaseUrl(settings.steadfast_base_url || 'https://portal.packzy.com/api/v1');

      // Pathao
      setPathaoEnabled(settings.pathao_enabled === 'true');
      setPathaoEnv((settings.pathao_environment as any) || 'sandbox');
      setPathaoClientId(settings.pathao_client_id || '7N1aMJQbWm');
      setPathaoClientSecret(settings.pathao_client_secret || 'wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39');
      setPathaoUsername(settings.pathao_username || 'test@pathao.com');
      setPathaoPassword(settings.pathao_password || 'lovePathao');
      setPathaoStoreId(settings.pathao_store_id || '');
    }
  }, [settings]);

  // Fetch pending orders for Bulk Dispatch
  const fetchPendingOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (data) {
      setPendingOrders(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'bulk') {
      fetchPendingOrders();
    }
  }, [activeTab]);

  // Save Settings to Supabase
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      const updates = [
        { key: 'default_courier', value: defaultCourier },
        { key: 'steadfast_enabled', value: steadfastEnabled ? 'true' : 'false' },
        { key: 'steadfast_api_key', value: steadfastApiKey.trim() },
        { key: 'steadfast_secret_key', value: steadfastSecretKey.trim() },
        { key: 'steadfast_base_url', value: steadfastBaseUrl.trim() },
        { key: 'pathao_enabled', value: pathaoEnabled ? 'true' : 'false' },
        { key: 'pathao_environment', value: pathaoEnv },
        { key: 'pathao_client_id', value: pathaoClientId.trim() },
        { key: 'pathao_client_secret', value: pathaoClientSecret.trim() },
        { key: 'pathao_username', value: pathaoUsername.trim() },
        { key: 'pathao_password', value: pathaoPassword.trim() },
        { key: 'pathao_store_id', value: pathaoStoreId }
      ];

      for (const item of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert({ key: item.key, value: item.value }, { onConflict: 'key' });
        if (error) throw error;
      }

      await refreshSettings();
      toast.success('Courier settings saved successfully!');
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save courier settings');
    } finally {
      setSaving(false);
    }
  };

  // Test Steadfast Connection & Balance
  const handleTestSteadfast = async () => {
    if (!steadfastApiKey.trim() || !steadfastSecretKey.trim()) {
      toast.error('Please enter Steadfast API Key and Secret Key');
      return;
    }

    setTestingSteadfast(true);
    try {
      const config: SteadfastConfig = {
        apiKey: steadfastApiKey.trim(),
        secretKey: steadfastSecretKey.trim(),
        baseUrl: steadfastBaseUrl.trim(),
      };

      const result = await getSteadfastBalance(config);
      if (result && (result.status === 200 || result.current_balance !== undefined)) {
        setSteadfastBalance(Number(result.current_balance || 0));
        toast.success(`Steadfast API connected! Current Balance: ৳${result.current_balance}`);
      } else {
        toast.error(result.message || 'Failed to fetch Steadfast balance');
      }
    } catch (err: any) {
      toast.error('Steadfast Connection Error: ' + err.message);
    } finally {
      setTestingSteadfast(false);
    }
  };

  // Test Pathao Connection & Stores
  const handleTestPathao = async () => {
    if (!pathaoClientId.trim() || !pathaoClientSecret.trim() || !pathaoUsername.trim() || !pathaoPassword.trim()) {
      toast.error('Please fill in all Pathao credentials');
      return;
    }

    setTestingPathao(true);
    try {
      const config: PathaoConfig = {
        clientId: pathaoClientId.trim(),
        clientSecret: pathaoClientSecret.trim(),
        username: pathaoUsername.trim(),
        password: pathaoPassword.trim(),
        environment: pathaoEnv,
      };

      const tokenData = await getPathaoAccessToken(config);
      if (tokenData.access_token) {
        const stores = await getPathaoStores(config, tokenData.access_token);
        setPathaoStores(stores || []);
        if (stores && stores.length > 0 && !pathaoStoreId) {
          setPathaoStoreId(String(stores[0].store_id || stores[0].id));
        }
        toast.success(`Pathao Connected! Found ${stores.length || 0} stores.`);
      }
    } catch (err: any) {
      toast.error('Pathao Connection Error: ' + err.message);
    } finally {
      setTestingPathao(false);
    }
  };

  // Fetch Cities for Pathao Price Calculator
  const handleLoadPathaoCities = async () => {
    try {
      const config: PathaoConfig = {
        clientId: pathaoClientId.trim(),
        clientSecret: pathaoClientSecret.trim(),
        username: pathaoUsername.trim(),
        password: pathaoPassword.trim(),
        environment: pathaoEnv,
      };

      const tokenData = await getPathaoAccessToken(config);
      const cities = await getPathaoCities(config, tokenData.access_token);
      setCalcCities(cities || []);
    } catch (err: any) {
      toast.error('Error loading Pathao cities: ' + err.message);
    }
  };

  const handleCityChange = async (cityId: number) => {
    setCalcCityId(cityId);
    setCalcZoneId('');
    setCalcZones([]);
    if (!cityId) return;

    try {
      const config: PathaoConfig = {
        clientId: pathaoClientId.trim(),
        clientSecret: pathaoClientSecret.trim(),
        username: pathaoUsername.trim(),
        password: pathaoPassword.trim(),
        environment: pathaoEnv,
      };
      const tokenData = await getPathaoAccessToken(config);
      const zones = await getPathaoZones(cityId, config, tokenData.access_token);
      setCalcZones(zones || []);
    } catch (err: any) {
      toast.error('Error loading zones: ' + err.message);
    }
  };

  const handleCalculatePathaoFee = async () => {
    if (!calcCityId || !calcZoneId) {
      toast.error('Please select City and Zone');
      return;
    }

    setCalculatingPrice(true);
    try {
      const config: PathaoConfig = {
        clientId: pathaoClientId.trim(),
        clientSecret: pathaoClientSecret.trim(),
        username: pathaoUsername.trim(),
        password: pathaoPassword.trim(),
        environment: pathaoEnv,
      };

      const tokenData = await getPathaoAccessToken(config);
      const result = await calculatePathaoPrice(
        {
          store_id: Number(pathaoStoreId || 1),
          item_type: 2,
          delivery_type: 48,
          item_weight: calcWeight,
          recipient_city: Number(calcCityId),
          recipient_zone: Number(calcZoneId),
        },
        config,
        tokenData.access_token
      );
      setCalcResult(result);
      toast.success(`Calculated Delivery Fee: ৳${result.final_price || result.price}`);
    } catch (err: any) {
      toast.error('Calculation error: ' + err.message);
    } finally {
      setCalculatingPrice(false);
    }
  };

  // Dispatch selected orders to Steadfast
  const handleDispatchSteadfast = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error('Please select at least one order to dispatch');
      return;
    }

    if (!steadfastApiKey.trim() || !steadfastSecretKey.trim()) {
      toast.error('Steadfast API Key and Secret Key are not configured.');
      return;
    }

    setDispatchingCourier('steadfast');
    const config: SteadfastConfig = {
      apiKey: steadfastApiKey.trim(),
      secretKey: steadfastSecretKey.trim(),
      baseUrl: steadfastBaseUrl.trim(),
    };

    let successCount = 0;
    for (const orderId of selectedOrderIds) {
      const order = pendingOrders.find(o => o.id === orderId);
      if (!order) continue;

      // Extract recipient details
      const addressLines = (order.shipping_address || '').split('\n');
      const nameLine = addressLines.find((l: string) => l.startsWith('Name:'))?.replace('Name:', '').trim() || 'Customer';
      const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '01700000000';
      const cleanPhone = phoneLine.replace(/\D/g, '').slice(-11);
      const baseAddress = addressLines.find((l: string) => l.startsWith('Address:'))?.replace('Address:', '').trim() || 'Dhaka';
      const deliveryArea = addressLines.find((l: string) => l.startsWith('Delivery Area:'))?.replace('Delivery Area:', '').trim();
      const addressLine = baseAddress;

      const shortId = order.id.slice(0, 8).toUpperCase();
      const invoice = `ORD-${shortId}`;

      try {
        // Auto-resolve Thana & District
        const resolved = await autoResolveBDLocation(addressLine);

        const response = await createSteadfastOrder(
          {
            invoice,
            recipient_name: nameLine,
            recipient_phone: cleanPhone.length === 11 ? cleanPhone : '01700000000',
            recipient_address: addressLine,
            cod_amount: remainingBalance(order),
            note: '',
          },
          config
        );

        if (response && response.consignment) {
          const consignment = response.consignment;
          await supabase
            .from('orders')
            .update({
              courier_name: 'steadfast',
              courier_consignment_id: String(consignment.consignment_id),
              courier_tracking_code: consignment.tracking_code,
              courier_status: consignment.status || 'in_review',
              courier_response: response,
              courier_sent_at: new Date().toISOString(),
              status: 'processing',
            })
            .eq('id', order.id);

          successCount++;
        }
      } catch (err: any) {
        console.error(`Error sending order ${order.id} to Steadfast:`, err);
        toast.error(`Order ${invoice} failed: ${err.message}`);
      }
    }

    setDispatchingCourier(null);
    setSelectedOrderIds([]);
    toast.success(`Successfully dispatched ${successCount} orders to Steadfast Courier!`);
    fetchPendingOrders();
  };

  // Dispatch selected orders to Pathao
  const handleDispatchPathao = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error('Please select at least one order to dispatch');
      return;
    }

    if (!pathaoClientId.trim() || !pathaoClientSecret.trim()) {
      toast.error('Pathao Credentials are not configured.');
      return;
    }

    setDispatchingCourier('pathao');
    const config: PathaoConfig = {
      clientId: pathaoClientId.trim(),
      clientSecret: pathaoClientSecret.trim(),
      username: pathaoUsername.trim(),
      password: pathaoPassword.trim(),
      environment: pathaoEnv,
    };

    try {
      const tokenData = await getPathaoAccessToken(config);
      let successCount = 0;

      for (const orderId of selectedOrderIds) {
        const order = pendingOrders.find(o => o.id === orderId);
        if (!order) continue;

        const addressLines = (order.shipping_address || '').split('\n');
        const nameLine = addressLines.find((l: string) => l.startsWith('Name:'))?.replace('Name:', '').trim() || 'Customer';
        const phoneLine = addressLines.find((l: string) => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '01700000000';
        const cleanPhone = phoneLine.replace(/\D/g, '').slice(-11);
        const baseAddress = addressLines.find((l: string) => l.startsWith('Address:'))?.replace('Address:', '').trim() || 'Dhaka, Bangladesh';
        const deliveryArea = addressLines.find((l: string) => l.startsWith('Delivery Area:'))?.replace('Delivery Area:', '').trim();
        const addressLine = baseAddress;

        const shortId = order.id.slice(0, 8).toUpperCase();
        const invoice = `ORD-${shortId}`;

        try {
          // Auto-resolve City, Zone, and Area from Customer Address!
          const resolved = await autoResolveBDLocation(addressLine, config, tokenData.access_token);

          const pathaoPayload: any = {
            store_id: Number(pathaoStoreId || 1),
            merchant_order_id: invoice,
            recipient_name: nameLine,
            recipient_phone: cleanPhone.length === 11 ? cleanPhone : '01700000000',
            recipient_address: addressLine.length >= 10 ? addressLine : `${addressLine}, Dhaka Bangladesh`,
            delivery_type: 48,
            item_type: 2,
            item_quantity: 1,
            item_weight: 0.5,
            amount_to_collect: remainingBalance(order),
          };

          if (resolved.cityId) pathaoPayload.recipient_city = resolved.cityId;
          if (resolved.zoneId) pathaoPayload.recipient_zone = resolved.zoneId;
          if (resolved.areaId) pathaoPayload.recipient_area = resolved.areaId;

          const response = await createPathaoOrder(
            pathaoPayload,
            config,
            tokenData.access_token
          );

          if (response && response.data) {
            const consignmentData = response.data;
            await supabase
              .from('orders')
              .update({
                courier_name: 'pathao',
                courier_consignment_id: String(consignmentData.consignment_id),
                courier_tracking_code: consignmentData.consignment_id,
                courier_status: consignmentData.order_status || 'Pending',
                courier_response: response,
                courier_sent_at: new Date().toISOString(),
                status: 'processing',
              })
              .eq('id', order.id);

            successCount++;
          }
        } catch (err: any) {
          console.error(`Pathao order ${order.id} error:`, err);
          toast.error(`Order ${invoice} failed: ${err.message}`);
        }
      }

      toast.success(`Successfully dispatched ${successCount} orders to Pathao Courier!`);
      fetchPendingOrders();
    } catch (err: any) {
      toast.error('Pathao Dispatch Error: ' + err.message);
    } finally {
      setDispatchingCourier(null);
      setSelectedOrderIds([]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Courier API Integration</h1>
            <p className="text-sm text-gray-500">Automate order shipping, live tracking, and dispatch with Steadfast & Pathao Courier.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSaveSettings()}
            disabled={saving}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 bg-white rounded-xl p-1 shadow-sm gap-1 overflow-x-auto">
        {[
          { id: 'settings', label: 'API Settings & Setup', icon: SettingsIcon },
          { id: 'steadfast', label: 'Steadfast Courier', icon: Truck },
          { id: 'pathao', label: 'Pathao Courier', icon: Store },
          { id: 'bulk', label: 'Bulk Order Dispatch', icon: Send },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: API SETTINGS & SETUP */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Default Courier Selection */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Layers className="w-5 h-5 text-indigo-600" />
              Default Courier Strategy
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'steadfast', title: 'Steadfast Courier', desc: 'Fast nationwide COD & parcel delivery' },
                { id: 'pathao', title: 'Pathao Courier', desc: 'On-demand & Express delivery nationwide' },
                { id: 'manual', title: 'Manual Dispatch', desc: 'Manually select courier per order' },
              ].map(strategy => (
                <label
                  key={strategy.id}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    defaultCourier === strategy.id
                      ? 'border-primary bg-primary/10/40'
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="defaultCourier"
                      checked={defaultCourier === strategy.id}
                      onChange={() => setDefaultCourier(strategy.id)}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="font-bold text-sm text-gray-900">{strategy.title}</span>
                  </div>
                  <p className="text-xs text-gray-500 pl-5">{strategy.desc}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Steadfast API Config */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-gray-900">Steadfast Courier Credentials</h2>
              </div>
              <button
                type="button"
                onClick={handleTestSteadfast}
                disabled={testingSteadfast}
                className="text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3.5 py-1.5 rounded-lg transition-all"
              >
                {testingSteadfast ? 'Testing...' : 'Test Connection & Balance'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Steadfast Api-Key</label>
                <input
                  type="text"
                  value={steadfastApiKey}
                  onChange={e => setSteadfastApiKey(e.target.value)}
                  placeholder="Enter Api-Key"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Steadfast Secret-Key</label>
                <input
                  type="password"
                  value={steadfastSecretKey}
                  onChange={e => setSteadfastSecretKey(e.target.value)}
                  placeholder="Enter Secret-Key"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Base URL</label>
              <input
                type="text"
                value={steadfastBaseUrl}
                onChange={e => setSteadfastBaseUrl(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <span className="font-bold shrink-0 text-amber-700">⚠️ নোট:</span>
              <span>
                স্টিডফাস্ট এপিআই ব্যবহার করার জন্য আপনার <b>Steadfast Merchant Account</b> টি স্টিডফাস্ট কর্তৃপক্ষ কর্তৃক Approved/Active থাকতে হবে। একাউন্ট এখনও একটিভ না করা থাকলে অর্ডার পাঠানোর সময় স্টিডফাস্ট <i>"Account is not active!"</i> উত্তর দেয়। স্টিডফাস্ট প্যানেলে (`portal.packzy.com`) লগইন করে একাউন্ট অ্যাক্টিভেশন নিশ্চিত করুন।
              </span>
            </div>
          </div>

          {/* Pathao API Config */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-gray-900">Pathao Courier Credentials (OAuth 2.0)</h2>
              </div>
              <button
                type="button"
                onClick={handleTestPathao}
                disabled={testingPathao}
                className="text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 px-3.5 py-1.5 rounded-lg transition-all"
              >
                {testingPathao ? 'Testing...' : 'Test OAuth & Fetch Stores'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Environment</label>
                <select
                  value={pathaoEnv}
                  onChange={e => setPathaoEnv(e.target.value as any)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="sandbox">Sandbox / Test (courier-api-sandbox.pathao.com)</option>
                  <option value="production">Production / Live (api-hermes.pathao.com)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Client ID</label>
                <input
                  type="text"
                  value={pathaoClientId}
                  onChange={e => setPathaoClientId(e.target.value)}
                  placeholder="e.g. 7N1aMJQbWm"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Client Secret</label>
                <input
                  type="password"
                  value={pathaoClientSecret}
                  onChange={e => setPathaoClientSecret(e.target.value)}
                  placeholder="e.g. wRcaibZkUdSN..."
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Username / Email</label>
                <input
                  type="text"
                  value={pathaoUsername}
                  onChange={e => setPathaoUsername(e.target.value)}
                  placeholder="e.g. merchant@pathao.com"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={pathaoPassword}
                  onChange={e => setPathaoPassword(e.target.value)}
                  placeholder="Pathao password"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Default Pathao Store ID (পিকআপ স্টোর)</label>
                {pathaoStores.length > 0 ? (
                  <select
                    value={pathaoStoreId}
                    onChange={e => setPathaoStoreId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary bg-white"
                  >
                    <option value="">Select Merchant Store...</option>
                    {pathaoStores.map((s: any) => (
                      <option key={s.store_id || s.id} value={s.store_id || s.id}>
                        {s.store_name || s.name} (ID: {s.store_id || s.id}) - {s.store_address || s.address}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={pathaoStoreId}
                    onChange={e => setPathaoStoreId(e.target.value)}
                    placeholder="e.g. 453789 (অথবা উপরে 'Test OAuth & Fetch Stores' বাটনে ক্লিক করুন)"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                  />
                )}
                <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                  💡 <b>Store ID কি?</b> পাঠাও মার্চেন্ট প্যানেলের পিকআপ স্টোর আইডি। উপরে <b>'Test OAuth & Fetch Stores'</b> বাটনে ক্লিক করলে আপনার একাউন্টের সব স্টোর অটোমেটিক ড্রপডাউনে লোড হবে।
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STEADFAST DETAILS */}
      {activeTab === 'steadfast' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center justify-between">
              <span>Steadfast Account Overview</span>
              <button
                onClick={handleTestSteadfast}
                disabled={testingSteadfast}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <RefreshCcw className="w-3.5 h-3.5" /> Refresh Balance
              </button>
            </h2>

            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Current Account Balance</span>
                <div className="text-3xl font-black text-emerald-700 mt-1">
                  ৳{steadfastBalance !== null ? steadfastBalance.toLocaleString('en-IN') : '---'}
                </div>
              </div>
              <DollarSign className="w-12 h-12 text-emerald-400 opacity-60" />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PATHAO TOOLS & FEE CALCULATOR */}
      {activeTab === 'pathao' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-red-600" />
                Pathao Delivery Charge Calculator
              </h2>
              <button
                type="button"
                onClick={handleLoadPathaoCities}
                className="text-xs font-bold bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-gray-700"
              >
                Load Cities
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
                <select
                  value={calcCityId}
                  onChange={e => handleCityChange(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                >
                  <option value="">Select City...</option>
                  {calcCities.map(city => (
                    <option key={city.city_id} value={city.city_id}>{city.city_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Zone</label>
                <select
                  value={calcZoneId}
                  onChange={e => setCalcZoneId(Number(e.target.value))}
                  disabled={!calcCityId}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none disabled:bg-gray-50"
                >
                  <option value="">Select Zone...</option>
                  {calcZones.map(zone => (
                    <option key={zone.zone_id} value={zone.zone_id}>{zone.zone_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Weight (KG)</label>
                <input
                  type="number"
                  step="0.1"
                  value={calcWeight}
                  onChange={e => setCalcWeight(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleCalculatePathaoFee}
              disabled={calculatingPrice || !calcCityId || !calcZoneId}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all disabled:opacity-50"
            >
              {calculatingPrice ? 'Calculating...' : 'Calculate Delivery Charge'}
            </button>

            {calcResult && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center justify-between mt-4">
                <div>
                  <span className="text-xs text-red-600 font-bold">Estimated Delivery Charge:</span>
                  <div className="text-2xl font-extrabold text-red-700">৳{calcResult.final_price || calcResult.price}</div>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  <div>Base Price: ৳{calcResult.price}</div>
                  <div>COD Fee: {(calcResult.cod_percentage * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: BULK ORDER DISPATCH */}
      {activeTab === 'bulk' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Bulk Courier Dispatcher</h2>
              <p className="text-xs text-gray-500">Select pending orders and dispatch them to Steadfast or Pathao in 1-click.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDispatchSteadfast}
                disabled={selectedOrderIds.length === 0 || dispatchingCourier !== null}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                {dispatchingCourier === 'steadfast' ? 'Sending...' : `Send ${selectedOrderIds.length} to Steadfast`}
              </button>

              <button
                onClick={handleDispatchPathao}
                disabled={selectedOrderIds.length === 0 || dispatchingCourier !== null}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Store className="w-4 h-4" />
                {dispatchingCourier === 'pathao' ? 'Sending...' : `Send ${selectedOrderIds.length} to Pathao`}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-gray-500">Loading orders...</div>
          ) : pendingOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">No orders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-gray-600 font-bold uppercase tracking-wider">
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.length === pendingOrders.length && pendingOrders.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds(pendingOrders.map(o => o.id));
                          } else {
                            setSelectedOrderIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Courier Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingOrders.map((order) => {
                    const shortId = `ORD-${order.id.slice(0, 8).toUpperCase()}`;
                    const addressLines = (order.shipping_address || '').split('\n');
                    const nameLine = addressLines.find((l: string) => l.startsWith('Name:'))?.replace('Name:', '').trim() || 'Customer';

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds([...selectedOrderIds, order.id]);
                              } else {
                                setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                              }
                            }}
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-gray-900">{shortId}</td>
                        <td className="p-3 font-semibold text-gray-800">{nameLine}</td>
                        <td className="p-3 font-bold text-primary">৳{Number(order.total_amount).toLocaleString('en-IN')}</td>
                        <td className="p-3">
                          {order.courier_name ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary-hover border border-primary/20 uppercase w-max">
                                {order.courier_name}: {order.courier_status || 'Sent'}
                              </span>
                              {(order.courier_consignment_id || order.courier_tracking_code) && (
                                <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 w-max">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">CID:</span>
                                  <code className="text-[10px] font-mono font-bold text-slate-800">
                                    {order.courier_consignment_id || order.courier_tracking_code}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const cid = order.courier_consignment_id || order.courier_tracking_code || '';
                                      navigator.clipboard.writeText(cid);
                                      toast.success(`Courier ID Copied: ${cid}`);
                                    }}
                                    className="text-slate-400 hover:text-primary transition-colors cursor-pointer p-0.5"
                                    title="Copy Courier Order ID"
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
                              Not Dispatched
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
