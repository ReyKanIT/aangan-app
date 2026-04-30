'use client';
import { useMemo } from 'react';
import AvatarCircle from '@/components/ui/AvatarCircle';
import type { FamilyMember, OfflineFamilyMember, User } from '@/types/database';
import { RELATIONSHIP_MAP, getRelationshipGeneration, getRelationshipLevel } from '@/lib/constants';
import { deriveRowLabel, composeRelationship } from '@/lib/familyKinship';

interface Props {
  self: User | null;
  members: FamilyMember[];
  offline: OfflineFamilyMember[];
  /**
   * Current viewer's user id — required to derive per-viewer relationship
   * labels for offline rows that were added by someone else (e.g. Krishna's
   * "wife" row should render as Kumar's "भाभी" when Kumar is viewing).
   * Pass null to disable derivation (renders raw labels).
   */
  viewerId: string | null;
  onRemoveOnline: (m: FamilyMember) => void;
  onRemoveOffline: (m: OfflineFamilyMember) => void;
}

interface TreeNode {
  id: string;
  name: string;
  relationLabel: string;
  level: number;
  avatarUrl?: string | null;
  isDeceased?: boolean;
  isOffline?: boolean;
  isSelf?: boolean;
  generation: number;
  village?: string | null;
  /** When set, render a small "via <name>" badge so the viewer knows the
   *  row was added by someone else and the label is derived/fallback. */
  viaName?: string | null;
  onRemove?: () => void;
}

const GEN_LABELS: Record<number, { hi: string; en: string }> = {
  3:  { hi: 'पर-दादा-दादी', en: 'Great-grandparents' },
  2:  { hi: 'दादा-दादी / नाना-नानी', en: 'Grandparents' },
  1:  { hi: 'माता-पिता / चाचा-मामा', en: 'Parents & Uncles' },
  0:  { hi: 'भाई-बहन / पति-पत्नी / आप', en: 'Self, Spouse, Siblings, Cousins' },
  '-1': { hi: 'बच्चे / भतीजा-भांजा', en: 'Children & Nephews' },
  '-2': { hi: 'पोता-पोती', en: 'Grandchildren' },
};

export default function FamilyTreeDiagram({
  self,
  members,
  offline,
  viewerId,
  onRemoveOnline,
  onRemoveOffline,
}: Props) {
  const { rows, generations } = useMemo(() => {
    const nodes: TreeNode[] = [];

    // ─── Build viewer-perspective lookups for derived labels ───
    // viewerToAdderRel: family_member_id → relationship_type the viewer has
    // declared toward that user. Source of truth for "from MY perspective,
    // what is this person?". Only the viewer's OWN family_members rows
    // contribute (each user maintains their own labels).
    const viewerToAdderRel = new Map<string, string>();
    // adderName: family_member_id → display name to show in the "via X"
    // badge. Same source — we only know names of users in the viewer's tree.
    const adderName = new Map<string, string>();
    for (const m of members) {
      viewerToAdderRel.set(m.family_member_id, m.relationship_type);
      adderName.set(
        m.family_member_id,
        m.member?.display_name_hindi ?? m.member?.display_name ?? ''
      );
    }

    if (self) {
      nodes.push({
        id: `self-${self.id}`,
        name: self.display_name_hindi ?? self.display_name,
        relationLabel: 'आप — You',
        level: 0,
        avatarUrl: self.avatar_url,
        isSelf: true,
        generation: 0,
        village: self.village_city,
      });
    }

    for (const m of members) {
      nodes.push({
        id: `online-${m.id}`,
        name: m.member?.display_name_hindi ?? m.member?.display_name ?? 'Unknown',
        // family_members rows are MINE → label is correct as stored.
        relationLabel: m.relationship_label_hindi || RELATIONSHIP_MAP[m.relationship_type] || m.relationship_type,
        level: m.connection_level,
        avatarUrl: m.member?.avatar_url,
        generation: getRelationshipGeneration(m.relationship_type),
        village: m.member?.village_city,
        onRemove: () => onRemoveOnline(m),
      });
    }

    for (const o of offline) {
      // Offline rows can be added by anyone in the viewer's family_members
      // (RLS predicate). When added_by != viewer, the stored label is from
      // the adder's perspective — derive viewer's label here.
      const derived = viewerId
        ? deriveRowLabel(
            { added_by: o.added_by, relationship_type: o.relationship_type, relationship_label_hindi: o.relationship_label_hindi },
            viewerId,
            viewerToAdderRel,
          )
        : null;

      const isOwnRow = !viewerId || o.added_by === viewerId;
      const label = derived
        ? derived.hindiLabel
        : (o.relationship_label_hindi || RELATIONSHIP_MAP[o.relationship_type] || o.relationship_type);

      // For derived rows, recompute level/generation from the composed
      // relationship key so the L-badge and tree row reflect MY view (e.g.
      // Krishna's wife stored at L1 should display as L2 भाभी for Kumar).
      let displayLevel = o.connection_level;
      let displayGeneration = getRelationshipGeneration(o.relationship_type);
      if (viewerId && !isOwnRow) {
        const viewerToAdder = viewerToAdderRel.get(o.added_by);
        if (viewerToAdder) {
          const composedKey = composeRelationship(viewerToAdder, o.relationship_type);
          if (composedKey) {
            displayLevel = getRelationshipLevel(composedKey);
            displayGeneration = getRelationshipGeneration(composedKey);
          }
        }
      }

      nodes.push({
        id: `offline-${o.id}`,
        name: o.display_name_hindi ?? o.display_name,
        relationLabel: label,
        level: displayLevel,
        avatarUrl: o.avatar_url,
        isDeceased: o.is_deceased,
        isOffline: true,
        generation: displayGeneration,
        village: o.village_city,
        viaName: !isOwnRow ? (adderName.get(o.added_by) || null) : null,
        onRemove: isOwnRow ? () => onRemoveOffline(o) : undefined,
      });
    }

    const byGen = new Map<number, TreeNode[]>();
    for (const n of nodes) {
      if (!byGen.has(n.generation)) byGen.set(n.generation, []);
      byGen.get(n.generation)!.push(n);
    }
    const gens = Array.from(byGen.keys()).sort((a, b) => b - a);
    return { rows: byGen, generations: gens };
  }, [self, members, offline, viewerId, onRemoveOnline, onRemoveOffline]);

  if (generations.length === 0) {
    return (
      <div className="flex justify-center py-20 text-brown-light font-body">
        अभी कोई सदस्य नहीं — No members yet
      </div>
    );
  }

  return (
    <div className="relative w-full bg-cream/40 rounded-2xl border border-cream-dark overflow-hidden">
      {/* Scroll hint */}
      <div className="absolute top-2 right-2 z-10 bg-white/85 backdrop-blur px-3 py-1.5 rounded-full font-body text-xs text-brown-light shadow-sm pointer-events-none select-none">
        ↕ स्क्रॉल करें • → खींचें
      </div>

      {/* Native-scroll container — no zoom-pan library so wheel scrolls normally */}
      <div className="w-full overflow-auto" style={{ maxHeight: '70vh' }}>
        <div className="px-8 py-10 min-w-max">
          {generations.map((gen, idx) => {
            const list = rows.get(gen) ?? [];
            const hasNext = idx < generations.length - 1;
            const label = GEN_LABELS[gen] ?? {
              hi: gen > 0 ? `पीढ़ी +${gen}` : `पीढ़ी ${gen}`,
              en: gen > 0 ? `Generation +${gen}` : `Generation ${gen}`,
            };
            return (
              <div key={gen} className="flex flex-col items-center">
                {/* Generation label */}
                <div className="mb-2 text-center">
                  <p className="font-body text-sm text-brown-light/80 font-semibold">{label.hi}</p>
                  <p className="font-body text-xs text-brown-light/60">{label.en}</p>
                </div>

                {/* Member cards */}
                <div className="flex flex-wrap justify-center gap-4 max-w-[1100px]">
                  {list.map((node) => (
                    <TreeNodeCard key={node.id} node={node} />
                  ))}
                </div>

                {/* Connector line to next generation */}
                {hasNext && (
                  <svg width="2" height="40" className="my-2 shrink-0">
                    <line x1="1" y1="0" x2="1" y2="40" stroke="#C8A84B" strokeWidth="2" strokeDasharray="4 3" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TreeNodeCard({ node }: { node: TreeNode }) {
  const ring = node.isSelf
    ? 'ring-4 ring-haldi-gold ring-offset-2 ring-offset-cream'
    : node.isDeceased
      ? 'ring-2 ring-gray-300'
      : 'ring-2 ring-mehndi-green/40';

  const bg = node.isDeceased
    ? 'bg-gray-50 border-gray-200'
    : node.isSelf
      ? 'bg-haldi-gold-light/30 border-haldi-gold'
      : 'bg-white border-cream-dark';

  return (
    <div className={`relative w-36 sm:w-40 rounded-2xl p-3 text-center shadow-sm border ${bg} group`}>
      <div className={`mx-auto mb-2 rounded-full ${ring}`}>
        {node.avatarUrl ? (
          <AvatarCircle src={node.avatarUrl} name={node.name} size={64} className="mx-auto" />
        ) : (
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-heading font-bold ${node.isDeceased ? 'bg-gray-200 text-gray-500' : 'bg-haldi-gold-light text-haldi-gold-dark'}`}>
            {node.isDeceased ? '🕊️' : node.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <p className={`font-body font-semibold text-sm truncate ${node.isDeceased ? 'text-gray-600' : 'text-brown'}`}>
        {node.name}
      </p>
      <p className="font-body text-xs text-brown-light truncate">{node.relationLabel}</p>

      <div className="mt-1.5 flex flex-wrap justify-center gap-1">
        {!node.isSelf && (
          <span className="bg-haldi-gold-light text-haldi-gold-dark text-xs font-bold px-2 py-0.5 rounded-full">
            L{node.level}
          </span>
        )}
        {node.isDeceased && (
          <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            स्वर्गवासी
          </span>
        )}
        {node.isOffline && !node.isDeceased && (
          <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            ऑफ़लाइन
          </span>
        )}
        {node.isSelf && (
          <span className="bg-haldi-gold text-white text-xs font-bold px-2 py-0.5 rounded-full">
            आप
          </span>
        )}
      </div>

      {node.village && (
        <p className="font-body text-xs text-brown-light mt-1 truncate">📍 {node.village}</p>
      )}

      {node.viaName && (
        // "via X" badge — tells the viewer that this row was added by another
        // family member, and the relationship label shown is computed from
        // their perspective. Crucial for the Krishna-added "wife" → भाभी
        // case so Kumar isn't confused why someone else's wife shows up.
        <p className="font-body text-[11px] text-brown-light/80 mt-1 truncate italic">
          via {node.viaName}
        </p>
      )}

      {node.onRemove && (
        <button
          onClick={node.onRemove}
          className="absolute top-1 right-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 text-gray-400 hover:text-error transition-all w-7 h-7 flex items-center justify-center text-sm rounded-lg"
          aria-label="सदस्य हटाएं — Remove member"
        >✕</button>
      )}
    </div>
  );
}
