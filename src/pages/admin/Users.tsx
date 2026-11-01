import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminPageSkeleton } from '../../components/ui/AdminPageSkeleton';
import { motion } from 'framer-motion';
import { Search, Shield, ShieldAlert, Trash2, User, UserX, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Pagination } from '../../components/ui/Pagination';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.dropdown-trigger') && !(e.target as Element).closest('.dropdown-menu')) {
        setOpenDropdownId(null);
        setDropdownPosition(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const closeDropdown = () => {
      setOpenDropdownId(null);
      setDropdownPosition(null);
    };

    window.addEventListener('resize', closeDropdown);
    window.addEventListener('scroll', closeDropdown, true);

    return () => {
      window.removeEventListener('resize', closeDropdown);
      window.removeEventListener('scroll', closeDropdown, true);
    };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`User role updated to ${newRole}`);
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setConfirmModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    try {
      // Note: This will delete the profile, but usually Supabase auth.users needs to be deleted via Admin API.
      // We will try deleting the profile record.
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== userToDelete));
      toast.success('User profile deleted');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setConfirmModalOpen(false);
      setUserToDelete(null);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ITEMS_PER_PAGE = 25;
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (loading) return <AdminPageSkeleton variant="table" />;

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12 max-w-7xl mx-auto"
    >
      <motion.div variants={item} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage users, roles, and permissions.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </motion.div>

      <motion.div variants={item} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Role / Status</th>
                <th className="px-6 py-4 font-semibold">Joined At</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-gray-900 truncate">
                          {user.full_name || 'No Name'}
                        </span>
                        <span className="text-xs text-gray-500 truncate">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       {user.role === 'admin' && <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase"><Shield className="w-3 h-3 mr-1"/> Admin</span>}
                       {user.role === 'manager' && <span className="inline-flex items-center px-2 py-1 bg-primary/20 text-primary-hover rounded-full text-xs font-bold uppercase"><Shield className="w-3 h-3 mr-1"/> Manager</span>}
                       {user.role === 'user' && <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">User</span>}
                       {user.role === 'blocked' && <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase"><ShieldAlert className="w-3 h-3 mr-1"/> Blocked</span>}
                       {(!user.role || !['admin', 'manager', 'user', 'blocked'].includes(user.role)) && <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold uppercase">{user.role || 'User'}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-medium">
                    {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative">
                      <button
                        className="dropdown-trigger p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={(e) => {
                          if (openDropdownId === user.id) {
                            setOpenDropdownId(null);
                            setDropdownPosition(null);
                            return;
                          }

                          const rect = e.currentTarget.getBoundingClientRect();
                          setDropdownPosition({
                            top: rect.bottom + 8,
                            right: window.innerWidth - rect.right,
                          });
                          setOpenDropdownId(user.id);
                        }}
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {openDropdownId === user.id && dropdownPosition && (
                        <div
                          className="dropdown-menu fixed w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50"
                          style={{ top: dropdownPosition.top, right: dropdownPosition.right }}
                        >
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => { updateUserRole(user.id, 'admin'); setOpenDropdownId(null); setDropdownPosition(null); }}
                              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Shield className="w-4 h-4 mr-3 text-purple-600" />
                              Make Admin
                            </button>
                          )}
                          {user.role !== 'manager' && (
                            <button
                              onClick={() => { updateUserRole(user.id, 'manager'); setOpenDropdownId(null); setDropdownPosition(null); }}
                              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Shield className="w-4 h-4 mr-3 text-primary" />
                              Make Manager
                            </button>
                          )}
                          {(user.role === 'admin' || user.role === 'manager') && (
                            <button
                              onClick={() => { updateUserRole(user.id, 'user'); setOpenDropdownId(null); setDropdownPosition(null); }}
                              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                            >
                              <User className="w-4 h-4 mr-3 text-gray-500 shrink-0" />
                              Make Regular User
                            </button>
                          )}
                          
                          {user.role !== 'blocked' ? (
                            <button
                              onClick={() => { updateUserRole(user.id, 'blocked'); setOpenDropdownId(null); setDropdownPosition(null); }}
                              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <UserX className="w-4 h-4 mr-3 text-orange-600" />
                              Block User
                            </button>
                          ) : (
                            <button
                              onClick={() => { updateUserRole(user.id, 'user'); setOpenDropdownId(null); setDropdownPosition(null); }}
                              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <User className="w-4 h-4 mr-3 text-green-600" />
                              Unblock User
                            </button>
                          )}

                          <div className="h-px bg-gray-100 my-1"></div>

                          <button
                            onClick={() => { handleDeleteClick(user.id); setOpenDropdownId(null); setDropdownPosition(null); }}
                            className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
                            Delete User
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </motion.div>
      
      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />
    </motion.div>
  );
}
