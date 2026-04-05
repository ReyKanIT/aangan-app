---
name: Aangan Project
description: Family social network app for Indian families — FlutterFlow + Supabase, phone OTP auth, family tree, events
type: project
---

# Aangan (आँगन)

A family social network platform designed for Indian families. The name means "courtyard" — the shared family space in Indian homes.

## Tech Stack
- **Frontend**: FlutterFlow (no-code)
- **Backend**: Supabase (Postgres, Auth, RLS, Realtime)
- **SMS**: Twilio for OTP delivery
- **Region**: Mumbai (Supabase), optimized for India

## Database (8 tables)
1. `users` — profiles with Hindi name support, village, family_level
2. `family_members` — relationships with Level 1 (Direct), 2 (Close), 3 (Extended)
3. `audience_groups` — reusable groups for content sharing control
4. `posts` — text/photo/video with audience-based visibility
5. `post_audience` — per-post audience rules
6. `events` — weddings, pujas, gatherings with location + RSVP
7. `event_rsvps` — attendance tracking with dietary preferences
8. `notifications` — real-time activity alerts

## Design Philosophy
- **Dadi Test (दादी टेस्ट)**: Every screen must be usable by a grandmother
- Hindi-first labels, English subtitles
- Large touch targets, soft shadows, rounded corners

## Build Order (from Build Guide)
1. Login/Signup (phone OTP) ← current focus
2. Home Feed
3. Family Tree
4. Post Composer
5. Event Invitations
6. Member Profile
7. Notifications

## Key Files
- `Aangan_Build_Guide.md` — step-by-step FlutterFlow + Supabase instructions
- `supabase_schema.sql` — complete database schema with RLS policies
- `aangan_screens_v1.jsx`, `aangan_screens_v2.jsx` — UI mockups
- `login_signup_mockup.jsx` — login flow mockup
- `aangan_family_tree_v3.html` — family tree visualization
