'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

type Category = 'feature_request' | 'bug_report' | 'complaint' | 'general' | 'billing' | 'account';

const CATEGORY_META: Record<Category, { emoji: string; label: string; color: string }> = {
  feature_request: { emoji: '💡', label: 'Feature', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  bug_report:      { emoji: '🐛', label: 'Bug',     color: 'bg-red-50 text-red-800 border-red-200' },
  complaint:       { emoji: '😟', label: 'Complaint', color: 'bg-orange-50 text-orange-800 border-orange-200' },
  general:         { emoji: '💬', label: 'General', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  billing:         { emoji: '💳', label: 'Billing', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  account:         { emoji: '👤', label: 'Account', color: 'bg-gray-50 text-gray-800 border-gray-200' },
};

interface FeedbackItem {
  id: string;
  ticket_number: string;
  category: Category;
  priority: string;
  status: string;
  subject: string;
  created_at: string;
  user_id: string;
  user?: { display_name: string | null; phone_number: string | null } | null;
  first_message?: string;
}

function todayISTString(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + (330 - (-now.getTimezoneOffset())) * 60 * 1000);
  // simpler: rebuild from UTC + 5:30
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const istNow = new Date(utcMs + 330 * 60 * 1000);
  void ist;
  const y = istNow.getFullYear();
  const m = String(istNow.getMonth() + 1).padStart(2, '0');
  const d = String(istNow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function istDayWindow(dateStr: string): { fromIso: string; toIso: string } {
  // Window for "digest of <dateStr>" = (dateStr-1 18:00 IST) → (dateStr 18:00 IST)
  const toIso = `${dateStr}T18:00:00+05:30`;
  const yesterday = new Date(new Date(toIso).getTime() - 24 * 60 * 60 * 1000);
  return { fromIso: yesterday.toISOString(), toIso };
}

export default function FeedbackDigestPage() {
  const [date, setDate] = useState<string>(todayISTString());
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDigest = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { fromIso, toIso } = istDayWindow(date);
      const { data: tickets, error: tErr } = await supabase
        .from('support_tickets')
        .select(`id, ticket_number, category, priority, status, subject, created_at, user_id,
                 user:users!user_id (display_name, phone_number)`)
        .gte('created_at', fromIso)
        .lt('created_at', toIso)
        .order('created_at', { ascending: false });
      if (tErr) throw tErr;

      const list = (tickets ?? []) as unknown as FeedbackItem[];
      if (list.length > 0) {
        const ids = list.map((t) => t.id);
        const { data: msgs } = await supabase
          .from('support_messages')
          .select('ticket_id, message, created_at')
          .in('ticket_id', ids)
          .eq('is_from_support', false)
          .eq('is_internal_note', false)
          .order('created_at', { ascending: true });
        const firstMsg = new Map<string, string>();
        for (const m of (msgs ?? []) as { ticket_id: string; message: string }[]) {
          if (!firstMsg.has(m.ticket_id)) firstMsg.set(m.ticket_id, m.message);
        }
        for (const it of list) it.first_message = firstMsg.get(it.id);
      }
      setItems(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load feedback');
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  const counts: Record<string, number> = items.reduce((acc, it) => {
    acc[it.category] = (acc[it.category] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });

  function exportCsv() {
    const headers = ['ticket_number', 'category', 'priority', 'status', 'user_name', 'phone', 'message', 'created_at_ist'];
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = items.map((it) => [
      it.ticket_number,
      it.category,
      it.priority,
      it.status,
      it.user?.display_name ?? '',
      it.user?.phone_number ?? '',
      (it.first_message ?? it.subject).replace(/\n/g, ' '),
      formatTime(it.created_at),
    ].map(escape).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aangan-feedback-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl text-brown">📬 Daily Feedback Digest</h1>
          <p className="text-base text-brown-light mt-1">
            Window: <strong>{date}</strong> 6:00 PM IST &larr; previous day 6:00 PM IST
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl border-2 border-cream-dark bg-white text-brown text-base focus:outline-none focus:border-haldi-gold min-h-dadi"
          />
          <button
            onClick={() => setDate(todayISTString())}
            className="px-3 py-2 rounded-xl bg-cream-dark text-brown text-base hover:bg-cream min-h-dadi"
          >
            Today
          </button>
          <button
            onClick={exportCsv}
            disabled={items.length === 0}
            className="px-4 py-2 rounded-xl bg-haldi-gold text-brown font-semibold text-base hover:bg-haldi-gold-dark disabled:opacity-40 min-h-dadi"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Total" value={items.length} emoji="📊" />
        <SummaryCard label="Bugs" value={counts.bug_report ?? 0} emoji="🐛" />
        <SummaryCard label="Features" value={counts.feature_request ?? 0} emoji="💡" />
        <SummaryCard label="Complaints" value={counts.complaint ?? 0} emoji="😟" />
        <SummaryCard label="General" value={counts.general ?? 0} emoji="💬" />
      </div>

      {error && (
        <div className="bg-red-50 border border-error/30 rounded-xl px-4 py-3 text-error text-base">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-cream-dark animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-dark py-16 text-center">
          <p className="text-5xl mb-3">📭</p>
          <p className="text-lg font-semibold text-brown">No feedback in this window</p>
          <p className="text-base text-brown-light mt-1">कोई नया फ़ीडबैक नहीं</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const meta = CATEGORY_META[it.category] ?? CATEGORY_META.general;
            return (
              <div key={it.id} className="bg-white rounded-2xl border border-cream-dark p-4 lg:p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-medium', meta.color)}>
                      <span>{meta.emoji}</span>
                      <span>{meta.label}</span>
                    </span>
                    <span className="text-sm text-brown-light font-mono">{it.ticket_number}</span>
                    <span className="text-sm text-brown-light">• {it.priority}</span>
                  </div>
                  <span className="text-sm text-brown-light">{formatTime(it.created_at)}</span>
                </div>
                <p className="text-base text-brown leading-relaxed whitespace-pre-wrap">
                  {it.first_message ?? it.subject}
                </p>
                <div className="mt-2 flex items-center gap-3 text-sm text-brown-light flex-wrap">
                  <span>👤 {it.user?.display_name ?? 'Unknown'}</span>
                  {it.user?.phone_number && <span>📞 {it.user.phone_number}</span>}
                  <span>• status: {it.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="bg-white rounded-2xl border border-cream-dark p-4 text-center">
      <p className="text-2xl">{emoji}</p>
      <p className="text-3xl font-bold text-brown mt-1">{value}</p>
      <p className="text-sm text-brown-light mt-0.5">{label}</p>
    </div>
  );
}
