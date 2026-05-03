'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { EventGift, GiftType } from '@/types/database';

interface Props {
  eventId: string;
  currentUserId: string | undefined;
  isCreator: boolean;
  onOpenManagers?: () => void;
}

const GIFT_TYPES: { value: GiftType; label: string; emoji: string }[] = [
  { value: 'cash', label: 'नकद / Cash', emoji: '💵' },
  { value: 'gold', label: 'सोना / Gold', emoji: '🟡' },
  { value: 'silver', label: 'चाँदी / Silver', emoji: '⚪' },
  { value: 'gift', label: 'उपहार / Gift', emoji: '🎁' },
  { value: 'blessing', label: 'आशीर्वाद / Blessing', emoji: '🙏' },
  { value: 'other', label: 'अन्य / Other', emoji: '📦' },
];

function inr(n: number | null | undefined): string {
  if (n == null) return '';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

/**
 * GiftRegister — Private shagun/नेग ledger. Shown only if the viewer is the
 * creator or in event_gift_managers. Falls back silently (no render) if the
 * gift tables don't exist yet — lets us ship UI before Kumar applies the
 * v0.9.2 migration, without crashing.
 */
export default function GiftRegister({ eventId, currentUserId, isCreator, onOpenManagers }: Props) {
  const [gifts, setGifts] = useState<EventGift[]>([]);
  const [canAccess, setCanAccess] = useState<boolean>(isCreator);
  const [tableMissing, setTableMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form state
  const [giverName, setGiverName] = useState('');
  const [giftType, setGiftType] = useState<GiftType>('cash');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_gifts')
      .select('*')
      .eq('event_id', eventId)
      .order('received_at', { ascending: false });

    // RLS will filter non-host-side viewers out; an empty list is valid.
    if (error) {
      // 42P01 = relation does not exist (migration not yet applied)
      if (error.code === '42P01') {
        setTableMissing(true);
        setCanAccess(false);
      }
      setGifts([]);
    } else {
      setGifts((data ?? []) as EventGift[]);
      setTableMissing(false);
    }
    setLoading(false);
  };

  // Check access independently: if the viewer is the creator they always see the
  // panel. Otherwise, check the managers table for their row.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isCreator) {
        setCanAccess(true);
      } else if (currentUserId) {
        const { data, error } = await supabase
          .from('event_gift_managers')
          .select('event_id')
          .eq('event_id', eventId)
          .eq('user_id', currentUserId)
          .maybeSingle();
        if (error?.code === '42P01') { setTableMissing(true); setCanAccess(false); }
        else if (!cancelled) setCanAccess(!!data);
      }
      await refresh();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, currentUserId, isCreator]);

  if (tableMissing || !canAccess) return null;

  const handleAdd = async () => {
    setFormError(null);
    if (!giverName.trim()) { setFormError('देने वाले का नाम ज़रूरी है'); return; }
    setSaving(true);
    const payload = {
      event_id: eventId,
      giver_name: giverName.trim(),
      gift_type: giftType,
      amount: amount ? Number(amount) : null,
      description: description.trim() || null,
      notes: notes.trim() || null,
      received_at: new Date().toISOString(),
      logged_by: currentUserId ?? null,
    };
    const { error } = await supabase.from('event_gifts').insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setGiverName(''); setAmount(''); setDescription(''); setNotes(''); setGiftType('cash');
    setAdding(false);
    refresh();
  };

  const handleDelete = async (giftId: string) => {
    if (!confirm('इस एंट्री को हटाएं?')) return;
    const { error } = await supabase.from('event_gifts').delete().eq('id', giftId);
    if (!error) setGifts((prev) => prev.filter((g) => g.id !== giftId));
  };

  const totalCash = gifts
    .filter((g) => g.gift_type === 'cash' && g.amount != null)
    .reduce((sum, g) => sum + (g.amount ?? 0), 0);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-4 border-2 border-haldi-gold/30">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <h3 className="font-heading text-lg text-brown">शगुन / नेग बही — Gift Register</h3>
          <p className="font-body text-sm text-brown-light">सिर्फ़ मेज़बान और सौंपे गए लोग देख सकते हैं · Private to host side</p>
        </div>
        {isCreator && onOpenManagers && (
          <button
            onClick={onOpenManagers}
            className="min-h-dadi px-4 rounded-xl border-2 border-haldi-gold text-haldi-gold-dark font-body text-base font-semibold hover:bg-unread-bg transition-colors whitespace-nowrap"
          >
            👥 एक्सेस दें
          </button>
        )}
      </div>

      {gifts.length > 0 && (
        <div className="bg-cream rounded-xl p-3 mb-3 flex items-center justify-between">
          <span className="font-body text-base text-brown-light">{gifts.length} एंट्री</span>
          {totalCash > 0 && (
            <span className="font-body text-base font-semibold text-brown">
              कुल नकद: {inr(totalCash)}
            </span>
          )}
        </div>
      )}

      {!loading && gifts.length === 0 && !adding && (
        <p className="font-body text-base text-brown-light text-center py-6">अभी कोई एंट्री नहीं — No entries yet</p>
      )}

      {gifts.length > 0 && (
        <div className="space-y-2 mb-3">
          {gifts.map((g) => {
            const typeInfo = GIFT_TYPES.find((t) => t.value === g.gift_type) ?? GIFT_TYPES[5];
            return (
              <div key={g.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200">
                <span className="text-2xl">{typeInfo.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="font-body text-base font-semibold text-brown">{g.giver_name}</p>
                    {g.amount != null && <span className="font-body text-base text-haldi-gold-dark font-semibold">{inr(g.amount)}</span>}
                  </div>
                  {g.description && <p className="font-body text-sm text-brown-light">{g.description}</p>}
                  {g.notes && <p className="font-body text-xs text-brown-light italic mt-1">{g.notes}</p>}
                  <p className="font-body text-xs text-brown-light mt-1">{new Date(g.received_at).toLocaleDateString('hi-IN')}</p>
                </div>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="text-brown-light hover:text-red-500 text-xl p-1"
                  aria-label={'हटाएं'}
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="w-full min-h-dadi rounded-xl bg-haldi-gold text-white font-body font-semibold text-base hover:bg-haldi-gold-dark transition-colors"
        >
          + एंट्री जोड़ें — Add Entry
        </button>
      ) : (
        <div className="space-y-3 border-t border-gray-100 pt-3">
          {formError && <p className="font-body text-base text-error">{formError}</p>}

          <div>
            <label className="block font-body font-semibold text-brown mb-1">देने वाले का नाम *</label>
            <input
              value={giverName}
              onChange={(e) => setGiverName(e.target.value)}
              placeholder={'जैसे — चाचा रामकुमार'}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-body font-semibold text-brown mb-1">क्या दिया?</label>
            <div className="grid grid-cols-3 gap-2">
              {GIFT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setGiftType(t.value)}
                  className={`p-2 rounded-xl border-2 flex flex-col items-center min-h-dadi transition-all ${giftType === t.value ? 'border-haldi-gold bg-unread-bg' : 'border-gray-200 hover:border-haldi-gold-light'}`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="font-body text-xs text-brown">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body font-semibold text-brown mb-1">रुपये (optional)</label>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5100"
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-body font-semibold text-brown mb-1">विवरण</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={'जैसे — सोने की अँगूठी'}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-body font-semibold text-brown mb-1">नोट्स</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={'कोई निजी नोट...'}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setAdding(false); setFormError(null); }}
              className="flex-1 min-h-dadi rounded-xl border-2 border-gray-300 text-brown font-body font-semibold text-base hover:bg-cream-dark transition-colors"
            >
              रद्द करें
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 min-h-dadi rounded-xl bg-haldi-gold text-white font-body font-semibold text-base hover:bg-haldi-gold-dark transition-colors disabled:opacity-60"
            >
              {saving ? '…' : 'सेव करें ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
