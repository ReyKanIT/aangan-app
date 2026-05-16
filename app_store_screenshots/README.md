# App Store Screenshots — v1 (web capture)

Six PNG screens, each **1290×2796** (Apple 6.7″ iPhone Pro Max class, also accepted for Google Play 9:19.5 portrait).

Captured `[11:31pm - 15May26]` from the production web app via headless Chrome at `localhost:3000` after the v0.15.5/6 commits.

## Files

| # | File | Page | Status |
|---|---|---|---|
| 01 | `01-landing.png` | `/` Landing — hero + 100 परिवार proof + Android CTA + features grid + share | ✅ ready |
| 02 | `02-panchang.png` | `/panchang` — full panchang (tithi, nakshatra, yoga, karana, sunrise, sunset, Abhijit, Rahu/Yama/Gulika kalam, day+night choghadiya) | ✅ ready, **showcase screen** |
| 03 | `03-festivals.png` | `/festivals` — Hindu festival list | ✅ ready |
| 04 | `04-login.png` | `/login` — phone OTP entry, Google sign-in, Hindi-first | ⚠️ whitespace below form — needs Canva crop or device frame |
| 05 | `05-kuldevi.png` | `/kuldevi` — kuldevi feature | ⚠️ short content, whitespace below |
| 06 | `06-demo.png` | `/demo` — feature demo | ✅ ready |

## Limitations of v1

1. **All public pages — no authenticated screens.** Feed, Family Tree, Settings, Events all require login. Capture those via iOS simulator with the demo account (see `APPLE_REVIEW_DEMO_ACCOUNT.md`) before final submission. Authenticated screens are the most important for App Store conversion — these are the "what does the app actually do" shots.
2. **No device frame.** Apple doesn't require it, but it dramatically lifts perceived quality. Drop these PNGs into [Canva → Mockup → iPhone 15 Pro Max](https://www.canva.com) or [Figma → Mockup plugin] for free framing.
3. **No marketing copy overlay.** Top winning iOS apps in India typically have a single bold caption like "अपने परिवार से जुड़ें" / "Family Tree, Posts, Festivals". Add in Canva.
4. **Short pages have visible whitespace.** Login + Kuldevi don't fill 2796px tall — App Store accepts this but it looks lazy. Either crop tighter or hero them with a device frame.

## How to regenerate

```bash
# From repo root with dev server running on :3000:
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for entry in "01-landing|/" "02-panchang|/panchang" "03-festivals|/festivals" \
             "04-login|/login" "05-kuldevi|/kuldevi" "06-demo|/demo"; do
  name="${entry%%|*}"
  url="http://localhost:3000${entry##*|}"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --window-size=1290,2796 --force-device-scale-factor=1 \
    --virtual-time-budget=4000 \
    --screenshot="app_store_screenshots/${name}.png" "$url"
done
```

## Apple required minimums

- **6.7″ iPhone Pro Max** (1290×2796) — what's here. **Required**, 3 minimum, up to 10.
- **6.5″ iPhone (12 Pro Max / 11 Pro Max / XS Max)** (1284×2778 or 1242×2688) — required if 6.7″ not provided, but 6.7″ scales down automatically since iOS 15, so just 6.7″ is fine.
- **iPad Pro 12.9″** (2048×2732) — optional unless you flip "supportsTablet": true. The current `app.json` has `"supportsTablet": true`, so iPad screens **are required**. Capture these separately at 2048×2732 viewport.

## Google Play required minimums

- **Phone screenshots**: 1080×1920 or larger, 9:16. The 1290×2796 captures work (Play resizes).
- **2 minimum, 8 maximum.**

## Recommended additional captures before submission

Run after demo account is wired (per `APPLE_REVIEW_DEMO_ACCOUNT.md`):

| # | Screen | Why crucial |
|---|---|---|
| 07 | `/feed` (authed, panchang widget visible, 1-2 posts) | Primary "what the app does" |
| 08 | `/family` (authed, family tree with 8+ members) | Hero feature, visually striking |
| 09 | `/events/[id]` with RSVP buttons | Core feature |
| 10 | `/tithi-reminders` | Differentiator vs WhatsApp |
| 11 | `/settings` showing Aangan ID + WhatsApp share | Discovery primitive |
| 12 | `/profile-setup` first-run | Onboarding shot |

Once captured, replace `04-login.png` and `05-kuldevi.png` with the stronger authenticated screens for the final upload.

## ASC upload path

App Store Connect → Aangan → App Store → 1.0 Prepare for Submission → **iPhone 6.7" Display** section → drag the 6 PNGs in order. Save. They appear left-to-right in the App Store listing in this same order — sort `01` first (landing), `02` second (panchang), etc.
