-- ============================================================================
-- AANGAN V2 - STORAGE, REFERRALS & EVENT BUNDLES
-- Migration: 20260331000000_v2_storage_events
-- ============================================================================
-- Adds: user_storage, referrals, storage_purchases, family_storage_pools,
-- app_config, event_bundles, event_photos, event_checkins, event_confirmations
-- ============================================================================

-- ============================================================================
-- 1. APP CONFIG TABLE (no dependencies - create first)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_app_config_key ON public.app_config(config_key);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read config" ON public.app_config
    FOR SELECT USING (TRUE);

CREATE POLICY "System can update config" ON public.app_config
    FOR ALL WITH CHECK (TRUE);

CREATE TRIGGER trigger_app_config_updated_at
    BEFORE UPDATE ON public.app_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial config values
INSERT INTO public.app_config (config_key, config_value, description, data_type)
VALUES
    ('early_adopter_limit', '10000', 'Max number of early adopter users eligible for free storage', 'integer'),
    ('early_adopter_count', '0', 'Current count of early adopter users', 'integer'),
    ('max_referrals_per_user', '100', 'Maximum referrals a user can make', 'integer'),
    ('referral_verification_days', '7', 'Days a referred user must be active to verify', 'integer'),
    ('max_daily_referral_invites', '10', 'Max referral invites per user per day', 'integer')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 2. STORAGE PURCHASES TABLE (before family_storage_pools)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.storage_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    purchase_type TEXT NOT NULL
        CHECK (purchase_type IN ('individual', 'pool')),
    storage_gb INTEGER NOT NULL CHECK (storage_gb > 0),
    amount_inr INTEGER NOT NULL CHECK (amount_inr > 0),
    billing_cycle TEXT
        CHECK (billing_cycle IN ('monthly', 'annual')),
    razorpay_subscription_id TEXT,
    razorpay_payment_id TEXT NOT NULL,
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storage_purchases_user_id ON public.storage_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_purchases_status ON public.storage_purchases(status);
CREATE INDEX IF NOT EXISTS idx_storage_purchases_razorpay_payment_id ON public.storage_purchases(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_storage_purchases_expires_at ON public.storage_purchases(expires_at);

ALTER TABLE public.storage_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON public.storage_purchases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert purchases" ON public.storage_purchases
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "System can update purchases" ON public.storage_purchases
    FOR UPDATE WITH CHECK (TRUE);

-- ============================================================================
-- 3. FAMILY STORAGE POOLS TABLE (depends on storage_purchases)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.family_storage_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    pool_name TEXT DEFAULT 'पारिवार पूल',
    total_storage_gb INTEGER NOT NULL CHECK (total_storage_gb > 0),
    used_storage_bytes BIGINT DEFAULT 0 CHECK (used_storage_bytes >= 0),
    member_ids UUID[] DEFAULT '{}',
    purchase_id UUID NOT NULL REFERENCES public.storage_purchases(id) ON DELETE RESTRICT,
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_storage_pools_admin_id ON public.family_storage_pools(admin_id);
CREATE INDEX IF NOT EXISTS idx_family_storage_pools_status ON public.family_storage_pools(status);
CREATE INDEX IF NOT EXISTS idx_family_storage_pools_purchase_id ON public.family_storage_pools(purchase_id);
CREATE INDEX IF NOT EXISTS idx_family_storage_pools_member_ids ON public.family_storage_pools USING GIN(member_ids);

ALTER TABLE public.family_storage_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pool members can view pool" ON public.family_storage_pools
    FOR SELECT USING (
        auth.uid() = admin_id OR
        auth.uid() = ANY(member_ids)
    );

CREATE POLICY "Admin can update pool" ON public.family_storage_pools
    FOR UPDATE USING (auth.uid() = admin_id)
    WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "System can insert pools" ON public.family_storage_pools
    FOR INSERT WITH CHECK (TRUE);

CREATE TRIGGER trigger_family_storage_pools_updated_at
    BEFORE UPDATE ON public.family_storage_pools
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. USER STORAGE TABLE (depends on family_storage_pools)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_storage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    base_storage_gb INTEGER DEFAULT 10 CHECK (base_storage_gb > 0),
    referral_bonus_gb INTEGER DEFAULT 0 CHECK (referral_bonus_gb >= 0),
    purchased_gb INTEGER DEFAULT 0 CHECK (purchased_gb >= 0),
    pool_id UUID REFERENCES public.family_storage_pools(id) ON DELETE SET NULL,
    used_storage_bytes BIGINT DEFAULT 0 CHECK (used_storage_bytes >= 0),
    referral_code TEXT UNIQUE NOT NULL,
    verified_referral_count INTEGER DEFAULT 0 CHECK (verified_referral_count >= 0),
    storage_tier TEXT DEFAULT 'base'
        CHECK (storage_tier IN ('base', 'bronze', 'silver', 'gold')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_storage_tier CHECK (
        (storage_tier = 'base' AND purchased_gb = 0 AND referral_bonus_gb < 10) OR
        (storage_tier = 'bronze' AND (purchased_gb > 0 OR referral_bonus_gb >= 10)) OR
        (storage_tier = 'silver' AND purchased_gb >= 100) OR
        (storage_tier = 'gold' AND purchased_gb >= 500)
    )
);

CREATE INDEX IF NOT EXISTS idx_user_storage_user_id ON public.user_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_storage_referral_code ON public.user_storage(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_storage_pool_id ON public.user_storage(pool_id);
CREATE INDEX IF NOT EXISTS idx_user_storage_tier ON public.user_storage(storage_tier);

ALTER TABLE public.user_storage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own storage" ON public.user_storage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own storage" ON public.user_storage
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert storage record" ON public.user_storage
    FOR INSERT WITH CHECK (TRUE);

CREATE TRIGGER trigger_user_storage_updated_at
    BEFORE UPDATE ON public.user_storage
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. REFERRALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'verified', 'rejected')),
    referred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_referral UNIQUE (referrer_id, referred_id),
    CONSTRAINT no_self_referral CHECK (referrer_id != referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_at ON public.referrals(referred_at DESC);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "System can insert referrals" ON public.referrals
    FOR INSERT WITH CHECK (TRUE);

-- ============================================================================
-- 6. EVENT BUNDLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    purchaser_id UUID NOT NULL REFERENCES public.users(id),
    bundle_type TEXT NOT NULL
        CHECK (bundle_type IN ('free', 'shagun', 'mangal', 'maharaja', 'puja', 'gathering', 'engagement')),
    storage_gb INTEGER NOT NULL CHECK (storage_gb >= 0),
    max_photos INTEGER,
    video_allowed BOOLEAN DEFAULT FALSE,
    gallery_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    amount_inr INTEGER NOT NULL CHECK (amount_inr >= 0),
    razorpay_payment_id TEXT,
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'extended', 'archived')),
    used_storage_bytes BIGINT DEFAULT 0 CHECK (used_storage_bytes >= 0),
    photo_count INTEGER DEFAULT 0 CHECK (photo_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_bundles_event_id ON public.event_bundles(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bundles_purchaser_id ON public.event_bundles(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_event_bundles_bundle_type ON public.event_bundles(bundle_type);
CREATE INDEX IF NOT EXISTS idx_event_bundles_status ON public.event_bundles(status);
CREATE INDEX IF NOT EXISTS idx_event_bundles_gallery_expires_at ON public.event_bundles(gallery_expires_at);

ALTER TABLE public.event_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event creator and purchaser can view bundle" ON public.event_bundles
    FOR SELECT USING (
        auth.uid() = purchaser_id OR
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_bundles.event_id
            AND events.created_by_user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert bundles" ON public.event_bundles
    FOR INSERT WITH CHECK (TRUE);

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
CREATE TABLE IF NOT EXISTS public.event_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    moderated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP WITH TIME ZONE,
    privacy_type TEXT DEFAULT 'all'
        CHECK (privacy_type IN ('all', 'level', 'individual')),
    privacy_level_min INTEGER DEFAULT 1 CHECK (privacy_level_min >= 1 AND privacy_level_min <= 3),
    privacy_level_max INTEGER DEFAULT 99 CHECK (privacy_level_max >= 1),
    privacy_user_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_uploader_id ON public.event_photos(uploader_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_status ON public.event_photos(status);
CREATE INDEX IF NOT EXISTS idx_event_photos_created_at ON public.event_photos(created_at DESC);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Uploader and event creator can manage photos" ON public.event_photos
    FOR ALL USING (
        auth.uid() = uploader_id OR
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_photos.event_id
            AND events.created_by_user_id = auth.uid()
        )
    );

CREATE POLICY "Event invitees can view approved photos" ON public.event_photos
    FOR SELECT USING (
        status = 'approved' AND
        EXISTS (
            SELECT 1 FROM public.event_rsvps
            WHERE event_rsvps.event_id = event_photos.event_id
            AND event_rsvps.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert photos" ON public.event_photos
    FOR INSERT WITH CHECK (TRUE);

CREATE TRIGGER trigger_event_photos_updated_at
    BEFORE UPDATE ON public.event_photos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 8. EVENT CHECKINS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    checkin_type TEXT DEFAULT 'gps'
        CHECK (checkin_type IN ('gps', 'manual', 'qr')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy_meters DOUBLE PRECISION,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_user_id ON public.event_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_checked_in_at ON public.event_checkins(checked_in_at DESC);

ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.event_checkins
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_checkins.event_id
            AND events.created_by_user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert checkins" ON public.event_checkins
    FOR INSERT WITH CHECK (TRUE);

-- ============================================================================
-- 9. EVENT CONFIRMATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    confirmation_method TEXT NOT NULL
        CHECK (confirmation_method IN ('app', 'call', 'meeting')),
    confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (event_id, user_id, confirmation_method)
);

CREATE INDEX IF NOT EXISTS idx_event_confirmations_event_id ON public.event_confirmations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_confirmations_user_id ON public.event_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_confirmations_confirmation_method ON public.event_confirmations(confirmation_method);

ALTER TABLE public.event_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event creator can view confirmations" ON public.event_confirmations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_confirmations.event_id
            AND events.created_by_user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert confirmations" ON public.event_confirmations
    FOR INSERT WITH CHECK (TRUE);

-- ============================================================================
-- 10. FUNCTIONS
-- ============================================================================

-- Check if user has available storage before upload
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
    SELECT
        (base_storage_gb + referral_bonus_gb + purchased_gb) * 1073741824,
        used_storage_bytes,
        pool_id
    INTO v_total_storage_bytes, v_used_storage_bytes, v_pool_id
    FROM public.user_storage
    WHERE user_id = p_user_id;

    IF v_total_storage_bytes IS NULL THEN
        RETURN FALSE;
    END IF;

    v_available_bytes := v_total_storage_bytes - v_used_storage_bytes;

    IF p_file_size_bytes <= v_available_bytes THEN
        RETURN TRUE;
    END IF;

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

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment early adopter count
CREATE OR REPLACE FUNCTION public.increment_early_adopter_count()
RETURNS BOOLEAN AS $$
DECLARE
    v_current_count INTEGER;
    v_limit INTEGER;
BEGIN
    SELECT CAST(config_value AS INTEGER)
    INTO v_current_count
    FROM public.app_config
    WHERE config_key = 'early_adopter_count';

    SELECT CAST(config_value AS INTEGER)
    INTO v_limit
    FROM public.app_config
    WHERE config_key = 'early_adopter_limit';

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

-- Auto-create user_storage record on signup
CREATE OR REPLACE FUNCTION public.create_user_storage_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_referral_code TEXT;
BEGIN
    v_referral_code := SUBSTRING(uuid_generate_v4()::text, 1, 8);

    WHILE EXISTS (
        SELECT 1 FROM public.user_storage WHERE referral_code = v_referral_code
    ) LOOP
        v_referral_code := SUBSTRING(uuid_generate_v4()::text, 1, 8);
    END LOOP;

    INSERT INTO public.user_storage (
        user_id, base_storage_gb, referral_bonus_gb, purchased_gb,
        used_storage_bytes, referral_code
    )
    VALUES (NEW.id, 10, 0, 0, 0, v_referral_code);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_storage_on_user_signup
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_storage_on_signup();

-- ============================================================================
-- 11. V2 GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.check_storage_limit(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_early_adopter_count() TO authenticated;
GRANT SELECT ON public.app_config TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
