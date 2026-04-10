# ReyKan IT — CEO Action Tracker
> Last updated: 2026-04-10

---

## SPRINT 1: Launch Ready (April 8 - April 14, 2026)

### P0 — Critical (This Week)

| # | Task | Owner | Status | ETA | Notes |
|---|------|-------|--------|-----|-------|
| 1 | Add Google Sign-In to web + mobile app | Claude | ✅ DONE | Apr 9 | Web + mobile, removes SMS OTP dependency |
| 2 | Fix Indus App Store screenshots (replace dashboard with real screens) | Claude + Kumar | PENDING | Apr 9 | Need real app screenshots |
| 3 | Complete VilPower DLT approval | VilPower | WAITING | Apr 10 | Reg# VI-1100093984, ~48 hrs |
| 4 | Register Header "AANGAN" on DLT | Claude | BLOCKED | Apr 10 | Needs VilPower approval first |
| 5 | Register OTP template on DLT | Claude | BLOCKED | Apr 10 | Needs VilPower approval first |
| 6 | Link PE-TM chain in MSG91 | Claude | BLOCKED | Apr 10 | Needs DLT Entity ID |
| 7 | Test real SMS OTP delivery | Claude | BLOCKED | Apr 11 | Needs all DLT steps done |
| 8 | Install Aangan on 5 family phones | Kumar | PENDING | Apr 9 | Use test OTP: 9886110312 -> 123456 |

### P1 — High Priority (This Week)

| # | Task | Owner | Status | ETA | Notes |
|---|------|-------|--------|-----|-------|
| 9 | Register Google Play Console ($25) | Kumar | ✅ DONE | Apr 10 | Registered, identity verified ✓ |
| 10 | Build signed release APK for Play Store | Claude | ✅ DONE | Apr 9 | APK + AAB built via EAS, APK hosted at aangan.app |
| 11 | Record 60-sec demo video | Kumar | PENDING | Apr 10 | Screen record: Login -> Feed -> Family Tree -> Panchang |
| 12 | Add SEO meta tags + OG images to aangan.app | Claude | ✅ DONE | Apr 8 | Meta tags, OG image, JSON-LD, favicon |
| 13 | Create WhatsApp broadcast with download link | Kumar | PENDING | Apr 9 | Message ready below |
| 14 | Fix email OTP (custom SMTP) | Claude | ✅ DONE | Apr 10 | MSG91 SMTP, 5000 emails/month free |

### P2 — Important (Next Week)

| # | Task | Owner | Status | ETA | Notes |
|---|------|-------|--------|-----|-------|
| 15 | Apply for Startup India Recognition | Kumar | PENDING | Apr 14 | startupindia.gov.in |
| 16 | Add push notifications (FCM) | Claude | PENDING | Apr 14 | For new posts, events, family invites |
| 17 | Add profile photo upload | Claude | PENDING | Apr 14 | Currently missing |
| 18 | Set up custom email domain (info@aangan.app) | Claude | PENDING | Apr 14 | For OTP emails + professional comms |
| 19 | Create Instagram/YouTube page for Aangan | Kumar | PENDING | Apr 14 | Short demo reels |
| 20 | Write 2 blog posts on aangan.app | Claude | ✅ DONE | Apr 9 | Panchang + Festivals pages live |

---

## SPRINT 2: Growth (April 15 - April 30, 2026)

| # | Task | Owner | Status | ETA | Notes |
|---|------|-------|--------|-----|-------|
| 21 | Submit to Google Play Store | Kumar | READY | Apr 15 | Identity verified ✓, signed APK ready, need screenshots + listing |
| 22 | Get 50 real users (family + friends network) | Kumar | PENDING | Apr 20 | Target: Choudhary/extended family |
| 23 | Add Hindi blog content for SEO | Claude | PENDING | Apr 20 | "आज का पंचांग" daily pages |
| 24 | Implement premium features (family tree PDF export) | Claude | PENDING | Apr 25 | First monetization feature |
| 25 | Add WhatsApp sharing for posts/events | Claude | PENDING | Apr 25 | Viral growth mechanism |
| 26 | iOS build via EAS | Claude | UNBLOCKED | Apr 30 | Apple Developer $99 paid, awaiting account activation |

---

## SPRINT 3: Monetization (May 2026)

| # | Task | Owner | Status | ETA | Notes |
|---|------|-------|--------|-----|-------|
| 27 | Define freemium tiers | Kumar + Claude | PENDING | May 5 | Free: 20 members, Pro: unlimited |
| 28 | Integrate Razorpay payments | Claude | PENDING | May 10 | For premium subscriptions |
| 29 | Festival marketplace (Diwali prep) | Claude | PENDING | May 15 | Connect with local vendors |
| 30 | Reach 500 users milestone | Kumar | PENDING | May 30 | Growth target |

---

## Completed Tasks

| # | Task | Completed | Notes |
|---|------|-----------|-------|
| C1 | Website live at aangan.app | Apr 6 | Cloudflare + Vercel |
| C2 | Fix Hindi Unicode rendering | Apr 6 | Replaced escape sequences |
| C3 | Cloudflare DDoS/WAF/SSL setup | Apr 6 | Full security configured |
| C4 | Fix APK download link | Apr 6 | Hosted on Vercel public/ |
| C5 | Enable Supabase Phone auth | Apr 6 | Phone provider + Send SMS hook |
| C6 | Fix edge function BOOT_ERROR | Apr 6 | Removed unused import |
| C7 | Fix edge function payload format | Apr 6 | sms.otp not otp |
| C8 | Create OTP template in MSG91 OTP section | Apr 6 | ID: 69d50d42a906e8ed3f047d02 |
| C9 | Set up test phone OTP | Apr 6 | 9886110312 -> 123456 |
| C10 | Add Panchang widget to web feed | Apr 7 | Drik Ganita calculations |
| C11 | VilPower DLT registration submitted | Apr 8 | Reg# VI-1100093984, Rs.5900 paid |
| C12 | All DLT docs uploaded | Apr 8 | PAN, CoI, LOA, DL |
| C13 | MSG91 linked as Telemarketer on DLT | Apr 8 | Walkover Web Solutions |
| C14 | B2 Cloud Storage integration (media uploads) | Apr 9 | Backblaze B2 + uploadB2.ts + upload API route |
| C15 | Cloudflare CDN setup (media.aangan.app) | Apr 9 | CNAME proxy + B2 friendly URLs |
| C16 | Vercel environment variables for B2 | Apr 9 | 6 env vars added (Production + Preview) |
| C17 | Post likes persistence | Apr 9 | post_likes table + RLS + auto-count trigger |
| C18 | Client-side image compression | Apr 9 | browser-image-compression (1MB, 1920px, WebP) |
| C19 | Version bump to v0.6.0 | Apr 9 | Web + mobile (buildNumber 7, versionCode 7) |
| C20 | Google Sign-In (web + mobile) | Apr 9 | Supabase Google OAuth + web login flow |
| C21 | EAS builds v0.6.0 (APK + AAB) | Apr 9 | production-apk + production profiles, both finished |
| C22 | APK hosted at aangan.app | Apr 9 | Aangan-v0.6.0.apk (106MB) in public/ |
| C23 | Sentry error monitoring integration | Apr 9 | @sentry/nextjs, global-error.tsx, env-var gated |
| C24 | Panchang daily blog page for SEO | Apr 9 | aangan.app/panchang, SSR, Hindi+English, JSON-LD |
| C25 | Version strings updated to v0.6.0 | Apr 9 | Landing page, auth, settings, sidenav |
| C26 | APK download link updated to v0.6.0 | Apr 9 | Landing page pointed to new APK |
| C27 | Festival calendar 2026 page | Apr 9 | aangan.app/festivals, 24 festivals, Hindi+English, SEO |
| C28 | Marketing demo slideshow | Apr 9 | aangan.app/demo, 8 slides, auto-play for screen recording |
| C29 | Login flow fix (new user redirect) | Apr 9 | Both auth callbacks now detect new users → profile-setup |
| C30 | Production deploy v0.6.0 (all pages) | Apr 9 | Vercel prod deploy with all new pages live |
| C31 | MSG91 Email domain verified | Apr 10 | mail.aangan.app — SPF, DKIM, MX, CNAME all verified |
| C32 | Custom SMTP in Supabase | Apr 10 | MSG91 SMTP (smtp.mailer91.com:587), 5000 emails/month free |
| C33 | Google Play Console registered + verified | Apr 10 | ReyKan, identity verification DONE |
| C34 | Apple Developer enrollment paid | Apr 10 | $99 paid, account activation in progress |
| C35 | CEO Mode configured in CLAUDE.md | Apr 10 | Multi-agent parallel execution, priority framework |
| C36 | v0.7.0 — login redesign + signup enhancements | Apr 10 | Name field, phone signup, password UX, ShareButton, PWA |
| C37 | CEO audit: 15 Dadi Test fixes + 5 bug fixes + 6 SEO fixes | Apr 10 | 3 parallel agents, deployed |
| C38 | Admin bugs fixed (support + analytics) | Apr 10 | is_from_support, totalFamilies/Photos queries |
| C39 | APK link fixed to v0.6.0 | Apr 10 | v0.7.0 APK not yet built |
| C40 | Comments feature (store + UI + PostCard) | Apr 10 | commentStore, CommentSection, optimistic delete |
| C41 | Direct Messages / Chat feature | Apr 10 | messageStore, messages page, conversation list + chat |
| C42 | Kuldevi page (कुलदेवी/कुलदेवता) | Apr 10 | 6 fields, edit/save, Hindi-first, VoiceButton |
| C43 | Voice Control (Web Speech API) | Apr 10 | VoiceButton (hi-IN), PostComposer + Chatbot integration |
| C44 | Chatbot (आँगन बॉट) | Apr 10 | Local knowledge base, Hindi-first, quick replies |
| C45 | SideNav updated (Kuldevi, Messages, Chatbot) | Apr 10 | Unread badges for messages |
| C46 | QA tester agent — all 6 features verified | Apr 10 | 3 bugs fixed (double AppShell, VoiceButton 52px, delete btn) |
| C47 | Version bump to v0.8.0 + deploy | Apr 10 | 18 files, 1600+ lines, all routes compile |

---

## Key Credentials & IDs

| Item | Value |
|------|-------|
| VilPower DLT Reg# | VI-1100093984 |
| MSG91 TM ID | 1302157225275643280 |
| MSG91 OTP Template ID | 69d50d42a906e8ed3f047d02 |
| Supabase Project | okzmeuhxodzkbdilvkyu |
| Vercel Project | aangan_web (rey-kan) |
| Domain | aangan.app (Cloudflare + BigRock) |
| Indus App Store | App ID: 2227179 |
| Company CIN | U72900KA2023PTC170575 |
| Test OTP | 9886110312 -> 123456 |

---

## WhatsApp Broadcast Message (Ready to Send)

```
🏠 Aangan आँगन — अपने परिवार का Digital Home

परिवार से जुड़ें, पल साझा करें!

India's first family social network with:
✅ Family Tree (परिवार का पेड़)
✅ Hindu Panchang (पंचांग)
✅ Voice Control in Hindi
✅ Family Events & RSVP
✅ Photo Sharing

📱 Download now: https://aangan.app

बड़े बटन, बड़े अक्षर — दादी भी चला सकती हैं! 🙏
```
