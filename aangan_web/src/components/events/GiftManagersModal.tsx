'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import AvatarCircle from '@/components/ui/AvatarCircle';
import GoldButton from '@/components/ui/GoldButton';
import type { User } from '@/types/database';

interface Manager {
  user_id: string;
  user: Pick<User, 'id' | 'display_name' | 'display_name_hindi' | 'avatar_url'>;
}

interface Props {
  eventId: string;
  onClose: () => void;
}

/**
 * GiftManagersModal — Creator grants a handful of trusted family members
 * (host side) access to the gift register. Adds rows in event_gift_managers.
 * Uses a simple phone/name search against the users table.
 */
export default function GiftManagersModal({ eventId, onClose }: Props) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data, error: dbErr } = await supabase
      .from('event_gift_managers')
      .select('user_id, user:users(id, display_name, display_name_hindi, avatar_url)')
      .eq('event_id', eventId);
    if (dbErr) {
      if (dbErr.code === '42P01') setError('माइग्रेशन अभी अप्लाई नहीं हुआ');
      else setError(dbErr.message);
    } else {
      setManagers((data ?? []) as unknown as Manager[]);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [eventId]);

  // Debounced search against users table
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) { setResults([]); return; }
    setSearching(true);
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id, display_name, display_name_hindi, avatar_url, phone_number, village_city')
        .or(`display_name.ilike.%${trimmed}%,display_name_hindi.ilike.%${trimmed}%,phone_number.ilike.%${trimmed}%`)
        .limit(8);
      setResults((data ?? []) as User[]);
      setSearching(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const addManager = async (user: User) => {
    setWorking(user.id);
    const { error: dbErr } = await supabase.from('event_gift_managers').insert({
      event_id: eventId,
      user_id: user.id,
    });
    if (!dbErr) {
      setResults((prev) => prev.filter((u) => u.id !== user.id));
      refresh();
    } else if (dbErr.code === '23505') {
      // already a manager; ignore
      refresh();
    } else {
      setError(dbErr.message);
    }
    setWorking(null);
  };

  const removeManager = async (userId: string) => {
    if (!confirm('एक्सेस हटाएं?')) return;
    setWorking(userId);
    const { error: dbErr } = await supabase.from('event_gift_managers')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);
    if (!dbErr) setManagers((prev) => prev.filter((m) => m.user_id !== userId));
    setWorking(null);
  };

  const managerIds = new Set(managers.map((m) => m.user_id));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 mx-4 max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading text-xl text-brown">बही एक्सेस — Gift Register Access</h3>
          <button onClick={onClose} className="text-brown-light text-xl min-w-dadi min-h-dadi flex items-center justify-center rounded-lg hover:bg-cream-dark transition-colors">✕</button>
        </div>

        <p className="font-body text-sm text-brown-light mb-4">
          ये लोग शगुन बही देख और एडिट कर सकेंगे। मेज़बान पक्ष के भरोसेमंद लोगों को ही जोड़ें।
        </p>

        {error && (
          <div className="bg-red-50 border border-error rounded-lg px-4 py-3 mb-4">
            <p className="font-body text-base text-error">{error}</p>
          </div>
        )}

        {/* Existing managers */}
        <div className="mb-4">
          <h4 className="font-body font-semibold text-brown mb-2">मौजूदा एक्सेस</h4>
          {loading ? (
            <p className="font-body text-base text-brown-light">…</p>
          ) : managers.length === 0 ? (
            <p className="font-body text-base text-brown-light">अभी कोई नहीं — सिर्फ़ आप देख सकते हैं</p>
          ) : (
            <div className="space-y-2">
              {managers.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-xl border border-gray-200">
                  <AvatarCircle src={m.user?.avatar_url} name={m.user?.display_name_hindi ?? m.user?.display_name} size={36} />
                  <span className="flex-1 font-body text-base text-brown truncate">
                    {m.user?.display_name_hindi ?? m.user?.display_name ?? m.user_id}
                  </span>
                  <button
                    onClick={() => removeManager(m.user_id)}
                    disabled={working === m.user_id}
                    className="min-h-dadi px-3 rounded-lg border-2 border-red-400 text-red-600 font-body text-base font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    हटाएं
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search / add */}
        <div>
          <h4 className="font-body font-semibold text-brown mb-2">+ नया जोड़ें</h4>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="नाम या फोन नंबर से ढूंढें"
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 mb-2 font-body text-base text-brown focus:border-haldi-gold focus:outline-none"
          />

          {searching && <p className="font-body text-sm text-brown-light">ढूंढ रहे हैं…</p>}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.filter((u) => !managerIds.has(u.id)).map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl border border-gray-200">
                  <AvatarCircle src={u.avatar_url} name={u.display_name_hindi ?? u.display_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-base text-brown truncate">{u.display_name_hindi ?? u.display_name}</p>
                    {u.village_city && <p className="font-body text-xs text-brown-light truncate">📍 {u.village_city}</p>}
                  </div>
                  <button
                    onClick={() => addManager(u)}
                    disabled={working === u.id}
                    className="min-h-dadi px-4 rounded-xl bg-haldi-gold text-white font-body text-base font-semibold hover:bg-haldi-gold-dark disabled:opacity-50 transition-colors"
                  >
                    {working === u.id ? '…' : '+ जोड़ें'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <GoldButton variant="outline" className="w-full" onClick={onClose}>बंद करें</GoldButton>
        </div>
      </div>
    </div>
  );
}
