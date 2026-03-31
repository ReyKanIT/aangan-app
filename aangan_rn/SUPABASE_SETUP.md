# Aangan - Supabase Setup Guide

Complete guide to configure Supabase for the Aangan family social network.

## Prerequisites

- Supabase project created at [supabase.com](https://supabase.com)
- Twilio account for SMS OTP
- Node.js 18+ installed

## Quick Setup (5 steps)

### Step 1: Get Your Supabase Credentials

1. Go to **Supabase Dashboard > Settings > API**
2. Copy your **Project URL** and **anon/public key**
3. Create `.env` file in `aangan_rn/`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

### Step 2: Run Database Migrations

**Option A: Via Supabase Dashboard (Recommended for first setup)**

1. Go to **Supabase Dashboard > SQL Editor**
2. Copy and paste contents of `supabase/migrations/20260330000000_core_schema.sql`
3. Click **Run** - wait for completion
4. Copy and paste contents of `supabase/migrations/20260331000000_v2_storage_events.sql`
5. Click **Run** - wait for completion
6. Copy and paste contents of `supabase/migrations/20260331000001_storage_policies.sql`
7. Click **Run** - wait for completion

**Option B: Via Supabase CLI**

```bash
# Link to your remote project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push
```

### Step 3: Configure Phone OTP Authentication

1. Go to **Supabase Dashboard > Authentication > Providers**
2. Click **Phone** provider
3. Enable it and configure:

   | Setting | Value |
   |---------|-------|
   | SMS Provider | Twilio |
   | Twilio Account SID | From Twilio console |
   | Twilio Auth Token | From Twilio console |
   | Twilio Message Service SID | From Twilio Messaging Services |
   | SMS OTP Expiry | 600 (10 minutes) |
   | SMS OTP Length | 6 |
   | SMS Template | `आँगन (Aangan) - आपका OTP है: {{.Code}}। 10 मिनट में expire होगा।` |

4. Save changes

### Step 4: Create Storage Buckets

1. Go to **Supabase Dashboard > Storage**
2. Create these 4 buckets:

   | Bucket Name | Public | File Size Limit |
   |-------------|--------|-----------------|
   | `avatars` | Yes | 5 MB |
   | `posts` | No | 50 MB |
   | `events` | No | 50 MB |
   | `event-bundles` | No | 100 MB |

3. Storage RLS policies are already applied via the migration in Step 2.

### Step 5: Enable Realtime

1. Go to **Supabase Dashboard > Database > Replication**
2. Under **supabase_realtime** publication, enable the `notifications` table
3. This powers real-time push notifications in the app

## Verification Checklist

Run these queries in **SQL Editor** to verify setup:

```sql
-- Check all 17 tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: app_config, audience_groups, event_bundles, event_checkins,
-- event_confirmations, event_photos, event_rsvps, events, family_members,
-- family_storage_pools, notifications, post_audience, posts, referrals,
-- storage_purchases, user_storage, users

-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check all storage buckets
SELECT id, name, public FROM storage.buckets;

-- Check app_config is seeded
SELECT config_key, config_value FROM public.app_config;

-- Test the handle_new_user trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Test the storage signup trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_create_storage_on_user_signup';
```

## Twilio Setup (Detailed)

### 1. Create Twilio Account
- Sign up at [twilio.com](https://www.twilio.com)
- Verify your phone number

### 2. Get a Phone Number
- Go to **Phone Numbers > Manage > Buy a Number**
- Get an Indian-compatible number (or use Messaging Service for better delivery)

### 3. Create Messaging Service
- Go to **Messaging > Services**
- Create a new service named "Aangan OTP"
- Add your Twilio phone number as a sender
- Note the **Messaging Service SID** (starts with `MG...`)

### 4. Get Credentials
- **Account SID**: Found on Twilio Dashboard homepage
- **Auth Token**: Found on Twilio Dashboard homepage (click to reveal)
- **Message Service SID**: From step 3 above

### 5. Configure in Supabase
- Enter these 3 values in the Phone provider settings (Step 3 above)

## Architecture Overview

```
React Native App (Expo)
    |
    |-- Supabase Client (src/config/supabase.ts)
    |       |
    |       |-- Auth (Phone OTP via Twilio)
    |       |-- Database (17 Postgres tables with RLS)
    |       |-- Storage (4 buckets: avatars, posts, events, event-bundles)
    |       |-- Realtime (notifications table)
    |
    |-- Zustand Stores (src/stores/)
            |-- authStore (login, OTP, profile)
            |-- familyStore (family tree, relationships)
            |-- postStore (feed, audience control)
            |-- eventStore (events, RSVP)
            |-- notificationStore (real-time alerts)
            |-- storageStore (storage tracking)
            |-- rsvpStore (event responses)
            |-- photoStore (event photos)
            |-- languageStore (Hindi/English)
```

## Environment Summary

| Variable | Where | Purpose |
|----------|-------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` | Supabase public API key |
| `TWILIO_ACCOUNT_SID` | Supabase Dashboard | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Supabase Dashboard | Twilio secret token |
| `TWILIO_MESSAGE_SERVICE_SID` | Supabase Dashboard | Twilio messaging service |

## Test OTP (Development)

For local development, a test OTP is configured in `supabase/config.toml`:
- Phone: `+919999999999`
- OTP: `123456`

This only works with `supabase start` (local development). For the hosted project, you need real Twilio credentials.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| OTP not received | Check Twilio balance and phone number format (+91...) |
| RLS blocking queries | Check `auth.uid()` matches the user; use service_role for admin ops |
| Storage upload fails | Verify bucket exists and storage policies are applied |
| Realtime not working | Ensure `notifications` table is in the `supabase_realtime` publication |
| User profile not created | Check `on_auth_user_created` trigger on `auth.users` |
| Storage record missing | Check `trigger_create_storage_on_user_signup` trigger on `users` |
