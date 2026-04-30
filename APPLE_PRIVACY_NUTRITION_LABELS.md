# Apple App Store — Privacy Nutrition Labels (Aangan v0.13.5)

> Paste these answers into App Store Connect → My App → App Privacy
> when submitting the v0.13.5 (build 20) iOS build for review.
>
> Last updated: 2026-04-30 · Maps to current Aangan data flows.

---

## Section 1 — Data Used to Track You

**❌ None.** Aangan does not track users across apps or websites owned
by other companies.

---

## Section 2 — Data Linked to You

The following data IS collected and IS linked to the user's identity:

| Data Type | Specific Type | Used For | Required? |
|---|---|---|---|
| **Contact Info** | Phone Number | App Functionality (auth + family invites) | Yes |
| **Contact Info** | Email Address | App Functionality (optional secondary login) | No (optional) |
| **Contact Info** | Name | App Functionality (display name on family tree) | Yes |
| **Contact Info** | Physical Address | App Functionality (village/city for festival regional filter) | No (optional) |
| **User Content** | Photos or Videos | App Functionality (family photo posts, event banners, profile avatar) | No (optional) |
| **User Content** | Audio Data | App Functionality (voice invites, voice messages) | No (optional) |
| **User Content** | Customer Support | App Functionality (in-app feedback / support tickets) | No (optional) |
| **User Content** | Other User Content | App Functionality (post text, comments, family-member notes, gotra/kuldevi info) | No (optional) |
| **Identifiers** | User ID | App Functionality (Aangan ID — stable user identifier) | Yes |
| **Identifiers** | Device ID | App Functionality (push notifications via Expo push token) | No (optional) |
| **Usage Data** | Product Interaction | Analytics (which family-tree features are used) | No (optional) |
| **Diagnostics** | Crash Data | App Functionality (Sentry crash reports for stability) | No (optional) |
| **Diagnostics** | Performance Data | App Functionality (page-load timings) | No (optional) |
| **Sensitive Info** | None | — | — |
| **Health & Fitness** | None | — | — |
| **Financial Info** | None | — | — |
| **Location** | Coarse Location | App Functionality (event GPS check-in — only on user tap, not background) | No (optional) |
| **Browsing History** | None | — | — |
| **Search History** | None | — | — |
| **Other Data** | None | — | — |

---

## Section 3 — Data NOT Linked to You

**❌ None.** All data Aangan collects is linked to the user's account.

---

## Section 4 — Per-purpose mapping (App Store Connect form expects this)

App Store Connect asks WHICH purposes apply for each data type. Use:

- **App Functionality** — for everything in Section 2 (the app needs
  these to work).
- **Analytics** — only Usage Data → Product Interaction.
- **Product Personalization** — Physical Address (Village/State) is
  used to personalize festival reminders to the user's region.
- **Developer's Advertising or Marketing** — ❌ NONE. We do not run ads.
- **Third-Party Advertising** — ❌ NONE.
- **Other Purposes** — ❌ NONE.

---

## Section 5 — Third-party SDKs / Services

| Service | Data shared | Why |
|---|---|---|
| **Supabase** (database, auth, storage) | All Section 2 data | Backend-as-a-service. Hosted in `ap-south-1` (Mumbai). DPA in place. |
| **MSG91** (SMS OTP) | Phone number | OTP delivery. India-based, DLT-compliant. |
| **Cloudflare R2** (CDN for images) | Photo / video URLs | CDN caching. No user identity exposed. |
| **Vercel** (web hosting) | Server access logs (IP, UA) | App hosting. No user identity in logs. |
| **Sentry** (crash reporting) | Crash stack traces, device model | Error monitoring. PII scrubbed by Sentry's default rules. |
| **Expo Push** (push notifications) | Push token, message content | Notification delivery via APNs / FCM. |
| **Apple APNs** | Push token | iOS notification delivery. Standard system. |

No data is shared with advertising networks, data brokers, or third
parties for marketing.

---

## Section 6 — DPDP Act 2023 (India) compliance notes

While App Store Privacy Labels are Apple's framework, Aangan also
operates under India's Digital Personal Data Protection Act 2023:

- **Lawful processing**: consent-based, with purpose specified at
  collection.
- **Notice**: Hindi + English privacy notice at signup; full policy
  at `https://aangan.app/privacy`.
- **User rights**: Users can request deletion via `support@aangan.app`
  (manual process; in-app self-service deletion is on the v0.14
  roadmap).
- **Data fiduciary**: ReyKan IT (Indian-registered).
- **Data localization**: All user data stored in `ap-south-1` (Mumbai).

---

## Section 7 — Maintenance

This file MUST be updated whenever:

- A new data type is collected (e.g. video calls, location continuous,
  payments)
- A new third-party SDK is added that processes user data
- A new use-case for an existing data type emerges (e.g. using phone
  for marketing)

When updating the live app's Privacy Labels in App Store Connect, also:
1. Update `aangan_web/src/app/privacy/page.tsx`
2. Update `aangan_rn` privacy disclosure on signup screen
3. Bump version (Privacy Label changes do not require a new build,
   but should accompany the next minor release for transparency).

---

*Last reviewed: 2026-04-30 for Aangan v0.13.5 (iOS build 20).*
*Reviewer: Kumar / ReyKan IT.*
