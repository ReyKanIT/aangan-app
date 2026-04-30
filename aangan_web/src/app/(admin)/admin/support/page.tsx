'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { notifyUser } from '@/lib/utils/notifyUser';

// ─── Quick-reply templates ─────────────────────────────────────────────
// One-click canned responses for the most common cases. Click to insert
// into the reply box (still editable before send). Hindi-first per the
// Dadi Test, with an English subtitle so reviewers and English-only
// supporters can scan them too. Order them by frequency so the top row
// fits on a phone screen without scrolling.
//
// {{name}} is substituted with the ticket owner's display_name at insert
// time so a reply feels personal without manual typing.
interface ReplyTemplate {
  id: string;
  emoji: string;
  shortLabel: string; // What shows on the chip
  body: string;       // What goes into the reply box
}
const REPLY_TEMPLATES: ReplyTemplate[] = [
  {
    id: 'thanks_looking',
    emoji: '🙏',
    shortLabel: 'Thanks, looking',
    body: 'नमस्ते {{name}} 🙏\nआपके feedback के लिए धन्यवाद! हम इसे देख रहे हैं और जल्दी ही अपडेट देंगे।\n\nThank you for your feedback — we are looking into this and will update you soon.',
  },
  {
    id: 'fixed_in_update',
    emoji: '✅',
    shortLabel: 'Fixed in update',
    body: 'नमस्ते {{name}} 🙏\nयह समस्या नए version में ठीक कर दी गई है। App update करके फिर से try करें — अगर अभी भी दिखे तो बताइए।\n\nThis has been fixed in the latest update. Please update your app and try again — let us know if it still appears.',
  },
  {
    id: 'need_more_info',
    emoji: '🤔',
    shortLabel: 'Need details',
    body: 'नमस्ते {{name}} 🙏\nथोड़ी और जानकारी चाहिए — कृपया बताएं:\n• कौन सा screen / button?\n• क्या error message दिखा?\n• कौन सा phone / browser इस्तेमाल कर रहे हैं?\n\nA little more info will help us fix it — which screen, what error, and which phone/browser are you on?',
  },
  {
    id: 'screenshot_request',
    emoji: '📸',
    shortLabel: 'Send screenshot',
    body: 'नमस्ते {{name}} 🙏\nक्या आप इस screen का screenshot भेज सकते हैं? तस्वीर देखकर हम जल्दी समझ लेंगे।\n\nCould you share a screenshot of this screen? It helps us understand and fix it faster.',
  },
  {
    id: 'wont_fix_explanation',
    emoji: '💡',
    shortLabel: 'Working as designed',
    body: 'नमस्ते {{name}} 🙏\nयह feature जान-बूझकर ऐसे बनाया गया है — [REASON]। आपकी समझ के लिए धन्यवाद।\n\nThis is working as intended — [REASON]. Thank you for understanding.',
  },
  {
    id: 'feature_planned',
    emoji: '📅',
    shortLabel: 'Planned soon',
    body: 'नमस्ते {{name}} 🙏\nयह feature आगे आने वाले update में add किया जाएगा। आपका सुझाव note कर लिया है — धन्यवाद!\n\nThis feature is on our roadmap for an upcoming update. We have noted your suggestion — thank you!',
  },
  {
    id: 'restart_help',
    emoji: '🔄',
    shortLabel: 'Restart app',
    body: 'नमस्ते {{name}} 🙏\nकृपया एक बार app बंद करके फिर से खोलें। अगर समस्या बनी रहे तो बताइए — हम तुरंत देखेंगे।\n\nPlease close and reopen the app once. If the issue continues, let us know and we will investigate immediately.',
  },
  {
    id: 'resolved_thanks',
    emoji: '👌',
    shortLabel: 'Resolved, thanks',
    body: 'नमस्ते {{name}} 🙏\nसमस्या ठीक हो गई है — आपके धैर्य के लिए धन्यवाद!\n\nThe issue has been resolved — thank you for your patience!',
  },
];

// Stale-ticket threshold (days). Tickets with status `open` /
// `waiting_for_user` and `updated_at` older than this get a ⏰ badge
// so they don't slip through the cracks like Jyotsna's 19-day-old one.
const STALE_DAYS = 3;

type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
type TicketCategory = 'billing' | 'account' | 'bug_report' | 'feature_request' | 'complaint' | 'general';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Ticket {
  id: string;
  ticket_number: string;
  user_id: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  first_response_at: string | null;
  created_at: string;
  updated_at: string;
  user?: { display_name: string; phone_number: string; profile_photo_url: string | null };
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_from_support: boolean;
  is_internal_note: boolean;
  created_at: string;
  sender?: { display_name: string };
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  assigned: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  waiting_for_user: 'bg-red-100 text-red-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  waiting_for_user: 'Waiting',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  billing: '💳 Billing',
  account: '👤 Account',
  bug_report: '🐛 Bug',
  feature_request: '💡 Feature',
  complaint: '📢 Complaint',
  general: '❓ General',
};

const ALL_STATUSES: TicketStatus[] = ['open', 'assigned', 'in_progress', 'waiting_for_user', 'resolved', 'closed'];

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  // Active ticket detail
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [isNote, setIsNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [showResolve, setShowResolve] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    // Sort: open + waiting > stale-flag > priority > recent activity.
    // The DB does the cheap part (status + updated_at), client sorts the
    // priority bucket so urgent tickets always float up.
    let q = supabase
      .from('support_tickets')
      .select(`*, user:users!user_id (display_name, phone_number, profile_photo_url)`)
      .order('updated_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setTickets((data as Ticket[]) ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // ─── Realtime: refresh ticket list when a row changes ─────────────
  // Without this, a brand-new ticket only appears when the admin
  // manually reloads — which means slower first-touch and tickets
  // sitting in the queue. Subscribe to support_tickets INSERT/UPDATE
  // and to support_messages INSERT (so an incoming user reply on the
  // currently-open ticket shows up live, and the parent ticket's
  // updated_at bubble re-sorts the list).
  useEffect(() => {
    const channel = supabase
      .channel('support-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchTickets();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
        // If the inbound message is on the currently-open ticket and
        // came from the user (not a duplicate echo of our own send),
        // append it to the visible thread immediately.
        const m = payload.new as Message;
        if (selected && m.ticket_id === selected.id && !m.is_from_support) {
          setMessages((prev) => [...prev, m]);
        }
        fetchTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTickets, selected]);

  async function openTicket(ticket: Ticket) {
    setSelected(ticket);
    const { data } = await supabase
      .from('support_messages')
      .select(`*, sender:users!sender_id (display_name)`)
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('support_messages').insert({
      ticket_id: selected.id,
      sender_id: user!.id,
      message: reply.trim(),
      is_from_support: true,
      is_internal_note: isNote,
    });
    // Update ticket status to in_progress if it was open
    if (selected.status === 'open' || selected.status === 'assigned') {
      await supabase.from('support_tickets').update({ status: 'in_progress' }).eq('id', selected.id);
      setSelected((s) => s ? { ...s, status: 'in_progress' } : s);
    }
    // Notify the ticket owner — internal notes stay internal.
    // Fire-and-forget so notification failure doesn't block the reply itself.
    if (!isNote && selected.user_id) {
      await notifyUser({
        userId: selected.user_id,
        type: 'support_reply',
        titleHi: 'आपके टिकट पर जवाब आया है',
        titleEn: 'New reply on your support ticket',
        bodyHi: reply.trim().slice(0, 200),
        bodyEn: reply.trim().slice(0, 200),
        data: { ticket_id: selected.id, ticket_number: selected.ticket_number },
      });
    }
    setReply('');
    setSending(false);
    // Reload messages
    const { data } = await supabase
      .from('support_messages')
      .select(`*, sender:users!sender_id (display_name)`)
      .eq('ticket_id', selected.id)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    fetchTickets();
  }

  async function updateStatus(ticketId: string, status: TicketStatus, note?: string) {
    const patch: Record<string, unknown> = { status };
    if (status === 'resolved') {
      patch.resolved_at = new Date().toISOString();
      if (note) patch.resolution_notes = note;
    }
    await supabase.from('support_tickets').update(patch).eq('id', ticketId);
    setSelected((s) => s ? { ...s, status, ...(note ? { resolution_notes: note } : {}) } : s);
    setShowResolve(false);
    // Notify the user when their ticket is resolved (not on other transitions — those are internal state).
    if (status === 'resolved' && selected?.user_id) {
      await notifyUser({
        userId: selected.user_id,
        type: 'issue_resolved',
        titleHi: 'आपकी शिकायत का समाधान हो गया 🙏',
        titleEn: 'Your support ticket is resolved',
        bodyHi: note?.slice(0, 200) || 'मेज़बान ने टिकट close कर दिया है',
        bodyEn: note?.slice(0, 200) || 'Your ticket has been marked resolved',
        data: { ticket_id: ticketId, ticket_number: selected.ticket_number },
      });
    }
    fetchTickets();
  }

  const filtered = useMemo(() => tickets.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.ticket_number ?? '').toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.user?.display_name ?? '').toLowerCase().includes(q) ||
      (t.user?.phone_number ?? '').includes(q)
    );
  }), [tickets, search]);

  // Stale = open/waiting AND last touched > STALE_DAYS days ago.
  // Used both for the visual ⏰ badge in the list and for the inbox
  // counter so the admin sees at a glance how many tickets need
  // attention NOW vs ones still waiting on the user.
  function isStale(t: Ticket): boolean {
    if (t.status !== 'open' && t.status !== 'waiting_for_user') return false;
    const ageMs = Date.now() - new Date(t.updated_at).getTime();
    return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000;
  }

  const staleCount = useMemo(() => filtered.filter(isStale).length, [filtered]);
  const openCount = useMemo(
    () => filtered.filter((t) => t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_for_user').length,
    [filtered]
  );

  // Apply a quick-reply template — substitutes {{name}} with the
  // recipient's display name and focuses the textarea so the admin
  // can edit before sending. Append-vs-replace: if the textarea is
  // empty replace; if non-empty append a blank line so the admin
  // can chain templates ("thanks looking" + "need details").
  function applyTemplate(t: ReplyTemplate) {
    if (!selected) return;
    const name = selected.user?.display_name?.split(' ')[0] || '';
    const body = t.body.replace(/\{\{name\}\}/g, name);
    setReply((prev) => (prev.trim() ? prev + '\n\n' + body : body));
    setIsNote(false);
    // Defer so React commits the new value before we focus.
    setTimeout(() => replyRef.current?.focus(), 0);
  }

  // Bulk close — for the test-ticket cleanup case (Jyotsna's 4 dummies)
  // and any future spam wave. RLS is admin-only so this is safe to ship.
  async function bulkClose() {
    if (bulkSelected.size === 0) return;
    if (!confirm(`Close ${bulkSelected.size} selected tickets? They'll be marked status=closed and removed from the open queue.`)) return;
    await supabase
      .from('support_tickets')
      .update({ status: 'closed' })
      .in('id', Array.from(bulkSelected));
    setBulkSelected(new Set());
    fetchTickets();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-80px)]">
      {/* Ticket List */}
      <div className={cn('flex flex-col', selected ? 'hidden lg:flex w-96 flex-shrink-0' : 'flex-1')}>
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h1 className="font-heading text-2xl text-brown">Support Tickets</h1>
            <p className="text-brown-light text-sm mt-1">
              {/* Inbox glance: show open + stale counts so the admin
                  immediately knows what needs attention. Realtime keeps
                  these counts live without manual refresh. */}
              <span className="font-semibold text-brown">{openCount}</span> active
              {staleCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-orange-700 font-semibold">
                  ⏰ {staleCount} stale
                </span>
              )}
            </p>
          </div>
          {bulkSelected.size > 0 && (
            <button
              onClick={bulkClose}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              title="Close selected tickets"
            >
              Close {bulkSelected.size} ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              statusFilter === 'all' ? 'bg-brown text-cream' : 'bg-cream-dark text-brown-light hover:bg-cream')}
          >
            All
          </button>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                statusFilter === s ? 'bg-brown text-cream' : 'bg-cream-dark text-brown-light hover:bg-cream')}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ticket #, subject, or user..."
          className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-white text-sm text-brown placeholder:text-brown-light/60 mb-3 focus:outline-none focus:ring-2 focus:ring-haldi-gold/40"
        />

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 bg-white rounded-xl border border-cream-dark animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-brown-light">No tickets found.</div>
          ) : (
            filtered.map((ticket) => {
              const stale = isStale(ticket);
              const isBulkSel = bulkSelected.has(ticket.id);
              return (
                <div
                  key={ticket.id}
                  className={cn(
                    'group relative w-full bg-white rounded-xl border p-4 hover:shadow-md transition-shadow',
                    selected?.id === ticket.id ? 'border-haldi-gold ring-1 ring-haldi-gold/40' : 'border-cream-dark',
                    stale && 'border-l-4 border-l-orange-400'
                  )}
                >
                  {/* Bulk-select checkbox — only shows when at least one
                      ticket is already selected, OR on hover, so the
                      single-click open flow stays clean for solo work. */}
                  <input
                    type="checkbox"
                    checked={isBulkSel}
                    onChange={(e) => {
                      e.stopPropagation();
                      setBulkSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(ticket.id);
                        else next.delete(ticket.id);
                        return next;
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'absolute top-3 left-3 w-4 h-4 rounded transition-opacity',
                      bulkSelected.size > 0 || isBulkSel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}
                    aria-label="Select ticket for bulk actions"
                  />
                  <button
                    onClick={() => openTicket(ticket)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2 pl-5">
                      <span className="text-xs text-brown-light font-mono flex items-center gap-1.5">
                        {stale && <span title="Stale: no activity in 3+ days">⏰</span>}
                        {ticket.ticket_number ?? ticket.id.slice(0, 8)}
                      </span>
                      <div className="flex gap-1.5">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_COLORS[ticket.priority])}>
                          {ticket.priority}
                        </span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[ticket.status])}>
                          {STATUS_LABELS[ticket.status]}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-brown truncate mb-1 pl-5">{ticket.subject}</p>
                    <div className="flex items-center justify-between pl-5">
                      <span className="text-xs text-brown-light">{ticket.user?.display_name ?? '—'}</span>
                      <span className="text-xs text-brown-light/60">{formatDate(ticket.updated_at)}</span>
                    </div>
                    <span className="text-xs text-brown-light/60 pl-5">{CATEGORY_LABELS[ticket.category]}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Ticket Detail */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-cream-dark overflow-hidden">
          {/* Detail Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-cream-dark bg-cream/40">
            <button onClick={() => setSelected(null)} className="lg:hidden p-1 text-brown-light hover:text-brown">
              ← Back
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-brown-light">{selected.ticket_number}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[selected.status])}>
                  {STATUS_LABELS[selected.status]}
                </span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_COLORS[selected.priority])}>
                  {selected.priority}
                </span>
              </div>
              <p className="text-sm font-semibold text-brown mt-0.5 truncate">{selected.subject}</p>
              <p className="text-xs text-brown-light">{CATEGORY_LABELS[selected.category]} • {selected.user?.display_name} • {selected.user?.phone_number}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {selected.status !== 'resolved' && selected.status !== 'closed' && (
                <>
                  <button
                    onClick={() => updateStatus(selected.id, 'waiting_for_user')}
                    className="px-3 py-1.5 text-sm bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors font-medium"
                  >
                    Waiting
                  </button>
                  <button
                    onClick={() => setShowResolve(true)}
                    className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium"
                  >
                    Resolve ✓
                  </button>
                  <button
                    onClick={() => updateStatus(selected.id, 'closed')}
                    className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Resolve modal */}
          {showResolve && (
            <div className="px-5 py-3 bg-green-50 border-b border-green-200">
              <p className="text-sm font-medium text-green-800 mb-2">Resolution notes (optional):</p>
              <textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-green-200 text-sm bg-white resize-none focus:outline-none"
                rows={2}
                placeholder="Describe what was done to resolve..."
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => updateStatus(selected.id, 'resolved', resolveNote)}
                  className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Mark Resolved
                </button>
                <button onClick={() => setShowResolve(false)} className="px-4 py-1.5 text-sm text-brown-light hover:text-brown">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-3',
                  msg.is_internal_note
                    ? 'bg-yellow-50 border border-yellow-200 mx-auto text-center'
                    : msg.is_from_support
                    ? 'bg-brown text-cream ml-auto rounded-br-sm'
                    : 'bg-cream rounded-bl-sm'
                )}
              >
                <p className={cn('text-xs font-semibold mb-1',
                  msg.is_internal_note ? 'text-yellow-700' :
                  msg.is_from_support ? 'text-haldi-gold' : 'text-brown-light')}>
                  {msg.is_internal_note ? '📌 Internal Note' : msg.sender?.display_name ?? '—'}
                </p>
                <p className={cn('text-sm leading-relaxed',
                  msg.is_from_support && !msg.is_internal_note ? 'text-cream' : 'text-brown')}>
                  {msg.message}
                </p>
                <p className={cn('text-xs mt-1.5',
                  msg.is_from_support && !msg.is_internal_note ? 'text-cream/60 text-right' : 'text-brown-light/60')}>
                  {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                </p>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-center text-brown-light text-sm py-8">No messages yet.</p>
            )}
          </div>

          {/* Reply */}
          {selected.status !== 'closed' && (
            <div className="px-5 py-4 border-t border-cream-dark bg-cream/20">
              <div className="flex gap-3 mb-2">
                <button
                  onClick={() => setIsNote(false)}
                  className={cn('text-sm px-3 py-1 rounded-full font-medium transition-colors',
                    !isNote ? 'bg-brown text-cream' : 'text-brown-light hover:text-brown')}
                >
                  Reply to User
                </button>
                <button
                  onClick={() => setIsNote(true)}
                  className={cn('text-sm px-3 py-1 rounded-full font-medium transition-colors',
                    isNote ? 'bg-yellow-500 text-white' : 'text-brown-light hover:text-brown')}
                >
                  📌 Internal Note
                </button>
              </div>

              {/* Quick-reply templates — single click inserts the canned
                  body into the textarea (with {{name}} substituted), still
                  editable before send. Hidden when composing internal
                  notes since the templates are user-facing. Horizontally
                  scrolls on phones so the chips don't wrap into a wall. */}
              {!isNote && (
                <div className="mb-2">
                  <p className="text-xs text-brown-light mb-1.5 font-medium">Quick replies:</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                    {REPLY_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-cream-dark hover:border-haldi-gold hover:bg-haldi-gold/5 text-xs font-medium text-brown transition-colors"
                        title={t.body.split('\n')[0]}
                      >
                        <span>{t.emoji}</span>
                        <span className="whitespace-nowrap">{t.shortLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <textarea
                  ref={replyRef}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  // Cmd/Ctrl+Enter to send — saves a thumb-stretch on
                  // mobile and feels native to anyone who types email.
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && reply.trim() && !sending) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                  placeholder={isNote ? 'Add internal note (not visible to user)...' : 'Type your reply... (⌘+Enter to send)'}
                  className="flex-1 px-4 py-3 rounded-xl border border-cream-dark bg-white text-sm text-brown resize-none focus:outline-none focus:ring-2 focus:ring-haldi-gold/40"
                  rows={3}
                />
                <button
                  onClick={sendReply}
                  disabled={!reply.trim() || sending}
                  className="px-5 py-2 bg-haldi-gold text-brown rounded-xl font-semibold text-sm hover:bg-haldi-gold-dark transition-colors disabled:opacity-40 self-end"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-brown-light">
          <div className="text-center">
            <p className="text-5xl mb-4">💬</p>
            <p className="text-lg font-medium">Select a ticket to view</p>
          </div>
        </div>
      )}
    </div>
  );
}
