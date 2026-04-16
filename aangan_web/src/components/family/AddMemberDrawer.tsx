'use client';
import { useState, useEffect, useRef } from 'react';
import { useFamilyStore } from '@/stores/familyStore';
import AvatarCircle from '@/components/ui/AvatarCircle';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';
import { RELATIONSHIP_MAP } from '@/lib/constants';
import type { User } from '@/types/database';
import { supabase } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/errorMessages';

const REVERSE_MAP: Record<string, string> = {
  father: 'son', mother: 'son', son: 'father', daughter: 'father',
  brother: 'brother', sister: 'brother', husband: 'wife', wife: 'husband',
  grandfather_paternal: 'grandson', grandmother_paternal: 'grandson',
  grandfather_maternal: 'grandson', grandmother_maternal: 'grandson',
  uncle_paternal: 'nephew', aunt_paternal: 'nephew',
  uncle_maternal: 'nephew', aunt_maternal: 'nephew',
  nephew: 'uncle_paternal', niece: 'uncle_paternal',
  cousin: 'cousin',
  son_in_law: 'father_in_law', daughter_in_law: 'mother_in_law',
  father_in_law: 'son_in_law', mother_in_law: 'daughter_in_law',
  brother_in_law: 'brother_in_law', sister_in_law: 'sister_in_law',
  grandson: 'grandfather_paternal', granddaughter: 'grandmother_paternal',
  other: 'other',
};

type Tab = 'search' | 'manual';

interface Props { onClose: () => void; }

export default function AddMemberDrawer({ onClose }: Props) {
  const { searchUsers, searchResults, addMember, clearSearch } = useFamilyStore();
  const [activeTab, setActiveTab] = useState<Tab>('search');

  // Search tab state
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual tab state
  const [manualName, setManualName] = useState('');
  const [manualNameHindi, setManualNameHindi] = useState('');
  const [isDeceased, setIsDeceased] = useState(false);
  const [manualVillage, setManualVillage] = useState('');

  // Shared state
  const [relType, setRelType] = useState('');
  const [level, setLevel] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if (query.length >= 2) searchUsers(query);
      else clearSearch();
    }, 300);
  }, [query, searchUsers, clearSearch]);

  // ── Add existing user as family member ──
  const handleAddExisting = async () => {
    if (!selected || !relType) { setError('रिश्ता चुनें — Select relationship'); return; }
    setIsAdding(true);
    setError('');
    const relHindi = RELATIONSHIP_MAP[relType] ?? relType;
    const reverseType = REVERSE_MAP[relType] ?? 'other';
    const ok = await addMember(selected.id, relType, relHindi, level, reverseType);
    setIsAdding(false);
    if (ok) onClose();
    else setError('सदस्य नहीं जोड़ पाए — Could not add member');
  };

  // ── Add offline/deceased family member manually ──
  const handleAddManual = async () => {
    if (!manualName.trim()) { setError('नाम डालें — Enter name'); return; }
    if (!relType) { setError('रिश्ता चुनें — Select relationship'); return; }
    setIsAdding(true);
    setError('');

    try {
      // Insert into offline_family_members table
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setError('लॉगिन करें — Please login first'); setIsAdding(false); return; }

      const relHindi = RELATIONSHIP_MAP[relType] ?? relType;

      const { error: dbError } = await supabase.from('offline_family_members').insert({
        added_by: session.user.id,
        display_name: manualName.trim(),
        display_name_hindi: manualNameHindi.trim() || null,
        relationship_type: relType,
        relationship_label_hindi: relHindi,
        connection_level: level,
        is_deceased: isDeceased,
        village_city: manualVillage.trim() || null,
      });

      if (dbError) {
        // If table doesn't exist yet, show helpful message
        if (dbError.message?.includes('does not exist') || dbError.code === '42P01') {
          setError('यह सुविधा जल्दी आ रही है! — This feature is coming soon. Table setup pending.');
        } else {
          setError(friendlyError(dbError.message));
        }
        setIsAdding(false);
        return;
      }

      setSuccess('सदस्य जोड़ा गया! — Member added successfully');
      setTimeout(() => onClose(), 1200);
    } catch (e: unknown) {
      setError(friendlyError(e instanceof Error ? e.message : 'Failed to add member'));
    }
    setIsAdding(false);
  };

  // ── Relationship + Level picker (shared between tabs) ──
  const renderRelationshipPicker = () => (
    <>
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
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setLevel((l) => Math.max(1, l - 1))} className="w-12 h-12 rounded-xl bg-cream-dark text-brown font-bold text-xl min-h-dadi min-w-dadi flex items-center justify-center">−</button>
        <span className="font-body font-bold text-2xl text-haldi-gold">{level}</span>
        <button onClick={() => setLevel((l) => Math.min(3, l + 1))} className="w-12 h-12 rounded-xl bg-cream-dark text-brown font-bold text-xl min-h-dadi min-w-dadi flex items-center justify-center">+</button>
        <span className="font-body text-base text-brown-light">
          {level === 1 ? 'सीधा — Direct' : level === 2 ? 'करीबी — Close' : 'विस्तारित — Extended'}
        </span>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl p-6 mx-4 max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading text-xl text-brown">परिवार जोड़ें</h3>
          <button onClick={onClose} className="text-brown-light text-xl min-w-dadi min-h-dadi flex items-center justify-center rounded-lg hover:bg-cream-dark transition-colors">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-cream-dark rounded-xl p-1 mb-4">
          <button
            onClick={() => { setActiveTab('search'); setError(''); setSuccess(''); }}
            className={`flex-1 py-3 rounded-lg font-body text-base font-semibold transition-all ${activeTab === 'search' ? 'bg-white shadow text-haldi-gold' : 'text-brown-light'}`}
          >
            🔍 खोजें
            <span className="block text-base font-normal opacity-70">Search</span>
          </button>
          <button
            onClick={() => { setActiveTab('manual'); setError(''); setSuccess(''); }}
            className={`flex-1 py-3 rounded-lg font-body text-base font-semibold transition-all ${activeTab === 'manual' ? 'bg-white shadow text-haldi-gold' : 'text-brown-light'}`}
          >
            ✍️ मैन्युअल
            <span className="block text-base font-normal opacity-70">Add Manually</span>
          </button>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 font-body text-base text-error">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 font-body text-base text-mehndi-green">
            ✅ {success}
          </div>
        )}

        {/* ═══ SEARCH TAB ═══ */}
        {activeTab === 'search' && (
          <>
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
                {searchResults.length === 0 && query.length >= 2 && (
                  <div className="text-center py-4">
                    <p className="font-body text-base text-brown-light mb-3">
                      कोई नहीं मिला — No results found
                    </p>
                    <button
                      onClick={() => { setActiveTab('manual'); setManualName(query); setError(''); }}
                      className="font-body text-base text-haldi-gold font-semibold hover:underline min-h-dadi px-4"
                    >
                      ✍️ मैन्युअल जोड़ें — Add manually instead
                    </button>
                  </div>
                )}
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => { setSelected(user); clearSearch(); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cream-dark transition-colors mb-1 text-left min-h-dadi"
                  >
                    <AvatarCircle src={user.avatar_url} name={user.display_name_hindi ?? user.display_name} size={44} />
                    <div>
                      <p className="font-body font-semibold text-brown">{user.display_name_hindi ?? user.display_name}</p>
                      {user.village_city && <p className="font-body text-base text-brown-light">📍 {user.village_city}</p>}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                {/* Selected user card */}
                <div className="flex items-center gap-3 bg-cream-dark rounded-xl p-3 mb-4">
                  <AvatarCircle src={selected.avatar_url} name={selected.display_name_hindi ?? selected.display_name} size={48} />
                  <div>
                    <p className="font-body font-semibold text-brown">{selected.display_name_hindi ?? selected.display_name}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="ml-auto text-brown-light min-w-dadi min-h-dadi flex items-center justify-center rounded-lg hover:bg-cream transition-colors">✕</button>
                </div>

                {renderRelationshipPicker()}

                <GoldButton className="w-full" loading={isAdding} onClick={handleAddExisting}>
                  परिवार में जोड़ें — Add to Family
                </GoldButton>
              </div>
            )}
          </>
        )}

        {/* ═══ MANUAL TAB ═══ */}
        {activeTab === 'manual' && (
          <div className="space-y-3">
            <p className="font-body text-base text-brown-light mb-2">
              जो ऐप पर नहीं हैं या जो अब नहीं रहे, उन्हें यहाँ जोड़ें
              <br />
              <span className="text-brown-light/70">Add members not on the app, or who have passed away</span>
            </p>

            <InputField
              label="नाम"
              sublabel="Name (English)"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              autoFocus
            />

            <InputField
              label="नाम हिंदी में"
              sublabel="Name in Hindi (optional)"
              value={manualNameHindi}
              onChange={(e) => setManualNameHindi(e.target.value)}
              placeholder="e.g. रमेश कुमार"
            />

            <InputField
              label="गाँव / शहर"
              sublabel="Village / City (optional)"
              value={manualVillage}
              onChange={(e) => setManualVillage(e.target.value)}
              placeholder="e.g. Jaipur"
            />

            {/* Deceased toggle */}
            <div className="flex items-center gap-3 bg-cream/50 rounded-xl p-4 border border-gray-100">
              <button
                type="button"
                onClick={() => setIsDeceased(!isDeceased)}
                className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${isDeceased ? 'bg-brown' : 'bg-gray-300'}`}
                role="switch"
                aria-checked={isDeceased}
                aria-label="स्वर्गवासी — Deceased"
              >
                <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${isDeceased ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
              <div>
                <p className="font-body font-semibold text-brown text-base">स्वर्गवासी</p>
                <p className="font-body text-base text-brown-light">Deceased / Late</p>
              </div>
              {isDeceased && <span className="ml-auto text-2xl">🕊️</span>}
            </div>

            {renderRelationshipPicker()}

            <GoldButton className="w-full" loading={isAdding} onClick={handleAddManual}>
              {isDeceased ? '🕊️ स्मृति में जोड़ें — Add in Memory' : '✍️ परिवार में जोड़ें — Add to Family'}
            </GoldButton>
          </div>
        )}
      </div>
    </div>
  );
}
