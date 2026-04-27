'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  loadEvents,
  loadEventsFromSupabase,
  addEvent,
  addEventToSupabase,
  deleteEvent,
  deleteEventFromSupabase,
  migrateLocalToSupabase,
  buildEventFromGregorian,
  upcoming,
  formatEventLabel,
  formatRelativeDate,
  eventTypeLabel,
  tithiLabel,
  masaLabel,
  MASA_LIST,
  type TithiEvent,
  type TithiEventType,
  type UpcomingMatch,
} from '@/services/tithiEventService';

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPES: { value: TithiEventType; label: string; emoji: string }[] = [
  { value: 'birthday',    label: 'जन्मदिन / Birthday',       emoji: '🎂' },
  { value: 'anniversary', label: 'सालगिरह / Anniversary',    emoji: '💍' },
  { value: 'shraddha',    label: 'श्राद्ध / Shraddha',        emoji: '🙏' },
  { value: 'festival',    label: 'त्योहार / Festival',        emoji: '🎉' },
  { value: 'other',       label: 'अन्य / Other',             emoji: '📌' },
];

const TITHI_LIST = Array.from({ length: 30 }, (_, i) => ({
  num: i + 1,
  label: `${i < 15 ? 'शुक्ल' : 'कृष्ण'} ${tithiLabel(i + 1)}`,
}));

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TithiRemindersPage() {
  const [events, setEvents] = useState<TithiEvent[]>([]);
  const [upcomingList, setUpcomingList] = useState<UpcomingMatch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<'supabase' | 'local'>('local');

  const refresh = useCallback(async () => {
    // Try Supabase first; fall back to localStorage if the table isn't ready
    const remote = await loadEventsFromSupabase();
    let all: TithiEvent[];
    if (remote !== null) {
      // Best-effort: push any localStorage items into Supabase on first sync
      await migrateLocalToSupabase();
      const after = await loadEventsFromSupabase();
      all = after ?? remote;
      setStorageMode('supabase');
    } else {
      all = loadEvents();
      setStorageMode('local');
    }
    setEvents(all);
    // Compute upcoming — runs ~60 panchang calls per event, may take a beat
    const up = upcoming(all, 60);
    setUpcomingList(up);
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleDelete(id: string) {
    if (storageMode === 'supabase') {
      await deleteEventFromSupabase(id);
    } else {
      deleteEvent(id);
    }
    refresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl text-haldi-gold">
            तिथि अनुस्मारक
          </h1>
          <p className="text-sm text-brown-light mt-1">
            Tithi-based Reminders — जन्मदिन, श्राद्ध, त्योहार
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="min-h-dadi px-5 py-2 rounded-xl bg-haldi-gold text-white font-semibold text-base hover:bg-haldi-gold-dark transition-colors"
        >
          {showForm ? 'बंद करें' : '+ जोड़ें'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <AddEventForm
          storageMode={storageMode}
          onSave={() => { refresh(); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Upcoming events */}
      {!isLoading && upcomingList.length > 0 && (
        <section className="mb-8">
          <h2 className="font-heading text-lg text-brown mb-3">
            आगामी / Upcoming (60 दिन)
          </h2>
          <div className="space-y-3">
            {upcomingList.map((u) => (
              <div
                key={u.event.id + u.date.toISOString()}
                className={`flex items-center justify-between bg-white rounded-xl border px-4 py-3 ${
                  u.daysAway === 0
                    ? 'border-haldi-gold bg-haldi-gold/5 shadow-sm'
                    : 'border-cream-dark'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {EVENT_TYPES.find((t) => t.value === u.event.type)?.emoji || '📌'}
                  </span>
                  <div>
                    <p className="text-base font-semibold text-brown">{u.event.name}</p>
                    <p className="text-xs text-brown-light">
                      {formatEventLabel(u.event)} &middot; {eventTypeLabel(u.event.type)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${u.daysAway === 0 ? 'text-haldi-gold' : 'text-brown-light'}`}>
                    {formatRelativeDate(u.date)}
                  </p>
                  <p className="text-xs text-brown-light/70">
                    {u.date.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {u.calendarSource && (
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${u.calendarSource === 'tithi' ? 'bg-mehndi-green/15 text-mehndi-green' : 'bg-haldi-gold-light text-haldi-gold-dark'}`}>
                      {u.calendarSource === 'tithi' ? '🌙 तिथि' : '📅 तारीख़'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All saved events */}
      <section>
        <h2 className="font-heading text-lg text-brown mb-3">
          सभी तिथि घटनाएँ / All Events ({events.length})
        </h2>
        {isLoading ? (
          <p className="text-brown-light py-8 text-center">Loading…</p>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-xl border border-cream-dark px-6 py-10 text-center">
            <span className="text-4xl">🗓️</span>
            <p className="text-brown-light mt-3 text-base">
              कोई तिथि घटना नहीं है। ऊपर &ldquo;+ जोड़ें&rdquo; पर क्लिक करें।
            </p>
            <p className="text-sm text-brown-light/70 mt-1">
              No tithi events yet. Add a birthday, shraddha, or festival above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between bg-white rounded-xl border border-cream-dark px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {EVENT_TYPES.find((t) => t.value === e.type)?.emoji || '📌'}
                  </span>
                  <div>
                    <p className="text-base font-semibold text-brown">{e.name}</p>
                    <p className="text-xs text-brown-light">
                      {formatEventLabel(e)}
                      {e.gregorianReference && ` (${e.gregorianReference})`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-red-400 hover:text-red-600 text-sm min-h-dadi px-3"
                  title="Delete"
                >
                  हटाएँ
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Info box */}
      <div className="mt-8 bg-cream rounded-xl border border-haldi-gold/10 px-5 py-4">
        <h3 className="font-heading text-base text-haldi-gold mb-2">
          तिथि अनुस्मारक क्या है? / What are Tithi Reminders?
        </h3>
        <p className="text-sm text-brown-light leading-relaxed">
          हिंदू परंपरा में जन्मदिन, बरसी (श्राद्ध) और त्योहार तिथि (चंद्र दिवस) के
          आधार पर मनाए जाते हैं — ग्रेगोरियन तारीख़ से नहीं। उदाहरण: यदि किसी का
          जन्म &ldquo;भाद्रपद कृष्ण अष्टमी&rdquo; (जन्माष्टमी) को हुआ, तो हर साल वही
          तिथि आने पर जन्मदिन मनाया जाता है — अलग-अलग ग्रेगोरियन तारीख़ पर।
        </p>
        <p className="text-sm text-brown-light leading-relaxed mt-2">
          In Hindu tradition, birthdays and death anniversaries are observed by tithi
          (lunar day), not the Gregorian calendar date. This tool automatically finds when
          your events recur each year.
        </p>
        <p className="font-body text-base text-brown-light leading-relaxed mt-2">
          <strong>दोहरी कैलेंडर सूचना:</strong> ग्रेगोरियन तारीख़ के साथ event जोड़ने पर
          हर साल हिंदी तिथि <em>और</em> English date — दोनों दिन reminder मिलेगा।
          (e.g., 15-Aug-1980 birthday → हर 15-Aug को AND उस दिन की तिथि पर हर साल)
        </p>
        <p className="text-xs text-brown-light/60 mt-3">
          {storageMode === 'supabase'
            ? '✅ Supabase synced — reminders fire from server cron daily'
            : '⚠️ localStorage only — apply migration 20260428b_tithi_events_apply.sql to enable cross-device sync + push notifications'}
        </p>
      </div>
    </div>
  );
}

// ─── Add Event Form ───────────────────────────────────────────────────────────

function AddEventForm({ storageMode, onSave, onCancel }: { storageMode: 'supabase' | 'local'; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TithiEventType>('birthday');
  const [mode, setMode] = useState<'gregorian' | 'manual'>('gregorian');
  const [gregDate, setGregDate] = useState('');
  const [tithiNum, setTithiNum] = useState(1);
  const [masa, setMasa] = useState(1);
  const [note, setNote] = useState('');
  const [computedLabel, setComputedLabel] = useState('');

  // When Gregorian date changes, preview the tithi
  useEffect(() => {
    if (mode !== 'gregorian' || !gregDate) { setComputedLabel(''); return; }
    try {
      const d = new Date(gregDate + 'T06:00:00+05:30');
      const draft = buildEventFromGregorian('', 'birthday', d);
      const pakshaHindi = draft.paksha === 'shukla' ? 'शुक्ल' : 'कृष्ण';
      setComputedLabel(`${masaLabel(draft.masa)} ${pakshaHindi} ${tithiLabel(draft.tithiNumber)}`);
    } catch {
      setComputedLabel('');
    }
  }, [gregDate, mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    let draft: Omit<TithiEvent, 'id' | 'createdAt'>;
    if (mode === 'gregorian') {
      if (!gregDate) return;
      const d = new Date(gregDate + 'T06:00:00+05:30');
      draft = buildEventFromGregorian(name.trim(), type, d, { note: note.trim() || undefined });
    } else {
      const paksha: 'shukla' | 'krishna' = tithiNum <= 15 ? 'shukla' : 'krishna';
      draft = {
        name: name.trim(),
        type,
        tithiNumber: tithiNum,
        paksha,
        masa,
        note: note.trim() || undefined,
      };
    }

    if (storageMode === 'supabase') {
      await addEventToSupabase(draft);
    } else {
      addEvent(draft);
    }
    onSave();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-haldi-gold/20 p-5 mb-6 shadow-sm"
    >
      <h3 className="font-heading text-lg text-haldi-gold mb-4">
        नई तिथि घटना जोड़ें / Add Tithi Event
      </h3>

      {/* Name */}
      <div className="mb-4">
        <label className="text-sm text-brown-light block mb-1">नाम / Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="जैसे: दादाजी की बरसी, राहुल का जन्मदिन"
          className="w-full px-4 py-3 min-h-dadi rounded-xl border border-cream-dark bg-cream/30 text-brown text-base focus:outline-none focus:ring-2 focus:ring-haldi-gold/40"
          required
        />
      </div>

      {/* Type */}
      <div className="mb-4">
        <label className="text-sm text-brown-light block mb-1">प्रकार / Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TithiEventType)}
          className="w-full px-4 py-3 min-h-dadi rounded-xl border border-cream-dark bg-cream/30 text-brown text-base focus:outline-none focus:ring-2 focus:ring-haldi-gold/40"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.emoji} {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Mode toggle */}
      <div className="mb-4">
        <label className="text-sm text-brown-light block mb-2">तिथि कैसे बताएँ?</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('gregorian')}
            className={`flex-1 py-2 min-h-dadi rounded-xl text-sm font-semibold transition-colors ${
              mode === 'gregorian'
                ? 'bg-haldi-gold text-white'
                : 'bg-cream text-brown-light border border-cream-dark'
            }`}
          >
            📅 तारीख़ से (auto)
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 min-h-dadi rounded-xl text-sm font-semibold transition-colors ${
              mode === 'manual'
                ? 'bg-haldi-gold text-white'
                : 'bg-cream text-brown-light border border-cream-dark'
            }`}
          >
            🕉️ तिथि खुद बताएँ
          </button>
        </div>
      </div>

      {/* Gregorian input */}
      {mode === 'gregorian' && (
        <div className="mb-4">
          <label className="text-sm text-brown-light block mb-1">
            ग्रेगोरियन तारीख़ / Gregorian Date *
          </label>
          <input
            type="date"
            value={gregDate}
            onChange={(e) => setGregDate(e.target.value)}
            className="w-full px-4 py-3 min-h-dadi rounded-xl border border-cream-dark bg-cream/30 text-brown text-base focus:outline-none focus:ring-2 focus:ring-haldi-gold/40"
            required
          />
          {computedLabel && (
            <p className="text-sm text-mehndi-green mt-2 font-heading">
              → {computedLabel}
            </p>
          )}
        </div>
      )}

      {/* Manual tithi input */}
      {mode === 'manual' && (
        <>
          <div className="mb-4">
            <label className="text-sm text-brown-light block mb-1">तिथि / Tithi *</label>
            <select
              value={tithiNum}
              onChange={(e) => setTithiNum(Number(e.target.value))}
              className="w-full px-4 py-3 min-h-dadi rounded-xl border border-cream-dark bg-cream/30 text-brown text-base focus:outline-none focus:ring-2 focus:ring-haldi-gold/40"
            >
              {TITHI_LIST.map((t) => (
                <option key={t.num} value={t.num}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="text-sm text-brown-light block mb-1">मास / Month *</label>
            <select
              value={masa}
              onChange={(e) => setMasa(Number(e.target.value))}
              className="w-full px-4 py-3 min-h-dadi rounded-xl border border-cream-dark bg-cream/30 text-brown text-base focus:outline-none focus:ring-2 focus:ring-haldi-gold/40"
            >
              {MASA_LIST.map((m) => (
                <option key={m.num} value={m.num}>{m.hindi} ({m.english})</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Note */}
      <div className="mb-4">
        <label className="text-sm text-brown-light block mb-1">नोट / Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="कोई विशेष बात?"
          className="w-full px-4 py-3 min-h-dadi rounded-xl border border-cream-dark bg-cream/30 text-brown text-base focus:outline-none focus:ring-2 focus:ring-haldi-gold/40"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-5">
        <button
          type="submit"
          className="flex-1 min-h-dadi py-3 rounded-xl bg-haldi-gold text-white font-semibold text-base hover:bg-haldi-gold-dark transition-colors"
        >
          सहेजें / Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 min-h-dadi py-3 rounded-xl border border-cream-dark text-brown-light font-semibold text-base hover:bg-cream transition-colors"
        >
          रद्द
        </button>
      </div>
    </form>
  );
}
