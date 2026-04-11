'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type AdminRole = 'super_admin' | 'admin' | 'manager' | null;

interface AdminUser {
  id: string;
  display_name: string;
  phone_number: string | null;
  email: string | null;
  village_city: string | null;
  is_active: boolean;
  is_app_admin: boolean;
  admin_role: AdminRole;
  last_seen_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-red-100 text-red-800' },
  admin: { label: 'Admin', color: 'bg-amber-100 text-amber-800' },
  manager: { label: 'Manager', color: 'bg-green-100 text-green-800' },
};

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<AdminRole>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch current user's role
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('admin_role').eq('id', user.id).single();
        setMyRole(data?.admin_role ?? null);
      }
    })();
  }, [supabase]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('users')
        .select('id, display_name, phone_number, email, village_city, is_active, is_app_admin, admin_role, last_seen_at, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        // Escape PostgREST filter metacharacters to prevent query injection
        const escaped = search.trim().replace(/[%_,.()\\'"!@*]/g, '\\$&');
        query = query.or(`display_name.ilike.%${escaped}%,phone_number.ilike.%${escaped}%`);
      }

      const { data, count, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setUsers(data ?? []);
      setTotalCount(count ?? 0);
    } catch (err) {
      setError('उपयोगकर्ता लोड नहीं हो सके। पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  }, [page, search, supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function toggleActive(userId: string, currentValue: boolean) {
    try {
      setUpdating(userId);
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: !currentValue })
        .eq('id', userId);

      if (updateError) throw updateError;
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentValue } : u))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(null);
    }
  }

  async function changeRole(userId: string, newRole: AdminRole) {
    try {
      setUpdating(userId);
      const { error: updateError } = await supabase
        .from('users')
        .update({
          admin_role: newRole,
          is_app_admin: newRole !== null,
        })
        .eq('id', userId);

      if (updateError) throw updateError;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, admin_role: newRole, is_app_admin: newRole !== null } : u
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Role update failed');
    } finally {
      setUpdating(null);
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-brown">User Management</h1>
        <p className="text-brown-light text-sm mt-1">{totalCount} total users</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-full sm:w-80 px-4 py-2.5 rounded-lg border border-cream-dark bg-white text-brown placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-haldi-gold/40 text-sm"
        />
      </div>

      {error && (
        <div className="bg-error/10 text-error px-4 py-3 rounded-lg text-sm mb-4">
          {error}
          <button onClick={fetchUsers} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl border border-cream-dark">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-dark bg-cream">
              <th className="text-left px-4 py-3 font-medium text-brown">Name</th>
              <th className="text-left px-4 py-3 font-medium text-brown hidden sm:table-cell">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-brown hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 font-medium text-brown hidden lg:table-cell">Village</th>
              <th className="text-center px-4 py-3 font-medium text-brown">Active</th>
              <th className="text-center px-4 py-3 font-medium text-brown">Role</th>
              <th className="text-left px-4 py-3 font-medium text-brown hidden sm:table-cell">Last Seen</th>
              <th className="text-left px-4 py-3 font-medium text-brown hidden md:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-cream-dark">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 bg-cream-dark rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-brown-light">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-cream-dark hover:bg-cream/50 transition-colors">
                  <td className="px-4 py-3 text-brown font-medium">{user.display_name}</td>
                  <td className="px-4 py-3 text-brown-light hidden sm:table-cell">{user.phone_number ?? '-'}</td>
                  <td className="px-4 py-3 text-brown-light hidden md:table-cell text-xs">{user.email ?? '-'}</td>
                  <td className="px-4 py-3 text-brown-light hidden lg:table-cell">{user.village_city ?? '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      disabled={updating === user.id}
                      onClick={() => toggleActive(user.id, user.is_active)}
                      className={`inline-flex items-center justify-center w-10 h-6 rounded-full transition-colors ${
                        user.is_active ? 'bg-mehndi-green' : 'bg-cream-dark'
                      } ${updating === user.id ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          user.is_active ? 'translate-x-2' : '-translate-x-2'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.admin_role === 'super_admin' ? (
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        Super Admin
                      </span>
                    ) : (
                      <select
                        disabled={updating === user.id}
                        value={user.admin_role ?? 'user'}
                        onChange={(e) => {
                          const val = e.target.value;
                          changeRole(user.id, val === 'user' ? null : val as AdminRole);
                        }}
                        className={`text-xs px-2 py-1.5 rounded-lg border border-cream-dark bg-white text-brown focus:ring-2 focus:ring-haldi-gold/40 focus:outline-none ${
                          updating === user.id ? 'opacity-50' : ''
                        }`}
                      >
                        <option value="user">User</option>
                        <option value="manager">Manager</option>
                        {myRole === 'super_admin' && <option value="admin">Admin</option>}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brown-light text-xs hidden sm:table-cell">
                    {user.last_seen_at ? new Date(user.last_seen_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-brown-light text-xs hidden md:table-cell">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-brown-light">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-cream-dark bg-white text-brown disabled:opacity-40 hover:bg-cream transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-cream-dark bg-white text-brown disabled:opacity-40 hover:bg-cream transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
