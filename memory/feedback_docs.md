---
name: Always update PRD, Pitch Deck & Business Plan
description: After every new feature, update the three living documents and version history
type: feedback
---

After implementing any new feature, ALWAYS update three living documents:
- `/AANGAN_PRD.md` — Product Requirements Document
- `/AANGAN_PITCH_DECK.md` — Pitch deck content
- `/AANGAN_BUSINESS_PLAN.md` — Business plan

Add the feature to the relevant section AND bump the version history table in each doc.

**Why:** User wants a single source of truth for product, investor, and strategy docs — always current.

**How to apply:** At the end of every feature implementation session, update all three docs before signing off. The docs are Markdown so they can be opened in any editor or printed to PDF.

When asked to generate downloadable packages for testing:
- Trigger EAS build: `eas build --platform android --profile preview` (for APK)
- Or iOS simulator: `eas build --platform ios --profile preview-ios-sim`
- Upload to Firebase App Distribution if Firebase CI token is available
