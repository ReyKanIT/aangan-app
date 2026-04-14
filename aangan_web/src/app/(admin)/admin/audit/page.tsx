'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: { display_name: string };
}

const PAGE_SIZE = 25;

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [actorSearch, setActorSearch] = useState('');
  const [actionTypes, setActionTypes] = useState<string[]>([]);

  // Fetch distinct action types for the filter dropdown
  useEffect(() => {
    async function loadActionTypes() {
      const { data } = await supabase
        .from('audit_logs')
        .select('action')
        .limit(200);

      if (data) {
        const unique = [...new Set(data.map((d) => d.action))].sort();
        setActionTypes(unique);
      }
    }
    loadActionTypes();
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('audit_logs')
        .select('*, actor:users!audit_logs_actor_id_fkey(display_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }

      const { data, count, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      let filtered = data ?? [];
      // Client-side filter by actor name since it's a joined field
      if (actorSearch.trim()) {
        const term = actorSearch.trim().toLowerCase();
        filtered = filtered.filter((l) =>
          l.actor?.display_name?.toLowerCase().includes(term)
        );
      }

      setLogs(filtered);
      setTotalCount(count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, actorSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function formatMetadata(metadata: Record<string, unknown> | null): string {
    if (!metadata) return '-';
    const str = JSON.stringify(metadata);
    return str.length > 80 ? str.slice(0, 80) + '...' : str;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-brown">Audit Log</h1>
        <p className="text-brown-light text-sm mt-1">Read-only history of admin and system actions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 rounded-lg border border-cream-dark bg-white text-brown text-sm focus:outline-none focus:ring-2 focus:ring-haldi-gold/40"
        >
          <option value="">All actions</option>
          {actionTypes.map((at) => (
            <option key={at} value={at}>
              {at}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by actor name..."
          value={actorSearch}
          onChange={(e) => {
            setActorSearch(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 rounded-lg border border-cream-dark bg-white text-brown placeholder:text-brown-light/60 text-sm focus:outline-none focus:ring-2 focus:ring-haldi-gold/40 w-full sm:w-64"
        />
      </div>

      {error && (
        <div className="bg-error/10 text-error px-4 py-3 rounded-lg text-base mb-4">
          {error}
          <button onClick={fetchLogs} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl border border-cream-dark">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-dark bg-cream">
              <th className="text-left px-4 py-3 font-medium text-brown">Timestamp</th>
              <th className="text-left px-4 py-3 font-medium text-brown">Actor</th>
              <th className="text-left px-4 py-3 font-medium text-brown">Action</th>
              <th className="text-left px-4 py-3 font-medium text-brown hidden md:table-cell">Target Type</th>
              <th className="text-left px-4 py-3 font-medium text-brown hidden md:table-cell">Target ID</th>
              <th className="text-left px-4 py-3 font-medium text-brown hidden lg:table-cell">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-cream-dark">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 bg-cream-dark rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-brown-light">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-cream-dark hover:bg-cream/50 transition-colors">
                  <td className="px-4 py-3 text-brown-light text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </td>
                  <td className="px-4 py-3 text-brown font-medium">
                    {log.actor?.display_name ?? log.actor_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-cream-dark text-brown text-xs font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brown-light text-xs hidden md:table-cell">
                    {log.target_type ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-brown-light text-xs font-mono hidden md:table-cell">
                    {log.target_id ? log.target_id.slice(0, 8) + '...' : '-'}
                  </td>
                  <td className="px-4 py-3 text-brown-light text-xs font-mono hidden lg:table-cell max-w-xs truncate">
                    {formatMetadata(log.metadata)}
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
            Page {page + 1} of {totalPages} ({totalCount} entries)
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
