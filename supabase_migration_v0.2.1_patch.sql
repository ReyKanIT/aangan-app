-- ============================================================================
-- AANGAN v0.2.1 — SECURITY PATCH
-- ============================================================================
-- Fixes constraint mismatches found during security audit:
--   1. audit_logs: missing 'content_report' action in valid_audit_action
--   2. rate_limits: missing 'feedback_submit' action in valid_rate_action
--   3. Adds performance index on users.is_app_admin for is_admin() function
--
-- Apply AFTER supabase_migration_v0.2_security.sql
-- Created: 2026-03-31
-- ============================================================================

-- ============================================================================
-- FIX 1: audit_logs — add 'content_report' to valid_audit_action constraint
-- ============================================================================
-- Drop and recreate the check constraint with 'content_report' included

ALTER TABLE public.audit_logs
    DROP CONSTRAINT IF EXISTS valid_audit_action;

ALTER TABLE public.audit_logs
    ADD CONSTRAINT valid_audit_action CHECK (
        action IN (
            'user_login', 'user_logout', 'profile_update',
            'post_create', 'post_delete',
            'event_create', 'event_delete',
            'family_add', 'family_remove',
            'photo_moderate', 'report_resolve',
            'admin_action', 'account_deactivate',
            'content_report'   -- ← was missing from v0.2
        )
    );

-- ============================================================================
-- FIX 2: rate_limits — add 'feedback_submit' to valid_rate_action constraint
-- ============================================================================

ALTER TABLE public.rate_limits
    DROP CONSTRAINT IF EXISTS valid_rate_action;

ALTER TABLE public.rate_limits
    ADD CONSTRAINT valid_rate_action CHECK (
        action IN (
            'otp_send', 'otp_verify', 'login_attempt',
            'report_submit', 'post_create',
            'feedback_submit'   -- ← was missing from v0.2
        )
    );

-- ============================================================================
-- FIX 3: Performance index on is_app_admin for is_admin() function
-- ============================================================================
-- is_admin() does a full scan of users table filtered by is_app_admin = TRUE
-- This partial index makes it O(1) instead of O(n)

CREATE INDEX IF NOT EXISTS idx_users_is_app_admin
    ON public.users(id)
    WHERE is_app_admin = TRUE;

-- ============================================================================
-- FIX 4: Prevent privilege escalation — users cannot set their own is_app_admin
-- ============================================================================
-- The existing "Users can update own profile" policy allows users to update
-- any column including is_app_admin. Add a security trigger to block this.

CREATE OR REPLACE FUNCTION public.prevent_admin_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Block users from setting their own is_app_admin to TRUE
    IF NEW.is_app_admin = TRUE AND OLD.is_app_admin = FALSE THEN
        -- Only allow if the caller is already an admin (e.g., another admin granting)
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'You cannot grant yourself admin privileges';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_admin_escalation ON public.users;
CREATE TRIGGER trigger_prevent_admin_escalation
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_admin_self_escalation();

COMMENT ON FUNCTION public.prevent_admin_self_escalation IS
    'Prevents users from escalating their own is_app_admin privilege. '
    'Only existing admins can grant admin status to other users.';

-- ============================================================================
-- END OF PATCH
-- ============================================================================
