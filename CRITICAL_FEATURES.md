# CRITICAL_FEATURES.md
*Last updated: [1:25am - 3May26]*

> **What this is:** an authoritative manifest of UI features that **must always
> be present** on Aangan. If you (human, AI, or refactor) are about to delete
> any of these — STOP and confirm with Kumar first. Treat removal of any item
> here as a P0 regression.
>
> **Why this exists:** on 2026-04-26 the v0.10.1 commit silently stripped the
> Google sign-in button from the login page while fixing an unrelated mobile-OTP
> bug. The regression made it past 12+ commits and several manual reviews
> before Kumar caught it on 2026-05-03 — losing every Google-OAuth signup in
> the gap (~7 days). This file + `tests/smoke/*` + the CLAUDE.md rule are the
> three layers that prevent that class of bug from recurring.

---

## How to use this file

### Before you delete UI code:
1. Find the feature in the table below.
2. If it's listed → DO NOT remove without explicit user OK.
3. If you must remove it: open a PR with subject `BREAKING UI: remove <feature>` so the diff is reviewed before merge.

### After you add a new critical feature:
1. Append it to the table below in the matching section.
2. Add a smoke test in `aangan_web/tests/smoke/<route>.spec.ts` that asserts its `data-testid` is visible.
3. Commit both the feature + the protection in the same PR.

### When CI fails the smoke test:
1. **Don't bypass.** A red smoke test means a critical feature regressed.
2. Either fix the regression OR delete the smoke test entry only after deleting the feature from this manifest with explicit user OK.

---

## Critical features by route

### `/` (Landing page)
| Feature | Selector | Why critical | Smoke test |
|---|---|---|---|
| Hero "Download" CTA | `[data-testid="landing-download-cta"]` | Primary conversion point | `smoke/landing.spec.ts` |
| WhatsApp share button | `[data-testid="landing-share-whatsapp"]` | K-factor loop | `smoke/landing.spec.ts` |
| UTM-tagged share URLs | href contains `utm_source=` | Attribution measurement | `smoke/landing.spec.ts` |

### `/login`
| Feature | Selector | Why critical | Smoke test |
|---|---|---|---|
| **Google sign-in button** | `[data-testid="login-google-button"]` | **Lost in v0.10.1 regression — never again.** Highest-converting passwordless option. | `smoke/login.spec.ts` |
| Phone OTP input | `input[type="tel"]` | Default sign-in path for Indian mobile users | `smoke/login.spec.ts` |
| Email OTP fallback | "ईमेल से लॉगिन" or `[data-testid="login-email-fallback"]` | Survives Vi/MSG91 SMS outages | `smoke/login.spec.ts` |
| Country code picker | dropdown with at least IN +91 | Required for E164 phone format | `smoke/login.spec.ts` |

### `/(app)/feed` (authenticated home)
| Feature | Selector | Why critical | Smoke test |
|---|---|---|---|
| Post composer | `[data-testid="feed-composer"]` | Core write surface | `smoke/feed.spec.ts` (TBD) |
| Audience selector | controls visibility | Privacy, families won't post without it | `smoke/feed.spec.ts` (TBD) |

### `/(app)/family`
| Feature | Selector | Why critical | Smoke test |
|---|---|---|---|
| Add member button | `[data-testid="family-add-member"]` | Core onboarding action | `smoke/family.spec.ts` (TBD) |
| Tree-card ➕ Add-via-this-person bubble | `[data-testid="tree-add-via"]` | Discoverability for grandma (v0.13.14) | `smoke/family.spec.ts` (TBD) |
| Tree-card ✏️ Edit-relationship | `[data-testid="tree-edit-rel"]` | Was missing pre-v0.13.11 — caused user complaints | `smoke/family.spec.ts` (TBD) |

### `/(app)/settings`
| Feature | Selector | Why critical | Smoke test |
|---|---|---|---|
| Sign-out button | `[data-testid="settings-signout"]` | Self-service exit, GDPR-adjacent | `smoke/settings.spec.ts` (TBD) |
| Sign-out uses **useConfirm()** Hindi-first dialog | NOT browser `confirm()` | Jyotsna ticket — never regress to native confirm | `smoke/settings.spec.ts` (TBD) |
| Aangan ID card with Copy + WhatsApp share | `[data-testid="settings-aangan-id"]` | Cross-device discovery primitive | `smoke/settings.spec.ts` (TBD) |

### `/(app)/events`
| Feature | Selector | Why critical | Smoke test |
|---|---|---|---|
| Event creation CTA | `[data-testid="events-create"]` | Core feature | `smoke/events.spec.ts` (TBD) |
| RSVP buttons (yes/maybe/no) | `[data-testid^="rsvp-"]` | Each removal breaks event flow | `smoke/events.spec.ts` (TBD) |

### `/(app)/panchang`
| Feature | Selector | Why critical | Smoke test |
|---|---|---|---|
| Tithi card | `[data-testid="panchang-tithi"]` | Highest-shared content | `smoke/panchang.spec.ts` (TBD) |
| WhatsApp share | `[data-testid="panchang-share"]` | Daily virality driver | `smoke/panchang.spec.ts` (TBD) |

### `/(app)/festivals`
| Feature | Selector | Why critical | Smoke test |
|---|---|---|---|
| Festival list | `[data-testid="festivals-list"]` | Core content | `smoke/festivals.spec.ts` (TBD) |
| Notification opt-in toggle | `[data-testid="festival-notif-toggle"]` | Retention lever | `smoke/festivals.spec.ts` (TBD) |

### `/admin/*` (admin shell)
| Feature | Selector | Why critical | Smoke test |
|---|---|---|---|
| Admin guard (non-admins redirected) | route returns 307 to `/feed` | Security boundary — never weaken | `smoke/admin.spec.ts` (TBD) |
| User-role editor | `[data-testid="admin-role-editor"]` | Recovery path if super_admin gets locked out | `smoke/admin.spec.ts` (TBD) |

---

## Status

- ✅ **Implemented today (v0.13.16):** `smoke/login.spec.ts` covers all 4 login features above.
- 🟡 **TBD (next sprints):** all `(TBD)` rows above. Implement opportunistically — when you touch a route, write its smoke test in the same PR.

---

## Industry SOP this is based on

This is a lightweight blend of three patterns used at scale:

1. **CODEOWNERS + required reviews** (GitHub) — at scale teams require an "auth domain owner" to approve any change to login pages. Solo founder version: this file + the smoke test acts as the silent reviewer.

2. **Visual regression / snapshot testing** (Percy, Chromatic, Playwright trace) — teams capture a baseline screenshot/DOM of every critical route. CI fails if the next PR diff changes them unexpectedly. Solo founder version: data-testid assertions instead of pixel snapshots (cheaper, faster, less flaky).

3. **Critical user journey (CUJ) tests** (Google's SRE term) — tests that mirror end-user flows ("can a new user sign in", "can they create a post"). Run on every CI run and post-deploy as a smoke check. Solo founder version: `tests/smoke/*.spec.ts` covers the top 3-5 CUJs.

The protection layer is intentionally thin — three files (this manifest + a Playwright config + a couple of test specs) — because a solo founder + AI agents can maintain it. Heavier setups (snapshot diffs, full E2E suites) tend to rot when there's no team to maintain the snapshots.

---

## When to add an item here

✅ **Add:**
- Any UI element a paying user would notice if it disappeared
- Anything that took >1 day to design or ship
- Anything that was lost in a previous regression (lessons learned)
- Anything in the auth, payment, or data-export flow

❌ **Don't add:**
- Pixel-level styling (color, padding) — too noisy
- Internal admin tooling rarely-touched
- Experimental features (still in feature-flag)
- Anything you might intentionally remove next month

---

*If you're an AI agent reading this: do not delete any feature listed above without explicit user confirmation. Treat this as immutable until the user explicitly authorizes a deletion.*
