-- ============================================================================
-- AANGAN v0.2 — SECURITY HARDENING MIGRATION
-- ============================================================================
--
-- This migration adds security infrastructure to the Aangan family social
-- network: admin system, content reporting, audit logging, rate limiting,
-- user blocking, and feature flags.
--
-- Prerequisites:
--   - supabase_schema.sql (v0.1) must be applied first
--   - 12 existing tables: users, posts, events, event_rsvps, family_members,
--     notifications, event_photos, event_checkins, event_confirmations,
--     physical_cards, audience_groups, post_audience
--
-- Created: 2026-03-31
-- ============================================================================


-- ============================================================================
-- 1. ADMIN SYSTEM
-- ============================================================================
-- Add global app admin flag (distinct from is_family_admin)
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_app_admin BOOLEAN DEFAULT FALSE;

-- Admin check helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND is_app_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_admin() IS
    'Returns true if the current authenticated user is a global app admin.';

-- ---------------------------------------------------------------------------
-- Admin RLS bypass policies on ALL existing tables
-- Admins can SELECT, UPDATE, DELETE any row across the platform.
-- ---------------------------------------------------------------------------

-- users
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any user" ON public.users
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any user" ON public.users
    FOR DELETE USING (public.is_admin());

-- posts
CREATE POLICY "Admins can view all posts" ON public.posts
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any post" ON public.posts
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any post" ON public.posts
    FOR DELETE USING (public.is_admin());

-- events
CREATE POLICY "Admins can view all events" ON public.events
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any event" ON public.events
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any event" ON public.events
    FOR DELETE USING (public.is_admin());

-- event_rsvps
CREATE POLICY "Admins can view all event_rsvps" ON public.event_rsvps
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any event_rsvp" ON public.event_rsvps
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any event_rsvp" ON public.event_rsvps
    FOR DELETE USING (public.is_admin());

-- family_members
CREATE POLICY "Admins can view all family_members" ON public.family_members
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any family_member" ON public.family_members
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any family_member" ON public.family_members
    FOR DELETE USING (public.is_admin());

-- notifications
CREATE POLICY "Admins can view all notifications" ON public.notifications
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any notification" ON public.notifications
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any notification" ON public.notifications
    FOR DELETE USING (public.is_admin());

-- event_photos
CREATE POLICY "Admins can view all event_photos" ON public.event_photos
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any event_photo" ON public.event_photos
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any event_photo" ON public.event_photos
    FOR DELETE USING (public.is_admin());

-- event_checkins
CREATE POLICY "Admins can view all event_checkins" ON public.event_checkins
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any event_checkin" ON public.event_checkins
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any event_checkin" ON public.event_checkins
    FOR DELETE USING (public.is_admin());

-- event_confirmations
CREATE POLICY "Admins can view all event_confirmations" ON public.event_confirmations
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any event_confirmation" ON public.event_confirmations
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any event_confirmation" ON public.event_confirmations
    FOR DELETE USING (public.is_admin());

-- physical_cards
CREATE POLICY "Admins can view all physical_cards" ON public.physical_cards
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any physical_card" ON public.physical_cards
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any physical_card" ON public.physical_cards
    FOR DELETE USING (public.is_admin());

-- audience_groups
CREATE POLICY "Admins can view all audience_groups" ON public.audience_groups
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any audience_group" ON public.audience_groups
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any audience_group" ON public.audience_groups
    FOR DELETE USING (public.is_admin());

-- post_audience
CREATE POLICY "Admins can view all post_audience" ON public.post_audience
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any post_audience" ON public.post_audience
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any post_audience" ON public.post_audience
    FOR DELETE USING (public.is_admin());


-- ============================================================================
-- 2. CONTENT REPORTING / FLAGGING SYSTEM
-- ============================================================================
-- Allows users to report inappropriate content for admin review
CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    reason TEXT NOT NULL,
    description TEXT, -- Optional details from reporter
    status TEXT NOT NULL DEFAULT 'pending',
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolution_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- One report per user per content item
    CONSTRAINT unique_user_content_report UNIQUE (reporter_id, content_type, content_id),
    -- Allowed content types
    CONSTRAINT valid_content_type CHECK (
        content_type IN ('post', 'photo', 'event', 'user', 'comment')
    ),
    -- Allowed reasons
    CONSTRAINT valid_reason CHECK (
        reason IN ('inappropriate', 'spam', 'harassment', 'fake_account', 'privacy_violation', 'other')
    ),
    -- Allowed statuses
    CONSTRAINT valid_status CHECK (
        status IN ('pending', 'reviewing', 'resolved', 'dismissed')
    )
);

CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON public.content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_content ON public.content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_created_at ON public.content_reports(created_at DESC);

-- Enable RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- RLS: Users can insert their own reports
CREATE POLICY "Users can create own reports" ON public.content_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- RLS: Users can view their own reports
CREATE POLICY "Users can view own reports" ON public.content_reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- RLS: Admins can view all reports
CREATE POLICY "Admins can view all reports" ON public.content_reports
    FOR SELECT USING (public.is_admin());

-- RLS: Admins can update any report (resolve/dismiss)
CREATE POLICY "Admins can update any report" ON public.content_reports
    FOR UPDATE USING (public.is_admin());

-- RLS: Admins can delete reports
CREATE POLICY "Admins can delete any report" ON public.content_reports
    FOR DELETE USING (public.is_admin());

-- Trigger: Update updated_at
CREATE TRIGGER trigger_content_reports_updated_at
    BEFORE UPDATE ON public.content_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();


-- ============================================================================
-- 3. AUDIT LOG SYSTEM
-- ============================================================================
-- Immutable log of important actions across the platform
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Allowed actions
    CONSTRAINT valid_audit_action CHECK (
        action IN (
            'user_login', 'user_logout', 'profile_update',
            'post_create', 'post_delete',
            'event_create', 'event_delete',
            'family_add', 'family_remove',
            'photo_moderate', 'report_resolve',
            'admin_action', 'account_deactivate'
        )
    ),
    -- Allowed target types
    CONSTRAINT valid_target_type CHECK (
        target_type IS NULL OR target_type IN (
            'user', 'post', 'event', 'photo', 'report', 'family_member'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_type, target_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can view audit logs (no direct user access)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_admin());

-- No INSERT policy for regular users — they must use the SECURITY DEFINER function

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER function to insert audit log entries
-- ---------------------------------------------------------------------------
-- Users cannot insert directly into audit_logs; this function bypasses RLS
-- so application code can log events without granting INSERT to users.
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        actor_id, action, target_type, target_id,
        metadata, ip_address, user_agent
    )
    VALUES (
        auth.uid(), p_action, p_target_type, p_target_id,
        p_metadata, p_ip_address, p_user_agent
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_audit_event IS
    'Inserts an audit log entry. Runs as SECURITY DEFINER to bypass RLS — '
    'users cannot insert directly into audit_logs.';


-- ============================================================================
-- 4. RATE LIMITING TABLE (SERVER-SIDE TRACKING)
-- ============================================================================
-- Tracks request counts per identifier+action to prevent abuse
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL, -- Phone number or IP address
    action TEXT NOT NULL,
    attempt_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- One row per identifier+action pair
    CONSTRAINT unique_rate_limit UNIQUE (identifier, action),
    -- Allowed actions
    CONSTRAINT valid_rate_action CHECK (
        action IN ('otp_send', 'otp_verify', 'login_attempt', 'report_submit', 'post_create')
    )
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until ON public.rate_limits(blocked_until);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON public.rate_limits(identifier, action);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can view rate limit data directly
CREATE POLICY "Admins can view rate limits" ON public.rate_limits
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage rate limits" ON public.rate_limits
    FOR ALL USING (public.is_admin());

-- No direct user access — all interaction through SECURITY DEFINER functions

-- ---------------------------------------------------------------------------
-- Rate limit check function
-- ---------------------------------------------------------------------------
-- Returns TRUE if the action is allowed, FALSE if rate-limited or blocked.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_identifier TEXT,
    p_action TEXT,
    p_max_attempts INTEGER,
    p_window_minutes INTEGER,
    p_block_minutes INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_record RECORD;
    v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

    -- Get existing rate limit record
    SELECT * INTO v_record
    FROM public.rate_limits
    WHERE identifier = p_identifier
      AND action = p_action;

    -- No existing record — create one and allow
    IF v_record IS NULL THEN
        INSERT INTO public.rate_limits (identifier, action, attempt_count, window_start)
        VALUES (p_identifier, p_action, 1, NOW());
        RETURN TRUE;
    END IF;

    -- Currently blocked — check if block has expired
    IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > NOW() THEN
        RETURN FALSE;
    END IF;

    -- Window expired — reset the counter
    IF v_record.window_start < v_window_start THEN
        UPDATE public.rate_limits
        SET attempt_count = 1,
            window_start = NOW(),
            blocked_until = NULL
        WHERE id = v_record.id;
        RETURN TRUE;
    END IF;

    -- Within window — check attempt count
    IF v_record.attempt_count >= p_max_attempts THEN
        -- Over limit — block the identifier
        UPDATE public.rate_limits
        SET blocked_until = NOW() + (p_block_minutes || ' minutes')::INTERVAL
        WHERE id = v_record.id;
        RETURN FALSE;
    END IF;

    -- Within limits — increment counter and allow
    UPDATE public.rate_limits
    SET attempt_count = attempt_count + 1
    WHERE id = v_record.id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_rate_limit IS
    'Checks and enforces rate limits. Returns TRUE if allowed, FALSE if blocked. '
    'Runs as SECURITY DEFINER to manage rate_limits table without user RLS access.';

-- ---------------------------------------------------------------------------
-- Cleanup expired rate limit entries (run periodically via cron or Edge Function)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.rate_limits
    WHERE window_start < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_expired_rate_limits IS
    'Deletes rate limit records older than 24 hours. Returns count of deleted rows.';


-- ============================================================================
-- 5. USER BLOCKS TABLE
-- ============================================================================
-- Allows users to block other users from viewing their content
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- One block per user pair
    CONSTRAINT unique_user_block UNIQUE (blocker_id, blocked_id),
    -- Cannot block yourself
    CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON public.user_blocks(blocked_id);

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own blocks
CREATE POLICY "Users can view own blocks" ON public.user_blocks
    FOR SELECT USING (auth.uid() = blocker_id);

-- RLS: Users can create blocks
CREATE POLICY "Users can block other users" ON public.user_blocks
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- RLS: Users can remove their own blocks
CREATE POLICY "Users can unblock users" ON public.user_blocks
    FOR DELETE USING (auth.uid() = blocker_id);

-- RLS: Admins can view all blocks
CREATE POLICY "Admins can view all blocks" ON public.user_blocks
    FOR SELECT USING (public.is_admin());

-- RLS: Admins can delete any block
CREATE POLICY "Admins can delete any block" ON public.user_blocks
    FOR DELETE USING (public.is_admin());


-- ============================================================================
-- 6. APP SETTINGS / FEATURE FLAGS TABLE
-- ============================================================================
-- Key-value store for application configuration and feature flags
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS: All authenticated users can read settings
CREATE POLICY "Authenticated users can read settings" ON public.app_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS: Only admins can insert settings
CREATE POLICY "Admins can insert settings" ON public.app_settings
    FOR INSERT WITH CHECK (public.is_admin());

-- RLS: Only admins can update settings
CREATE POLICY "Admins can update settings" ON public.app_settings
    FOR UPDATE USING (public.is_admin());

-- RLS: Only admins can delete settings
CREATE POLICY "Admins can delete settings" ON public.app_settings
    FOR DELETE USING (public.is_admin());

-- Insert default settings
INSERT INTO public.app_settings (key, value, description) VALUES
    ('maintenance_mode', 'false'::JSONB, 'When true, app shows maintenance screen'),
    ('min_app_version', '"0.2.0"'::JSONB, 'Minimum app version required to use the platform'),
    ('max_otp_attempts', '5'::JSONB, 'Maximum OTP verification attempts before temporary block'),
    ('otp_block_minutes', '5'::JSONB, 'Minutes to block after exceeding OTP attempts'),
    ('max_reports_per_day', '10'::JSONB, 'Maximum content reports a user can submit per day'),
    ('registration_open', 'true'::JSONB, 'When false, new user registration is disabled')
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- 7. GRANTS
-- ============================================================================
-- Match existing pattern: anon gets minimal, authenticated gets ALL with RLS,
-- service_role bypasses RLS entirely.

-- Table grants for authenticated role (RLS enforces access)
GRANT ALL ON public.content_reports TO authenticated;
GRANT ALL ON public.audit_logs TO authenticated;
GRANT ALL ON public.rate_limits TO authenticated;
GRANT ALL ON public.user_blocks TO authenticated;
GRANT ALL ON public.app_settings TO authenticated;

-- Sequence grants (for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Anon gets SELECT on app_settings only (for maintenance/version checks)
GRANT SELECT ON public.app_settings TO anon;

-- Function grants: authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated;

-- Function grants: service_role (for Edge Functions and server-side operations)
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_audit_event TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits TO service_role;

-- Service role gets full access (bypasses RLS by default)
GRANT ALL ON public.content_reports TO service_role;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.rate_limits TO service_role;
GRANT ALL ON public.user_blocks TO service_role;
GRANT ALL ON public.app_settings TO service_role;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary of changes:
--   1. Added is_app_admin column to users + is_admin() helper function
--   2. Added admin RLS bypass policies on all 12 existing tables
--   3. Created content_reports table with RLS
--   4. Created audit_logs table with RLS + log_audit_event() SECURITY DEFINER
--   5. Created rate_limits table with RLS + check_rate_limit() SECURITY DEFINER
--      + cleanup_expired_rate_limits() maintenance function
--   6. Created user_blocks table with RLS
--   7. Created app_settings table with default feature flags
--   8. Granted permissions matching existing schema patterns
-- ============================================================================
