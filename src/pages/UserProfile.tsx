import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StorefrontPageSkeleton } from '../components/ui/StorefrontPageSkeleton';
import { User, Mail, LogOut, ArrowLeft, Shield, Package, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

import { getPremiumOrderId, cleanShippingAddress } from '../lib/orderUtils';
import { SEO } from '../components/SEO';

export default function UserProfile() {
  const { user, profile, signOut, loading, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin');
    } else if (user) {
      refreshProfile();
      fetchOrders();
    }
  }, [user, loading, navigate]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          total_amount,
          status,
          shipping_address,
          order_items (
            product:products(image)
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const copyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('Premium Order ID copied!');
  };

  if (loading || !user) {
    return <StorefrontPageSkeleton variant="content" />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
       <SEO title="My Account" />
       <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
          <Link to="/" className="flex items-center gap-2 text-gray-700">
             <ArrowLeft size={20} />
             <span className="font-medium">Back to Shop</span>
          </Link>
          <span className="font-bold text-primary">My Account</span>
       </div>

       <div className="max-w-3xl mx-auto px-4 mt-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 mb-6">
             <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                 <User size={32} className="text-primary" />
             </div>
             <div>
                <h1 className="text-xl font-bold text-gray-900">User Profile</h1>
                <p className="text-sm text-gray-500 capitalize">{profile?.role || 'User'}</p>
             </div>
          </div>

          {(profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'demo') && (
            <button 
                onClick={() => navigate('/admin')}
                className="w-full bg-primary text-white rounded-xl p-4 flex items-center justify-center gap-2 font-medium hover:bg-primary-hover transition-colors mb-6 shadow-sm"
            >
                <Shield size={20} />
                Access Admin Dashboard
            </button>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
             <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                 <Mail className="text-gray-400" size={20} />
                 <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email Address</p>
                    <p className="font-medium text-gray-900">{user.email}</p>
                 </div>
             </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package size={20} className="text-primary" />
              My Orders
            </h2>
            {ordersLoading ? (
              <div className="bg-white rounded-xl p-6 text-center text-gray-500 border border-gray-100">
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium mb-1">No orders yet</p>
                <p className="text-sm text-gray-500 mb-4">When you place an order, it will appear here.</p>
                <Link to="/" className="inline-block bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-hover transition-colors">Start Shopping</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-100 rounded-xl p-5 hover:border-primary/30 transition-colors shadow-sm relative overflow-hidden group">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center mb-4 pb-4 border-b border-gray-50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500 font-medium">PREMIUM ID:</span>
                          <code className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                            {getPremiumOrderId(order)}
                          </code>
                          <button 
                            onClick={() => copyOrderId(getPremiumOrderId(order))}
                            className="p-1 hover:bg-primary/20 rounded text-gray-400 hover:text-primary transition-colors active:scale-95"
                            title="Copy Premium Order ID"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">{new Date(order.created_at).toLocaleDateString()} • {order.order_items?.length || 0} Items</p>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2">
                        <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                          order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' :
                          order.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {order.status}
                        </span>
                        <p className="font-bold text-gray-900 text-lg">৳{order.total_amount.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                      {order.order_items?.slice(0, 5).map((item: any, idx: number) => (
                        <div key={idx} className="w-12 h-12 rounded-lg bg-gray-50 flex-shrink-0 border border-gray-100 overflow-hidden">
                          <img src={item.product?.image || item.product?.images?.[0] || 'https://via.placeholder.com/150'} alt="thumbnail" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {(order.order_items?.length || 0) > 5 && (
                        <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-100 flex-shrink-0">
                          +{(order.order_items?.length || 0) - 5}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 hidden group-hover:block animate-in fade-in slide-in-from-top-2">
                      <Link 
                        to={`/track-order?id=${order.id}`}
                        className="w-full py-2.5 bg-gray-50 text-primary font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors text-sm"
                      >
                        <Package size={16} /> Track Order Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
             onClick={handleSignOut}
             className="w-full bg-white border border-red-200 text-red-600 rounded-xl p-4 flex items-center justify-center gap-2 font-medium hover:bg-red-50 transition-colors"
          >
             <LogOut size={20} />
             Sign Out
          </button>
       </div>
    </div>
  );
}
