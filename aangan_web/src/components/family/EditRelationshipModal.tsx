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
//   key for the other side is auto-derived via getReverse() from
//   lib/relationshipReverse.ts — the single source of truth shared
//   with AddMemberDrawer.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  RELATIONSHIP_MAP,
  RELATIONSHIP_OPTIONS,
  getRelationshipLevel,
} from '@/lib/constants';
import { getReverse } from '@/lib/relationshipReverse';
import { friendlyError } from '@/lib/errorMessages';
import GoldButton from '@/components/ui/GoldButton';
import { isFeatureEnabled } from '@/lib/features';
import type { SecondaryRelationship } from '@/types/database';

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
  /** v0.15.3 — current array of additional relationships for this member.
   *  Defaults to empty when SECONDARY_RELATIONSHIPS feature flag is off. */
  currentSecondary?: SecondaryRelationship[];
  /** Called on save success so the parent can refetch + close. */
  onSaved: () => void;
  /** Called when user dismisses without saving. */
  onClose: () => void;
}

export default function EditRelationshipModal({
  memberId,
  memberName,
  currentRelType,
  currentSecondary = [],
  onSaved,
  onClose,
}: Props) {
  const [relType, setRelType] = useState(currentRelType);
  const [customLabel, setCustomLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // v0.15.3 — local mirror of secondary relationships so add/remove can
  // update optimistically without a full parent refetch on every change.
  // Reconciled with the server array on every successful RPC.
  const [secondary, setSecondary] = useState<SecondaryRelationship[]>(currentSecondary);
  const [secAddType, setSecAddType] = useState('');
  const [secAddVia, setSecAddVia] = useState('');
  const [secBusy, setSecBusy] = useState(false);
  const showSecondary = isFeatureEnabled('SECONDARY_RELATIONSHIPS');

  const grouped = useMemo(() => {
    const out: Record<string, typeof RELATIONSHIP_OPTIONS> = {};
    for (const opt of RELATIONSHIP_OPTIONS) {
      (out[opt.group] ||= []).push(opt);
    }
    return out;
  }, []);

  const level = useMemo(() => (relType ? getRelationshipLevel(relType) : 1), [relType]);
  const dirty = relType !== currentRelType || (relType === 'other' && customLabel.trim().length > 0);

  async function handleAddSecondary() {
    if (!secAddType) {
      setError('अतिरिक्त रिश्ता चुनें — Pick an additional relationship');
      return;
    }
    if (secAddType === currentRelType) {
      setError('यह तो पहले से ही प्राथमिक रिश्ता है — That is already the primary');
      return;
    }
    if (secondary.some((s) => s.type === secAddType)) {
      setError('यह रिश्ता पहले से जुड़ा है — Already added');
      return;
    }
    setSecBusy(true);
    setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('add_secondary_relationship', {
        p_pair_member_id: memberId,
        p_relationship_type: secAddType,
        p_label_hindi: RELATIONSHIP_MAP[secAddType] ?? secAddType,
        p_label_en: null,
        p_via_member_id: null,
        p_via_label: secAddVia.trim() || null,
        p_is_offline: false,
        p_offline_id: null,
      });
      if (rpcErr) {
        setError(friendlyError(rpcErr.message));
        setSecBusy(false);
        return;
      }
      // RPC returns the updated array.
      if (Array.isArray(data)) setSecondary(data as SecondaryRelationship[]);
      setSecAddType('');
      setSecAddVia('');
    } catch (e: unknown) {
      setError(friendlyError(e instanceof Error ? e.message : 'Add failed'));
    } finally {
      setSecBusy(false);
    }
  }

  async function handleRemoveSecondary(index: number) {
    setSecBusy(true);
    setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('remove_secondary_relationship', {
        p_pair_member_id: memberId,
        p_index: index,
        p_is_offline: false,
        p_offline_id: null,
      });
      if (rpcErr) {
        setError(friendlyError(rpcErr.message));
        setSecBusy(false);
        return;
      }
      if (Array.isArray(data)) setSecondary(data as SecondaryRelationship[]);
    } catch (e: unknown) {
      setError(friendlyError(e instanceof Error ? e.message : 'Remove failed'));
    } finally {
      setSecBusy(false);
    }
  }

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
      const reverseType = getReverse(relType);
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

        {/* v0.15.3 — Additional relationships section. Gated by feature flag
            so it stays hidden until the migration adding
            secondary_relationships JSONB is applied to prod. */}
        {showSecondary && (
          <div className="mt-6 pt-5 border-t-2 border-cream-dark">
            <h4 className="font-heading text-lg text-brown mb-1">{'अतिरिक्त रिश्ते'}</h4>
            <p className="font-body text-sm text-brown-light mb-3">
              {'जैसे: बहन भी, भाभी भी (बुआ की बेटी जो मौसी के बेटे से शादी कर ली)'}
              <br />
              <span className="opacity-70">e.g. someone who is your cousin AND your sister-in-law</span>
            </p>

            {secondary.length > 0 && (
              <div className="space-y-2 mb-4">
                {secondary.map((s, i) => (
                  <div key={`${s.type}-${i}`} className="flex items-center gap-2 bg-mehndi-green/10 rounded-xl px-3 py-2">
                    <span className="text-mehndi-green font-semibold">+ {s.label_hindi}</span>
                    {s.via_label && <span className="text-brown-light text-sm truncate">· {s.via_label}</span>}
                    <button
                      onClick={() => handleRemoveSecondary(i)}
                      disabled={secBusy}
                      className="ml-auto w-[44px] h-[44px] flex items-center justify-center rounded-lg text-brown-light hover:text-error hover:bg-red-50 disabled:opacity-40"
                      aria-label={`हटाएं — Remove ${s.label_hindi}`}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-cream/50 rounded-xl p-3 space-y-2">
              <select
                value={secAddType}
                onChange={(e) => setSecAddType(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-xl px-3 py-2.5 font-body text-base focus:border-haldi-gold focus:outline-none bg-white"
                aria-label={'अतिरिक्त रिश्ता चुनें — Select additional relationship'}
              >
                <option value="">{'अतिरिक्त रिश्ता चुनें — Select another relationship'}</option>
                {GROUP_ORDER.map((g) => (
                  grouped[g] && grouped[g].length > 0 && (
                    <optgroup key={g} label={GROUP_LABELS[g]}>
                      {grouped[g]
                        .filter((opt) => opt.key !== currentRelType && !secondary.some((s) => s.type === opt.key))
                        .map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.hindi} — {opt.english}
                          </option>
                        ))}
                    </optgroup>
                  )
                ))}
              </select>
              <input
                type="text"
                value={secAddVia}
                onChange={(e) => setSecAddVia(e.target.value)}
                placeholder={'किसके माध्यम से? जैसे: मौसी का बेटा (optional)'}
                className="w-full border-2 border-gray-300 rounded-xl px-3 py-2.5 font-body text-base focus:border-haldi-gold focus:outline-none bg-white"
              />
              <button
                onClick={handleAddSecondary}
                disabled={!secAddType || secBusy}
                className="w-full min-h-dadi bg-mehndi-green text-white font-body font-semibold rounded-xl py-2.5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-mehndi-green-dark transition-colors"
              >
                {secBusy ? '…' : '+ अतिरिक्त रिश्ता जोड़ें — Add another relationship'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
