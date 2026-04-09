# ReyKan IT — CEO Action Tracker
> Last updated: 2026-04-09

---

## SPRINT 1: Launch Ready (April 8 - April 14, 2026)

### P0 — Critical (This Week)

| # | Task | Owner | Status | ETA | Notes |
|---|------|-------|--------|-----|-------|
| 1 | Add Google Sign-In to web + mobile app | Claude | IN PROGRESS | Apr 9 | Removes SMS OTP dependency |
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
| 9 | Register Google Play Console ($25) | Kumar | PENDING | Apr 9 | play.google.com/console |
| 10 | Build signed release APK for Play Store | Claude | PENDING | Apr 10 | Needs EAS login |
| 11 | Record 60-sec demo video | Kumar | PENDING | Apr 10 | Screen record: Login -> Feed -> Family Tree -> Panchang |
| 12 | Add SEO meta tags + OG images to aangan.app | Claude | PENDING | Apr 9 | Title, description, social sharing |
| 13 | Create WhatsApp broadcast with download link | Kumar | PENDING | Apr 9 | Message ready below |
| 14 | Fix email OTP (custom SMTP) | Claude | PENDING | Apr 10 | Supabase free tier limit = 4/hr |

### P2 — Important (Next Week)

| # | Task | Owner | Status | ETA | Notes |
|---|------|-------|--------|-----|-------|
| 15 | Apply for Startup India Recognition | Kumar | PENDING | Apr 14 | startupindia.gov.in |
| 16 | Add push notifications (FCM) | Claude | PENDING | Apr 14 | For new posts, events, family invites |
| 17 | Add profile photo upload | Claude | PENDING | Apr 14 | Currently missing |
| 18 | Set up custom email domain (info@aangan.app) | Claude | PENDING | Apr 14 | For OTP emails + professional comms |
| 19 | Create Instagram/YouTube page for Aangan | Kumar | PENDING | Apr 14 | Short demo reels |
| 20 | Write 2 blog posts on aangan.app | Claude | PENDING | Apr 14 | Panchang daily + festival guide |

---

## SPRINT 2: Growth (April 15 - April 30, 2026)

| # | Task | Owner | Status | ETA | Notes |
|---|------|-------|--------|-----|-------|
| 21 | Submit to Google Play Store | Kumar | PENDING | Apr 15 | After signed APK ready |
| 22 | Get 50 real users (family + friends network) | Kumar | PENDING | Apr 20 | Target: Choudhary/extended family |
| 23 | Add Hindi blog content for SEO | Claude | PENDING | Apr 20 | "आज का पंचांग" daily pages |
| 24 | Implement premium features (family tree PDF export) | Claude | PENDING | Apr 25 | First monetization feature |
| 25 | Add WhatsApp sharing for posts/events | Claude | PENDING | Apr 25 | Viral growth mechanism |
| 26 | iOS build via EAS | Claude | PENDING | Apr 30 | Needs Apple Developer ($99/yr) |

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
