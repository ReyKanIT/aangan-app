'use client';
import { useEffect, useState, useCallback } from 'react';
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);

  const fetchOfflineMembers = useCallback(async () => {
    try {
      // Switched 2026-04-30 to a SECURITY DEFINER RPC. Direct SELECT on
      // offline_family_members now returns only the caller's own rows
      // (RLS tightened in migration 20260430i to plug a P0 PII leak —
      // mobile/email/DOB/address were visible to family-of-family).
      // The RPC reproduces the family-of-family superset for the tree
      // view but redacts PII columns on rows the caller doesn't own.
      const { data, error } = await supabase.rpc('get_visible_offline_family_members');
      if (!error && data) setOfflineMembers(data as OfflineFamilyMember[]);
    } catch {
      // RPC may not exist yet on stale environments — silently degrade
      // to an empty offline list rather than blocking the page.
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchOfflineMembers();
  }, [fetchMembers, fetchOfflineMembers]);

  const filtered = activeLevel === 0 ? members : members.filter((m) => m.connection_level === activeLevel);
  const filteredOffline = activeLevel === 0 ? offlineMembers : offlineMembers.filter((m) => m.connection_level === activeLevel);

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

      {/* Level Filter — narrows the tree to a specific generation band */}
      <div className="flex gap-1 bg-cream-dark rounded-xl p-1 mb-4">
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 font-body text-base">
          <p className="font-semibold">कुछ गड़बड़ हुई — Something went wrong</p>
          <p className="text-base mt-1">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : totalCount === 0 ? (
        <EmptyState
          emoji="👨‍👩‍👧‍👦"
          title="कोई परिवार नहीं"
          subtitle="शुरू करने के लिए परिवार के सदस्य जोड़ें — Add family members to get started"
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
        />
      )}

      {drawerOpen && (
        <AddMemberDrawer onClose={() => {
          setDrawerOpen(false);
          fetchMembers();
          fetchOfflineMembers();
        }} />
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
