# Aangan Regression Suite

> **Last updated:** 2026-05-17 14:24 IST — initial draft after gen-tree regression in v0.16.1.
>
> Owner: Kumar (solo founder) + Claude (AI pair)
> Status: Phase 1 active; Phases 2–4 planned.

---

## Why this exists

Three regressions in ~7 weeks have made it through manual review:

| Date | Regression | Caught by | Cost |
|---|---|---|---|
| 2026-04-26 | Google sign-in silently stripped (v0.10.1) | Kumar, 7 days later | Lost ~7d of Google-OAuth signups |
| 2026-05-17 (am) | Posts bucket lost all RLS policies (server-side) | Kumar's repeated reports through 4 client-side fix attempts | ~6h of mis-attribution + wasted EAS builds |
| 2026-05-17 (pm) | Kulvriksh tree render exception after gen-tree refactor (v0.16.1) | Simulator test post-build | 1 EAS build burned + v0.16.1 ship blocked |

Every one of these would have been caught by an automated test running against the artifact BEFORE store upload. Solo-founder + AI velocity made the test-then-ship discipline necessary; this document encodes the layers.

---

## The layered model

Tests layer cheapest-fastest at the top, slowest-but-most-realistic at the bottom. A change must pass every applicable layer before reaching the store.

| Tier | Tool | Speed | What it catches | Required on |
|---|---|---|---|---|
| **T0** | TypeScript (`tsc --noEmit`) | seconds | type errors, missing props, contract drift | every edit |
| **T1** | Jest + React Native Testing Library | seconds | render exceptions, prop logic, store actions, pure functions | every commit |
| **T2** | `check:critical` (web) + manifest check (RN) | seconds | silent deletion of UI features listed in `CRITICAL_FEATURES.md` | every commit |
| **T3** | Maestro flows (iOS sim + Android emu) | minutes | navigation, real Supabase, gestures, real RLS, real photo upload | every PR / pre-release |
| **T4** | Manual smoke test on built artifact | minutes | gestalt feel, Dadi-Test compliance, anything not in T0–T3 yet | every store-upload-candidate |

What we deliberately **skip**:
- Visual regression (Percy/Chromatic) — too flaky for a solo founder; T4 covers gestalt feel
- Full E2E test grid across N device sizes — covered by Maestro on a representative iPhone + Android device
- Mutation testing — premature optimization at our scale

---

## What gets tested, by feature

| Feature | T1 (Jest) | T3 (Maestro flow) |
|---|---|---|
| **Auth (phone OTP + Google + email)** | Mock Supabase, verify store actions | `signin-phone.yaml`, `signin-google.yaml` |
| **Home feed** | `<HomeFeedScreen>` renders, PanchangWidget computes specialToday | `home-loads.yaml` (header, posts, FAB) |
| **Post composer + photo upload** | uploadFileToStorage logic, audience picker | `compose-photo.yaml` (real upload, real Supabase) |
| **Family tree** | `<KulvrikshTreeView>` renders for empty / 1L / 2L+ data, `getGenerationOffset` mapping | `family-tree-renders.yaml` |
| **Add member** | Modal name-first form, phone-optional routing, validation | `add-member-name-only.yaml`, `add-member-with-phone.yaml` |
| **Events (RSVP)** | `<EventsListScreen>`, EventCreator validation | `create-event.yaml`, `rsvp.yaml` |
| **Settings** | No Storage section visible, Sign-out confirm dialog, Delete Account flow | `settings-no-storage.yaml`, `delete-account.yaml` |
| **Panchang widget** | getPanchang() math correct for known dates, specialToday ribbon when festival/special tithi | `panchang-today.yaml` |
| **Notifications** | Notification routing per type, unread badge | `notifications.yaml` |
| **Critical features manifest** | `check-critical-rn.mjs` script (analogue of web's `check-critical-features.mjs`) | n/a |

---

## Phase plan

### Phase 1 — TODAY (1–2 hr): T0 + T1 scaffold + the gen-tree regression test
1. `aangan_rn/jest.config.js` + `jest.setup.ts` with RN preset
2. `aangan_rn/src/__tests__/components/KulvrikshTreeView.test.tsx` — render with empty data, 1 member, Kumar's 6-member data (brother/sister/wife/daughter + 2 offline ancestors). Catches today's exception.
3. `aangan_rn/src/__tests__/utils/relationships.test.ts` — `getGenerationOffset` exhaustive mapping (English + Hindi keys, fallback).
4. Use the failing test to find + fix the gen-tree exception.
5. Add `npm test` script + document in `TESTING.md`.

### Phase 2 — NEXT (2–3 hr): T1 broaden + T2 RN critical-features check
6. Tests for `<HomeFeedScreen>`, `<FamilyTreeScreen>` tabs default, `<AddMemberModal>` rendering.
7. Tests for stores: `postStore.createPost`, `familyStore.fetchMembers` (mocked Supabase).
8. `scripts/check-critical-rn.mjs` — verify critical RN UI elements (login Google btn, tree default tab, etc.) exist in source via `data-testid`/AST grep.
9. Pre-commit hook (`husky` or simple `.git/hooks/pre-commit` script).

### Phase 3 — FOLLOW-UP (2–3 hr): T3 Maestro E2E
10. Install Maestro CLI.
11. `.maestro/signin-phone.yaml` — phone OTP with test account 9876543210 → 123456.
12. `.maestro/photo-upload.yaml` — pick image from photo library, post, verify in feed.
13. `.maestro/family-tree.yaml` — open Family tab, verify tree renders for Kumar's data.
14. `.maestro/add-member-name-only.yaml`, `.maestro/add-member-with-phone.yaml`.
15. `.maestro/create-event.yaml` (once events tab is in v0.16.2).
16. CI: GitHub Actions workflow runs T0+T1+T2 on every push; T3 on PR open + manually-triggered.

### Phase 4 — POLISH (1 hr): release gate
17. `scripts/post-build-smoke.sh` — installs the freshly-built IPA/APK on simulator, runs the Maestro smoke pack, fails on any flow that errors.
18. Wire into `release.mjs` so `eas build --auto-submit` is replaced by `eas build → post-build smoke → manual approval → eas submit`.
19. Document the full loop in `TESTING.md`.

---

## "Keep running it after every feature addition or update"

The discipline is encoded in **`feedback_release_workflow.md`** (memory file) and the pre-commit / CI hooks:

```
Code edit
  ↓ (T0: tsc on save)
git commit
  ↓ (pre-commit: T1 Jest, T2 critical check)
git push
  ↓ (CI: T0 + T1 + T2)
EAS build (production + preview-ios-sim)
  ↓ (post-build hook: T3 Maestro on built artifact)
Manual smoke (T4) on real device
  ↓ (Kumar OK)
eas submit → App Store / Play / Indus
```

Each layer is a hard gate. Failures don't proceed.

---

## Test data and fixtures

Real-data test fixtures (no PII):
- `tests/fixtures/kumar-family.json` — sanitised copy of Kumar's family_members + offline_family_members rows, ids replaced with stable UUIDs. Used in component tests and Maestro flows that need a non-trivial tree.
- `tests/fixtures/festivals-2026.json` — already in `aangan_rn/src/assets/data/festivals.ts`; reuse.
- `tests/fixtures/panchang-known-dates.json` — handful of known-good Panchang outputs for golden-master testing of `getPanchang()`.

Test Supabase project (Phase 3+):
- Separate `aangan_test` project mirrors prod schema. Seeded with deterministic users + relationships. Maestro flows use this to avoid mutating Kumar's real data.

---

## Maintenance contract

- **Adding a new feature**: write its T1 + T3 test in the same PR. CI blocks merge until they exist and pass.
- **Fixing a bug**: write the failing T1/T3 test FIRST (reproduces the bug), then the fix. PR description includes "Regression test: <test-file>".
- **Removing a UI feature**: remove its test in the same PR + update `CRITICAL_FEATURES.md` + Kumar's explicit OK.
- **Test maintenance budget**: ~30 min/week. If a test becomes flaky, fix or delete; don't carry red CI.
