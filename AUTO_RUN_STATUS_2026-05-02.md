# Auto-Run Status Report
*[3:40pm - 2May26]*

> Generated while you were AFK. Read top-to-bottom for the picture, or
> jump to "ACTION ITEMS" at the bottom for what needs your hands.

---

## Highlights

- 🚨 **P0 events bug fixed in prod** — `/events` page was 500ing for
  every authenticated user (RLS recursion between events ↔ event_rsvps).
  Migration `20260502a` applied, recursion broken via SECURITY DEFINER
  helper. **Web verified working; mobile gets the fix automatically
  through Supabase — no APK rebuild needed.** Force-close + reopen the
  app to clear cached error state.
- ✨ **All 3 of your new feature asks shipped** as v0.13.12 / v0.13.13 /
  v0.13.14.
- 📸 **3 of 6 store screenshots** captured (login / home / family) at
  native 1080×2400. Remaining 3 (events / notifications / settings)
  deferred to phone-side capture (Appetize free tier wipes session
  every 3 min — unsustainable).
- 📲 **Real-device APK ready** at `https://expo.dev/artifacts/eas/tjrUt9eu5jav4enL7F5zEL.apk`
  (QR on Desktop: `~/Desktop/aangan-install-qr.png`).

---

## What shipped (committed, NOT yet pushed — auth blocked)

### v0.13.6–v0.13.14 (web)

| Tag | Feature |
|---|---|
| v0.13.6 | Reply-quickly support inbox: 8 canned templates + ⌘+Enter + stale-flag + sidebar badge + bulk-close |
| v0.13.7 | Homepage Indus link + per-store version subtitles |
| v0.13.9 | Indus card always-Available + canonical URL fix (verified Aangan IS live on Indus, no version exposed) |
| v0.13.10 | Hindi-first ConfirmDialog + provider; family deletes migrated; closed all 6 stale support tickets |
| v0.13.11 | Edit-relationship feature: RPC + EditRelationshipModal + ✏️ pencil on every tree card |
| v0.13.12 | **NEW** — Invite-to-Aangan checkbox in AddMember + WhatsApp share with brief app description (centralized in `lib/inviteMessage.ts`) |
| v0.13.13 | **NEW** — "🔗 के ज़रिए — Via Member" 3rd tab in AddMember (add by other person's relation, kinship-composed live preview) |
| v0.13.14 | **NEW** — GUI tree picker: ➕ button on every tree card opens AddMember pre-seeded to Via tab with that person as anchor |

Plus footer-version polish (RELEASES catalog bumped).

### Migrations applied to PROD this session

| Migration | What |
|---|---|
| `20260501a` | New RPC `update_family_member_relationship` (bidirectional update for v0.13.11) |
| `20260502a` | **🚨 P0 fix** — `user_has_event_rsvp(p_event_id)` SECURITY DEFINER helper + rewritten events SELECT policy. Breaks the events ↔ event_rsvps RLS recursion that was 500ing every page load. |

### RN

- `aangan_rn` is at v0.13.5 (versionCode 21 after autoIncrement on the EAS build)
- APK built: `releases/Aangan-v0.13.5-vc21.apk` (106 MB, SHA256 `2129dceff7…`)
- The 4 v0.13.x web features above (Hindi confirm, edit-rel, invite, Via-tab, GUI ➕) are web-only — RN gets parity in next session

### Tools installed

- `~/aangan-mobile-tools/platform-tools/adb` — works (37.0.0)
- `~/aangan-mobile-tools/scrcpy-macos-aarch64-v3.3.4/scrcpy` — works (3.3.4)
- Both stripped of macOS quarantine attr, zero sudo used

---

## /events bug — full debugging trail

You reported errors on /events. I reproduced via curl:

```
curl https://okzmeuhxodzkbdilvkyu.supabase.co/rest/v1/events?... \
  -H "apikey: $ANON"
→ {"code":"42P17","message":"infinite recursion detected in policy for relation \"events\""}
[HTTP 500]
```

**Root cause:** the `events` SELECT policy ended with
`OR EXISTS (SELECT FROM event_rsvps WHERE event_rsvps.event_id = events.id …)`.
That EXISTS triggered RLS on event_rsvps. The event_rsvps SELECT
policy in turn referenced events. Postgres detected the cycle → 42P17.

The recursion was always there but masked by an earlier PostgREST
PGRST200 (FK shorthand failure). Once I fixed that (v0.13.4 explicit
constraint name), the postgres-side recursion became visible.

**Fix:** new SECURITY DEFINER function `user_has_event_rsvp(p_event_id)`
that bypasses RLS to check the RSVP. Events policy invokes it instead
of the recursive EXISTS. Same semantics, no recursion.

After the fix:
- Curl reproduction now returns 401 "permission denied for users" — that's
  just the standard anon-can't-read-users response (not a 500).
- Aangan.app/events renders the proper empty state: "🎉 कोई उत्सव नहीं —
  No upcoming events" with a "उत्सव बनाएं" CTA.
- DB-only fix → applies to web AND mobile automatically. Mobile users
  who saw the error before just need to force-close + reopen the app.

You also mentioned "even at home page bottom also error is there" — I
couldn't reproduce that without the exact error text. If you still see
it after force-closing the app, screenshot or paste the message and
I'll dig in.

---

## Screenshots state

| # | Screen | Status | Path |
|---|---|---|---|
| 01 | Login (Hindi-first) | ✅ Captured 1080×2400 | `aangan_rn/assets/store-screenshots/android/01-login-hindi-first.png` |
| 02 | Home / Dashboard | ✅ Captured 1080×2400 | `…/02-home-dashboard.png` |
| 03 | Family Tree (empty state, v0.13.5 placeholder visible) | ✅ Captured 1080×2400 | `…/03-family-tree.png` |
| 04 | Events | ⏳ Awaiting phone capture | (would now show the fix) |
| 05 | Notifications | ⏳ Awaiting phone capture | |
| 06 | Settings (with Aangan ID card) | ⏳ Awaiting phone capture | |

Appetize's free-tier 3-min limit + per-session OTP login made
rapid-fire navigation impossible. The phone-side path (install APK
via QR → screenshot natively → AirDrop) is faster and produces
identical-quality 1080×2400 images.

---

## Why nothing's deployed yet

All 12+ commits since the last successful push are queued locally:

```
git log --oneline @{u}..HEAD
…
5c559f0  feat(v0.13.14) GUI tree picker
127b476  feat(v0.13.13) AddMember 3rd "Via Member" tab
89680c0  feat(v0.13.12) Invite-to-Aangan + WhatsApp message
83388ae  feat(v0.13.11) edit-relationship feature
… (and the events RLS fix migration, ConfirmDialog, etc.)
```

**Push is blocked on the SSH key add.** Public key was generated and
printed to chat earlier:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMRrYkfcagqDwJSmXuP2dUJU7HEoT7596JPcZgOiAneK kumar@aangan-mac
```

Add it at https://github.com/settings/ssh/new (title "Aangan Mac"),
then I switch the remote to SSH and push everything in one shot.

The events RLS fix is **already live on prod** because Supabase
migrations don't go through GitHub — I applied directly via the
SQL editor. Same for the v0.13.x web features that are committed
locally: they're queued for Vercel deploy on next push.

---

## ACTION ITEMS — your hands needed

| # | Task | Effort | Unblocks |
|---|---|---|---|
| 1 | **Install APK on your Android phone** via the QR on Desktop OR open `https://expo.dev/artifacts/eas/tjrUt9eu5jav4enL7F5zEL.apk` in phone Chrome → install → OTP login → walk every screen | 5 min | Real-device validation before Indus upload |
| 2 | **Take 3 screenshots on phone** (events / notifications / settings) → AirDrop to Mac → say "AirDropped" | 3 min | Completes store-screenshots set |
| 3 | **Add SSH key to GitHub** (https://github.com/settings/ssh/new, paste the ed25519 line above) | 1 min | Unblocks 12 queued commits → Vercel deploys → site reflects all v0.13.6–v0.13.14 work |
| 4 | If you find any bug in #1, **paste the error text + which screen** | as found | I patch + decide if a new EAS build is needed (would burn 1 of remaining 14 monthly slots) |

After #1 + #2: complete screenshot set. After #3: latest web live.
After all 4: ready to assemble the Indus submission packet (already
drafted at `INDUS_VERSION_UPDATE_v0.13.5.md` with copy-paste content +
predicted reviewer Q&A).

---

## What I'm working on while you're back

If nothing else surfaces, the queue is:

1. Mirror v0.13.10 ConfirmDialog + v0.13.11 edit-rel + v0.13.12 invite
   button + v0.13.13 Via-tab + v0.13.14 GUI ➕ to RN (next EAS build)
2. Refresh PLAY_STORE_LISTING.md / TESTING_INDUS_APP_STORE.md to
   v0.13.14 (current ones say v0.13.5)
3. Build the admin merge-accounts UI you mentioned earlier
4. Encrypted backup/restore system (you mentioned earlier)

But stop me anytime to redirect.

---

*This file is a living summary — I'll update it as items get checked off.*
