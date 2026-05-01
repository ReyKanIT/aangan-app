# Aangan — Changelog

All notable changes per release tag. Each entry tagged **(web)**, **(rn)**,
**(both)**, or **(db)** to clarify which surface the change shipped on.
Web is auto-deployed via Vercel on each tag push; RN ships on the next
EAS build (currently bundles all web-shipped DB migrations + parity
features so a single RN release catches up to the latest web tag).

---

## [0.13.11] — 2026-05-01  *(web + db)*

**Edit-relationship feature**

- DB migration `20260501a` — new `update_family_member_relationship`
  SECURITY DEFINER RPC. Validates auth + caller's existing connection
  to the target user, then UPDATEs both sides of the bidirectional
  pair atomically. Mirror of `add_family_member_bidirectional`.
- `EditRelationshipModal` reuses AddMemberDrawer's grouped picker
  (immediate / grandparents / in-laws / great / extended / other),
  pre-selects the current relationship, derives the reverse via the
  same REVERSE_MAP, computes level via `getRelationshipLevel`.
- Tree cards now show a ✏️ pencil button (top-left, mirror of the
  ✕ remove on the right). Online rows only — offline rows are
  free-form text on add, nothing structured to relabel.
- Closes Kumar's ask: "Allow one time to change the relationship of
  members as earlier very smalllist was there."

## [0.13.10] — 2026-05-01  *(web)*

**Hindi-first ConfirmDialog + support inbox cleanup**

- New `components/ui/ConfirmDialog.tsx` — bilingual replacement for
  `window.confirm()`. ConfirmProvider context + useConfirm() hook
  resolves Promise<boolean>, API matches native confirm() so caller
  migration is mechanical.
- Dadi-test sized (52px+ buttons, text-lg body), gold border,
  role=alertdialog ARIA, Esc=cancel + Enter=confirm shortcuts,
  click-outside-to-cancel, danger=true paints confirm red.
- Provider mounted in `(app)/layout.tsx`. Migrated highest-frequency
  callsite (family/page.tsx delete flows for online + offline members).
- Closed all 6 open support tickets via SQL: 4 Jyotsna QA tests
  (29-Apr) → status=closed; Kumar's 15-Apr "AddMember UI not visible
  on mobile" → status=resolved (v0.13.5 fix); Jyotsna's 12-Apr
  "Popup msgs not clear" (19 days no response) → status=closed
  with reference to this dialog.

## [0.13.9] — 2026-05-01  *(web)*

**Indus card always-Available + canonical URL**

- Verified Aangan IS live on Indus as "Aangan - Your Family's
  Digital Home" (4.0★, Verified). Indus's listing doesn't expose a
  version number publicly.
- New `INDUS_LIVE` flag + `INDUS_LISTING_URL` constants.
- Card now always renders an "Available on Indus" link with no
  version subtitle. URL switched from broken
  `store.indusappstore.com/app/aangan` (subdomain doesn't resolve)
  to canonical `www.indusappstore.com/apps/social/aangan-आँगन/...`
- `JoinClient.tsx` Indus deep-link fallback updated to the same.

## [0.13.7] — 2026-05-01  *(web)*

**Indus + per-store version subtitles**

- New `STORE_VERSIONS` constant in `data/versions.ts`. Per-channel
  published version strings (or null), updated only when each store
  listing actually goes live (not in lockstep with web).
- Homepage download grid now shows `(v0.8.0)` etc. inline next to
  each store name, in smaller bracketed font.
- Footer Indus link rendered when STORE_VERSIONS.indus is set.

## [0.13.6] — 2026-04-30  *(web)*

**Reply-quickly support inbox**

- AdminShell sidebar gets a live red badge on "Support Tickets"
  showing open + in_progress count. Realtime-subscribed.
- /admin/support: 8 quick-reply templates with Hindi-first body +
  English subtitle, {{name}} substitution, click → insert into
  textarea (still editable).
- ⌘+Enter (Ctrl+Enter on Win/Linux) sends the reply.
- Stale-ticket flag (orange left-border + ⏰ badge) on rows in
  open/waiting_for_user with no activity >3 days.
- Realtime subscription for ticket + message inserts.
- Bulk-select + close N tickets at once (for test-data cleanup).
- Reply textarea bumped 2 → 3 rows.

## [0.13.5] — 2026-04-30  *(web)*

**Claude Design polish**

- Settings: Aangan ID now renders as `AAN-X7K2 P9X3` (Aadhaar-style
  visual chunking) at `text-xl tracking-widest` with `tabular-nums`.
  Added 📲 WhatsApp share button alongside 📋 Copy.
- Chatbot: festival reply caps at 3 entries within 90 days for generic
  "next festival" queries; specific name searches keep wider net.
  Days-until switched to cognitive units — "X दिन में" up to 14d,
  "~N हफ़्ते में" up to 60d, then "~N महीने में".
- Family tree: "via X" promoted from whisper-quiet italic line into a
  proper chip in the same row as the L-badge; "ऑफ़लाइन" pill recolored
  blue → muted haldi-gold so the card stays in one warm palette.
- Family tree card width 144→160px so the now-fuller chip row wraps
  cleanly without crushing names.
- InviteShareCard: shared message is now personalized — leads with the
  inviter's display name (Hindi preferred) and includes their
  `AAN-XXXXXXXX` so recipients can find them post-install.

## [0.13.4] — 2026-04-30  *(web + db)*

**Bug fixes from CEO-mode review**

- DB migration `20260430j` adds 4 v0.12-era event columns to prod
  (`hosted_by`, `voice_invite_url`, `invites_scheduled_at`,
  `invites_sent_at`) that web reads but had never been applied. Same
  class as `20260430d` (v0.4 user columns).
- `eventStore.ts` switched from FK-shorthand `users!creator_id` to
  explicit constraint name `users!events_creator_id_fkey` (and
  `event_rsvps_user_id_fkey`) — robust against PostgREST schema-cache
  hiccups under the new RLS lockdown.
- Chatbot: replaced hardcoded 4-festival if/else with a DB-grounded
  `searchFestivals()` helper that ILIKE-matches against `system_festivals`
  (27+ rows) and filters by user `state_code`.
- Kinship: `father.son` / `father.daughter` / grandparent reductions
  return `null` (→ via-X fallback) instead of confidently wrong labels.
- Documented known auth-fragmentation risk in `authStore.ts` for a
  follow-up dedicated identity-link session.

## [0.13.3] — 2026-04-30  *(web + db)*

**P0 PII fix + Dadi compliance**

- DB migration `20260430i`: PII-safe RPC for offline family members.
  Direct table SELECT now owner-only; `get_visible_offline_family_members()`
  RPC returns family-of-family rows with `mobile_number`, `email`,
  `date_of_birth`, `current_address`, `notes`, `birth_year` redacted
  on rows the caller doesn't own. Closes a TRAI/DPDP-class leak found
  in tonight's pre-store audit.
- `family/page.tsx` switched from `.from('offline_family_members')` to
  `.rpc('get_visible_offline_family_members')`.
- Family-tree text bumped `text-xs/11px` → `text-sm` (14px) on
  relationLabel / village / generation labels / via-X. L-badge and
  status pills also `text-sm`. Member-card name `text-sm` → `text-base`.
- Remove ✕ button: 28px tap target → 44px (WCAG AA).

## [0.13.2] — 2026-04-30  *(web + db)*

**Stable Aangan IDs**

- DB migration `20260430h`: `users.aangan_id TEXT UNIQUE NOT NULL`,
  format `AAN-XXXXXXXX` from 32-char grandma-safe alphabet.
  Auto-assigned via `BEFORE INSERT` trigger; backfill loop for legacy
  rows. New RPC `lookup_user_by_aangan_id(p_aangan_id)`.
- `search_users_safe` rebuilt to also return `aangan_id` and to fix
  a latent column-name mismatch (`village`/`state` → `village_city`/
  `state_code`) — the place chip in family search will now finally
  render.
- Settings page: prominent gold-bordered "आपकी आँगन ID" card with
  Hindi explainer ("Stable across phone/email changes").
- AddMemberDrawer: detects AAN-prefixed input and short-circuits to
  the RPC for an exact match; falls back to fuzzy name search.

## [0.13.1] — 2026-04-30  *(web)*

**Per-viewer family-tree labels**

- New `lib/familyKinship.ts` 2-hop kinship-composition table. Krishna's
  wife Chhayadevi now displays for Kumar as **भाभी (via Krishna)**
  instead of पत्नी.
- `FamilyTreeDiagram` builds a viewer-perspective lookup
  (`viewerToAdderRel` + `adderName`) from the viewer's own
  `family_members` rows, computes derived label + level + generation
  for offline rows where `added_by != viewer.id`. Adds "via <name>"
  badge so the user knows the row came from another tree.

## [0.13.0] — 2026-04-29  *(both)*

**WhatsApp deep-link family invites**

- New page `/join/[code]` with server-rendered metadata + dynamic OG.
  React Native `JoinFamilyScreen` handles `aangan://join/<code>` and
  the https fallback (linking config wired in `AppNavigator.tsx`).
- `family_invites` + `family_invite_clicks` tables (migration
  `20260429i`). 6-char codes from grandma-safe alphabet (no O/0/I/1).
  RPCs: `create_family_invite`, `lookup_invite` (anon-callable),
  `claim_family_invite`.
- New RN component `InviteWithCodeModal` with 25 curated Hindi
  relationship chips (each carrying a `reverseKey`).

## [0.12.5] — 2026-04-29  *(web)*

- Privacy copy: removed personal-name + DPDP labels. Version bump.

## [0.12.x] — 2026-04-25 → 2026-04-28  *(both)*

- v0.12.4: Family-tree native scroll (web)
- v0.12.3: iOS Safari fixes (web)
- v0.12.2: profile-setup upsert (both)
- v0.12.1: Dual-calendar reminders, recurring panchang (both)
- v0.12.0: 50+ festival notifications catalog with regional opt-in (both)

## [0.11.0] — 2026-04-22  *(both)*

- Family tree overhaul: bidirectional reciprocal relationships,
  level-aware visibility, offline-member support.

## [0.10.x] — 2026-04-18 → 2026-04-20  *(rn)*

- v0.10.2: Vi DLT chain audit (rn)
- v0.10.1: OTP env-var fix (both)
- v0.10.0: Last RN-shipped version. Baseline for the v0.13.5 catch-up.

---

*To regenerate this changelog, run:*
```
git log --oneline v0.10.0..HEAD --decorate=short
```
*and pull the per-tag sections from each `git show <tag>` body.*
