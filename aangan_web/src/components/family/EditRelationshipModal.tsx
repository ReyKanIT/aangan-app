'use client';

// ─────────────────────────────────────────────────────────────────────────────
// EditRelationshipModal — change the relationship label on an existing
// family_members row in-place, both sides of the bidirectional pair
// updated atomically via update_family_member_relationship RPC
// (migration 20260501a).
//
// Why it exists:
//   The relationship catalogue grew from ~20 → 60+ options between v0.4
//   and v0.10 (taa, chacha, mama, mausa, devar, jeth, etc.). Members
//   added with the OLD small list were stuck — there was no way to
//   relabel them without removing + re-adding (which loses the connection
//   history). Kumar's verbal ask: "Allow one time to change the
//   relationship of members as earlier very smalllist was there."
//
//   This modal lets the user re-pick from the full list. The reverse
//   key for the other side is auto-derived from the same REVERSE_MAP
//   used by AddMemberDrawer.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  RELATIONSHIP_MAP,
  RELATIONSHIP_OPTIONS,
  getRelationshipLevel,
} from '@/lib/constants';
import { friendlyError } from '@/lib/errorMessages';
import GoldButton from '@/components/ui/GoldButton';

// Same reverse map used by AddMemberDrawer (the one source of truth for
// "if I added X as my Y, what does X see ME as?"). Hard-coded here to
// avoid a circular import — duplicated intentionally because changing
// either copy without the other would break new vs existing flows.
// TODO(consolidate): move to lib/relationshipReverse.ts and import from
//                    both AddMemberDrawer + EditRelationshipModal.
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

interface Props {
  /** family_members.family_member_id — the OTHER person's user.id, not the row PK. */
  memberId: string;
  /** What to show in the title ("X का रिश्ता बदलें — Update X's relationship"). */
  memberName: string;
  /** Current relationship_type so the picker pre-selects it. */
  currentRelType: string;
  /** Called on save success so the parent can refetch + close. */
  onSaved: () => void;
  /** Called when user dismisses without saving. */
  onClose: () => void;
}

export default function EditRelationshipModal({
  memberId,
  memberName,
  currentRelType,
  onSaved,
  onClose,
}: Props) {
  const [relType, setRelType] = useState(currentRelType);
  const [customLabel, setCustomLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const grouped = useMemo(() => {
    const out: Record<string, typeof RELATIONSHIP_OPTIONS> = {};
    for (const opt of RELATIONSHIP_OPTIONS) {
      (out[opt.group] ||= []).push(opt);
    }
    return out;
  }, []);

  const level = useMemo(() => (relType ? getRelationshipLevel(relType) : 1), [relType]);
  const dirty = relType !== currentRelType || (relType === 'other' && customLabel.trim().length > 0);

  async function handleSave() {
    if (!relType) {
      setError('रिश्ता चुनें — Select a relationship');
      return;
    }
    if (relType === 'other' && !customLabel.trim()) {
      setError('रिश्ते का नाम लिखें — Type the custom relationship name');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const relHindi = relType === 'other'
        ? customLabel.trim()
        : (RELATIONSHIP_MAP[relType] ?? relType);
      const reverseType = REVERSE_MAP[relType] ?? 'other';
      const reverseHindi = RELATIONSHIP_MAP[reverseType] ?? null;

      const { error: rpcErr } = await supabase.rpc(
        'update_family_member_relationship',
        {
          p_member_id: memberId,
          p_rel_type: relType,
          p_rel_hindi: relHindi,
          p_level: level,
          p_reverse_type: reverseType,
          p_reverse_hindi: reverseHindi,
        }
      );
      if (rpcErr) {
        setError(friendlyError(rpcErr.message));
        setSaving(false);
        return;
      }
      onSaved();
    } catch (e: unknown) {
      setError(friendlyError(e instanceof Error ? e.message : 'Update failed'));
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-rel-title"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 id="edit-rel-title" className="font-heading text-xl text-brown">
              रिश्ता बदलें
            </h3>
            <p className="font-body text-base text-brown-light mt-0.5">
              Update {memberName}&rsquo;s relationship
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-brown-light text-xl min-w-dadi min-h-dadi flex items-center justify-center rounded-lg hover:bg-cream-dark transition-colors"
            aria-label="Close"
          >✕</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 font-body text-base text-error">
            {error}
          </div>
        )}

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
              <label className="block font-body font-semibold text-brown mb-1">
                रिश्ते का नाम लिखें
                <span className="text-brown-light text-sm font-normal ml-2">Custom relationship name</span>
              </label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder={'e.g. गुरु, मित्र, धर्मपिता…'}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base focus:border-haldi-gold focus:outline-none bg-white"
              />
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 bg-cream-dark/50 rounded-xl px-4 py-3">
            <span className="font-body text-base text-brown-light">स्तर — Level</span>
            <span className="bg-haldi-gold-light text-haldi-gold-dark font-bold px-3 py-1 rounded-full text-base">
              L{level}
            </span>
            <span className="font-body text-base text-brown-light">
              {level === 1 ? 'सीधा परिवार — Direct' : level === 2 ? 'करीबी — Close' : 'विस्तारित — Extended'}
            </span>
            <span className="ml-auto text-sm text-brown-light italic">रिश्ते से तय</span>
          </div>
        </div>

        <p className="font-body text-sm text-brown-light mb-4">
          💡 दोनों तरफ़ का रिश्ता एक साथ अपडेट हो जाएगा।
          <br />
          Both sides of the connection will be updated atomically.
        </p>

        <GoldButton
          className="w-full"
          loading={saving}
          disabled={!dirty || saving}
          onClick={handleSave}
        >
          {dirty ? 'सेव करें — Save' : 'कोई बदलाव नहीं — No changes'}
        </GoldButton>
      </div>
    </div>
  );
}
