# Aangan — Production Readiness Audit & Fix Plan

**Generated:** `[7:38pm - 29Apr26]`
**Scope:** Full-stack production-readiness review of `aangan_web` (Next.js 15), `aangan_rn` (Expo), Supabase backend, and ops/compliance.
**Verdict:** 🔴 NOT production-ready — 7 P0 launch blockers + 14 P1 items. None require rewrites; ~5–7 days of focused work.
**Purpose of this file:** Resumable single source of truth so this work can continue across sessions/disconnects.

> **Hard rule reminder (CLAUDE.md):** Every reply starts with `[h:mma - DMonYY]` IST timestamp. Version bump on new features (web `aangan_web/package.json` + RN `aangan_rn/app.json`).

---

## 0. Session resume instructions

If this session disconnects, the next Claude run should:

1. Read this file end-to-end.
2. Read `MEMORY.md` index + relevant memory files.
3. Run `git status` + `git log --oneline -10` to see what already landed.
4. Find the first unchecked `[ ]` task in §3 below — that is the resume point.
5. Continue executing **P0 first, then P1**, in the listed order, committing at each milestone.
6. **Do NOT start any EAS/mobile build until the web `npm run build` passes clean** (per Kumar's instruction 2026-04-29).
7. Push to GitHub (`git push origin main`) after Milestone 1 (P0 done) and Milestone 2 (P1 done).

---

## 1. Verdict by lane

| Lane | Status | Headline |
|------|--------|----------|
| Web (Next.js 15) | 🟡 needs-work | Solid Sentry/CSP/PWA, but middleware duplication, hardcoded `aangan.app` 20+ times, raw `<img>` for UGC, PII over-fetch via `users(*)` joins |
| Mobile (RN 0.9.15) | 🟡 needs-work | Strong auth/SecureStore/error boundaries, but version drift, `dist/` committed, push-send done client-side, EAS submit placeholders |
| Supabase / RLS | 🔴 blocked | `users` table SELECT = `USING (TRUE)` — phone directory reachable via anon key. 14 SECURITY DEFINER functions missing `search_path`. 3 of 4 edge functions unauthenticated. `daily-reminders` queries non-existent `aangan_events` table. |
| Ops / Secrets / Compliance | 🔴 blocked | MSG91 auth key in git history. Keystore not backed up off-machine. RN has zero crash reporting. Privacy policy not DPDP-2023 compliant. |

---

## 2. P0 launch blockers (must fix before any release)

| # | Issue | Where | Fix |
|---|---|---|---|
| **P0-1** | MSG91 auth key leaked in git (`505756...`) | `archive/SUPABASE_SETUP_GUIDE.md:120,160` (commit `2bd3679`) | Rotate in MSG91 dashboard → re-set Supabase secret. Treat current key as compromised. |
| **P0-2** | `users` table phone-directory leak — `USING (TRUE)` + `GRANT SELECT TO anon` | `supabase_schema.sql:69-70, 795` | Replace policy with family-scoped predicate. `REVOKE SELECT ON public.users FROM anon`. |
| **P0-3** | Audience leak — comments, reactions, stories, story_views, polls all use `USING (auth.uid() IS NOT NULL)` ≈ public | `supabase_migration_v0.3_features.sql:51,79,87,103`, `supabase_migration_v0.4_features.sql:39` | Gate by `EXISTS` on parent post visibility. |
| **P0-4** | Notification phishing — caller-supplied `data` JSONB, recipient never validated | `supabase/migrations/20260429_event_rls_fix.sql:31-41` | Add `EXISTS (rsvp/family_member where user_id = NEW.user_id)`. |
| **P0-5** | Open edge functions — `audit-log`, `rate-limit`, `daily-reminders` accept any caller; `rate-limit` lets attacker DoS any phone's OTP quota | `supabase/functions/{audit-log,rate-limit,daily-reminders}/index.ts` | JWT-verify, bind `actor_id`/`identifier` to `jwt.sub`. Fail-closed `send-otp-sms` when `WEBHOOK_SECRET` unset. |
| **P0-6** | Android keystore has no off-machine backup | `aangan_rn/aangan-release.keystore` (local-only) | Back up to 1Password / encrypted iCloud. Losing it = permanent Play Store lockout. |
| **P0-7** | `daily-reminders` silently dead — queries non-existent `aangan_events` | `supabase/functions/daily-reminders/index.ts:331` | Rename to `events`. No reminders are firing right now. |

## 3. Task tracker (live)

> Update this checklist as work lands. `[x]` = done & committed. `[~]` = in flight. `[k]` = blocked on Kumar action.

### Milestone 1 — P0 batch

- [ ] **T01** Backup doc written (this file)
- [ ] **T02** P0-1 Remove leaked file `archive/SUPABASE_SETUP_GUIDE.md` from working tree + write rotation runbook `MSG91_KEY_ROTATION_RUNBOOK.md`
- [k] **T03** P0-1 (Kumar action) Rotate MSG91 auth key in dashboard, update `MSG91_AUTH_KEY` Supabase secret
- [ ] **T04** P0-2 Migration `supabase/migrations/20260429_users_rls_lockdown.sql` — family-scoped SELECT + `REVOKE SELECT FROM anon`
- [ ] **T05** P0-3 Migration `supabase/migrations/20260429_audience_rls_lockdown.sql` — gate comments/reactions/stories/polls by parent visibility
- [ ] **T06** P0-4 Migration `supabase/migrations/20260429_notification_insert_hardening.sql` — recipient-validation
- [ ] **T07** P0-5 Edge function auth — `audit-log`, `rate-limit`, `daily-reminders` JWT-verify + fail-closed `send-otp-sms`
- [ ] **T08** P0-6 Write `KEYSTORE_BACKUP_RUNBOOK.md` (Kumar to execute)
- [k] **T09** P0-6 (Kumar action) Back up keystore to 1Password / encrypted iCloud
- [ ] **T10** P0-7 Fix `daily-reminders/index.ts` `aangan_events` → `events`
- [ ] **T11** Milestone 1 commit + `git push origin main`
- [k] **T12** (Kumar action) Apply P0 SQL migrations to production Supabase via Studio or `supabase db push`

### Milestone 2 — P1 batch

- [ ] **T13** P1-1 Migration `supabase/migrations/20260429_search_path_hardening.sql` — `SET search_path` on 14 SECURITY DEFINER functions
- [ ] **T14** P1-2 Re-issue `supabase_migration_v0.2.2_indexes.sql` — correct column names + missing FK indexes
- [ ] **T15** P1-3 Web: dedupe `middleware.ts` (root vs src) + server-side profile-completeness check
- [ ] **T16** P1-4 Web: `NEXT_PUBLIC_SITE_URL` env, single `lib/constants.ts` export, replace 20+ hardcodes
- [ ] **T17** P1-5 Web: trim `users(*)` joins → `id, display_name, display_name_hindi, avatar_url`
- [ ] **T18** P1-6 RN: sync versions in `app.json` (already 0.9.15), `package.json` (0.9.14 → 0.9.15), `src/config/constants.ts` (0.9.14 → 0.9.15), iOS `buildNumber` 2 → 18
- [ ] **T19** P1-7 RN: `git rm -r --cached aangan_rn/dist`
- [ ] **T20** P1-8 RN: replace 5 raw `console.*` calls with `secureLog`
- [ ] **T21** P1-9 New edge function `send-push` + deprecate client `pushNotifications.sendPushToUser`
- [ ] **T22** P1-10 RN: replace `analytics.ts` stub with real Sentry (`@sentry/react-native`)
- [ ] **T23** P1-11 Storage bucket migration — `file_size_limit`, `allowed_mime_types` on `event-photos`, `family-photos`, `voice-messages` (etc.)
- [ ] **T24** P1-12 Events date columns: `event_date TEXT → TIMESTAMPTZ` migration (data preserve + edge function update)
- [ ] **T25** P1-13 Update `privacy-policy.html` for DPDP-2023 — Grievance Officer, ReyKan IT data fiduciary, retention, withdrawal, cross-border
- [k] **T26** P1-14 (Kumar action) Fill `eas.json` Apple submit IDs + provision `play-service-account.json`
- [ ] **T27** Milestone 2 commit + `git push origin main`

### Milestone 3 — Verification + final

- [ ] **T28** `cd aangan_web && npm run build` passes clean
- [ ] **T29** Preview server smoke test — login, feed, events, family-tree, share-CTA all render without console errors
- [ ] **T30** Bump `aangan_web/package.json` 0.12.4 → 0.12.5
- [ ] **T31** Final commit `chore(v0.12.5): production-readiness P0/P1 sweep`
- [ ] **T32** `git tag v0.12.5 && git push origin main --tags`
- [k] **T33** (Kumar action) Apply P1 SQL migrations to production Supabase

---

## 4. Files this audit touches (planned)

**New:**
- `MSG91_KEY_ROTATION_RUNBOOK.md`
- `KEYSTORE_BACKUP_RUNBOOK.md`
- `supabase/migrations/20260429_users_rls_lockdown.sql`
- `supabase/migrations/20260429_audience_rls_lockdown.sql`
- `supabase/migrations/20260429_notification_insert_hardening.sql`
- `supabase/migrations/20260429_search_path_hardening.sql`
- `supabase/migrations/20260429_indexes_corrected.sql`
- `supabase/migrations/20260429_storage_bucket_limits.sql`
- `supabase/migrations/20260429_events_timestamptz.sql`
- `supabase/functions/send-push/index.ts`
- `aangan_web/src/lib/constants.ts` (centralized SITE_URL)

**Modified:**
- `archive/SUPABASE_SETUP_GUIDE.md` (remove leaked key)
- `supabase/functions/audit-log/index.ts`
- `supabase/functions/rate-limit/index.ts`
- `supabase/functions/daily-reminders/index.ts`
- `supabase/functions/send-otp-sms/index.ts`
- `aangan_web/middleware.ts` (or `src/middleware.ts` — pick one)
- `aangan_web/src/stores/*.ts` (trim `users(*)` joins)
- `aangan_rn/package.json` (version)
- `aangan_rn/app.json` (iOS buildNumber)
- `aangan_rn/src/config/constants.ts` (version)
- `aangan_rn/src/services/audioStorageService.ts`
- `aangan_rn/src/hooks/useAudioPlayer.ts`
- `aangan_rn/src/services/pushNotifications.ts` (deprecate client send)
- `aangan_rn/src/utils/analytics.ts` (real Sentry)
- `privacy-policy.html`

**Deleted/untracked:**
- `aangan_rn/dist/**` (untrack, keep on disk)

---

## 5. Kumar-only actions (cannot be automated)

| Tag | Action | Why |
|---|---|---|
| **T03** | Rotate MSG91 auth key in MSG91 dashboard, update `MSG91_AUTH_KEY` Supabase Edge Function secret | Requires MSG91 portal login; key is in Kumar's password manager |
| **T09** | Back up `aangan_rn/aangan-release.keystore` + `credentials.json` to 1Password (encrypted) and a second offline location | Cannot upload to Kumar's password manager from this session |
| **T12** | Apply P0 SQL migrations to production Supabase | Requires Supabase project credentials; safer for Kumar to run via Dashboard SQL Editor |
| **T26** | Fill `eas.json` Apple submit IDs (`appleId`, `ascAppId`, `appleTeamId`) + place real `play-service-account.json` | Requires Apple Developer / Google Play Console access |
| **T33** | Apply P1 SQL migrations to production Supabase | Same as T12 |

---

## 6. CEO dashboard snapshot (frozen at audit time)

```
=== AANGAN PRODUCTION READINESS ===
Build:   web=0.12.4 deployed, RN=0.9.15 unbuilt
Risk:    P0 leaks active in production (users RLS, MSG91 key, audience RLS)
Status:  NOT production-ready
Path:    7 P0 + 14 P1 = ~5–7 days focused
Gating:  web npm run build must pass before mobile EAS build
```

---

## 7. Findings detail (full)

### 7.1 Web (`aangan_web/`)

**Strengths:** Sentry per-runtime, CSP/HSTS in `next.config.ts:28-57`, Tailwind `min-h-dadi`/`text-dadi` tokens (57 usages), dynamic OG images, JSON-LD schema, referral attribution flow, `authStore.ts:198-241` clears all per-user caches on signOut.

**Issues:**
- **Two competing middleware files:** `middleware.ts` (root) vs `src/middleware.ts` — root runs, `src/` has better public-route allowlist but is dead code. Profile-completeness check is client-only (`(app)/layout.tsx:29-33`).
- **`https://aangan.app` hardcoded 20+ times:** `layout.tsx:25`, `sitemap.ts:4`, `robots.ts:13`, `invite/InviteClient.tsx:6`, `(app)/events/[eventId]/layout.tsx:57`, `(app)/tithi-reminders/layout.tsx:19`, etc. Vercel previews emit prod canonicals.
- **Auth callback duplication:** `src/app/auth/callback/page.tsx` (client, hash parse) and `src/app/api/auth/callback/route.ts` (server, PKCE).
- **Raw `<img>` for UGC** in 8 sites (`(app)/events/page.tsx:57`, etc.) — CLS, no lazy load, no CDN optimization.
- **PII over-fetch via `users(*)` joins** in `postStore.ts:46-50`, `eventStore.ts:35,51,168`, `familyStore.ts:34` — trim to `display_name, display_name_hindi, avatar_url`.
- `last_seen_at` write fires on every page load (`authStore.ts:258`) — throttle.
- No `Sentry.setUser()` in API routes; no `beforeSend` PII scrubber.
- No `typecheck` script in `package.json`.

### 7.2 Mobile (`aangan_rn/`)

**Strengths:** `expo-secure-store` for tokens, error boundary with bilingual fallback, NetInfo + `withRetry` + persisted offline queue, OTP rate-limit + cooldown, sanitization layer, Dadi-Test constants in `theme/typography.ts:108-112`.

**Issues:**
- **Version drift:** `app.json: 0.9.15`, `package.json: 0.9.14`, `src/config/constants.ts: 0.9.14`, iOS `buildNumber: 2` vs Android `versionCode: 18`.
- **`dist/` committed** (March-31 stale Expo export) despite `.gitignore`.
- **5 raw `console.error/warn`** in `audioStorageService.ts:50,57,75,81`, `useAudioPlayer.ts:27` — bypasses `secureLog`.
- **Push send is client-side** (`pushNotifications.ts:101-134`) — any signed-in user can spam any other.
- **EAS submit placeholders** (`eas.json:74-76` `REPLACE_WITH_*`) + `play-service-account.json` missing.
- **Sentry stub:** `src/utils/analytics.ts` is placeholder comments — mobile crashes ship silently.
- **`build.sh` uses `--profile preview` for production paths** (lines 71, 80, 96, 100).
- 2 TODOs blocking features: Razorpay payment ID (`storageStore.ts:357`), MessageList family-picker (`MessageListScreen.tsx:199`).

### 7.3 Supabase backend

**Strengths:** RLS enabled on every table inspected, bidirectional family-member triggers, audit log infrastructure, pg_cron migration ready, OTP rate-limit (Supabase Auth side).

**P0 RLS leaks:**
- `users` SELECT `USING (TRUE)` + `GRANT SELECT ON public.users TO anon` — phone directory reachable.
- `post_comments`, `post_reactions`, `post_polls`, `poll_votes`, `story_views` — all `USING (auth.uid() IS NOT NULL)`. Audience control is fictional.
- `stories` SELECT — same `USING (auth.uid() IS NOT NULL)`. Photos/videos publicly readable across families.
- `notifications` INSERT — caller-supplied `data` JSONB; recipient never checked.
- `users` UPDATE policy — admin-self-escalation guard skips when `OLD.is_app_admin IS NULL`.

**Schema/perf:**
- `v0.2.2_indexes.sql` references columns that don't exist (`author_id`, `start_time`, `user_id`, `expires_at`) — perf indexes never landed.
- ~12 FK columns without indexes.
- `events.event_date TEXT` instead of `TIMESTAMPTZ`.
- `app_settings` defined twice with different PKs.
- 14 `SECURITY DEFINER` functions missing `SET search_path`.

**Edge functions:**
- `audit-log` — no auth, fabricated `actor_id` accepted.
- `rate-limit` — no auth, can DoS any phone's OTP quota.
- `daily-reminders` — no auth + queries non-existent `aangan_events` table → silently broken.
- `send-otp-sms` — `?? ''` skips webhook auth when secret unset → fail-open.

**Storage:** `event-photos` allows anonymous INSERT, no MIME/size limits → cost-bomb + abuse vector.

**Auth config:** `config.toml` has `site_url` set to localhost (Dashboard authoritative); `minimum_password_length = 6`.

### 7.4 Ops / Secrets / Compliance

**Secrets-in-git:**
- `archive/SUPABASE_SETUP_GUIDE.md:120,160` contains live MSG91 auth key — **leaked**.
- `aangan-release.keystore`, `credentials.json`, `.env*` — gitignored, never in history.
- Keystore on local disk only — no off-machine backup → permanent Play Store lockout if lost.

**DLT:** Compliant. PE `1101455800000093984`, Header `AANGFM`, all 6 templates approved on Vi. Code matches: `send-otp-sms/index.ts:20-22`. Reviewer bypass disabled.

**Privacy:** `privacy-policy.html` substantive but missing DPDP-2023 essentials — Grievance Officer, consent withdrawal, data fiduciary (ReyKan IT), retention period, cross-border (Supabase region).

**CI/CD:** None. No `.github/workflows/`, no Husky, no secret scanner.

**Versioning:** Web 0.12.4 vs RN 0.9.15 — separate trains, undocumented.

**Doc clutter:** 25 `.md` files at repo root.

---

## 8. Audit memory hooks

After landing P0+P1, save these as user-memory entries (the auto-memory system at `~/.claude/projects/.../memory/`):

- `feedback_no_build_until_web_clean.md` — "Don't run EAS/mobile builds until `aangan_web && npm run build` passes clean. Why: web build catches type/lint regressions before mobile burn-rate kicks in. (Confirmed 2026-04-29.)"
- `feedback_milestone_commits.md` — "Auto-run mode: commit + push after each major milestone (P0 batch, P1 batch, final). Why: lets Kumar resume in another session if disconnect. (Confirmed 2026-04-29.)"

---

## 9. Production-ready definition (exit criteria)

All of the following must be true to call Aangan production-ready:

1. ✅ All P0 SQL migrations applied to prod Supabase
2. ✅ MSG91 key rotated; old key dead
3. ✅ Keystore backed up off-machine
4. ✅ Edge functions JWT-verified
5. ✅ Web `npm run build` passes
6. ✅ Web preview smoke test (login, feed, events, family-tree, share) green
7. ✅ RN versions synced
8. ✅ RN crash reporting (Sentry) live
9. ✅ Privacy policy DPDP-compliant
10. ✅ EAS submit fields filled (Kumar)
11. ✅ Test family-of-3 sees only their own data via Supabase Studio "Authenticated as <user>" probe

Once exit criteria met → bump `aangan_web/package.json` to `0.13.0`, tag `v0.13.0-prod-ready`, deploy.
