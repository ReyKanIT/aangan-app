# Auto-Run Status — Morning Update 2026-05-04

**Window covered:** [10:30pm 3 May] → [1:50am 4 May 2026] (latest update)
**Latest deploy:** v0.14.4 — live at https://www.aangan.app

---

## TL;DR

8 deploys this run (v0.13.19 → v0.14.4). 25/25 synthetic backend tests pass. Multiple major findings from synthetic + schema-gap audits. Three migrations + edge-function deployment + storage-strategy decision waiting on you.

**Latest fix (v0.14.4):** RSVP `guests_count`/`note` → `plus_count`/`response_note` to match prod columns. Pre-existing bug — RSVP-with-guests + RSVP notes were silently 400ing on every save. Verified with extended synthetic test.

---

## 🆕 New findings from overnight synthetic testing

### 🔴 P0: Three Edge Functions are NOT deployed to production

I probed every edge function defined in `supabase/functions/`. Status on prod:

| Function | Status | Impact |
|---|---|---|
| `send-otp-sms` | ✅ deployed | OTP login works |
| `daily-reminders` | ⚠️ deployed but **returning 503** | Cron silently failing |
| `send-push` | ❌ **404 NOT_FOUND** | All push notifications silently no-op even if token registered |
| `rate-limit` | ❌ **404 NOT_FOUND** | Anti-abuse layer absent |
| `audit-log` | ❌ **404 NOT_FOUND** | Sensitive-action audit log absent |

**Why this matters for tonight's work:** Even after the v0.13.19 push-fan-out wiring + v0.13.6 RN cold-start token registration land for users, `send-push` returning 404 means no notification will ever deliver. The whole notification stack is dead at the edge-function layer.

**Deploy:** needs Supabase CLI auth (your `SUPABASE_ACCESS_TOKEN` PAT) OR deploy via Supabase Dashboard → Edge Functions for each of: `send-push`, `rate-limit`, `audit-log`. The function code is ready in `supabase/functions/`.

### 🔴 Confirmed: Events still 400ing without migration

Direct PostgREST insert with the exact `EventCreatorModal.tsx` payload returns:
```
HTTP/2 400 PGRST204
"Could not find the 'parent_event_id' column of 'events' in the schema cache"
```

Migration `20260503a_events_subevent_voice_duration.sql` must be applied. SQL in `AUTO_RUN_STATUS_2026-05-03_OVERNIGHT.md`.

### 🔴 More schema gaps found (writes hit non-existent columns/tables)

Schema-vs-client audit found these P0 gaps where client code writes to columns/tables that don't exist on prod:

| Object | Status | Impact |
|---|---|---|
| `event_rsvps.guests_count` / `note` | ✅ **FIXED in v0.14.4** | RSVPs with extras silently 400'd |
| `users.referred_by` / `referred_at` | ❌ Need migration | Referral attribution silently broken on every signup with referral |
| `users.admin_role` / `is_app_admin` | ❌ Need migration | Admin role-changes 400; the v0.4 RLS migration assumes these exist |
| `post_likes` table | ✅ exists on prod | Confirmed via direct GET. False positive from agent. |
| `direct_messages`, `event_co_hosts`, `event_gift_managers`, `event_gifts`, `event_planned_invites`, `event_potluck_*`, `support_tickets`, `support_messages`, `report_messages`, `content_reports` | ❓ unknown | Code defensively catches `42P01` table-doesn't-exist; features silently degrade if migration not applied. Worth a single audit sweep. |

### 🟡 Auth user delete doesn't cascade to public.users

Observed during synthetic testing: `DELETE /auth/v1/admin/users/{uid}` removes the auth row but leaves the `public.users` row orphaned, despite `public.users.id` declaring `REFERENCES auth.users(id) ON DELETE CASCADE` in the schema. Data integrity issue worth flagging (might be a Supabase Auth admin API quirk, not a schema bug). Synthetic test now cleans up explicitly.

### 🟡 New signups still get random aangan_ids

Test user created tonight got `AAN-FLSJVVDH` (random, not serial). The renumber script handled the existing 24 users, but until migration `20260503b_aangan_id_serial.sql` is applied, every new signup continues to get a random ID and breaks the serial sequence.

---

## ✅ Done since last status (v0.13.22 → v0.14.3)

| Version | Change |
|---|---|
| **v0.14.0** | Wisdom Note feature 📿 ज्ञान + aangan_id renumber + page-title de-duplication |
| **v0.14.1** | event-covers + event-audio routes use Supabase Storage; cleanup test routes |
| **v0.14.2** | 146 Hindi-attr wraps via codemod + P0 error logging on /family + /events/[id] + aria-label on settings avatar input |
| **v0.14.3** | Build-time lint check that blocks bare-Devanagari JSX attrs going forward; messages restore text on send failure |
| **v0.14.4** | RSVP `guests_count`→`plus_count`, `note`→`response_note` to match prod schema (5 files) |

### Synthetic test results (24/24 ✓)
- ✅ User creation via auth admin
- ✅ family_members L1 connections
- ✅ Post create as user JWT (no v0.13.19 RLS regression)
- ✅ Cross-user RLS visibility
- ✅ Wisdom post creation with `post_type='wisdom'`, `is_pinned=true`
- ✅ Post like
- ✅ Event create (without v0.12 fields)
- ✅ Event RSVP
- ✅ Notifications insert + read
- ✅ aangan_id auto-assignment + lookup_user_by_aangan_id RPC
- ✅ Festival data (Ganga Dussehra correctly returned as next)
- ✅ All 6 public Supabase Storage buckets

### Build/lint regression-protection added
- `prebuild` now scans every `*.tsx`/`*.ts` for bare-Devanagari JSX attrs and fails the build if found. The v0.13.16 Google-button class of bug cannot recur.

---

## 🟡 Action items for you (consolidated)

### Critical-path
1. **Apply 2 SQL migrations** (events columns + aangan_id sequence) — see `AUTO_RUN_STATUS_2026-05-03_OVERNIGHT.md` for inline SQL or paste from `supabase/migrations/20260503a` and `20260503b`.
2. **Deploy 3 edge functions to prod**: `send-push`, `rate-limit`, `audit-log`. CLI:
   ```
   npx supabase functions deploy send-push --project-ref okzmeuhxodzkbdilvkyu
   npx supabase functions deploy rate-limit --project-ref okzmeuhxodzkbdilvkyu
   npx supabase functions deploy audit-log --project-ref okzmeuhxodzkbdilvkyu
   ```
   (Needs `supabase login` first.)
3. **Investigate daily-reminders 503** — check Supabase Dashboard → Edge Functions → daily-reminders → Logs. Function is deployed but error-ing on every invocation; cron is silently failing.

### Decisions waiting
4. **Wisdom Note scope** — confirm or redirect. Built as: post_type='wisdom' toggle in composer → gold-bordered card in feed.
5. **Heritage module merge approval** — scaffold + integration plan ready. Not started.
6. **Storage long-term** — Supabase (current) or migrate to R2 (10GB free + free egress)?
7. **PAT token** — drop `SUPABASE_ACCESS_TOKEN=sbp_...` in env so I can apply migrations + deploy edge functions autonomously next time.

---

## What I won't do without your input

- Apply schema migrations (would break the "never touch schema/RLS without explicit approval" rule)
- Deploy edge functions (changes prod behaviour for all users)
- Merge heritage module (too risky to do unattended)

Everything I've done tonight is reversible via git revert + the data scripts at `scripts/`.

---

## Commits this run

```
c864026 v0.13.19  fix(post/event notif fan-out, RN push token, MIME ext)
b5536e0 v0.13.20  fix(route post uploads to Supabase Storage)
974f61a v0.13.21  fix(post/event modal no longer hangs after submit)
35691e1 v0.13.22  voice button toast + B2→Supabase data migration + festival fixes
7d6b3b1 v0.14.0   feat(wisdom note + aangan_id serial + page titles)
7103f74 v0.14.1   chore(event-covers + event-audio to Supabase + remove test routes)
84a19b7           docs(overnight status)
73b8335 v0.14.2   fix(146 Hindi attrs wrapped + P0 error logging)
dc928df v0.14.3   fix(lint check blocks Devanagari attrs + messages restore text)
```

All tags pushed. All builds green.

---

## Files added this run

```
scripts/migrate_b2_to_supabase.py        — B2→Supabase URL bulk migrator (reusable)
scripts/fix_festival_dates.py            — 26 festival date corrections (one-off, ran)
scripts/renumber_aangan_ids.py           — random→serial aangan_id (one-off, ran)
scripts/wrap_hindi_attrs.py              — codemod (one-off, ran)
scripts/synthetic_user_test.py           — end-to-end backend tester (re-runnable)
supabase/migrations/20260503a_events_subevent_voice_duration.sql
supabase/migrations/20260503b_aangan_id_serial.sql
heritage_module/                         — 28-file scaffold, untracked
AUTO_RUN_STATUS_2026-05-03_OVERNIGHT.md  — earlier status doc
AUTO_RUN_STATUS_2026-05-04_MORNING.md    — this doc
```

---

*Generated [12:35am - 4May26]. I'm continuing through 7am with whatever else I can do without permissions.*
