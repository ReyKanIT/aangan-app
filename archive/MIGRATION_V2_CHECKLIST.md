# Aangan V2 Migration Checklist

## Pre-Deployment

- [ ] **Backup Supabase database** (Dashboard > Project Settings > Backups)
- [ ] **Review PRD sections 8.1-8.8** for requirements
- [ ] **Read MIGRATION_V2_GUIDE.md** for deployment process
- [ ] **Confirm Razorpay account** is set up with test keys

## Deployment

### Step 1: Run Migration SQL
- [ ] Open Supabase Dashboard > SQL Editor
- [ ] Copy contents of `supabase_migration_v2.sql`
- [ ] Execute full migration
- [ ] Check for errors (should be none)

### Step 2: Verify All Tables Created
Run this query to verify all 9 tables:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_storage', 'referrals', 'storage_purchases', 'family_storage_pools',
  'app_config', 'event_bundles', 'event_photos', 'event_checkins', 'event_confirmations'
)
ORDER BY table_name;
```
Expected output: 9 rows

### Step 3: Verify RLS Enabled
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;
```
Should include all new tables (at least 9 rows for new tables)

### Step 4: Verify app_config Initialized
```sql
SELECT config_key, config_value FROM public.app_config;
```
Should return:
- early_adopter_limit → 10000
- early_adopter_count → 0
- max_referrals_per_user → 100
- referral_verification_days → 7
- max_daily_referral_invites → 10

### Step 5: Test Functions
```sql
-- Test check_storage_limit (should work without error)
SELECT public.check_storage_limit('00000000-0000-0000-0000-000000000000'::uuid, 1073741824);

-- Test increment_early_adopter_count (should return true initially)
SELECT public.increment_early_adopter_count();
```

## Post-Deployment

### Storage Buckets (Dashboard)
- [ ] Create bucket: `avatars` (Public)
- [ ] Create bucket: `posts` (Private)
- [ ] Create bucket: `events` (Private)
- [ ] Create bucket: `event-bundles` (Private)
- [ ] Add RLS policies to each bucket (see MIGRATION_V2_GUIDE.md)

### Razorpay Integration
- [ ] Add Razorpay API Key to environment variables
- [ ] Add Razorpay Secret Key to environment variables
- [ ] Test payment webhook endpoints
- [ ] Enable test mode for initial testing

### FlutterFlow Updates
- [ ] Update Supabase connector to access new tables
- [ ] Add storage_tier to user profile screen
- [ ] Add referral_code display to settings screen
- [ ] Create event bundle selection modal
- [ ] Add storage usage progress bar
- [ ] Add photo moderation queue for event creators

## Testing Flows

### Test 1: User Signup → Storage Auto-Created
```
1. Sign up with phone OTP
2. Verify in Supabase SQL:
   SELECT * FROM public.user_storage WHERE user_id = '<new-user-id>'
3. Should return: base_storage_gb=10, referral_code=<unique>, storage_tier='base'
```

### Test 2: Referral System
```
1. User A (referrer) gets referral code from settings
2. User B (referee) signs up with code
3. Verify referral created:
   SELECT * FROM public.referrals WHERE referrer_id='<A>' AND referred_id='<B>'
   Status should be 'pending'
4. Wait 7 days OR manually update last_seen_at in users table
5. Verify referral marked verified:
   SELECT * FROM public.referrals WHERE id='<referral-id>'
   Status should be 'verified', verified_at should be recent
6. Check storage updated:
   SELECT * FROM public.user_storage WHERE user_id='<A>'
   referral_bonus_gb should be 2, verified_referral_count should be 1
```

### Test 3: Event Bundle Creation
```
1. Create event in FlutterFlow
2. Select bundle type (Free, Shagun, Mangal, Maharaja)
3. If paid: complete Razorpay payment (test mode)
4. Verify bundle created:
   SELECT * FROM public.event_bundles WHERE event_id='<event-id>'
   bundle_type, storage_gb, amount_inr should match selection
5. If paid: Razorpay payment ID should be recorded
```

### Test 4: Photo Upload with Storage Limit
```
1. Upload photo to event (≤50 MB for test)
2. System calls check_storage_limit():
   - Should return TRUE if space available
   - Should return FALSE if quota exceeded
3. Verify photo created:
   SELECT * FROM public.event_photos WHERE event_id='<event-id>'
   status='pending', uploader_id='<user-id>'
4. Event creator approves photo (moderation)
5. Photo visible to invited guests only
```

### Test 5: GPS Check-in
```
1. User at event location, opens check-in screen
2. App captures GPS coordinates + accuracy
3. Submit check-in
4. Verify in database:
   SELECT * FROM public.event_checkins WHERE event_id='<event-id>' AND user_id='<user-id>'
   checkin_type='gps', latitude/longitude should be present
5. Event creator can view all check-ins on event page
```

### Test 6: Family Storage Pool
```
1. Family admin (user A) purchases pool storage for 200GB @ ₹4,999
2. Razorpay payment processed (test mode)
3. Verify pool created:
   SELECT * FROM public.family_storage_pools WHERE admin_id='<A>'
   total_storage_gb=200, member_ids='{}' (initially empty)
4. Admin adds family members B & C to pool
5. Verify member_ids updated:
   SELECT member_ids FROM public.family_storage_pools WHERE admin_id='<A>'
   Should contain UUIDs of B and C
6. Users B & C update their storage records:
   UPDATE user_storage SET pool_id='<pool-id>' WHERE user_id IN ('<B>', '<C>')
7. When B uploads photo: check_storage_limit() uses pool storage if personal quota exceeded
```

## Quality Checks

### Data Integrity
- [ ] No duplicate referral codes: `SELECT COUNT(*) FROM (SELECT referral_code FROM public.user_storage GROUP BY referral_code HAVING COUNT(*) > 1) t;` → Should return 0
- [ ] No duplicate user_storage per user: `SELECT user_id, COUNT(*) FROM public.user_storage GROUP BY user_id HAVING COUNT(*) > 1;` → Should return 0
- [ ] Foreign key constraints working (try deleting a user)
- [ ] CHECK constraints enforced (try inserting invalid storage_tier)

### Performance
- [ ] Indexes created on all FK columns
- [ ] Composite indexes on (event_id, user_id)
- [ ] Query on event_photos filtered by event_id completes <100ms
- [ ] Query on event_bundles by status completes <100ms

### Security
- [ ] RLS policies prevent unauthorized access (test as different users)
- [ ] Service role can bypass RLS for system operations
- [ ] Payment IDs not exposed in client queries
- [ ] Referral codes not guessable (8-character alphanumeric)

### Documentation
- [ ] MIGRATION_V2_GUIDE.md reviewed by team
- [ ] Storage bucket setup documented in README
- [ ] Razorpay webhook endpoint documented
- [ ] Database schema diagram updated

## Rollback Plan (If Issues)

If critical issues found before production:
1. Stop all writes to new tables
2. Restore from backup: Supabase Dashboard > Project Settings > Backups > Restore
3. Re-analyze issues
4. Create v2.1 migration with fixes
5. Test thoroughly before re-deployment

## Monitoring Post-Launch

- [ ] Monitor early_adopter_count (should grow, max 10K)
- [ ] Monitor referrals status (pending vs verified ratio)
- [ ] Monitor event bundle usage by type (revenue tracking)
- [ ] Monitor storage usage distribution (potential quota issues)
- [ ] Monitor payment failures via Razorpay dashboard
- [ ] Monitor RLS policy violations in logs

## Sign-Off

- [ ] Kumar (Founder) - [ ] Approved
- [ ] Database Admin (if applicable) - [ ] Approved
- [ ] Testing Lead - [ ] All tests passed
- [ ] Deployment Date: ___________
- [ ] Deployed By: ___________
- [ ] Verification Completed: ___________

---

**Estimated Time:**
- Migration deployment: 5-10 minutes
- Verification: 20-30 minutes
- Storage bucket setup: 10-15 minutes
- Full testing: 2-3 hours
- **Total: ~3.5 hours**

**Rollback Time:** 5-10 minutes (restore from backup)

**Risk Level:** Low (additive changes, no schema modifications)
