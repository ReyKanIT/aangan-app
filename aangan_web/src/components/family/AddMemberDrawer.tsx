'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useFamilyStore } from '@/stores/familyStore';
import AvatarCircle from '@/components/ui/AvatarCircle';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';
import {
  RELATIONSHIP_MAP,
  RELATIONSHIP_OPTIONS,
  GENDER_OPTIONS,
  getRelationshipLevel,
} from '@/lib/constants';
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

const GROUP_LABELS: Record<string, string> = {
  immediate:    'सीधा परिवार — Immediate Family (L1)',
  grandparents: 'दादा-दादी / पोता-पोती — Grandparents & Grandchildren (L2)',
  in_laws:      'ससुराल — In-laws (L2)',
  great:        'पर-दादा-दादी — Great-grandparents (L3)',
  extended:     'चाचा-मामा / भतीजा-भांजा / चचेरे — Extended (L3)',
  other:        'अन्य — Other',
};
const GROUP_ORDER = ['immediate', 'grandparents', 'in_laws', 'great', 'extended', 'other'] as const;

type Tab = 'search' | 'manual';

interface Props { onClose: () => void; }

export default function AddMemberDrawer({ onClose }: Props) {
  const { searchUsers, searchResults, addMember, clearSearch, error: storeError } = useFamilyStore();
  const [activeTab, setActiveTab] = useState<Tab>('search');

  // Search tab state
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual tab state — basic
  const [manualName, setManualName] = useState('');
  const [manualNameHindi, setManualNameHindi] = useState('');
  const [isDeceased, setIsDeceased] = useState(false);

  // Manual tab state — extended profile
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [dod, setDod] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [village, setVillage] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Shared state
  const [relType, setRelType] = useState('');
  const [customRelLabel, setCustomRelLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-derived level from relationship type
  const level = useMemo(() => (relType ? getRelationshipLevel(relType) : 1), [relType]);

  // Group relationships for the dropdown
  const grouped = useMemo(() => {
    const out: Record<string, typeof RELATIONSHIP_OPTIONS> = {};
    for (const opt of RELATIONSHIP_OPTIONS) {
      (out[opt.group] ||= []).push(opt);
    }
    return out;
  }, []);

  // Aangan-ID-aware search.
  // If the query looks like an Aangan ID (starts with "AAN" or "AAN-"), we
  // bypass the name-fuzzy search and resolve directly via the lookup RPC —
  // a friend who shared their stable ID lands as a single, unambiguous
  // result instead of getting buried under similarly-named users.
  // Anything else falls through to the existing name search.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const trimmed = query.trim();
    debounce.current = setTimeout(async () => {
      if (trimmed.length < 2) { clearSearch(); return; }
      const isAanganId = /^AAN[-]?[A-Z0-9]{4,12}$/i.test(trimmed.replace(/\s+/g, ''));
      if (isAanganId) {
        const normalized = trimmed.replace(/\s+/g, '').toUpperCase();
        const candidate = normalized.startsWith('AAN-') ? normalized : 'AAN-' + normalized.slice(3);
        const { data, error } = await supabase.rpc('lookup_user_by_aangan_id', { p_aangan_id: candidate });
        if (!error && data && data.length > 0) {
          // Re-use the same store slot so the result list renders identically.
          useFamilyStore.setState({ searchResults: data as User[] });
          return;
        }
        // Fall back to name search if no exact ID match.
      }
      searchUsers(trimmed);
    }, 300);
  }, [query, searchUsers, clearSearch]);

  const onPhotoChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('फ़ोटो 5MB से बड़ी है — Photo larger than 5MB'); return; }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    setError('');
  };

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
    else setError(storeError || 'सदस्य नहीं जोड़ पाए — Could not add member');
  };

  // ── Add offline/deceased family member manually ──
  const handleAddManual = async () => {
    if (!manualName.trim()) { setError('नाम डालें — Enter name'); return; }
    if (!relType) { setError('रिश्ता चुनें — Select relationship'); return; }
    if (relType === 'other' && !customRelLabel.trim()) {
      setError('रिश्ता लिखें — Type the custom relationship name'); return;
    }
    if (mobile && !/^[6-9]\d{9}$/.test(mobile.replace(/\D/g, ''))) {
      setError('मोबाइल नंबर सही नहीं — Invalid mobile number'); return;
    }

    setIsAdding(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setError('लॉगिन करें — Please login first'); setIsAdding(false); return; }

      // 1) Upload photo first (if any)
      let avatarUrl: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split('.').pop() || 'jpg';
        const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('family-photos')
          .upload(path, photoFile, { contentType: photoFile.type, upsert: false });
        if (upErr) {
          if (upErr.message?.toLowerCase().includes('bucket') || upErr.message?.toLowerCase().includes('not found')) {
            setError('फ़ोटो सेवा तैयार हो रही है — Photo storage not ready yet (run migration)');
          } else {
            setError(friendlyError(upErr.message));
          }
          setIsAdding(false);
          return;
        }
        const { data: pub } = supabase.storage.from('family-photos').getPublicUrl(path);
        avatarUrl = pub.publicUrl;
      }

      const relHindi = relType === 'other'
        ? customRelLabel.trim()
        : (RELATIONSHIP_MAP[relType] ?? relType);

      const { error: dbError } = await supabase.from('offline_family_members').insert({
        added_by: session.user.id,
        display_name: manualName.trim(),
        display_name_hindi: manualNameHindi.trim() || null,
        relationship_type: relType,
        relationship_label_hindi: relHindi,
        custom_relationship_label: relType === 'other' ? customRelLabel.trim() : null,
        connection_level: level,
        is_deceased: isDeceased,
        village_city: village.trim() || null,
        current_address: address.trim() || null,
        avatar_url: avatarUrl,
        mobile_number: mobile.trim() || null,
        email: email.trim() || null,
        date_of_birth: dob || null,
        date_of_death: isDeceased ? (dod || null) : null,
        birth_year: dob ? Number(dob.slice(0, 4)) : null,
        death_year: isDeceased && dod ? Number(dod.slice(0, 4)) : null,
        gender: gender || null,
        occupation: occupation.trim() || null,
        notes: notes.trim() || null,
      });

      if (dbError) {
        if (dbError.message?.includes('does not exist') || dbError.code === '42P01') {
          setError('यह सुविधा जल्दी आ रही है! — Run the latest migration first.');
        } else if (dbError.code === '42703') {
          setError('नए field तैयार नहीं — Run migration 20260427_family_member_extended_fields.sql');
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

  // ── Relationship picker — grouped, with locked auto-derived level chip ──
  const renderRelationshipPicker = () => (
    <div className="mb-4">
      <label className="block font-body font-semibold text-brown mb-2">रिश्ता — Relationship</label>
      <select
        value={relType}
        onChange={(e) => setRelType(e.target.value)}
        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base focus:border-haldi-gold focus:outline-none bg-white"
      >
        <option value="">रिश्ता चुनें — Select Relationship</option>
        {GROUP_ORDER.map((g) => (
          grouped[g] && grouped[g].length > 0 && (
            <optgroup key={g} label={GROUP_LABELS[g]}>
              {grouped[g].map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.hindi} — {opt.english}
                </option>
              ))}
            </optgroup>
          )
        ))}
      </select>

      {relType === 'other' && (
        <div className="mt-3">
          <InputField
            label="रिश्ते का नाम लिखें"
            sublabel="Custom relationship name"
            value={customRelLabel}
            onChange={(e) => setCustomRelLabel(e.target.value)}
            placeholder="e.g. गुरु, मित्र, धर्मपिता…"
          />
        </div>
      )}

      {/* Auto-derived level — read-only chip */}
      <div className="mt-3 flex items-center gap-3 bg-cream-dark/50 rounded-xl px-4 py-3">
        <span className="font-body text-base text-brown-light">स्तर — Level</span>
        <span className="bg-haldi-gold-light text-haldi-gold-dark font-bold px-3 py-1 rounded-full text-base">
          L{level}
        </span>
        <span className="font-body text-base text-brown-light">
          {level === 1 ? 'सीधा परिवार — Direct' : level === 2 ? 'करीबी — Close' : 'विस्तारित — Extended'}
        </span>
        <span className="ml-auto text-base text-brown-light italic">रिश्ते से तय</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 font-body text-base text-error">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 font-body text-base text-mehndi-green">✅ {success}</div>
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
                  placeholder="नाम या आँगन ID — Name or Aangan ID"
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base focus:border-haldi-gold focus:outline-none mb-1"
                  autoFocus
                />
                <p className="font-body text-xs text-brown-light mb-3">
                  💡 आपके रिश्तेदार की आँगन ID सबसे पक्का तरीका है —
                  Their Aangan ID (e.g. <code className="font-mono">AAN-X7K2P9</code>) is the surest way to find them.
                </p>
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
                    <div className="min-w-0 flex-1">
                      <p className="font-body font-semibold text-brown truncate">{user.display_name_hindi ?? user.display_name}</p>
                      {user.aangan_id && (
                        <p className="font-mono text-xs text-haldi-gold-dark truncate">{user.aangan_id}</p>
                      )}
                      {user.village_city && <p className="font-body text-base text-brown-light truncate">📍 {user.village_city}</p>}
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
              <span className="text-brown-light/70">Add members not on the app, or who have passed away (photo allowed)</span>
            </p>

            {/* Photo upload */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-20 h-20 rounded-full border-2 border-dashed border-haldi-gold flex items-center justify-center bg-cream-dark/40 hover:bg-cream-dark transition-colors overflow-hidden"
                aria-label="फ़ोटो जोड़ें — Upload photo"
              >
                {photoPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">📷</span>
                )}
              </button>
              <div>
                <p className="font-body font-semibold text-brown text-base">
                  {photoFile ? 'फ़ोटो चुनी गई' : 'फ़ोटो जोड़ें'}
                </p>
                <p className="font-body text-base text-brown-light">
                  {photoFile ? 'Tap to change' : 'Optional — works for everyone, including 🕊️'}
                </p>
                {photoFile && (
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(''); if (photoInputRef.current) photoInputRef.current.value = ''; }}
                    className="font-body text-base text-error mt-1 underline"
                  >
                    हटाएं — Remove
                  </button>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={onPhotoChosen}
                className="hidden"
              />
            </div>

            <InputField
              label="नाम"
              sublabel="Name (English)"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
            />

            <InputField
              label="नाम हिंदी में"
              sublabel="Name in Hindi (optional)"
              value={manualNameHindi}
              onChange={(e) => setManualNameHindi(e.target.value)}
              placeholder="e.g. रमेश कुमार"
            />

            {/* Relationship + auto level */}
            {renderRelationshipPicker()}

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

            {/* Contact */}
            <InputField
              label="मोबाइल नंबर"
              sublabel="Mobile (optional)"
              prefix="+91"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10-digit mobile"
              inputMode="numeric"
              maxLength={10}
            />

            <InputField
              label="ईमेल"
              sublabel="Email (optional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />

            {/* Dates */}
            <InputField
              label="जन्म तिथि"
              sublabel="Date of birth (optional)"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />

            {isDeceased && (
              <InputField
                label="मृत्यु तिथि"
                sublabel="Date of passing (optional)"
                type="date"
                value={dod}
                onChange={(e) => setDod(e.target.value)}
              />
            )}

            {/* Gender */}
            <div>
              <label className="block font-body font-semibold text-brown mb-2">लिंग — Gender</label>
              <div className="flex gap-2">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`flex-1 py-3 rounded-xl font-body text-base font-semibold border-2 transition-all min-h-dadi ${gender === g.value ? 'border-haldi-gold bg-haldi-gold-light text-haldi-gold-dark' : 'border-gray-200 bg-white text-brown-light'}`}
                  >
                    {g.hindi}
                    <span className="block text-base font-normal opacity-70">{g.english}</span>
                  </button>
                ))}
              </div>
            </div>

            <InputField
              label="व्यवसाय"
              sublabel="Occupation (optional)"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g. Farmer, Teacher, Retired"
            />

            <InputField
              label="गाँव / पैतृक स्थान"
              sublabel="Native village / city (optional)"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="e.g. Jaipur"
            />

            <InputField
              label="वर्तमान पता"
              sublabel="Current address (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House, street, city"
            />

            <div>
              <label className="block font-body font-semibold text-brown mb-2">नोट्स — Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="कोई याद, विशेष बात…"
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base focus:border-haldi-gold focus:outline-none bg-white resize-none"
              />
            </div>

            <GoldButton className="w-full" loading={isAdding} onClick={handleAddManual}>
              {isDeceased ? '🕊️ स्मृति में जोड़ें — Add in Memory' : '✍️ परिवार में जोड़ें — Add to Family'}
            </GoldButton>
          </div>
        )}
      </div>
    </div>
  );
}
