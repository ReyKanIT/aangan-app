'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { cn } from '@/lib/utils/cn';

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
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

  const fetchTickets = useCallback(async () => {
    setLoading(true);
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
    fetchTickets();
  }

  const filtered = tickets.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.ticket_number.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.user?.display_name ?? '').toLowerCase().includes(q) ||
      (t.user?.phone_number ?? '').includes(q)
    );
  });

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-80px)]">
      {/* Ticket List */}
      <div className={cn('flex flex-col', selected ? 'hidden lg:flex w-96 flex-shrink-0' : 'flex-1')}>
        <div className="mb-4">
          <h1 className="font-heading text-2xl text-brown">Support Tickets</h1>
          <p className="text-brown-light text-sm mt-1">Manage customer queries & complaints</p>
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
            filtered.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                className={cn(
                  'w-full text-left bg-white rounded-xl border p-4 hover:shadow-md transition-shadow',
                  selected?.id === ticket.id ? 'border-haldi-gold ring-1 ring-haldi-gold/40' : 'border-cream-dark'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs text-brown-light font-mono">{ticket.ticket_number}</span>
                  <div className="flex gap-1.5">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_COLORS[ticket.priority])}>
                      {ticket.priority}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[ticket.status])}>
                      {STATUS_LABELS[ticket.status]}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-brown truncate mb-1">{ticket.subject}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brown-light">{ticket.user?.display_name ?? '—'}</span>
                  <span className="text-xs text-brown-light/60">{formatDate(ticket.updated_at)}</span>
                </div>
                <span className="text-xs text-brown-light/60">{CATEGORY_LABELS[ticket.category]}</span>
              </button>
            ))
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
                  {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
              <div className="flex gap-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={isNote ? 'Add internal note (not visible to user)...' : 'Type your reply...'}
                  className="flex-1 px-4 py-3 rounded-xl border border-cream-dark bg-white text-sm text-brown resize-none focus:outline-none focus:ring-2 focus:ring-haldi-gold/40"
                  rows={2}
                />
                <button
                  onClick={sendReply}
                  disabled={!reply.trim() || sending}
                  className="px-5 py-2 bg-haldi-gold text-brown rounded-xl font-semibold text-sm hover:bg-haldi-gold-dark transition-colors disabled:opacity-40"
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
