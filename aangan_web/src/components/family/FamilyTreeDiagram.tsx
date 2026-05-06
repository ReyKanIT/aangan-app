'use client';
import { useMemo, useState } from 'react';
import AvatarCircle from '@/components/ui/AvatarCircle';
import type { FamilyMember, OfflineFamilyMember, SecondaryRelationship, User } from '@/types/database';
import { RELATIONSHIP_MAP, getRelationshipGeneration, getRelationshipLevel } from '@/lib/constants';
import { deriveRowLabel, composeRelationship } from '@/lib/familyKinship';
import { isFeatureEnabled } from '@/lib/features';

// v0.15.4 — zoom support. Using CSS `zoom` (vs `transform: scale`) because
// `zoom` resizes the layout box, so scrolling works without manual width/
// height compensation. Range 0.5×–2× chosen to keep card text legible at
// the low end and to avoid runaway memory at the high end.
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;
const ZOOM_DEFAULT = 1.0;

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
  /**
   * Optional — when provided, renders an "edit relationship" pencil
   * button on each ONLINE member card (offline rows are skipped because
   * they're typed free-form on add). Click opens EditRelationshipModal
   * which calls update_family_member_relationship RPC.
   */
  onEditOnline?: (m: FamilyMember) => void;
  /**
   * GUI add-relative (v0.13.14). Renders a small ➕ button on every
   * non-self card. Click pre-seeds AddMemberDrawer's Via-Member tab
   * with that member as the via-context — so the user can say
   * "X is my brother's wife" with just relation + name to fill in.
   */
  onAddRelative?: (m: FamilyMember) => void;
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
  /** v0.15.3: extra relationships beyond the primary one
   *  (e.g. cousin who is also a bhabhi). Rendered as a tappable chip
   *  row when SECONDARY_RELATIONSHIPS feature flag is on. */
  secondary?: SecondaryRelationship[];
  onRemove?: () => void;
  /** Optional edit-relationship handler (online cards only). */
  onEdit?: () => void;
  /** Optional GUI add-relative handler — fires when user clicks the +
   *  bubble on this card. Online + offline cards both eligible (we use
   *  the family_member_id of the underlying user as the via-anchor). */
  onAdd?: () => void;
}

// v0.15.0 Family Tree redesign — generation labels now carry an emoji + a
// background tone so each band is visually distinct at a glance. Dadi can
// orient herself ("oh, that's the parents row") without reading the label.
const GEN_LABELS: Record<number, { hi: string; en: string; emoji: string; tone: string }> = {
  3:  { hi: 'पर-दादा-दादी', en: 'Great-grandparents',         emoji: '🌳', tone: 'bg-amber-50/70 border-amber-200' },
  2:  { hi: 'दादा-दादी / नाना-नानी', en: 'Grandparents',         emoji: '👴👵', tone: 'bg-orange-50/70 border-orange-200' },
  1:  { hi: 'माता-पिता / चाचा-मामा', en: 'Parents & Uncles',    emoji: '👨‍👩', tone: 'bg-haldi-gold-light/40 border-haldi-gold/30' },
  0:  { hi: 'भाई-बहन / पति-पत्नी / आप', en: 'Self & Siblings',  emoji: '🤝', tone: 'bg-mehndi-green/10 border-mehndi-green/30' },
  '-1': { hi: 'बच्चे / भतीजा-भांजा', en: 'Children & Nephews',  emoji: '👶', tone: 'bg-sky-50/70 border-sky-200' },
  '-2': { hi: 'पोता-पोती', en: 'Grandchildren',                emoji: '🧒', tone: 'bg-violet-50/70 border-violet-200' },
};

export default function FamilyTreeDiagram({
  self,
  members,
  offline,
  viewerId,
  onRemoveOnline,
  onRemoveOffline,
  onEditOnline,
  onAddRelative,
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
        secondary: m.secondary_relationships,
        onRemove: () => onRemoveOnline(m),
        onEdit: onEditOnline ? () => onEditOnline(m) : undefined,
        onAdd: onAddRelative ? () => onAddRelative(m) : undefined,
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
        secondary: o.secondary_relationships,
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
  }, [self, members, offline, viewerId, onRemoveOnline, onRemoveOffline, onEditOnline, onAddRelative]);

  if (generations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-cream/40 rounded-2xl border-2 border-dashed border-cream-dark">
        <div className="text-6xl mb-3">🌱</div>
        <p className="font-heading text-xl text-brown mb-1">{'अभी कोई सदस्य नहीं'}</p>
        <p className="font-body text-base text-brown-light">{'पहला सदस्य जोड़कर अपना परिवार वृक्ष शुरू करें'}</p>
        <p className="font-body text-sm text-brown-light/70 mt-1">No members yet — add the first to start your family tree</p>
      </div>
    );
  }

  return (
    <FamilyTreeDiagramShell rows={rows} generations={generations} />
  );
}

function FamilyTreeDiagramShell({
  rows, generations,
}: { rows: Map<number, TreeNode[]>; generations: number[] }) {
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const zoomIn   = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut  = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  const zoomReset = () => setZoom(ZOOM_DEFAULT);

  return (
    <div className="relative w-full bg-gradient-to-b from-cream/30 to-cream/60 rounded-2xl border border-cream-dark overflow-hidden">
      {/* Scroll hint — only on desktop where wheel-scroll matters */}
      <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full font-body text-xs text-brown-light/80 shadow-sm pointer-events-none select-none hidden sm:block">
        ↕ स्क्रॉल • ⇄ खींचें
      </div>

      {/* v0.15.4 — Zoom controls. Bottom-right of the tree container so
          they don't overlap the cards. Each button is min 44×44 (Dadi rule
          minimum, smaller than 52 because they're a meta-control, not a
          primary action). Reset button (1×) only shown when zoom != 1. */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-white/90 backdrop-blur rounded-full shadow-sm border border-cream-dark p-1">
        <button
          onClick={zoomOut}
          disabled={zoom <= ZOOM_MIN + 0.001}
          className="w-[44px] h-[44px] flex items-center justify-center rounded-full text-xl font-bold text-brown hover:bg-cream-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={'ज़ूम आउट — Zoom out'}
          title={'ज़ूम आउट — Zoom out'}
        >−</button>
        <button
          onClick={zoomReset}
          disabled={Math.abs(zoom - ZOOM_DEFAULT) < 0.001}
          className="min-w-[52px] h-[44px] px-2 flex items-center justify-center rounded-full text-sm font-mono font-semibold text-brown-light hover:bg-cream-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={'1× पर रीसेट — Reset to 100%'}
          title={'1× पर रीसेट — Reset to 100%'}
        >{Math.round(zoom * 100)}%</button>
        <button
          onClick={zoomIn}
          disabled={zoom >= ZOOM_MAX - 0.001}
          className="w-[44px] h-[44px] flex items-center justify-center rounded-full text-xl font-bold text-brown hover:bg-cream-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={'ज़ूम इन — Zoom in'}
          title={'ज़ूम इन — Zoom in'}
        >+</button>
      </div>

      {/* Native-scroll container — no zoom-pan library so wheel scrolls normally */}
      <div className="w-full overflow-auto" style={{ maxHeight: '75vh' }}>
        {/* Inner content uses CSS `zoom` so the layout box resizes with the
            scale — that way scrolling fills the visible area at any zoom
            level (unlike `transform: scale` which keeps the box at 100%
            and either clips or leaves whitespace). Supported in modern
            Chromium, WebKit, Gecko (Firefox shipped support in 2024). */}
        <div className="px-4 sm:px-8 py-6 sm:py-10 min-w-max" style={{ zoom }}>
          {generations.map((gen, idx) => {
            const list = rows.get(gen) ?? [];
            const hasNext = idx < generations.length - 1;
            const label = GEN_LABELS[gen] ?? {
              hi: gen > 0 ? `पीढ़ी +${gen}` : `पीढ़ी ${gen}`,
              en: gen > 0 ? `Generation +${gen}` : `Generation ${gen}`,
              emoji: '👤',
              tone: 'bg-cream-dark/40 border-cream-dark',
            };
            return (
              <div key={gen} className="flex flex-col items-center">
                {/* Generation label — colored chip with emoji */}
                <div className={`mb-4 px-4 py-2 rounded-full border ${label.tone} flex items-center gap-2 shadow-sm`}>
                  <span className="text-lg leading-none">{label.emoji}</span>
                  <div className="text-center leading-tight">
                    <p className="font-heading text-base text-brown font-semibold">{label.hi}</p>
                    <p className="font-body text-xs text-brown-light/70">{label.en} · {list.length}</p>
                  </div>
                </div>

                {/* Member cards */}
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-[1100px]">
                  {list.map((node) => (
                    <TreeNodeCard key={node.id} node={node} />
                  ))}
                </div>

                {/* Connector line to next generation */}
                {hasNext && (
                  <svg width="2" height="36" className="my-3 shrink-0" aria-hidden="true">
                    <line x1="1" y1="0" x2="1" y2="36" stroke="#C8A84B" strokeWidth="2" strokeDasharray="4 3" />
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
  // v0.15.0 redesign:
  //   - Card actions moved from absolute corners (overlapping the avatar
  //     and name) into a dedicated bottom-of-card toolbar. No more buttons
  //     fighting for the same pixels as text.
  //   - Self card: gold gradient background instead of flat tint. Pops.
  //   - Deceased card: faded grayscale + 🕊️ badge.
  //   - Hover lift + shadow expansion to make the cards feel tactile.
  //   - Wider card on small screens so 3 buttons fit cleanly side-by-side.
  const ring = node.isSelf
    ? 'ring-4 ring-haldi-gold ring-offset-2 ring-offset-cream'
    : node.isDeceased
      ? 'ring-2 ring-gray-300'
      : 'ring-2 ring-mehndi-green/40';

  const bg = node.isDeceased
    ? 'bg-gray-50 border-gray-200 grayscale-[0.3]'
    : node.isSelf
      ? 'bg-gradient-to-br from-haldi-gold-light/60 to-haldi-gold/20 border-haldi-gold ring-1 ring-haldi-gold/40'
      : 'bg-white border-cream-dark hover:shadow-md hover:-translate-y-0.5';

  // Show toolbar only when there's at least one action.
  const hasActions = !!(node.onEdit || node.onRemove || (node.onAdd && !node.isSelf));

  return (
    <article
      className={`relative w-40 sm:w-44 rounded-2xl p-3 pt-4 text-center shadow-sm border transition-all duration-200 ${bg}`}
    >
      {/* Avatar — generous top-padding so the gold ring is unobstructed */}
      <div className={`mx-auto mb-2 rounded-full ${ring} w-fit`}>
        {node.avatarUrl ? (
          <AvatarCircle src={node.avatarUrl} name={node.name} size={64} className="mx-auto" />
        ) : (
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-heading font-bold ${node.isDeceased ? 'bg-gray-200 text-gray-500' : 'bg-haldi-gold-light text-haldi-gold-dark'}`}>
            {node.isDeceased ? '🕊️' : node.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name + relation — name is the largest text per Dadi rule */}
      <p className={`font-body font-semibold text-lg leading-tight truncate ${node.isDeceased ? 'text-gray-600' : 'text-brown'}`}>
        {node.name}
      </p>
      <p className="font-body text-base text-brown-light truncate mt-0.5">{node.relationLabel}</p>

      {/* Badge row */}
      <div className="mt-1.5 flex flex-wrap justify-center gap-1 min-h-[24px]">
        {node.isSelf ? (
          <span className="bg-haldi-gold text-white text-sm font-bold px-2 py-0.5 rounded-full">
            {'आप'}
          </span>
        ) : (
          <span className="bg-haldi-gold-light text-haldi-gold-dark text-sm font-bold px-2 py-0.5 rounded-full">
            L{node.level}
          </span>
        )}
        {node.isDeceased && (
          <span className="bg-gray-200 text-gray-600 text-sm font-semibold px-2 py-0.5 rounded-full">
            {'स्वर्गवासी'}
          </span>
        )}
        {node.isOffline && !node.isDeceased && (
          <span className="bg-haldi-gold/15 text-haldi-gold-dark text-sm font-semibold px-2 py-0.5 rounded-full">
            {'ऑफ़लाइन'}
          </span>
        )}
        {node.viaName && (
          <span className="bg-cream-dark text-brown text-sm font-semibold px-2 py-0.5 rounded-full max-w-[120px] truncate">
            via {node.viaName}
          </span>
        )}
      </div>

      {node.village && (
        <p className="font-body text-sm text-brown-light mt-1 truncate">📍 {node.village}</p>
      )}

      {/* v0.15.3: secondary relationships — chip row showing this person's
          additional kinship paths (e.g. "बहन" primary + "भाभी" secondary
          when a cousin married another cousin). Gated by feature flag so
          it lands silent if the column hasn't been migrated yet. */}
      {isFeatureEnabled('SECONDARY_RELATIONSHIPS') && node.secondary && node.secondary.length > 0 && (
        <div className="mt-2 -mx-1 flex flex-wrap justify-center gap-1">
          {node.secondary.map((sec, i) => (
            <span
              key={`${sec.type}-${i}`}
              className="bg-mehndi-green/10 text-mehndi-green text-xs font-semibold px-2 py-0.5 rounded-full max-w-[140px] truncate"
              title={sec.via_label ? `${sec.label_hindi} (${sec.via_label})` : sec.label_hindi}
            >
              + {sec.label_hindi}
              {sec.via_label && <span className="opacity-60"> · {sec.via_label}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Action toolbar — bottom of card. No more absolute-positioned
          buttons overlapping the avatar/name. Each button is 52×52 (Dadi
          tap rule) but compact-icon visually so 3 fit on a 160px card.
          Order: edit (left, safe) → add (middle, primary action) → remove
          (right, destructive). Gives a thumb-friendly progression on
          right-handed touch users. */}
      {hasActions && (
        <div className="mt-3 -mx-3 -mb-3 px-2 py-2 border-t border-cream-dark/60 bg-cream/40 rounded-b-2xl flex items-center justify-around gap-1">
          {node.onEdit ? (
            <button
              onClick={node.onEdit}
              className="w-[52px] h-[52px] flex items-center justify-center rounded-xl text-lg text-brown-light hover:text-haldi-gold-dark hover:bg-haldi-gold/10 transition-colors"
              aria-label={'रिश्ता बदलें — Edit relationship'}
              title={'रिश्ता बदलें — Edit relationship'}
            >✏️</button>
          ) : <span className="w-[52px] h-[52px]" aria-hidden="true" />}

          {node.onAdd && !node.isSelf ? (
            // GUI add-relative — keeps the prominent green ➕ for the
            // "add via this person" affordance Dadi must discover.
            <button
              onClick={node.onAdd}
              className="w-[52px] h-[52px] rounded-full bg-mehndi-green text-white text-2xl font-bold flex items-center justify-center shadow-md hover:scale-110 hover:bg-mehndi-green-dark transition-all"
              aria-label={`${node.name} के माध्यम से सदस्य जोड़ें — Add a relative via ${node.name}`}
              title={`${node.name} के माध्यम से जोड़ें — Add via ${node.name}`}
            >+</button>
          ) : <span className="w-[52px] h-[52px]" aria-hidden="true" />}

          {node.onRemove ? (
            <button
              onClick={node.onRemove}
              className="w-[52px] h-[52px] flex items-center justify-center rounded-xl text-lg text-gray-500 hover:text-error hover:bg-red-50 transition-colors"
              aria-label={'सदस्य हटाएं — Remove member'}
            >✕</button>
          ) : <span className="w-[52px] h-[52px]" aria-hidden="true" />}
        </div>
      )}
    </article>
  );
}
