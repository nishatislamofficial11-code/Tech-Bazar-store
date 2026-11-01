import { getCleanPhoneNumber } from '../../lib/fraudCheck';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminPageSkeleton } from '../../components/ui/AdminPageSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, MapPin, ShoppingBag, DollarSign, Calendar, ChevronDown, ChevronUp, Package, Truck, Store, XCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { BlockUserDialog } from '../../components/ui/BlockUserDialog';
import { Pagination } from '../../components/ui/Pagination';

interface Order {
  id: string;
  total_amount: number;
  status: string;
  shipping_address: string;
  created_at: string;
}

interface Customer {
  phone: string;
  names: Set<string>;
  addresses: Set<string>;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  orders: Order[];
  statusBreakdown: Record<string, number>;
}

export default function AdminCustomers() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);
  const [blockUserDialog, setBlockUserDialog] = useState<{ isOpen: boolean; phone?: string; ip?: string } | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const customerMap = new Map<string, Customer>();

      (data || []).forEach((order: Order) => {
        const addressLines = (order.shipping_address || '').split('\n');
        const phoneLine = addressLines.find(l => l.startsWith('Phone:'))?.replace('Phone:', '').trim() || '';
        const nameLine = addressLines.find(l => l.startsWith('Name:'))?.replace('Name:', '').trim() || 'Unknown';
        
        const matchAddress = (order.shipping_address || '').match(/Address:([\s\S]*?)(?=\nDelivery Area:|\nDelivery:|\nShipping Charge:|\nOrder Note:|\n\[TID:|$)/);
        const addressLine = matchAddress ? matchAddress[1].trim() : 'N/A';

        const cleanPhone = getCleanPhoneNumber(phoneLine) || 'Unknown Phone';

        if (!customerMap.has(cleanPhone)) {
          customerMap.set(cleanPhone, {
            phone: cleanPhone,
            names: new Set<string>(),
            addresses: new Set<string>(),
            totalOrders: 0,
            totalSpent: 0,
            lastOrderDate: order.created_at,
            orders: [],
            statusBreakdown: {}
          });
        }

        const customer = customerMap.get(cleanPhone)!;
        if (nameLine && nameLine !== 'Unknown') customer.names.add(nameLine);
        if (addressLine && addressLine !== 'N/A') customer.addresses.add(addressLine);
        
        customer.totalOrders += 1;
        customer.totalSpent += Number(order.total_amount || 0);
        customer.orders.push(order);
        
        const status = order.status || 'pending';
        customer.statusBreakdown[status] = (customer.statusBreakdown[status] || 0) + 1;
        
        // Update last order date if this order is newer
        if (new Date(order.created_at) > new Date(customer.lastOrderDate)) {
          customer.lastOrderDate = order.created_at;
        }
      });

      // Convert Map to Array and sort by last order date
      const sortedCustomers = Array.from(customerMap.values()).sort((a, b) => 
        new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
      );

      setCustomers(sortedCustomers);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const matchPhone = c.phone.toLowerCase().includes(term);
    const matchName = Array.from(c.names).some(n => String(n).toLowerCase().includes(term));
    const matchAddress = Array.from(c.addresses).some(a => String(a).toLowerCase().includes(term));
    return matchPhone || matchName || matchAddress;
  });

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (loading) return <AdminPageSkeleton variant="table" />;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'call_verified': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'hold': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Customers</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage and view all customer order histories.</p>
        </div>
        
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <th className="px-5 py-4">Customer Info</th>
                <th className="px-5 py-4">Contact</th>
                <th className="px-5 py-4 text-center">Total Orders</th>
                <th className="px-5 py-4 text-right">Total Spent</th>
                <th className="px-5 py-4">Last Order</th>
                <th className="px-5 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCustomers.map((customer) => {
                const names = Array.from(customer.names);
                const displayName = names.length > 0 ? names[0] : 'Unknown';
                const hasMultipleNames = names.length > 1;
                
                const addresses = Array.from(customer.addresses);
                const displayAddress = addresses.length > 0 ? addresses[0] : 'Unknown';

                const isExpanded = expandedPhone === customer.phone;

                return (
                  <React.Fragment key={customer.phone}>
                    <tr 
                      className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50/80' : ''}`}
                      onClick={() => setExpandedPhone(isExpanded ? null : customer.phone)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                            {String(displayName).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              {displayName}
                              {hasMultipleNames && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded" title={names.join(', ')}>+{names.length - 1} more</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px] sm:max-w-[300px]" title={displayAddress}>
                              {displayAddress}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold text-slate-700">{customer.phone}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                          {customer.totalOrders}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="font-bold text-slate-900">৳ {customer.totalSpent.toLocaleString()}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-slate-600">
                          {new Date(customer.lastOrderDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setBlockUserDialog({ isOpen: true, phone: customer.phone }); }}
                            className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                            title="Block User"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-slate-50/50"
                        >
                          <td colSpan={6} className="px-5 py-6">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 max-w-4xl mx-auto">
                              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-primary" />
                                Order History ({customer.totalOrders})
                              </h4>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                                {Object.entries(customer.statusBreakdown).map(([status, count]) => (
                                  <div key={status} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                                    <span className="font-black text-lg text-slate-800">{count}</span>
                                    <span className={`text-[10px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded border ${getStatusColor(status)}`}>
                                      {status.replace('_', ' ')}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {customer.orders.map((order) => (
                                  <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-primary/20 hover:shadow-md transition-all bg-white gap-4">
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <Package className="w-5 h-5" />
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-900 text-sm">
                                          Order #{order.id.slice(0,8).toUpperCase()}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1.5">
                                          <Calendar className="w-3 h-3" />
                                          {new Date(order.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                                      <div className="text-left sm:text-right">
                                        <div className="font-bold text-slate-900">৳ {order.total_amount?.toLocaleString() || 0}</div>
                                      </div>
                                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${getStatusColor(order.status || 'pending')}`}>
                                        {(order.status || 'pending').replace('_', ' ')}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}

              {paginatedCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-medium text-slate-600">No customers found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
      {blockUserDialog && (
        <BlockUserDialog
          isOpen={blockUserDialog.isOpen}
          onClose={() => setBlockUserDialog(null)}
          phone={blockUserDialog.phone}
          initialIp={blockUserDialog.ip}
        />
      )}
    </div>
  );
}
