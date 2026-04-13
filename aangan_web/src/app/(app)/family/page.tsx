'use client';
import { useEffect, useState, useCallback } from 'react';
import { useFamilyStore } from '@/stores/familyStore';
import { toastError } from '@/lib/toast';
import AvatarCircle from '@/components/ui/AvatarCircle';
import GoldButton from '@/components/ui/GoldButton';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { FamilyMember } from '@/types/database';
import { RELATIONSHIP_MAP } from '@/lib/constants';
import AddMemberDrawer from '@/components/family/AddMemberDrawer';

const LEVELS = [
  { value: 0, label: 'सभी', sub: 'All' },
  { value: 1, label: 'स्तर 1', sub: 'Level 1' },
  { value: 2, label: 'स्तर 2', sub: 'Level 2' },
  { value: 3, label: 'स्तर 3', sub: 'Level 3' },
];

export default function FamilyPage() {
  const { members, fetchMembers, removeMember, isLoading, error } = useFamilyStore();
  const [activeLevel, setActiveLevel] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filtered = activeLevel === 0 ? members : members.filter((m) => m.connection_level === activeLevel);

  const handleRemove = useCallback(async (m: FamilyMember) => {
    if (!confirm(`${m.member?.display_name_hindi ?? m.member?.display_name} को हटाएं?`)) return;
    try {
      const success = await removeMember(m.family_member_id);
      if (!success) toastError('सदस्य हटाने में समस्या हुई', 'Member removal failed');
    } catch {
      toastError('सदस्य हटाने में समस्या हुई', 'Member removal failed');
    }
  }, [removeMember]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl text-brown">मेरा परिवार</h2>
          <p className="font-body text-base text-brown-light">My Family Tree</p>
        </div>
        <GoldButton size="sm" onClick={() => setDrawerOpen(true)}>+ जोड़ें</GoldButton>
      </div>

      {/* Level Tabs */}
      <div className="flex gap-1 bg-cream-dark rounded-xl p-1 mb-6">
        {LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => setActiveLevel(level.value)}
            className={`flex-1 py-3 rounded-lg font-body text-base font-semibold transition-all ${activeLevel === level.value ? 'bg-white shadow text-haldi-gold' : 'text-brown-light'}`}
          >
            {level.label}
            <span className="block text-sm font-normal opacity-70">{level.sub}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 font-body text-base">
          <p className="font-semibold">कुछ गड़बड़ हुई — Something went wrong</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji="👨‍👩‍👧‍👦"
          title="कोई परिवार नहीं"
          subtitle="Add family members to get started"
          action={<GoldButton size="sm" onClick={() => setDrawerOpen(true)}>सदस्य जोड़ें</GoldButton>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((member) => (
            <MemberCard key={member.id} member={member} onRemove={() => handleRemove(member)} />
          ))}
        </div>
      )}

      {drawerOpen && <AddMemberDrawer onClose={() => { setDrawerOpen(false); fetchMembers(); }} />}
    </div>
  );
}

function MemberCard({ member, onRemove }: { member: FamilyMember; onRemove: () => void }) {
  return (
    <div className="bg-white rounded-2xl p-4 text-center shadow-sm group relative">
      <AvatarCircle
        src={member.member?.avatar_url}
        name={member.member?.display_name_hindi ?? member.member?.display_name}
        size={64}
        className="mx-auto mb-3"
      />
      <p className="font-body font-semibold text-brown text-base truncate">
        {member.member?.display_name_hindi ?? member.member?.display_name}
      </p>
      <p className="font-body text-sm text-brown-light">{member.relationship_hindi || RELATIONSHIP_MAP[member.relationship_type] || member.relationship_type}</p>
      <span className="inline-block mt-1.5 bg-haldi-gold-light text-haldi-gold-dark text-sm font-bold px-2 py-0.5 rounded-full">
        L{member.connection_level}
      </span>
      {member.member?.village_city && (
        <p className="font-body text-sm text-brown-light mt-1 truncate">📍 {member.member.village_city}</p>
      )}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-error transition-all min-w-dadi min-h-dadi flex items-center justify-center text-base rounded-lg"
        aria-label="सदस्य हटाएं — Remove member"
      >✕</button>
    </div>
  );
}
