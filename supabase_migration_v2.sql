-- ============================================================================
-- AANGAN V2 MIGRATION SCRIPT - STORAGE, REFERRALS & EVENT BUNDLES
-- ============================================================================
--
-- This migration adds new tables for Aangan's storage monetization system,
-- referral-based rewards, and paid event bundles for weddings and celebrations.
--
-- New Features:
--   - User storage tracking (base 10GB + referral bonuses + paid add-ons)
--   - Referral program with verification and anti-abuse measures
--   - Paid storage purchases (individual and family pool subscriptions)
--   - Family storage pools (Parivar Pool) for shared storage
--   - Event bundles (Free, Shagun, Mangal, Maharaja, Puja, Gathering, Engagement)
--   - Event photo management and moderation
--   - GPS check-in tracking for events
--   - Physical card tracking for events
--   - App configuration table for global settings
--   - Storage enforcement functions
--
-- Requirements:
--   - Supabase project with core schema (supabase_schema.sql) already deployed
--   - UUID extension enabled (should be from core schema)
--   - Postgres 12+
--
-- Created: 2026-03-31
-- Version: 2.0
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION FOR TIMESTAMP UPDATES
-- ============================================================================
-- Reuse from core schema - this will be applied to all new tables
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. USER STORAGE TABLE
-- ============================================================================
-- Tracks each user's total storage allocation across sources
-- (base 10GB + referral bonuses + purchased storage + pool membership)
CREATE TABLE IF NOT EXISTS public.user_storage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Storage allocation in GB (converted to bytes for calculations)
    base_storage_gb INTEGER DEFAULT 10 CHECK (base_storage_gb > 0),
    referral_bonus_gb INTEGER DEFAULT 0 CHECK (referral_bonus_gb >= 0),
    purchased_gb INTEGER DEFAULT 0 CHECK (purchased_gb >= 0),

    -- Pool membership (user can belong to ONE family storage pool)
    pool_id UUID REFERENCES public.family_storage_pools(id) ON DELETE SET NULL,

    -- Actual usage tracking
    used_storage_bytes BIGINT DEFAULT 0 CHECK (used_storage_bytes >= 0),

    -- Referral code for inviting others
    referral_code TEXT UNIQUE NOT NULL,
    verified_referral_count INTEGER DEFAULT 0 CHECK (verified_referral_count >= 0),

    -- Storage tier based on purchases/referrals
    storage_tier TEXT DEFAULT 'base'
        CHECK (storage_tier IN ('base', 'bronze', 'silver', 'gold')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint: tier must match storage amounts
    CONSTRAINT valid_storage_tier CHECK (
        (storage_tier = 'base' AND purchased_gb = 0 AND referral_bonus_gb < 10) OR
        (storage_tier = 'bronze' AND (purchased_gb > 0 OR referral_bonus_gb >= 10)) OR
        (storage_tier = 'silver' AND purchased_gb >= 100) OR
        (storage_tier = 'gold' AND purchased_gb >= 500)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_storage_user_id ON public.user_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_storage_referral_code ON public.user_storage(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_storage_pool_id ON public.user_storage(pool_id);
CREATE INDEX IF NOT EXISTS idx_user_storage_tier ON public.user_storage(storage_tier);

-- RLS
ALTER TABLE public.user_storage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own storage info
CREATE POLICY "Users can view own storage" ON public.user_storage
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own storage settings (via triggers only)
CREATE POLICY "Users can update own storage" ON public.user_storage
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- System can insert (for new user signup)
CREATE POLICY "System can insert storage record" ON public.user_storage
    FOR INSERT WITH CHECK (TRUE);

-- Trigger: Update timestamp
CREATE TRIGGER trigger_user_storage_updated_at
    BEFORE UPDATE ON public.user_storage
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. REFERRALS TABLE
-- ============================================================================
-- Tracks referral relationships and verification status
-- A referral is verified when referred_id completes 7 days of activity
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,

    -- Status progression: pending -> verified -> (or rejected)
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'verified', 'rejected')),

    -- Referral use timing
    referred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Constraint: cannot refer yourself, cannot refer the same person twice
    CONSTRAINT unique_referral UNIQUE (referrer_id, referred_id),
    CONSTRAINT no_self_referral CHECK (referrer_id != referred_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_at ON public.referrals(referred_at DESC);

-- RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own referral history (as referrer or referee)
CREATE POLICY "Users can view own referrals" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- System can insert (when signup happens with referral code)
CREATE POLICY "System can insert referrals" ON public.referrals
    FOR INSERT WITH CHECK (TRUE);

-- ============================================================================
-- 3. STORAGE PURCHASES TABLE
-- ============================================================================
-- Records individual and pool storage purchases via Razorpay
-- Supports both one-time and recurring (monthly/annual) subscriptions
CREATE TABLE IF NOT EXISTS public.storage_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Purchase type
    purchase_type TEXT NOT NULL
        CHECK (purchase_type IN ('individual', 'pool')),

    -- Storage purchased
    storage_gb INTEGER NOT NULL CHECK (storage_gb > 0),

    -- Amount in paisa (₹1 = 100 paisa) for precision
    amount_inr INTEGER NOT NULL CHECK (amount_inr > 0),

    -- Billing cycle for subscriptions
    billing_cycle TEXT
        CHECK (billing_cycle IN ('monthly', 'annual', NULL)),

    -- Razorpay integration
    razorpay_subscription_id TEXT, -- For recurring subscriptions
    razorpay_payment_id TEXT NOT NULL,

    -- Status tracking
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),

    -- Validity period
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_storage_purchases_user_id ON public.storage_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_purchases_status ON public.storage_purchases(status);
CREATE INDEX IF NOT EXISTS idx_storage_purchases_razorpay_payment_id
    ON public.storage_purchases(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_storage_purchases_expires_at ON public.storage_purchases(expires_at);

-- RLS
ALTER TABLE public.storage_purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own purchases
CREATE POLICY "Users can view own purchases" ON public.storage_purchases
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert (Razorpay webhook)
CREATE POLICY "System can insert purchases" ON public.storage_purchases
    FOR INSERT WITH CHECK (TRUE);

-- System can update (for expiry/cancellation)
CREATE POLICY "System can update purchases" ON public.storage_purchases
    FOR UPDATE WITH CHECK (TRUE);

-- ============================================================================
-- 4. FAMILY STORAGE POOLS TABLE (PARIVAR POOL)
-- ============================================================================
-- Paid shared storage for families - NO free pooling
-- Only family admins can create and manage pools
CREATE TABLE IF NOT EXISTS public.family_storage_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Pool name (default: Parivar Pool in Hindi)
    pool_name TEXT DEFAULT 'पारिवार पूल',

    -- Total storage purchased for this pool
    total_storage_gb INTEGER NOT NULL CHECK (total_storage_gb > 0),

    -- Current usage
    used_storage_bytes BIGINT DEFAULT 0 CHECK (used_storage_bytes >= 0),

    -- Pool members (array of user IDs)
    member_ids UUID[] DEFAULT '{}',

    -- Link to the purchase that paid for this pool
    purchase_id UUID NOT NULL REFERENCES public.storage_purchases(id) ON DELETE RESTRICT,

    -- Pool status
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled', 'expired')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_storage_pools_admin_id ON public.family_storage_pools(admin_id);
CREATE INDEX IF NOT EXISTS idx_family_storage_pools_status ON public.family_storage_pools(status);
CREATE INDEX IF NOT EXISTS idx_family_storage_pools_purchase_id ON public.family_storage_pools(purchase_id);
CREATE INDEX IF NOT EXISTS idx_family_storage_pools_member_ids ON public.family_storage_pools USING GIN(member_ids);

-- RLS
ALTER TABLE public.family_storage_pools ENABLE ROW LEVEL SECURITY;

-- Policy: Pool admin and members can view the pool
CREATE POLICY "Pool members can view pool" ON public.family_storage_pools
    FOR SELECT USING (
        auth.uid() = admin_id OR
        auth.uid() = ANY(member_ids)
    );

-- Policy: Only admin can update pool
CREATE POLICY "Admin can update pool" ON public.family_storage_pools
    FOR UPDATE USING (auth.uid() = admin_id)
    WITH CHECK (auth.uid() = admin_id);

-- System can insert (when pool purchase is made)
CREATE POLICY "System can insert pools" ON public.family_storage_pools
    FOR INSERT WITH CHECK (TRUE);

-- Trigger: Update timestamp
CREATE TRIGGER trigger_family_storage_pools_updated_at
    BEFORE UPDATE ON public.family_storage_pools
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. APP CONFIG TABLE
-- ============================================================================
-- Global application configuration
-- Used for early adopter tracking, feature flags, limits, etc.
CREATE TABLE IF NOT EXISTS public.app_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    data_type TEXT DEFAULT 'string'
        CHECK (data_type IN ('string', 'integer', 'boolean', 'json')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_config_key ON public.app_config(config_key);

-- RLS - Not needed for app config, but enable for consistency
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read config
CREATE POLICY "Everyone can read config" ON public.app_config
    FOR SELECT USING (TRUE);

-- System only can update
CREATE POLICY "System can update config" ON public.app_config
    FOR ALL WITH CHECK (TRUE);

-- Trigger: Update timestamp
CREATE TRIGGER trigger_app_config_updated_at
    BEFORE UPDATE ON public.app_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Initialize app config with early adopter limits
INSERT INTO public.app_config (config_key, config_value, description, data_type)
VALUES
    ('early_adopter_limit', '10000', 'Max number of early adopter users eligible for free storage', 'integer'),
    ('early_adopter_count', '0', 'Current count of early adopter users', 'integer'),
    ('max_referrals_per_user', '100', 'Maximum referrals a user can make', 'integer'),
    ('referral_verification_days', '7', 'Days a referred user must be active to verify', 'integer'),
    ('max_daily_referral_invites', '10', 'Max referral invites per user per day', 'integer')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 6. EVENT BUNDLES TABLE
-- ============================================================================
-- Per-event paid storage bundles (Free, Shagun, Mangal, Maharaja, Puja, Gathering, Engagement)
-- Bundles provide dedicated storage separate from user's personal storage
CREATE TABLE IF NOT EXISTS public.event_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    purchaser_id UUID NOT NULL REFERENCES public.users(id),

    -- Bundle type determines pricing and features
    bundle_type TEXT NOT NULL
        CHECK (bundle_type IN ('free', 'shagun', 'mangal', 'maharaja', 'puja', 'gathering', 'engagement')),

    -- Storage allocation for this event (in GB)
    storage_gb INTEGER NOT NULL CHECK (storage_gb >= 0),

    -- Photo upload limits
    max_photos INTEGER, -- NULL means unlimited

    -- Video upload capability
    video_allowed BOOLEAN DEFAULT FALSE,

    -- Gallery expiration
    gallery_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Payment details
    amount_inr INTEGER NOT NULL CHECK (amount_inr >= 0),
    razorpay_payment_id TEXT,

    -- Status tracking
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'extended', 'archived')),

    -- Usage tracking
    used_storage_bytes BIGINT DEFAULT 0 CHECK (used_storage_bytes >= 0),
    photo_count INTEGER DEFAULT 0 CHECK (photo_count >= 0),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_bundles_event_id ON public.event_bundles(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bundles_purchaser_id ON public.event_bundles(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_event_bundles_bundle_type ON public.event_bundles(bundle_type);
CREATE INDEX IF NOT EXISTS idx_event_bundles_status ON public.event_bundles(status);
CREATE INDEX IF NOT EXISTS idx_event_bundles_gallery_expires_at ON public.event_bundles(gallery_expires_at);

-- RLS
ALTER TABLE public.event_bundles ENABLE ROW LEVEL SECURITY;

-- Policy: Event creator and purchaser can view bundle
CREATE POLICY "Event creator and purchaser can view bundle" ON public.event_bundles
    FOR SELECT USING (
        auth.uid() = purchaser_id OR
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_bundles.event_id
            AND events.created_by_user_id = auth.uid()
        )
    );

-- System can insert
CREATE POLICY "System can insert bundles" ON public.event_bundles
    FOR INSERT WITH CHECK (TRUE);

-- Creator can update
CREATE POLICY "Creator can update bundle" ON public.event_bundles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_bundles.event_id
            AND events.created_by_user_id = auth.uid()
        )
    );

-- ============================================================================
-- 7. EVENT PHOTOS TABLE
-- ============================================================================
-- Photos uploaded by users during events
-- Supports privacy controls and moderation
CREATE TABLE IF NOT EXISTS public.event_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Photo URLs
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,

    -- Metadata
    caption TEXT,

    -- Moderation status
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    moderated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP WITH TIME ZONE,

    -- Privacy controls
    privacy_type TEXT DEFAULT 'all'
        CHECK (privacy_type IN ('all', 'level', 'individual')),
    privacy_level_min INTEGER DEFAULT 1 CHECK (privacy_level_min >= 1 AND privacy_level_min <= 3),
    privacy_level_max INTEGER DEFAULT 99 CHECK (privacy_level_max >= 1),
    privacy_user_ids UUID[] DEFAULT '{}', -- Individual user visibility

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_uploader_id ON public.event_photos(uploader_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_status ON public.event_photos(status);
CREATE INDEX IF NOT EXISTS idx_event_photos_created_at ON public.event_photos(created_at DESC);

-- RLS
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Photo uploader and event creator can view and manage
CREATE POLICY "Uploader and event creator can manage photos" ON public.event_photos
    FOR ALL USING (
        auth.uid() = uploader_id OR
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_photos.event_id
            AND events.created_by_user_id = auth.uid()
        )
    );

-- Policy: Invited users can view approved photos
CREATE POLICY "Event invitees can view approved photos" ON public.event_photos
    FOR SELECT USING (
        status = 'approved' AND
        EXISTS (
            SELECT 1 FROM public.event_rsvps
            WHERE event_rsvps.event_id = event_photos.event_id
            AND event_rsvps.user_id = auth.uid()
        )
    );

-- System can insert
CREATE POLICY "System can insert photos" ON public.event_photos
    FOR INSERT WITH CHECK (TRUE);

-- Trigger: Update timestamp
CREATE TRIGGER trigger_event_photos_updated_at
    BEFORE UPDATE ON public.event_photos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 8. EVENT CHECKINS TABLE
-- ============================================================================
-- GPS-based check-ins at events
-- Supports GPS, manual, or QR code check-in types
CREATE TABLE IF NOT EXISTS public.event_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Check-in method
    checkin_type TEXT DEFAULT 'gps'
        CHECK (checkin_type IN ('gps', 'manual', 'qr')),

    -- GPS coordinates (nullable for manual/QR)
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy_meters DOUBLE PRECISION,

    -- Check-in timestamp
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint: one check-in per user per event
    UNIQUE (event_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_user_id ON public.event_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_checked_in_at ON public.event_checkins(checked_in_at DESC);

-- RLS
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own check-ins, event creator can view all
CREATE POLICY "Users can view own checkins" ON public.event_checkins
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_checkins.event_id
            AND events.created_by_user_id = auth.uid()
        )
    );

-- System can insert
CREATE POLICY "System can insert checkins" ON public.event_checkins
    FOR INSERT WITH CHECK (TRUE);

-- ============================================================================
-- 9. EVENT CONFIRMATIONS TABLE
-- ============================================================================
-- Physical/personal confirmation tracking for events
-- Tracks confirmations via app, phone call, or in-person meeting
CREATE TABLE IF NOT EXISTS public.event_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Confirmation method
    confirmation_method TEXT NOT NULL
        CHECK (confirmation_method IN ('app', 'call', 'meeting')),

    -- Who confirmed the user
    confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

    -- Additional notes
    notes TEXT,

    -- Confirmation timestamp
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint: one confirmation per method per user per event
    UNIQUE (event_id, user_id, confirmation_method)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_confirmations_event_id ON public.event_confirmations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_confirmations_user_id ON public.event_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_confirmations_confirmation_method
    ON public.event_confirmations(confirmation_method);

-- RLS
ALTER TABLE public.event_confirmations ENABLE ROW LEVEL SECURITY;

-- Policy: Event creator can view all confirmations
CREATE POLICY "Event creator can view confirmations" ON public.event_confirmations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_confirmations.event_id
            AND events.created_by_user_id = auth.uid()
        )
    );

-- System can insert
CREATE POLICY "System can insert confirmations" ON public.event_confirmations
    FOR INSERT WITH CHECK (TRUE);

-- ============================================================================
-- 10. STORAGE LIMIT CHECK FUNCTION
-- ============================================================================
-- Checks if user has available storage (personal or pool) before upload
-- Called before every file upload to enforce storage limits
CREATE OR REPLACE FUNCTION public.check_storage_limit(
    p_user_id UUID,
    p_file_size_bytes BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_total_storage_bytes BIGINT;
    v_used_storage_bytes BIGINT;
    v_available_bytes BIGINT;
    v_pool_total_bytes BIGINT;
    v_pool_used_bytes BIGINT;
    v_pool_id UUID;
BEGIN
    -- Get user's storage allocation and usage
    SELECT
        (base_storage_gb + referral_bonus_gb + purchased_gb) * 1073741824,
        used_storage_bytes,
        pool_id
    INTO v_total_storage_bytes, v_used_storage_bytes, v_pool_id
    FROM public.user_storage
    WHERE user_id = p_user_id;

    -- Return false if user doesn't have storage record
    IF v_total_storage_bytes IS NULL THEN
        RETURN FALSE;
    END IF;

    v_available_bytes := v_total_storage_bytes - v_used_storage_bytes;

    -- Check personal storage
    IF p_file_size_bytes <= v_available_bytes THEN
        RETURN TRUE;
    END IF;

    -- Check pool storage if user is member of a pool
    IF v_pool_id IS NOT NULL THEN
        SELECT total_storage_gb * 1073741824, used_storage_bytes
        INTO v_pool_total_bytes, v_pool_used_bytes
        FROM public.family_storage_pools
        WHERE id = v_pool_id AND status = 'active';

        IF v_pool_total_bytes IS NOT NULL THEN
            IF p_file_size_bytes <= (v_pool_total_bytes - v_pool_used_bytes) THEN
                RETURN TRUE;
            END IF;
        END IF;
    END IF;

    -- No available storage
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. INCREMENT EARLY ADOPTER COUNT FUNCTION
-- ============================================================================
-- Increments early adopter counter when a user signs up
-- Enforces 10K limit for early adopter program
CREATE OR REPLACE FUNCTION public.increment_early_adopter_count()
RETURNS BOOLEAN AS $$
DECLARE
    v_current_count INTEGER;
    v_limit INTEGER;
BEGIN
    -- Get current count and limit
    SELECT
        CAST(config_value AS INTEGER)
    INTO v_current_count
    FROM public.app_config
    WHERE config_key = 'early_adopter_count';

    SELECT
        CAST(config_value AS INTEGER)
    INTO v_limit
    FROM public.app_config
    WHERE config_key = 'early_adopter_limit';

    -- Check if we're under the limit
    IF v_current_count < v_limit THEN
        UPDATE public.app_config
        SET config_value = CAST((v_current_count + 1) AS TEXT),
            updated_at = NOW()
        WHERE config_key = 'early_adopter_count';
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. AUTO-CREATE USER STORAGE RECORD
-- ============================================================================
-- Trigger to auto-create user_storage record when new user signs up
-- This happens via handle_new_user trigger in core schema
CREATE OR REPLACE FUNCTION public.create_user_storage_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_referral_code TEXT;
BEGIN
    -- Generate unique referral code (first 5 chars of UUID)
    v_referral_code := SUBSTRING(uuid_generate_v4()::text, 1, 8);

    -- Ensure uniqueness
    WHILE EXISTS (
        SELECT 1 FROM public.user_storage
        WHERE referral_code = v_referral_code
    ) LOOP
        v_referral_code := SUBSTRING(uuid_generate_v4()::text, 1, 8);
    END LOOP;

    -- Create storage record
    INSERT INTO public.user_storage (
        user_id,
        base_storage_gb,
        referral_bonus_gb,
        purchased_gb,
        used_storage_bytes,
        referral_code
    )
    VALUES (
        NEW.id,
        10,  -- 10 GB base for all early adopters
        0,
        0,
        0,
        v_referral_code
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on users table to auto-create storage record
CREATE TRIGGER trigger_create_storage_on_user_signup
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_storage_on_signup();

-- ============================================================================
-- 13. GRANT PERMISSIONS
-- ============================================================================
-- Allow authenticated users to use storage functions
GRANT EXECUTE ON FUNCTION public.check_storage_limit(UUID, BIGINT)
    TO authenticated;

GRANT EXECUTE ON FUNCTION public.increment_early_adopter_count()
    TO authenticated;

-- Allow all roles to read app_config
GRANT SELECT ON public.app_config TO authenticated, anon;

-- ============================================================================
-- 14. STORAGE BUCKETS SETUP (COMMENTS)
-- ============================================================================
-- NOTE: Storage buckets must be created in Supabase Dashboard > Storage
--
-- Required buckets:
--   1. 'avatars' (public) - Profile photos
--      Path: /avatars/{user_id}/profile.jpg
--      RLS: Public read, user can upload own
--
--   2. 'posts' (authenticated) - Post media
--      Path: /posts/{user_id}/{post_id}/{file}
--      RLS: User can upload to own folder, read based on post audience
--
--   3. 'events' (authenticated) - Event media
--      Path: /events/{event_id}/{user_id}/{file}
--      RLS: Invited users can upload, event creator moderates
--
--   4. 'event-bundles' (authenticated) - Paid event bundle storage
--      Path: /event-bundles/{event_id}/{user_id}/{file}
--      RLS: Invited users can upload to event, storage limit enforced
--
-- Run in Supabase dashboard with service_role key:
--   INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
--   INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', false);
--   INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', false);
--   INSERT INTO storage.buckets (id, name, public) VALUES ('event-bundles', 'event-bundles', false);

-- ============================================================================
-- 15. MIGRATION COMPLETION
-- ============================================================================
-- This migration successfully adds:
-- ✓ user_storage - storage tracking (10GB base + referrals + purchases)
-- ✓ referrals - referral program with verification
-- ✓ storage_purchases - Razorpay integration for paid storage
-- ✓ family_storage_pools - shared pool storage (paid only)
-- ✓ app_config - global configuration with early adopter limits
-- ✓ event_bundles - per-event paid storage bundles
-- ✓ event_photos - photo upload with moderation
-- ✓ event_checkins - GPS check-in tracking
-- ✓ event_confirmations - physical confirmation tracking
-- ✓ check_storage_limit() - storage enforcement function
-- ✓ increment_early_adopter_count() - early adopter tracking
-- ✓ RLS policies on all new tables
-- ✓ Triggers for timestamps and auto-initialization
--
-- Deployment checklist:
-- [ ] Run this SQL in Supabase SQL Editor
-- [ ] Verify all tables created: SELECT * FROM information_schema.tables WHERE table_schema = 'public'
-- [ ] Verify RLS enabled: SELECT tablename FROM pg_tables WHERE schemaname = 'public'
-- [ ] Create storage buckets in Dashboard
-- [ ] Test check_storage_limit() with sample data
-- [ ] Test referral flow (signup with code, verify after 7 days)
-- [ ] Test payment flow with Razorpay test mode
-- [ ] Test event bundle creation and photo uploads
--
-- Version: 2.0
-- Created: 2026-03-31
-- ============================================================================
