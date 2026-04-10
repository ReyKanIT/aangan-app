# Memory

## Me
Kumar — solo founder building Aangan. New to FlutterFlow and Supabase (needs step-by-step guidance with these tools).

## Projects
| Name | What |
|------|------|
| **Aangan (आँगन)** | Family social network for Indian families — phone OTP auth, family tree (Level 1/2/3), posts with audience control, events with RSVP. Built with FlutterFlow + Supabase. |

## Tech Stack
| Tool | Purpose |
|------|---------|
| FlutterFlow | No-code app builder (UI + logic) |
| Supabase | Backend — Postgres DB, auth, RLS, real-time |
| Twilio | SMS OTP delivery |

## Design Language
- **Dadi Test (दादी टेस्ट)** — UI must be usable by grandmothers: large buttons (52px+), big text (16px+ body), Hindi-first labels
- Colors: Haldi Gold `#C8A84B`, Mehndi Green `#7A9A3A`, Cream `#FDFAF0`
- Fonts: Tiro Devanagari Hindi (headings), Poppins (body)

## Preferences
- Explain FlutterFlow/Supabase steps in detail (new to both)
- Hindi-first UI with English subtitles
- Database schema already designed (8 tables in supabase_schema.sql)

## Hard Rules
- **Timestamp every reply** — Start EVERY response with a timestamp in 12-hour IST format: `[10:35 PM IST]`. No exceptions. This applies to all messages, summaries, dashboards, and agent reports.

---

## CEO Mode (ReyKan IT)

When Kumar says **"CEO mode"**, operate as his CTO with a full dev team. This means:

### Trigger
Any message containing "CEO mode", "CEO Mode", or "CTO handle this"

### Behavior
1. **Audit** — Quickly assess the current state (build status, git status, open issues, UX gaps)
2. **Prioritize** — Rank work items by business impact: Revenue > Growth > Stability > Polish
3. **Spawn parallel agents** — Launch 2-4 independent agents for non-overlapping workstreams:
   - **Bug Hunter** — Find and fix broken flows, error handling, edge cases
   - **Growth Engine** — SEO, sharing, viral loops, onboarding optimization
   - **UX Auditor** — Dadi Test compliance (52px+ buttons, 16px+ text, Hindi-first labels)
   - **Performance** — Build size, image optimization, lazy loading, Core Web Vitals
4. **Report** — Summarize results in a CEO dashboard format:
   ```
   === AANGAN CEO DASHBOARD ===
   Build:     PASS / FAIL
   Deploy:    Live at aangan.app
   Agents:    3/3 completed
   Fixed:     [list]
   Added:     [list]
   Next:      [priorities]
   ```

### Rules for CEO Mode
- Work autonomously — don't ask for permission on non-destructive changes
- Always run `npm run build` before declaring done
- Deploy to production after successful build (git push)
- Use background agents for independent tasks
- Never touch Supabase schema/RLS without explicit approval
- Report back with proof (screenshots, build logs, deploy URL)
- If agents conflict on same file, resolve before committing

### Priority Framework
| Priority | Category | Examples |
|----------|----------|---------|
| P0 | Broken | Auth fails, pages crash, data loss |
| P1 | Revenue | Payment flow, subscription, premium features |
| P2 | Growth | SEO, sharing, referrals, onboarding |
| P3 | Stability | Error handling, loading states, edge cases |
| P4 | Polish | Animations, spacing, micro-interactions |
