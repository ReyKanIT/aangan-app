'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { parseInviteePaste, type ParsedInvitee } from '@/lib/utils/phoneParse';
import type { PlannedInvite } from '@/types/database';

interface Props {
  eventId: string;
  currentUserId: string | undefined;
  scheduledAt: string | null;
  sentAt: string | null;
  onScheduleChange?: (iso: string | null) => void;
}

interface ParsedWithMatch extends ParsedInvitee {
  userId: string | null;       // null = not an Aangan user yet
  userAvatar: string | null;
  userDisplayName: string | null;
  isDuplicateOfExisting: boolean; // already queued for this event
}

/**
 * BulkInviteManager — host adds many invitees at once (paste or contact-picker),
 * queues them on event_planned_invites, and schedules a batch send time. The
 * cron at /api/cron/send-scheduled-invites fires at invites_scheduled_at.
 *
 * UX layers:
 *   1. Primary: textarea paste (works everywhere)
 *   2. Enhancement: Contact Picker API (Android Chrome) — appends to textarea
 *   3. Match existing Aangan users by phone so we know which get notifications
 *      and which get SMS only
 */
export default function BulkInviteManager({ eventId, currentUserId, scheduledAt, sentAt, onScheduleChange }: Props) {
  const [paste, setPaste] = useState('');
  const [parsed, setParsed] = useState<ParsedWithMatch[]>([]);
  const [skipped, setSkipped] = useState<Array<{ line: string; reason: string }>>([]);
  const [matching, setMatching] = useState(false);
  const [queue, setQueue] = useState<PlannedInvite[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [savingQueue, setSavingQueue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [scheduleLocal, setScheduleLocal] = useState<string>('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  const contactPickerSupported = typeof navigator !== 'undefined'
    && 'contacts' in navigator
    // @ts-expect-error — vendor API
    && typeof navigator.contacts?.select === 'function';

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    const { data, error: e } = await supabase
      .from('event_planned_invites')
      .select('*')
      .eq('event_id', eventId)
      .order('added_at', { ascending: true });
    if (e && e.code !== '42P01') {
      setError(`Could not load invitees: ${e.message}`);
      setQueueLoading(false);
      return;
    }
    setQueue((data ?? []) as PlannedInvite[]);
    setQueueLoading(false);
  }, [eventId]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // Load existing scheduled time into the picker on mount
  useEffect(() => {
    if (scheduledAt) {
      // datetime-local input needs YYYY-MM-DDTHH:mm in user's local tz
      const d = new Date(scheduledAt);
      const pad = (n: number) => String(n).padStart(2, '0');
      setScheduleLocal(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  }, [scheduledAt]);

  // Parse the paste → match against existing Aangan users → enrich preview
  const runParse = async () => {
    setError(null);
    setOk(null);
    const result = parseInviteePaste(paste);
    setSkipped(result.skipped);

    if (result.ok.length === 0) {
      setParsed([]);
      return;
    }

    setMatching(true);
    try {
      const phones = result.ok.map((p) => p.phone);
      const queuePhones = new Set(queue.map((q) => q.invitee_phone));

      // Batched lookup — Supabase `.in()` is fine with hundreds
      const { data: users } = await supabase
        .from('users')
        .select('id, display_name, display_name_hindi, avatar_url, phone_number')
        .in('phone_number', phones);

      const userByPhone = new Map<string, { id: string; display_name: string; display_name_hindi: string | null; avatar_url: string | null }>();
      for (const u of (users ?? []) as Array<{ id: string; display_name: string; display_name_hindi: string | null; avatar_url: string | null; phone_number: string }>) {
        userByPhone.set(u.phone_number, u);
      }

      const enriched: ParsedWithMatch[] = result.ok.map((p) => {
        const match = userByPhone.get(p.phone);
        return {
          ...p,
          userId: match?.id ?? null,
          userAvatar: match?.avatar_url ?? null,
          userDisplayName: match?.display_name_hindi ?? match?.display_name ?? null,
          isDuplicateOfExisting: queuePhones.has(p.phone),
        };
      });
      setParsed(enriched);
    } finally {
      setMatching(false);
    }
  };

  const addAllToQueue = async () => {
    if (parsed.length === 0) return;
    setSavingQueue(true);
    setError(null);
    setOk(null);

    const freshOnly = parsed.filter((p) => !p.isDuplicateOfExisting);
    if (freshOnly.length === 0) {
      setError('Sab pehle se list mein hain — All pasted entries are already in the queue.');
      setSavingQueue(false);
      return;
    }

    const rows = freshOnly.map((p) => ({
      event_id: eventId,
      invitee_user_id: p.userId,
      invitee_name: p.userDisplayName ?? p.name,
      invitee_phone: p.phone,
      relationship_hint: p.relationship ?? null,
      added_by: currentUserId ?? null,
    }));

    const { error: e } = await supabase.from('event_planned_invites').insert(rows);
    setSavingQueue(false);

    if (e) {
      if (e.code === '42P01') {
        setError('Migration pending — apply supabase_migration_v0.9.9_bulk_invites.sql');
      } else {
        setError(`Save nahi hua: ${e.message}`);
      }
      return;
    }

    setOk(`${rows.length} invitees queued ✓`);
    setPaste('');
    setParsed([]);
    setSkipped([]);
    fetchQueue();
  };

  const removeFromQueue = async (id: string) => {
    if (!confirm('Is invitee ko hataayein?')) return;
    const { error: e } = await supabase.from('event_planned_invites').delete().eq('id', id);
    if (e) {
      setError(`Delete failed: ${e.message}`);
      return;
    }
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const saveSchedule = async () => {
    setSavingSchedule(true);
    setError(null);
    setOk(null);
    const iso = scheduleLocal ? new Date(scheduleLocal).toISOString() : null;

    // Guard: can't schedule in the past
    if (iso && new Date(iso).getTime() < Date.now() - 60 * 1000) {
      setError('Schedule time abhi se pehle hai — schedule must be in the future.');
      setSavingSchedule(false);
      return;
    }

    const { error: e } = await supabase
      .from('events')
      .update({ invites_scheduled_at: iso })
      .eq('id', eventId);

    setSavingSchedule(false);
    if (e) {
      setError(`Schedule save failed: ${e.message}`);
      return;
    }
    setOk(iso ? `Scheduled for ${new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : 'Schedule cleared');
    onScheduleChange?.(iso);
  };

  const sendNow = async () => {
    if (!confirm(`Abhi ${queue.filter((q) => q.send_status === 'pending').length} invites bhej dein?`)) return;
    setSavingSchedule(true);
    setError(null);
    setOk(null);
    // Set schedule to NOW — the cron picks it up on next tick (within 5 min)
    // For instant feedback we also hit the cron endpoint directly.
    const now = new Date().toISOString();
    await supabase.from('events').update({ invites_scheduled_at: now }).eq('id', eventId);
    try {
      await fetch('/api/cron/send-scheduled-invites', { method: 'POST' });
    } catch { /* cron may be token-protected; the 5-min tick will catch up */ }
    setSavingSchedule(false);
    setOk('Send triggered — cron will process within 5 minutes.');
    onScheduleChange?.(now);
    setTimeout(fetchQueue, 6000);
  };

  const pickFromContacts = async () => {
    if (!contactPickerSupported) return;
    try {
      // @ts-expect-error — vendor API
      const contacts: Array<{ name?: string[]; tel?: string[] }> = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      const additions: string[] = [];
      for (const c of contacts) {
        const name = (c.name?.[0] ?? '').trim();
        const tel = (c.tel?.[0] ?? '').trim();
        if (!tel) continue;
        additions.push(name ? `${name}, ${tel}` : tel);
      }
      if (additions.length === 0) return;
      setPaste((prev) => (prev ? `${prev}\n${additions.join('\n')}` : additions.join('\n')));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Contact picker error');
    }
  };

  const stats = useMemo(() => {
    const pending = queue.filter((q) => q.send_status === 'pending').length;
    const sent = queue.filter((q) => q.send_status === 'sent').length;
    const failed = queue.filter((q) => q.send_status === 'failed').length;
    const existingUsers = queue.filter((q) => q.invitee_user_id).length;
    return { pending, sent, failed, existingUsers, total: queue.length };
  }, [queue]);

  const isSent = !!sentAt;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-4 border-2 border-haldi-gold/30">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-heading text-lg text-brown">Bulk Invite Scheduler</h3>
          <p className="font-body text-sm text-brown-light">
            Sab invitees ek saath add karein — fixed time par ek baar mein bhej dein
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 font-body text-sm">
          {error}
        </div>
      )}
      {ok && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 font-body text-sm">
          {ok}
        </div>
      )}

      {/* Step 1 — paste + contact picker */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="font-body font-semibold text-brown">
            1. Invitees जोड़ें — Add invitees
          </label>
          {contactPickerSupported && (
            <button
              type="button"
              onClick={pickFromContacts}
              className="min-h-dadi px-3 rounded-lg border-2 border-haldi-gold text-haldi-gold-dark font-body text-sm font-semibold hover:bg-unread-bg transition-colors"
            >
              📇 Pick from contacts
            </button>
          )}
        </div>
        <p className="font-body text-xs text-brown-light mb-2">
          Ek line per: naam aur phone. Jaise — &quot;Ram Sharma, 9876543210&quot; या sirf phone number.
        </p>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={5}
          placeholder={'Ram Sharma, 9876543210\nSita Devi, +91 98765 43210, cousin\n9876543212'}
          className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none resize-y font-mono"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={runParse}
            disabled={!paste.trim() || matching}
            className="min-h-dadi px-4 rounded-xl bg-haldi-gold text-white font-body font-semibold text-base hover:bg-haldi-gold-dark disabled:opacity-60 transition-colors"
          >
            {matching ? 'Matching…' : 'Preview list'}
          </button>
          {!contactPickerSupported && (
            <span className="font-body text-xs text-brown-light">
              📇 Contact picker needs Android Chrome; paste works on all devices.
            </span>
          )}
        </div>
      </div>

      {/* Step 1b — preview + add */}
      {parsed.length > 0 && (
        <div className="mb-4 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-body font-semibold text-brown">
              Preview — {parsed.length} entries
              {parsed.some((p) => p.userId) && <span className="text-brown-light font-normal"> · {parsed.filter((p) => p.userId).length} already on Aangan ✓</span>}
            </p>
            <button
              onClick={addAllToQueue}
              disabled={savingQueue}
              className="min-h-dadi px-4 rounded-xl bg-mehndi-green text-white font-body font-semibold text-base hover:opacity-90 disabled:opacity-60 transition-colors"
            >
              {savingQueue ? '…' : `+ Add ${parsed.filter((p) => !p.isDuplicateOfExisting).length} to queue`}
            </button>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {parsed.map((p, i) => (
              <div key={`${p.phone}:${i}`} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${p.isDuplicateOfExisting ? 'bg-gray-100 text-gray-500' : 'bg-cream'}`}>
                <AvatarCircle src={p.userAvatar} name={p.userDisplayName ?? p.name} size={28} />
                <span className="flex-1 truncate font-body">
                  <span className="font-semibold">{p.userDisplayName ?? p.name}</span>
                  <span className="text-brown-light"> · {p.phone}</span>
                  {p.relationship && <span className="text-brown-light"> · {p.relationship}</span>}
                </span>
                {p.isDuplicateOfExisting && <span className="text-xs text-brown-light">already queued</span>}
                {!p.isDuplicateOfExisting && p.userId && <span className="text-xs text-green-600">✓ on Aangan</span>}
                {!p.isDuplicateOfExisting && !p.userId && <span className="text-xs text-brown-light">📱 SMS only</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {skipped.length > 0 && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <p className="font-semibold">Skipped {skipped.length} lines:</p>
          <ul className="mt-1 list-disc list-inside">
            {skipped.slice(0, 5).map((s, i) => <li key={i} className="truncate">&quot;{s.line}&quot; — {s.reason}</li>)}
            {skipped.length > 5 && <li>...and {skipped.length - 5} more</li>}
          </ul>
        </div>
      )}

      {/* Step 2 — queue list */}
      <div className="mb-4 border-t border-gray-100 pt-3">
        <p className="font-body font-semibold text-brown mb-2">
          2. Queue — {stats.total} invitees
          <span className="font-normal text-brown-light">
            {' '}· {stats.pending} pending · {stats.sent} sent
            {stats.failed > 0 && ` · ${stats.failed} failed`}
          </span>
        </p>
        {queueLoading && <p className="text-sm text-brown-light">Loading…</p>}
        {!queueLoading && queue.length === 0 && (
          <p className="font-body text-sm text-brown-light text-center py-4">Queue empty — paste above to add.</p>
        )}
        {queue.length > 0 && (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {queue.map((q) => {
              const sentBadge = q.send_status === 'sent' ? '✓ sent' : q.send_status === 'failed' ? '✗ failed' : '⏳ pending';
              const badgeColor = q.send_status === 'sent' ? 'text-green-600' : q.send_status === 'failed' ? 'text-red-600' : 'text-brown-light';
              return (
                <div key={q.id} className="flex items-center gap-2 p-2 rounded-lg bg-cream text-sm">
                  <AvatarCircle name={q.invitee_name_hindi ?? q.invitee_name} size={28} />
                  <span className="flex-1 truncate font-body">
                    <span className="font-semibold">{q.invitee_name_hindi ?? q.invitee_name}</span>
                    <span className="text-brown-light"> · {q.invitee_phone}</span>
                    {q.invitee_user_id && <span className="text-green-600 text-xs"> ✓ user</span>}
                  </span>
                  <span className={`text-xs ${badgeColor}`}>{sentBadge}</span>
                  {q.send_status === 'pending' && !isSent && (
                    <button
                      onClick={() => removeFromQueue(q.id)}
                      className="min-h-dadi min-w-dadi flex items-center justify-center rounded-lg text-brown-light hover:text-red-500 hover:bg-red-50 text-base transition-colors"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 3 — schedule */}
      <div className="border-t border-gray-100 pt-3">
        <p className="font-body font-semibold text-brown mb-2">3. Schedule / Send</p>

        {isSent ? (
          <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            ✓ Sent at {new Date(sentAt!).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2 flex-wrap mb-2">
              <div className="flex-1 min-w-[200px]">
                <label className="block font-body text-sm text-brown-light mb-1">Send at (IST)</label>
                <input
                  type="datetime-local"
                  value={scheduleLocal}
                  onChange={(e) => setScheduleLocal(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none"
                />
              </div>
              <button
                onClick={saveSchedule}
                disabled={savingSchedule || stats.pending === 0}
                className="min-h-dadi px-4 rounded-xl bg-haldi-gold text-white font-body font-semibold text-base hover:bg-haldi-gold-dark disabled:opacity-60 transition-colors"
              >
                {savingSchedule ? '…' : scheduledAt ? 'Update schedule' : 'Schedule'}
              </button>
              <button
                onClick={sendNow}
                disabled={savingSchedule || stats.pending === 0}
                className="min-h-dadi px-4 rounded-xl bg-mehndi-green text-white font-body font-semibold text-base hover:opacity-90 disabled:opacity-60 transition-colors"
              >
                Send now
              </button>
            </div>
            {scheduledAt && !isSent && (
              <p className="font-body text-sm text-brown-light">
                ⏰ Scheduled for {new Date(scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST · fires within 5 minutes of that time
              </p>
            )}
            {stats.pending === 0 && (
              <p className="font-body text-sm text-brown-light">Add invitees above before scheduling.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
