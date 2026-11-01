import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Search, Trash2, Plus, Ban, Globe, Phone, RefreshCw, Laptop } from 'lucide-react';
import { getBlacklist, removeFromBlacklist, BlacklistedUser } from '../../lib/blacklist';
import { BlockUserDialog } from '../../components/ui/BlockUserDialog';
import toast from 'react-hot-toast';

export default function Blacklist() {
  const [blacklist, setBlacklist] = useState<BlacklistedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getBlacklist();
      setBlacklist(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRemove = async (id: string, phone: string) => {
    if (window.confirm(`Are you sure you want to unblock ${phone}?`)) {
      try {
        await removeFromBlacklist(id);
        toast.success(`Unblocked ${phone}`);
        setBlacklist(prev => prev.filter(i => i.id !== id));
      } catch (err: any) {
        toast.error('Failed to unblock: ' + err.message);
      }
    }
  };

  const filtered = blacklist.filter(item => 
    (item.phone && item.phone.includes(searchTerm)) || 
    (item.ip && item.ip.includes(searchTerm)) ||
    (item.reason && item.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-red-500" />
            Fraud Blacklist Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Blocked users cannot submit orders or visit checkout. Both Phone Number and IP Address can be restricted.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => loadData()}
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsBlockModalOpen(true)}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Block New User
          </button>
        </div>
      </div>

      {/* Filter and stats banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Blocked</span>
            <div className="text-xl font-black text-slate-900">{blacklist.length} Users</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone + IP Blocked</span>
            <div className="text-xl font-black text-slate-900">
              {blacklist.filter(b => b.phone && b.ip).length} Users
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Only Phone Blocked</span>
            <div className="text-xl font-black text-slate-900">
              {blacklist.filter(b => b.phone && !b.ip).length} Users
            </div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Search by phone number, IP address or reason..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm shadow-2xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Loading blacklist records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheck className="w-14 h-14 text-emerald-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Blocked Users Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm ? 'No entries match your search query.' : 'There are currently no users in the blacklist.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4">Status & Type</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Blocked Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((item) => {
                  const hasBoth = !!(item.phone && item.ip);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {item.phone || <span className="text-slate-400 italic font-sans text-xs">No Phone</span>}
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {item.ip ? (
                          <span className="bg-slate-100 px-2 py-1 rounded text-slate-800 border border-slate-200">
                            {item.ip}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No IP attached</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {item.phone && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Phone className="w-3 h-3 text-amber-600" />
                              Phone Blocked
                            </span>
                          )}
                          {item.deviceId && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200" title={item.deviceId}>
                              <Laptop className="w-3 h-3 text-purple-600" />
                              Device Locked
                            </span>
                          )}
                          {item.strictIp && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                              <Ban className="w-3 h-3 text-red-600" />
                              Strict IP
                            </span>
                          )}
                          {item.ip && !item.strictIp && !item.deviceId && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              <Globe className="w-3 h-3 text-slate-500" />
                              Logged IP
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                        {item.reason || <span className="text-slate-400 italic">No reason provided</span>}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(item.addedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemove(item.id, item.phone || item.ip || 'User')}
                          className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold text-xs inline-flex items-center gap-1.5 border border-transparent hover:border-red-200 cursor-pointer"
                          title="Unblock user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Unblock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Block Modal */}
      <BlockUserDialog
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
