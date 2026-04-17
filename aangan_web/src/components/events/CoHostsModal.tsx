'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import AvatarCircle from '@/components/ui/AvatarCircle';
import GoldButton from '@/components/ui/GoldButton';
import type { User } from '@/types/database';

interface CoHost {
  user_id: string;
  user: Pick<User, 'id' | 'display_name' | 'display_name_hindi' | 'avatar_url'>;
}

interface Props {
  eventId: string;
  onClose: () => void;
}

/**
 * CoHostsModal — Creator adds family members who can edit the event.
 * Indian wedding case: bride, groom, both mothers all need edit rights
 * without sharing one account.
 */
export default function CoHostsModal({ eventId, onClose }: Props) {
  const [coHosts, setCoHosts] = useState<CoHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data, error: dbErr } = await supabase
      .from('event_co_hosts')
      .select('user_id, user:users(id, display_name, display_name_hindi, avatar_url)')
      .eq('event_id', eventId);
    if (dbErr) {
      if (dbErr.code === '42P01') setError('माइग्रेशन अभी अप्लाई नहीं हुआ');
      else setError(dbErr.message);
    } else {
      setCoHosts((data ?? []) as unknown as CoHost[]);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [eventId]);

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

  const addCoHost = async (user: User) => {
    setWorking(user.id);
    const { error: dbErr } = await supabase.from('event_co_hosts').insert({
      event_id: eventId,
      user_id: user.id,
    });
    if (!dbErr || dbErr.code === '23505') {
      setResults((prev) => prev.filter((u) => u.id !== user.id));
      refresh();
    } else {
      setError(dbErr.message);
    }
    setWorking(null);
  };

  const removeCoHost = async (userId: string) => {
    if (!confirm('सह-मेज़बान हटाएं?')) return;
    setWorking(userId);
    const { error: dbErr } = await supabase.from('event_co_hosts')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);
    if (!dbErr) setCoHosts((prev) => prev.filter((m) => m.user_id !== userId));
    setWorking(null);
  };

  const coHostIds = new Set(coHosts.map((m) => m.user_id));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 mx-4 max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading text-xl text-brown">सह-मेज़बान — Co-hosts</h3>
          <button onClick={onClose} className="text-brown-light text-xl min-w-dadi min-h-dadi flex items-center justify-center rounded-lg hover:bg-cream-dark transition-colors">✕</button>
        </div>

        <p className="font-body text-sm text-brown-light mb-4">
          ये लोग इवेंट को एडिट कर सकेंगे, sub-events जोड़ सकेंगे, और पोटलक लिस्ट संभाल सकेंगे।
        </p>

        {error && (
          <div className="bg-red-50 border border-error rounded-lg px-4 py-3 mb-4">
            <p className="font-body text-base text-error">{error}</p>
          </div>
        )}

        <div className="mb-4">
          <h4 className="font-body font-semibold text-brown mb-2">मौजूदा सह-मेज़बान</h4>
          {loading ? (
            <p className="font-body text-base text-brown-light">…</p>
          ) : coHosts.length === 0 ? (
            <p className="font-body text-base text-brown-light">अभी कोई नहीं — सिर्फ़ आप एडिट कर सकते हैं</p>
          ) : (
            <div className="space-y-2">
              {coHosts.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-xl border border-gray-200">
                  <AvatarCircle src={m.user?.avatar_url} name={m.user?.display_name_hindi ?? m.user?.display_name} size={36} />
                  <span className="flex-1 font-body text-base text-brown truncate">
                    {m.user?.display_name_hindi ?? m.user?.display_name ?? m.user_id}
                  </span>
                  <button
                    onClick={() => removeCoHost(m.user_id)}
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

        <div>
          <h4 className="font-body font-semibold text-brown mb-2">+ नया सह-मेज़बान</h4>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="नाम या फोन नंबर से ढूंढें"
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 mb-2 font-body text-base text-brown focus:border-haldi-gold focus:outline-none"
          />

          {searching && <p className="font-body text-sm text-brown-light">ढूंढ रहे हैं…</p>}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.filter((u) => !coHostIds.has(u.id)).map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl border border-gray-200">
                  <AvatarCircle src={u.avatar_url} name={u.display_name_hindi ?? u.display_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-base text-brown truncate">{u.display_name_hindi ?? u.display_name}</p>
                    {u.village_city && <p className="font-body text-xs text-brown-light truncate">📍 {u.village_city}</p>}
                  </div>
                  <button
                    onClick={() => addCoHost(u)}
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
