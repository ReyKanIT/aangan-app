'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useFamilyStore } from '@/stores/familyStore';
import { useAuthStore } from '@/stores/authStore';
import { toastError } from '@/lib/toast';
import GoldButton from '@/components/ui/GoldButton';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { FamilyMember, OfflineFamilyMember } from '@/types/database';
import AddMemberDrawer from '@/components/family/AddMemberDrawer';
import EditRelationshipModal from '@/components/family/EditRelationshipModal';
import FamilyTreeDiagram from '@/components/family/FamilyTreeDiagram';
import InviteShareCard from '@/components/ui/InviteShareCard';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { supabase } from '@/lib/supabase/client';

const LEVELS = [
  { value: 0, label: 'सभी', sub: 'All' },
  { value: 1, label: 'स्तर 1', sub: 'L1 Direct' },
  { value: 2, label: 'स्तर 2', sub: 'L2 Close' },
  { value: 3, label: 'स्तर 3', sub: 'L3 Extended' },
];

export default function FamilyPage() {
  const { members, fetchMembers, removeMember, isLoading, error } = useFamilyStore();
  const { user: self } = useAuthStore();
  const confirm = useConfirm();
  const [offlineMembers, setOfflineMembers] = useState<OfflineFamilyMember[]>([]);
  const [activeLevel, setActiveLevel] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  // GUI add-relative state (v0.13.14): when set, AddMemberDrawer opens
  // pre-seeded to the Via-Member tab with this member as the via-anchor.
  const [addViaMember, setAddViaMember] = useState<FamilyMember | null>(null);

  const fetchOfflineMembers = useCallback(async () => {
    try {
      // Switched 2026-04-30 to a SECURITY DEFINER RPC. Direct SELECT on
      // offline_family_members now returns only the caller's own rows
      // (RLS tightened in migration 20260430i to plug a P0 PII leak —
      // mobile/email/DOB/address were visible to family-of-family).
      // The RPC reproduces the family-of-family superset for the tree
      // view but redacts PII columns on rows the caller doesn't own.
      const { data, error } = await supabase.rpc('get_visible_offline_family_members');
      if (error) {
        // Surface to console + Sentry so future RLS / migration regressions
        // don't hide as "empty offline list". Non-fatal — page continues.
        console.warn('[family] get_visible_offline_family_members error:', error.message, error.code);
        return;
      }
      if (data) setOfflineMembers(data as OfflineFamilyMember[]);
    } catch (e) {
      // RPC may not exist yet on stale environments — silently degrade
      // to an empty offline list rather than blocking the page.
      console.warn('[family] get_visible_offline_family_members threw:', e);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchOfflineMembers();
  }, [fetchMembers, fetchOfflineMembers]);

  // v0.15.0 family tree improvements: name-search filter on top of the
  // existing level filter. Lowercased substring match across both the
  // English and Hindi display names, plus the relationship label so a
  // user can search "भाई" / "brother" and surface every brother row.
  const filtered = useMemo(() => {
    let rows = activeLevel === 0 ? members : members.filter((m) => m.connection_level === activeLevel);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((m) =>
        (m.member?.display_name ?? '').toLowerCase().includes(q) ||
        (m.member?.display_name_hindi ?? '').toLowerCase().includes(q) ||
        (m.relationship_type ?? '').toLowerCase().includes(q) ||
        (m.relationship_label_hindi ?? '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [members, activeLevel, searchQuery]);

  const filteredOffline = useMemo(() => {
    let rows = activeLevel === 0 ? offlineMembers : offlineMembers.filter((m) => m.connection_level === activeLevel);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((m) =>
        (m.display_name ?? '').toLowerCase().includes(q) ||
        (m.display_name_hindi ?? '').toLowerCase().includes(q) ||
        (m.relationship_type ?? '').toLowerCase().includes(q) ||
        (m.relationship_label_hindi ?? '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [offlineMembers, activeLevel, searchQuery]);

  const handleRemove = useCallback(async (m: FamilyMember) => {
    // Was browser-native confirm() — replaced with bilingual Hindi-first
    // dialog (ConfirmDialog.tsx) per Jyotsna's "popup msgs not clear"
    // ticket. Still resolves to a boolean Promise, so the call shape
    // is identical. `danger: true` paints the confirm button red.
    const name = m.member?.display_name_hindi ?? m.member?.display_name ?? '';
    const ok = await confirm({
      title: 'सदस्य हटाएं?',
      subtitle: 'Remove family member',
      body: `${name} को परिवार से हटाएं?\nRemove ${name} from your family?`,
      confirmLabel: 'हाँ, हटाएं — Yes, remove',
      cancelLabel: 'नहीं — No',
      danger: true,
    });
    if (!ok) return;
    try {
      const success = await removeMember(m.family_member_id);
      if (!success) toastError('सदस्य हटाने में समस्या हुई', 'Member removal failed');
    } catch {
      toastError('सदस्य हटाने में समस्या हुई', 'Member removal failed');
    }
  }, [removeMember, confirm]);

  const handleRemoveOffline = useCallback(async (m: OfflineFamilyMember) => {
    const name = m.display_name_hindi ?? m.display_name;
    const ok = await confirm({
      title: 'सदस्य हटाएं?',
      subtitle: 'Remove offline member',
      body: `${name} को परिवार से हटाएं?\nRemove ${name} from your family?`,
      confirmLabel: 'हाँ, हटाएं — Yes, remove',
      cancelLabel: 'नहीं — No',
      danger: true,
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from('offline_family_members').delete().eq('id', m.id);
      if (!error) setOfflineMembers((prev) => prev.filter((o) => o.id !== m.id));
      else toastError('सदस्य हटाने में समस्या हुई', 'Member removal failed');
    } catch {
      toastError('सदस्य हटाने में समस्या हुई', 'Member removal failed');
    }
  }, [confirm]);

  const totalCount = filtered.length + filteredOffline.length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl text-brown">मेरा परिवार</h2>
          <p className="font-body text-base text-brown-light">My Family Tree</p>
        </div>
        <GoldButton size="sm" onClick={() => setDrawerOpen(true)}>+ जोड़ें</GoldButton>
      </div>

      {/* Invite Family CTA — viral loop */}
      <InviteShareCard className="mb-6" />

      {/* Search — quickly find a member by Hindi/English name or relation */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-light text-lg" aria-hidden="true">🔍</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={'नाम या रिश्ता खोजें — Search by name or relation'}
          className="w-full min-h-dadi pl-10 pr-10 py-3 rounded-xl bg-white border-2 border-cream-dark focus:border-haldi-gold focus:outline-none font-body text-base text-brown placeholder-brown-light/60"
          aria-label={'सदस्य खोजें — Search family members'}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-[44px] h-[44px] flex items-center justify-center text-brown-light hover:text-error rounded-lg"
            aria-label={'खोज साफ़ करें — Clear search'}
          >✕</button>
        )}
      </div>

      {/* Level Filter — narrows the tree to a specific generation band */}
      <div className="flex gap-1 bg-cream-dark rounded-xl p-1 mb-3">
        {LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => setActiveLevel(level.value)}
            className={`flex-1 py-3 rounded-lg font-body text-base font-semibold transition-all ${activeLevel === level.value ? 'bg-white shadow text-haldi-gold' : 'text-brown-light'}`}
          >
            {level.label}
            <span className="block text-base font-normal opacity-70">{level.sub}</span>
          </button>
        ))}
      </div>

      {/* Legend — explains the badge + ring colors at a glance. Compact
          row that doesn't take vertical space from the actual tree. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-body text-brown-light">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full ring-2 ring-haldi-gold bg-haldi-gold-light/60 inline-block" aria-hidden="true" />
          {'आप — You'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full ring-2 ring-mehndi-green/40 bg-white inline-block" aria-hidden="true" />
          {'ऑनलाइन — On Aangan'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-haldi-gold/15 text-haldi-gold-dark px-1.5 rounded-full text-xs font-semibold">{'ऑफ़लाइन'}</span>
          {'— Added manually'}
        </span>
        <span className="flex items-center gap-1.5">
          <span>🕊️</span>
          {'स्वर्गवासी — Departed'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-haldi-gold-light text-haldi-gold-dark px-1.5 rounded-full text-xs font-bold">L1</span>
          {'= Direct • L2 = Close • L3 = Extended'}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 font-body text-base">
          <p className="font-semibold">कुछ गड़बड़ हुई — Something went wrong</p>
          <p className="text-base mt-1">{error}</p>
        </div>
      )}

      {/* Result count when filtering — gives the user feedback that the
          tree below is a subset, not the full graph. */}
      {(searchQuery || activeLevel !== 0) && totalCount > 0 && (
        <p className="font-body text-sm text-brown-light mb-3">
          {`${totalCount} सदस्य मिले — ${totalCount} members match`}
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setActiveLevel(0); }} className="ml-3 text-haldi-gold underline">
              {'रीसेट करें — Reset'}
            </button>
          )}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : totalCount === 0 ? (
        <EmptyState
          emoji="👨‍👩‍👧‍👦"
          title={'कोई परिवार नहीं'}
          subtitle={'शुरू करने के लिए परिवार के सदस्य जोड़ें — Add family members to get started'}
          action={<GoldButton size="sm" onClick={() => setDrawerOpen(true)}>सदस्य जोड़ें</GoldButton>}
        />
      ) : (
        <FamilyTreeDiagram
          self={activeLevel === 0 ? self : null}
          members={filtered}
          offline={filteredOffline}
          viewerId={self?.id ?? null}
          onRemoveOnline={handleRemove}
          onRemoveOffline={handleRemoveOffline}
          onEditOnline={(m) => setEditing(m)}
          onAddRelative={(m) => { setAddViaMember(m); setDrawerOpen(true); }}
        />
      )}

      {drawerOpen && (
        <AddMemberDrawer
          // When the user tapped the ➕ on a tree card, pre-seed the
          // Via-Member tab with that member so they can directly say
          // "X's wife / brother / etc." without picking the via from
          // a dropdown again.
          prefillVia={addViaMember ? {
            memberId: addViaMember.family_member_id,
            memberName: addViaMember.member?.display_name_hindi ?? addViaMember.member?.display_name ?? '',
          } : undefined}
          onClose={() => {
            setDrawerOpen(false);
            setAddViaMember(null);
            fetchMembers();
            fetchOfflineMembers();
          }}
        />
      )}

      {editing && (
        <EditRelationshipModal
          memberId={editing.family_member_id}
          memberName={editing.member?.display_name_hindi ?? editing.member?.display_name ?? ''}
          currentRelType={editing.relationship_type}
          onSaved={() => {
            setEditing(null);
            fetchMembers();
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
