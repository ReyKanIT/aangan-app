'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { notifyUser } from '@/lib/utils/notifyUser';
import ReplyComposer from '@/components/admin/ReplyComposer';

type Channel = 'support' | 'report';

interface UnifiedIssue {
  channel: Channel;
  id: string;            // ticket id or report id
  ref: string;           // human-readable ref (TKT-xxxx or report/abc)
  subject: string;
  snippet: string;       // first bit of description / reason
  status: string;
  priority: string | null;
  category: string;
  userId: string | null;
  userName: string | null;
  userNameHindi: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const PENDING_STATUSES: Record<Channel, string[]> = {
  support: ['open', 'assigned', 'in_progress', 'waiting_for_user'],
  report: ['pending', 'reviewing'],
};

type FilterMode = 'pending' | 'all' | 'mine';

/**
 * /admin/issues — the unified triage inbox. Pulls from support_tickets and
 * content_reports, shows whichever is older/higher-priority first, and lets
 * the admin reply + resolve inline. One less reason to bounce between three
 * admin pages when users are waiting.
 */
export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<UnifiedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UnifiedIssue | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentAdmin(data.user?.id ?? null));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsRes, reportsRes] = await Promise.all([
        supabase
          .from('support_tickets')
          .select('id, ticket_number, user_id, category, subject, status, priority, created_at, updated_at, assigned_to, user:users!support_tickets_user_id_fkey(id, display_name, display_name_hindi, avatar_url)')
          .order('updated_at', { ascending: false })
          .limit(200),
        supabase
          .from('content_reports')
          .select('id, reporter_id, content_type, reason, description, status, created_at, updated_at, reporter:users!content_reports_reporter_id_fkey(id, display_name, display_name_hindi, avatar_url)')
          .order('updated_at', { ascending: false })
          .limit(200),
      ]);

      const out: UnifiedIssue[] = [];

      if (ticketsRes.error) {
        if (ticketsRes.error.code !== '42P01') throw ticketsRes.error;
      } else {
        for (const t of (ticketsRes.data ?? []) as Array<Record<string, unknown>>) {
          const userRaw = t.user as { id?: string; display_name?: string; display_name_hindi?: string | null; avatar_url?: string | null } | null;
          out.push({
            channel: 'support',
            id: String(t.id),
            ref: String(t.ticket_number ?? t.id),
            subject: String(t.subject ?? '(no subject)'),
            snippet: '',
            status: String(t.status ?? 'open'),
            priority: (t.priority as string | null) ?? null,
            category: String(t.category ?? 'general'),
            userId: (t.user_id as string | null) ?? null,
            userName: userRaw?.display_name ?? null,
            userNameHindi: userRaw?.display_name_hindi ?? null,
            avatarUrl: userRaw?.avatar_url ?? null,
            createdAt: String(t.created_at),
            updatedAt: String(t.updated_at),
          });
        }
      }

      if (reportsRes.error) {
        if (reportsRes.error.code !== '42P01') throw reportsRes.error;
      } else {
        for (const r of (reportsRes.data ?? []) as Array<Record<string, unknown>>) {
          const userRaw = r.reporter as { id?: string; display_name?: string; display_name_hindi?: string | null; avatar_url?: string | null } | null;
          const contentType = String(r.content_type ?? 'content');
          const reason = String(r.reason ?? 'other');
          out.push({
            channel: 'report',
            id: String(r.id),
            ref: `report/${String(r.id).slice(0, 8)}`,
            subject: `Report: ${reason} on ${contentType}`,
            snippet: String(r.description ?? '').slice(0, 140),
            status: String(r.status ?? 'pending'),
            priority: null,
            category: contentType,
            userId: (r.reporter_id as string | null) ?? null,
            userName: userRaw?.display_name ?? null,
            userNameHindi: userRaw?.display_name_hindi ?? null,
            avatarUrl: userRaw?.avatar_url ?? null,
            createdAt: String(r.created_at),
            updatedAt: String(r.updated_at),
          });
        }
      }

      // Sort: pending first (by oldest createdAt so no one waits too long),
      // then by updatedAt desc for everything else.
      out.sort((a, b) => {
        const aPending = PENDING_STATUSES[a.channel].includes(a.status);
        const bPending = PENDING_STATUSES[b.channel].includes(b.status);
        if (aPending && !bPending) return -1;
        if (!aPending && bPending) return 1;
        if (aPending && bPending) return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      setIssues(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((i) => {
      if (filter === 'pending' && !PENDING_STATUSES[i.channel].includes(i.status)) return false;
      // 'mine' would need assigned_to matching; we don't carry it on reports, so just filter tickets
      if (q) {
        const hay = `${i.ref} ${i.subject} ${i.userName ?? ''} ${i.userNameHindi ?? ''} ${i.category} ${i.snippet}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [issues, filter, search]);

  const counts = useMemo(() => {
    const pending = issues.filter((i) => PENDING_STATUSES[i.channel].includes(i.status)).length;
    const tickets = issues.filter((i) => i.channel === 'support').length;
    const reports = issues.filter((i) => i.channel === 'report').length;
    return { pending, total: issues.length, tickets, reports };
  }, [issues]);

  const sendReply = async (bodyHi: string, bodyEn: string, shouldResolve: boolean) => {
    if (!selected) return;

    if (selected.channel === 'support') {
      // Insert thread message
      const { error: msgErr } = await supabase.from('support_messages').insert({
        ticket_id: selected.id,
        sender_id: currentAdmin,
        message: bodyEn || bodyHi, // support_messages is single-language; prefer English with Hindi fallback
        is_from_support: true,
        is_internal_note: false,
      });
      if (msgErr) { setError(msgErr.message); return; }

      // Update ticket status + optionally resolve
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (shouldResolve) {
        patch.status = 'resolved';
        patch.resolved_at = new Date().toISOString();
      } else if (selected.status === 'open') {
        patch.status = 'in_progress';
      }
      await supabase.from('support_tickets').update(patch).eq('id', selected.id);
    } else {
      // Report channel — write to report_messages (gracefully skipped if table missing)
      const { error: msgErr } = await supabase.from('report_messages').insert({
        report_id: selected.id,
        sender_id: currentAdmin,
        message: bodyEn || bodyHi,
        message_hindi: bodyHi || null,
        is_from_admin: true,
        is_internal_note: false,
      });
      if (msgErr && msgErr.code !== '42P01') {
        setError(msgErr.message);
        return;
      }
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (shouldResolve) {
        patch.status = 'resolved';
        patch.resolved_by = currentAdmin;
      } else if (selected.status === 'pending') {
        patch.status = 'reviewing';
      }
      await supabase.from('content_reports').update(patch).eq('id', selected.id);
    }

    // Fire-and-forget user notification (both reply and resolve trigger a ping)
    if (selected.userId) {
      await notifyUser({
        userId: selected.userId,
        type: shouldResolve ? 'issue_resolved' : selected.channel === 'support' ? 'support_reply' : 'report_reply',
        titleHi: shouldResolve ? 'आपकी शिकायत का समाधान हो गया' : 'आपको जवाब मिला है',
        titleEn: shouldResolve ? 'Your issue is resolved' : 'You have a new reply',
        bodyHi: bodyHi.slice(0, 200),
        bodyEn: bodyEn.slice(0, 200),
        data: { channel: selected.channel, id: selected.id, ref: selected.ref },
      });
    }

    await fetchAll();
    // Keep the composer open with refreshed data
    setSelected((prev) => prev ? { ...prev, status: shouldResolve ? (selected.channel === 'support' ? 'resolved' : 'resolved') : prev.status } : null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-brown">Issues Inbox</h1>
          <p className="text-brown-light text-sm mt-1">
            {counts.pending} pending · {counts.tickets} tickets · {counts.reports} reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAll}
            className="text-sm px-3 py-2 rounded-lg border border-cream-dark hover:bg-cream transition-colors"
          >
            ↻ Refresh
          </button>
          <Link
            href="/admin/support"
            className="text-sm px-3 py-2 rounded-lg border border-cream-dark hover:bg-cream transition-colors"
          >
            Tickets →
          </Link>
          <Link
            href="/admin/reports"
            className="text-sm px-3 py-2 rounded-lg border border-cream-dark hover:bg-cream transition-colors"
          >
            Reports →
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg text-base mb-4">
          <p className="font-semibold">Load error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border border-cream-dark overflow-hidden">
          {(['pending', 'all'] as FilterMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={`px-3 py-1.5 text-sm transition-colors ${filter === m ? 'bg-haldi-gold text-brown' : 'bg-white text-brown-light hover:bg-cream'}`}
            >
              {m === 'pending' ? `Pending (${counts.pending})` : `All (${counts.total})`}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subject, user, category…"
          className="flex-1 min-w-[200px] text-sm px-3 py-1.5 border border-cream-dark rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-haldi-gold/40"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* List */}
        <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {loading && <p className="text-brown-light text-sm">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-cream-dark p-6 text-center">
              <p className="text-brown-light">No issues match.</p>
            </div>
          )}
          {filtered.map((i) => {
            const isSelected = selected?.channel === i.channel && selected?.id === i.id;
            const isPending = PENDING_STATUSES[i.channel].includes(i.status);
            return (
              <button
                key={`${i.channel}:${i.id}`}
                onClick={() => setSelected(i)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  isSelected ? 'border-haldi-gold bg-unread-bg' : 'border-cream-dark bg-white hover:border-haldi-gold-light'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${i.channel === 'support' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-800'}`}>
                    {i.channel === 'support' ? '🎫' : '🚩'} {i.ref}
                  </span>
                  {isPending ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">{i.status}</span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">{i.status}</span>
                  )}
                </div>
                <p className="font-semibold text-brown text-sm truncate">{i.subject}</p>
                {i.snippet && <p className="text-xs text-brown-light truncate mt-0.5">{i.snippet}</p>}
                <div className="flex items-center justify-between mt-1.5 text-xs text-brown-light">
                  <span className="truncate">{i.userNameHindi ?? i.userName ?? '—'}</span>
                  <span>{new Date(i.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail + composer */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="bg-white rounded-xl border border-cream-dark p-6 text-center text-brown-light">
              Select an issue on the left to reply.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-cream-dark p-5">
              <div className="mb-4 pb-4 border-b border-cream-dark">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h2 className="font-heading text-lg text-brown">{selected.subject}</h2>
                  <span className="text-xs font-mono text-brown-light">{selected.ref}</span>
                </div>
                <p className="text-sm text-brown-light">
                  {selected.channel === 'support' ? 'Support ticket' : 'Content report'} · {selected.category}
                  {selected.priority && ` · priority: ${selected.priority}`}
                </p>
                <p className="text-sm text-brown-light mt-1">
                  From: <span className="font-medium text-brown">{selected.userNameHindi ?? selected.userName ?? '—'}</span>
                  {' · '}Opened: {new Date(selected.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
                {selected.snippet && (
                  <p className="mt-3 text-sm text-brown bg-cream/60 rounded-lg p-3 whitespace-pre-wrap">{selected.snippet}</p>
                )}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {selected.channel === 'support' ? (
                    <Link
                      href={`/admin/support`}
                      className="text-xs px-2 py-1 rounded border border-cream-dark hover:bg-cream text-brown-light"
                    >
                      Open in Support →
                    </Link>
                  ) : (
                    <Link
                      href={`/admin/reports`}
                      className="text-xs px-2 py-1 rounded border border-cream-dark hover:bg-cream text-brown-light"
                    >
                      Open in Reports →
                    </Link>
                  )}
                </div>
              </div>
              <ReplyComposer
                recipientName={selected.userNameHindi ?? selected.userName ?? undefined}
                ticketRef={selected.ref}
                onSend={sendReply}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
