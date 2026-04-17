'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import AvatarCircle from '@/components/ui/AvatarCircle';
import type { EventPotluckItem, EventPotluckSignup } from '@/types/database';

interface Props {
  eventId: string;
  currentUserId: string | undefined;
  canManage: boolean; // creator or co-host
}

/**
 * PotluckSection — "क्या लाओगे?" The sign-up list families run over WhatsApp
 * today. Items added by host, guests claim "मैं लाऊँगा/गी" with quantity.
 * Shows filled-vs-needed at a glance.
 */
export default function PotluckSection({ eventId, currentUserId, canManage }: Props) {
  const [items, setItems] = useState<EventPotluckItem[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data: itemsData, error: itemsErr } = await supabase
      .from('event_potluck_items')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (itemsErr) {
      if (itemsErr.code === '42P01') setTableMissing(true);
      setLoading(false);
      return;
    }
    const itemIds = (itemsData ?? []).map((i) => i.id);
    let signups: EventPotluckSignup[] = [];
    if (itemIds.length > 0) {
      const { data: signupData } = await supabase
        .from('event_potluck_signups')
        .select('*, user:users(id, display_name, display_name_hindi, avatar_url)')
        .in('item_id', itemIds);
      signups = (signupData ?? []) as unknown as EventPotluckSignup[];
    }
    const byItem = new Map<string, EventPotluckSignup[]>();
    for (const s of signups) {
      const arr = byItem.get(s.item_id) ?? [];
      arr.push(s);
      byItem.set(s.item_id, arr);
    }
    const merged = (itemsData ?? []).map((i) => ({ ...i, signups: byItem.get(i.id) ?? [] })) as EventPotluckItem[];
    setItems(merged);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [eventId]);

  if (tableMissing) return null;

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    setAdding(true);
    await supabase.from('event_potluck_items').insert({
      event_id: eventId,
      item_name: newItem.trim(),
      quantity_needed: Math.max(1, parseInt(newItemQty, 10) || 1),
      created_by: currentUserId ?? null,
    });
    setNewItem(''); setNewItemQty('1');
    setAdding(false);
    refresh();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('इस आइटम को हटाएं?')) return;
    setBusy(itemId);
    await supabase.from('event_potluck_items').delete().eq('id', itemId);
    setBusy(null);
    refresh();
  };

  const toggleSignup = async (item: EventPotluckItem) => {
    if (!currentUserId) return;
    setBusy(item.id);
    const mine = item.signups?.find((s) => s.user_id === currentUserId);
    if (mine) {
      await supabase.from('event_potluck_signups').delete().eq('id', mine.id);
    } else {
      await supabase.from('event_potluck_signups').insert({
        item_id: item.id,
        user_id: currentUserId,
        quantity: 1,
      });
    }
    setBusy(null);
    refresh();
  };

  if (!canManage && items.length === 0) return null; // nothing to show non-hosts

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-heading text-lg text-brown">क्या लाओगे? — Potluck</h3>
          <p className="font-body text-sm text-brown-light">मेज़बान तय करे, मेहमान चुनें</p>
        </div>
      </div>

      {loading && <p className="font-body text-base text-brown-light">…</p>}

      {!loading && items.length === 0 && !canManage && (
        <p className="font-body text-base text-brown-light text-center py-4">अभी कुछ सूची में नहीं</p>
      )}

      <div className="space-y-3 mb-3">
        {items.map((item) => {
          const takenQty = item.signups?.reduce((s, sg) => s + (sg.quantity ?? 1), 0) ?? 0;
          const mine = item.signups?.find((s) => s.user_id === currentUserId);
          const isFilled = takenQty >= item.quantity_needed;
          return (
            <div key={item.id} className="p-3 rounded-xl border border-gray-200">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="font-body text-base font-semibold text-brown">{item.item_name_hindi ?? item.item_name}</p>
                    <span className={`font-body text-sm font-semibold ${isFilled ? 'text-green-600' : 'text-brown-light'}`}>
                      {takenQty}/{item.quantity_needed}
                    </span>
                  </div>
                  {item.notes && <p className="font-body text-sm text-brown-light">{item.notes}</p>}
                  {(item.signups?.length ?? 0) > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {item.signups!.map((s) => (
                        <div key={s.id} className="flex items-center gap-1.5 bg-cream rounded-full pr-2">
                          <AvatarCircle src={s.user?.avatar_url} name={s.user?.display_name_hindi ?? s.user?.display_name} size={24} />
                          <span className="font-body text-sm text-brown">{s.user?.display_name_hindi ?? s.user?.display_name ?? ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {canManage && (
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={busy === item.id}
                    className="text-brown-light hover:text-red-500 text-lg p-1"
                    aria-label="आइटम हटाएं"
                  >
                    ✕
                  </button>
                )}
              </div>
              {currentUserId && (
                <button
                  onClick={() => toggleSignup(item)}
                  disabled={busy === item.id || (isFilled && !mine)}
                  className={`mt-3 w-full min-h-dadi rounded-xl font-body font-semibold text-base transition-colors disabled:opacity-60 ${
                    mine
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : isFilled
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-haldi-gold text-white hover:bg-haldi-gold-dark'
                  }`}
                >
                  {mine ? '✓ मैं ला रहा/रही हूँ · हटाएं' : isFilled ? 'पूरा भर गया' : '+ मैं लाऊँगा/गी'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {canManage && (
        <div className="border-t border-gray-100 pt-3">
          <p className="font-body font-semibold text-brown mb-2">+ आइटम जोड़ें</p>
          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="जैसे — गाजर का हलवा"
              className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none"
            />
            <input
              type="number"
              min="1"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              className="w-16 border-2 border-gray-300 rounded-xl px-2 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none text-center"
            />
            <button
              onClick={handleAddItem}
              disabled={adding || !newItem.trim()}
              className="min-h-dadi px-4 rounded-xl bg-haldi-gold text-white font-body font-semibold text-base hover:bg-haldi-gold-dark disabled:opacity-60"
            >
              {adding ? '…' : '+ जोड़ें'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
