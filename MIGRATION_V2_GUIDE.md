# Aangan V2 Migration Guide

## Overview
This migration adds storage monetization, referral system, and paid event bundles to Aangan.

**File:** `supabase_migration_v2.sql`
**Lines:** 789
**Status:** Production-ready

## What's New (9 Tables)

### Storage System (4 tables)
1. **user_storage** - Tracks each user's storage allocation (base 10GB + referrals + purchased)
2. **referrals** - Referral program tracking with verification
3. **storage_purchases** - Razorpay integration for paid storage (individual & pool)
4. **family_storage_pools** - Shared paid storage for families (Parivar Pool)

### Event Features (4 tables)
5. **event_bundles** - Paid event storage bundles (Free, Shagun, Mangal, Maharaja, etc.)
6. **event_photos** - Photo uploads with moderation & privacy controls
7. **event_checkins** - GPS check-in tracking at events
8. **event_confirmations** - Physical/call confirmations tracking

### Configuration (1 table)
9. **app_config** - Global settings (early adopter limits, referral limits, etc.)

## Key Features

### User Storage
- **Base:** 10 GB for all early adopters
- **Referral Bonus:** +2 GB per verified referral (max 10 referrals = +20 GB)
- **Purchased:** Via Razorpay (monthly/annual subscriptions)
- **Pool:** Member of family storage pool (shared storage)
- **Tiers:** base → bronze → silver → gold (based on purchased storage)

### Referral System
- Each user gets unique referral code
- Referred user must:
  - Complete OTP verification (real phone)
  - Set up profile (name + photo)
  - Stay active for 7 days (≥1 app open/day)
- Anti-abuse: Max 100 referrals/user, max 10 invites/day, verified count tracked
- If referred user deactivated: referral reversed, storage tier recalculated

### Event Bundles (7 types)
| Bundle | Price | Storage | Photos | Duration | Key Feature |
|--------|-------|---------|--------|----------|------------|
| **Free** | ₹0 | 0 GB (uses personal) | 10 max | 3 months | Basic invite mgmt |
| **Shagun** (शगुन) | ₹499 | 50 GB | 500 max | 3 months | QR upload |
| **Mangal** (मंगल) | ₹1,499 | 200 GB | Unlimited | 1 year | RSVP + GPS check-in |
| **Maharaja** (महाराजा) | ₹4,999 | 500 GB | Unlimited + video | 3 years | Priority support |
| **Puja/Birthday** | ₹199 | 25 GB | 200 max | 1 month | Moderation |
| **Gathering** | ₹499 | 50 GB | 500 max | 3 months | RSVP tracking |
| **Engagement** (सगाई) | ₹799 | 100 GB | 1K max | 6 months | Card tracker |

### Photo Management
- **Privacy types:** all, level (1-3), individual user list
- **Moderation:** pending → approved → visible to guests
- **Expiry:** Gallery expires, 30-day download warning, then archived/deleted

### Check-ins
- **Types:** GPS (coordinates + accuracy), Manual, QR code
- **One check-in per user per event**
- **Event creator can view all**

### App Config
Initialized with:
- `early_adopter_limit`: 10,000 users
- `early_adopter_count`: 0 (tracks actual)
- `max_referrals_per_user`: 100
- `referral_verification_days`: 7
- `max_daily_referral_invites`: 10

## Database Patterns Used

### Storage Calculations
- All storage in **bytes for precision** (GB × 1,073,741,824)
- All amounts in **paisa** (₹1 = 100 paisa)
- Checks: `CHECK (amount_inr > 0)`, `CHECK (storage_gb > 0)`, etc.

### Security (RLS)
- **All tables have RLS enabled**
- Users see own data only
- Event creator/pool admin has extended visibility
- System (service role) can insert/update for payments & automation

### Timestamps
- All tables use `TIMESTAMP WITH TIME ZONE`
- `created_at` - immutable
- `updated_at` - auto-updated via trigger
- Timezone-aware for Indian users across regions

### Foreign Keys
- `ON DELETE CASCADE` for user-dependent data (posts, events, etc.)
- `ON DELETE RESTRICT` for critical relationships (storage purchases → pools)
- `ON DELETE SET NULL` for optional references (moderated_by, confirmed_by)

### Indexes
- **Composite:** `(event_id, user_id)` for checkins/confirmations/RSVPs
- **Array:** `GIN` indexes on UUID[] columns (member_ids, privacy_user_ids)
- **Temporal:** DESC on `created_at` for reverse chronological queries
- **Foreign keys:** All FK columns indexed

## Critical Functions

### `check_storage_limit(user_id, file_size_bytes)`
- Returns `TRUE` if user can upload file
- Checks personal storage first
- Falls back to pool storage
- **Called before every file upload**

### `increment_early_adopter_count()`
- Increments app_config early_adopter_count
- Enforces 10K limit (returns FALSE if limit hit)
- Used during user signup

### `create_user_storage_on_signup()`
- Trigger on `users` table
- Auto-creates `user_storage` record
- Generates unique referral code
- Gives new user 10 GB base storage

## Deployment Steps

1. **Backup** existing Supabase data
2. **Run migration SQL** in Supabase SQL Editor
3. **Verify tables:** Check information_schema
4. **Create storage buckets:**
   - `avatars` (public) → /avatars/{user_id}/
   - `posts` (private) → /posts/{user_id}/{post_id}/
   - `events` (private) → /events/{event_id}/
   - `event-bundles` (private) → /event-bundles/{event_id}/
5. **Configure Razorpay:**
   - Add payment ID keys to environment
   - Test with test mode
6. **Test flows:**
   - User signup → auto storage created
   - Referral invite → verification tracking
   - Event creation → bundle selection → payment
   - Photo upload → storage limit check
   - Check-in → GPS logging

## Testing Queries

```sql
-- Check user storage
SELECT * FROM public.user_storage WHERE user_id = '<user-uuid>';

-- Verify referral code is unique
SELECT COUNT(*) FROM public.user_storage GROUP BY referral_code HAVING COUNT(*) > 1;

-- Check early adopter count
SELECT config_value FROM public.app_config WHERE config_key = 'early_adopter_count';

-- List all event bundles by type
SELECT bundle_type, COUNT(*), SUM(storage_gb) FROM public.event_bundles GROUP BY bundle_type;

-- Storage usage by user
SELECT us.user_id, us.base_storage_gb, us.purchased_gb, us.used_storage_bytes / 1073741824.0 as used_gb
FROM public.user_storage us
ORDER BY us.used_storage_bytes DESC;
```

## Storage Bucket Setup (Dashboard)

**Required RLS Policies:**

```sql
-- avatars bucket (PUBLIC)
-- Allow public read
CREATE POLICY "Public Read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
-- Allow authenticated user to upload own
CREATE POLICY "User Upload Own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- posts bucket (PRIVATE)
-- User can upload to own folder
CREATE POLICY "User Upload Posts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'posts' AND
    auth.role() = 'authenticated' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- events bucket (PRIVATE)
-- Invited users can upload
CREATE POLICY "Event Attendees Upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'events' AND
    auth.role() = 'authenticated'
  );

-- event-bundles bucket (PRIVATE)
-- Enforce storage limits
CREATE POLICY "Bundle Upload With Limit" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-bundles' AND
    auth.role() = 'authenticated' AND
    check_storage_limit(auth.uid(), size)
  );
```

## Troubleshooting

**Issue:** Duplicate referral codes
- **Fix:** `create_user_storage_on_signup()` has WHILE loop to ensure uniqueness

**Issue:** User over storage quota
- **Fix:** `check_storage_limit()` returns FALSE, reject upload

**Issue:** Pool members can see each other's data
- **Fix:** RLS policy restricts to pool members only via `member_ids`

**Issue:** Event photos visible before approval
- **Fix:** RLS policy requires `status = 'approved'` for guest access

## Revenue Model
- **Event bundles:** Primary revenue (₹199–₹4,999 per event)
- **Storage add-ons:** Secondary (₹99–₹999/month)
- **Family pools:** Premium feature (₹999–₹9,999/year)

---

**Migration Version:** 2.0
**Created:** 2026-03-31
**Author:** Kumar (Founder)
**Status:** Ready for Production Deployment
