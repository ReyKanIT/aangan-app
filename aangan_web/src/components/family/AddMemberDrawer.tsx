'use client';
import { useState, useEffect, useRef } from 'react';
import { useFamilyStore } from '@/stores/familyStore';
import AvatarCircle from '@/components/ui/AvatarCircle';
import GoldButton from '@/components/ui/GoldButton';
import { RELATIONSHIP_MAP } from '@/lib/constants';
import type { User } from '@/types/database';

const REVERSE_MAP: Record<string, string> = {
  father: 'son', mother: 'son', son: 'father', daughter: 'father',
  brother: 'brother', sister: 'brother', husband: 'wife', wife: 'husband',
  grandfather_paternal: 'grandson', grandmother_paternal: 'grandson',
  grandfather_maternal: 'grandson', grandmother_maternal: 'grandson',
  uncle_paternal: 'nephew', aunt_paternal: 'nephew',
  nephew: 'uncle_paternal', niece: 'uncle_paternal',
  other: 'other',
};

interface Props { onClose: () => void; }

export default function AddMemberDrawer({ onClose }: Props) {
  const { searchUsers, searchResults, addMember, clearSearch } = useFamilyStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [relType, setRelType] = useState('');
  const [level, setLevel] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if (query.length >= 2) searchUsers(query);
      else clearSearch();
    }, 300);
  }, [query, searchUsers, clearSearch]);

  const handleAdd = async () => {
    if (!selected || !relType) { setError('रिश्ता चुनें'); return; }
    setIsAdding(true);
    const relHindi = RELATIONSHIP_MAP[relType] ?? relType;
    const reverseType = REVERSE_MAP[relType] ?? 'other';
    const ok = await addMember(selected.id, relType, relHindi, level, reverseType);
    setIsAdding(false);
    if (ok) onClose();
    else setError('सदस्य नहीं जोड़ पाए');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl lg:rounded-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading text-xl text-brown">परिवार जोड़ें</h3>
          <button onClick={onClose} className="text-brown-light text-xl min-w-dadi min-h-dadi flex items-center justify-center rounded-lg hover:bg-cream-dark transition-colors">✕</button>
        </div>

        {!selected ? (
          <div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="नाम से खोजें — Search by name"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base focus:border-haldi-gold focus:outline-none mb-3"
              autoFocus
            />
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => { setSelected(user); clearSearch(); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cream-dark transition-colors mb-1 text-left min-h-dadi"
              >
                <AvatarCircle src={user.avatar_url} name={user.display_name_hindi ?? user.display_name} size={44} />
                <div>
                  <p className="font-body font-semibold text-brown">{user.display_name_hindi ?? user.display_name}</p>
                  {user.village_city && <p className="font-body text-xs text-brown-light">📍 {user.village_city}</p>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 bg-cream-dark rounded-xl p-3 mb-4">
              <AvatarCircle src={selected.avatar_url} name={selected.display_name_hindi ?? selected.display_name} size={48} />
              <div>
                <p className="font-body font-semibold text-brown">{selected.display_name_hindi ?? selected.display_name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="ml-auto text-brown-light min-w-dadi min-h-dadi flex items-center justify-center rounded-lg hover:bg-cream transition-colors">✕</button>
            </div>

            <label className="block font-body font-semibold text-brown mb-2">रिश्ता — Relationship</label>
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base focus:border-haldi-gold focus:outline-none mb-4 bg-white"
            >
              <option value="">रिश्ता चुनें — Select Relationship</option>
              {Object.entries(RELATIONSHIP_MAP).map(([key, val]) => (
                <option key={key} value={key}>{val} — {key.replace(/_/g, ' ')}</option>
              ))}
            </select>

            <label className="block font-body font-semibold text-brown mb-2">स्तर — Connection Level</label>
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setLevel((l) => Math.max(1, l - 1))} className="w-12 h-12 rounded-xl bg-cream-dark text-brown font-bold text-xl">−</button>
              <span className="font-body font-bold text-2xl text-haldi-gold">{level}</span>
              <button onClick={() => setLevel((l) => Math.min(3, l + 1))} className="w-12 h-12 rounded-xl bg-cream-dark text-brown font-bold text-xl">+</button>
            </div>

            {error && <p className="font-body text-sm text-error mb-3">{error}</p>}
            <GoldButton className="w-full" loading={isAdding} onClick={handleAdd}>
              परिवार में जोड़ें — Add to Family
            </GoldButton>
          </div>
        )}
      </div>
    </div>
  );
}
