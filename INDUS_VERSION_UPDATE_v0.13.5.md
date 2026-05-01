# Indus App Store — Version Update Packet (v0.13.5)
*[1:30am - 1May26]*

> Copy-paste-ready content for the next Indus submission. Walk through
> this top-to-bottom while you have https://developer.indusappstore.com
> open in another tab.

---

## ⚠️ Prerequisite

The currently published version on Indus is whatever was last submitted
(Indus doesn't expose it on the public listing). The RN source is now at
**v0.13.5** (versionCode 20, buildNumber 20). Before pasting any of the
notes below, you must:

1. ✅ Build a fresh signed AAB/APK via EAS — `eas build --profile production-apk --platform android` (uses 1 of 15 monthly slots).
2. ✅ Upload that artifact to Indus.
3. THEN paste the "What's new" notes from this doc.

If the Indus dev console shows a current version other than `0.9.x`,
substitute the actual version in the headers below.

---

## 1. "What's new" — short version (Hindi + English, ≤500 chars)

Indus's "What's new" field has a soft 500-char limit (matches Play
Store). Use this version if the field rejects more.

### Hindi (489 chars)
```
आँगन v0.13.5 — परिवार और भी क़रीब

🌳 परिवार-वृक्ष अब हर सदस्य के नज़रिए से सही रिश्ता दिखाए — चाचा, मामा, दादा सब अपने-आप
🔗 WhatsApp से एक टैप में परिवार में जुड़ें — रिश्ता पहले से तय
🆔 आपकी अपनी आँगन ID — फ़ोन या ईमेल बदलें, परिवार वही रहे
🪔 50+ त्योहार reminders + दैनिक पंचांग
🎙️ आवाज़ का स्वागत संदेश, सह-मेज़बान, उप-इवेंट
🔒 निजता और मज़बूत — घर का डेटा घर में ही

एक ऐप, पूरा परिवार 🙏
```

### English (495 chars)
```
Aangan v0.13.5 — Bringing families closer

🌳 Family tree now shows the right relationship from YOUR view — chacha, mama, dada all auto-detected
🔗 One-tap WhatsApp family invites — relationship pre-set
🆔 Your own Aangan ID — phone or email may change, family stays
🪔 50+ festival reminders + daily Panchang
🎙️ Voice welcome messages, co-hosts, sub-events
🔒 Privacy hardened — household data stays in the household

One app, the whole family 🙏
```

---

## 2. "What's new" — long version (full feature list, for the long description if Indus allows)

```
NEW IN v0.13.5 (since v0.9.x):
🆔 Stable Aangan ID — every user gets a permanent share-able code
   (AAN-XXXX YYYY) that survives phone or email changes. Find each
   other by ID even after switching numbers.
🌳 Per-viewer family-tree labels — your bhabhi shows as bhabhi for
   YOU even when she was added by your brother as his patni. "via X"
   badge shows which side of the family she came from.
🔗 WhatsApp deep-link family invites — generates a one-tap link with
   the relationship pre-set; recipient lands directly on the family-
   add screen.
🪔 Festival chatbot grounded in 27+ real festivals — actual upcoming
   dates in Hindi, filtered to your state (Karwa Chauth for north
   India, Pongal for Tamil Nadu, Chhath for Bihar/UP).
🪔 50+ festivals catalogue with regional opt-in/out preferences.
📅 Recurring panchang reminders — every-month tithi alerts
   (पूर्णिमा, अमावस्या, एकादशी).
🔒 Privacy-safe family-of-family view — see relatives' tree
   positions without their phone / email / DOB / address being
   exposed to family-of-family viewers.

ALSO INCLUDED (from prior releases):
🎙️ Voice invites — record a 30-second blessing, plays inline.
👥 Co-hosts — bride + groom + both mothers can edit one event.
💍 Wedding sub-event series — Tilak, Haldi, Mehndi, Sangeet, Shaadi.
🎁 Gift register — private शगुन ledger visible only to host.
📇 Bulk invites — pick from phone contacts, schedule a send.
📍 GPS event check-in for guests.
🎉 Potluck — guests claim items by quantity.
🌳 Family Tree with offline + deceased member support (3 levels).
🗣️ Voice messages + Hindi/English voice-to-text.
🙏 Kuldevi / Kuldevta traditions.
📸 Photo sharing with audience control.
💬 Direct messages & family chat.
👵 Dadi Test UX — 52px+ buttons, 16px+ text, Hindi-first.
```

---

## 3. Indus dev-console steps

When the new build is uploaded:

1. **Indus Dev Console** → Aangan listing → **Edit Details**
2. **App description** (long): paste section 2 above as-is, or merge
   into the existing description if you prefer.
3. **What's new in this version**: paste section 1 (Hindi or English
   per language preference; Indus accepts both).
4. **App version** field: confirm it shows `0.13.5` (it'll auto-read
   from the AAB/APK manifest — you can override the display string if
   needed).
5. **Reviewer notes** (private — visible to Indus reviewers only):
   paste from `TESTING_INDUS_APP_STORE.md` (already refreshed to
   v0.13.5 with the new Discovery-testing walkthrough for Aangan ID).
6. **Screenshots**: if any feature shown in the screenshots changed
   visually (family tree got the per-viewer labels + via-X chip,
   settings got the Aangan ID card), capture fresh screenshots from
   /family and /settings to refresh.
7. Click **Submit for Final Review**.

---

## 4. Reviewer note refresh — already in repo

The reviewer note at `TESTING_INDUS_APP_STORE.md` was refreshed in
tonight's commit (52297eb) from v0.9.14 → v0.13.5 with:

- New "What's live in v0.13.5" section listing all v0.10–v0.13.5 features
- New "Discovery testing" section walking the reviewer through the
  Aangan ID flow (Settings → see ID → second device → AddMember →
  paste ID → instant lookup)

When you open the Indus reviewer-notes field, copy from there — don't
re-paste the v0.9.14 version that may still be cached in your browser.

---

## 5. Prediction: what Indus will ask

Based on the v0.9.x → v0.13.5 jump (12 minor versions), Indus's
reviewer is likely to flag any of:

- **MSG91 OTP path** — already documented in reviewer notes, no test
  numbers needed, real SMS via Vi DLT chain.
- **Privacy-policy URL** — confirm `https://aangan.app/privacy` still
  resolves (it does, per tonight's smoke test).
- **Permissions used** — `RECORD_AUDIO` (voice messages), `CAMERA` +
  `READ_MEDIA_IMAGES` (photo sharing), `POST_NOTIFICATIONS` (festival
  alerts), `ACCESS_FINE_LOCATION` only-when-tapped (event check-in).
  All declared in `aangan_rn/app.json` `infoPlist` + `androidPermissions`.
- **DPDP compliance** — all data stored in `ap-south-1` (Mumbai),
  consent flow on signup, deletion via support@aangan.app. See
  `APPLE_PRIVACY_NUTRITION_LABELS.md` Section 6 — same answers apply
  to Indus.
- **In-app purchases / subscriptions** — none. App is free, no IAP,
  no ads. Confirm in the listing.

---

## 6. Cross-store consistency

If you also push to Play Store this round:

- The Play "What's new" (already in `PLAY_STORE_LISTING.md` v0.13.5)
  matches section 1 above — keep them in sync so users on either
  store see the same updates.
- The App Store iOS notes (`APP_STORE_ASSETS.md` v0.13.5) are slightly
  shorter (Apple's first-170-char visible window). Don't paste the
  Play version into iOS without trimming.

---

## Status checklist before submitting

- [ ] Fresh AAB/APK built via EAS (versionCode = 20, versionName = 0.13.5)
- [ ] AAB uploaded to Indus dev console
- [ ] "What's new" pasted from Section 1 above
- [ ] Long description updated from Section 2 (optional)
- [ ] Reviewer notes synced from TESTING_INDUS_APP_STORE.md
- [ ] Screenshots refreshed (family tree + settings)
- [ ] Submitted for review
- [ ] Calendar reminder set to check approval status in 2-3 days

---

*This packet was generated 2026-05-01. Update version numbers + delta
features when preparing the NEXT submission (v0.13.6+).*
