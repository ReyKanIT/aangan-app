-- ============================================================================
-- Migration: 20260429b_users_rls_lockdown_phase_a
-- P0 — closes the public anon leak on public.users. (Phase A)
-- ----------------------------------------------------------------------------
-- Findings (audit 2026-04-29):
--   1. supabase_schema.sql:795 grants SELECT to anon → unauthenticated clients
--      can read every user's phone_number, village, state, DOB, family_role.
--   2. supabase_schema.sql:69-70 SELECT policy is `USING (TRUE)` →
--      every authenticated user sees every other user's full row.
--   3. supabase_migration_v0.2.1_patch.sql:70 admin-escalation guard
--      uses `OLD.is_app_admin = FALSE`, which evaluates NULL when
--      OLD.is_app_admin IS NULL → escalation slips through.
--
-- Phase A (this file) — minimal-risk P0 patch:
--   * REVOKE SELECT ON public.users FROM anon (CRITICAL — kills anon leak).
--   * Harden admin-self-escalation guard to also catch NULL OLD value.
--   * Create public.users_safe VIEW that exposes ONLY non-PII columns.
--   * Grant SELECT on the safe view to authenticated.
--   * Keeps the USING (TRUE) authenticated SELECT policy in place for now,
--     so existing joins/searches don't break.
--
-- Phase B (separate migration, applied after app code is updated to use
-- users_safe view for joins/searches) will tighten the authenticated
-- SELECT policy to self + family-connected + admin.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Kill the anon leak (THE actual production-data exposure).
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.users FROM anon;
REVOKE ALL ON public.users FROM anon;

-- (Re-grant USAGE on schema if needed — anon should still be able to call
-- explicitly-granted RPC functions and access tables we open up later.)
GRANT USAGE ON SCHEMA public TO anon;

-- ----------------------------------------------------------------------------
-- 2. Harden admin-self-escalation guard against NULL OLD.is_app_admin.
--    (Original guard checks `OLD.is_app_admin = FALSE`, which is NULL when
--    OLD.is_app_admin IS NULL — three-valued logic skips the IF branch.)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_admin_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.is_app_admin IS TRUE
       AND COALESCE(OLD.is_app_admin, FALSE) IS FALSE THEN
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'Cannot self-escalate to admin. Contact a current admin.'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_admin_self_escalation() IS
'Hardened 2026-04-29: blocks self-escalation when OLD.is_app_admin IS NULL OR FALSE. SET search_path = public, pg_temp to prevent search_path hijack.';

-- ----------------------------------------------------------------------------
-- 3. Create users_safe VIEW exposing only non-PII columns.
--    Joins, searches, and member listings should use this view from app code.
--    The base public.users table stays accessible (Phase A) but Phase B will
--    tighten its SELECT policy once app code is migrated.
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.users_safe CASCADE;

CREATE VIEW public.users_safe
WITH (security_invoker = true) AS
SELECT
    id,
    display_name,
    display_name_hindi,
    profile_photo_url,
    bio,
    village,
    state,
    country,
    family_level,
    is_active,
    last_seen_at,
    created_at
FROM public.users;

COMMENT ON VIEW public.users_safe IS
'Non-PII projection of public.users. Use this for joins, member search, and any cross-family display. Excludes phone_number, email, family_id, is_app_admin, is_family_admin, admin_role.';

-- Grant SELECT on the view to authenticated only.
GRANT SELECT ON public.users_safe TO authenticated;
REVOKE ALL ON public.users_safe FROM anon, public;

-- ----------------------------------------------------------------------------
-- 4. RPC for "search users to add as family" — used by familyStore.searchUsers.
--    Returns only safe columns. This replaces direct ilike() on public.users.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_users_safe(p_query TEXT)
RETURNS TABLE (
    id UUID,
    display_name TEXT,
    display_name_hindi TEXT,
    profile_photo_url TEXT,
    village TEXT,
    state TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_query TEXT;
BEGIN
    -- Require authenticated caller.
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;

    -- Length & character guardrails (prevents ReDoS / overly broad scans).
    v_query := TRIM(p_query);
    IF length(v_query) < 2 THEN
        RETURN;
    END IF;
    IF length(v_query) > 64 THEN
        v_query := substring(v_query FROM 1 FOR 64);
    END IF;

    -- Escape LIKE metacharacters so user input cannot smuggle wildcards.
    v_query := replace(v_query, '\', '\\');
    v_query := replace(v_query, '%', '\%');
    v_query := replace(v_query, '_', '\_');

    RETURN QUERY
    SELECT u.id,
           u.display_name,
           u.display_name_hindi,
           u.profile_photo_url,
           u.village,
           u.state
    FROM public.users u
    WHERE (u.display_name ILIKE '%' || v_query || '%' ESCAPE '\'
           OR u.display_name_hindi ILIKE '%' || v_query || '%' ESCAPE '\')
      AND u.is_active = TRUE
      AND u.id <> auth.uid()
    ORDER BY u.last_seen_at DESC NULLS LAST
    LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.search_users_safe(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_users_safe(TEXT) TO authenticated;

COMMENT ON FUNCTION public.search_users_safe(TEXT) IS
'Authenticated-only safe search across users.display_name / display_name_hindi. Returns non-PII columns. Use from familyStore.searchUsers in place of direct ilike() on the users table.';

-- ----------------------------------------------------------------------------
-- 5. RPC for "is this phone already a registered user?" — used by invite flow
--    and family-add-by-phone. Returns only the user_id, not the row.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_user_by_phone(p_phone TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_phone TEXT;
    v_user_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;

    -- Normalize: keep leading + and digits only.
    v_phone := regexp_replace(COALESCE(p_phone, ''), '[^+0-9]', '', 'g');
    IF length(v_phone) < 10 OR length(v_phone) > 16 THEN
        RETURN NULL;
    END IF;

    SELECT id INTO v_user_id
    FROM public.users
    WHERE phone_number = v_phone
    LIMIT 1;

    RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_user_by_phone(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_phone(TEXT) TO authenticated;

COMMENT ON FUNCTION public.lookup_user_by_phone(TEXT) IS
'Returns user_id for a given phone if registered, else NULL. Does not return any other columns. Authenticated callers only. Replaces direct phone-number SELECT from app code.';

COMMIT;

-- ============================================================================
-- Verification queries (run manually post-apply):
-- ============================================================================
--
-- 1. Confirm anon cannot read users:
--    SET ROLE anon;
--    SELECT count(*) FROM public.users;     -- should fail or return 0 rows
--    RESET ROLE;
--
-- 2. Confirm authenticated can still read users (for now — Phase A keeps this):
--    SET ROLE authenticated;
--    SELECT count(*) FROM public.users;
--    RESET ROLE;
--
-- 3. Confirm safe view is queryable:
--    SET ROLE authenticated;
--    SELECT count(*) FROM public.users_safe;
--    RESET ROLE;
--
-- 4. Confirm RPC works:
--    SELECT * FROM public.search_users_safe('कुमार') LIMIT 5;
--
-- 5. Confirm escalation guard catches NULL old value:
--    -- (Pseudocode — actual test requires inserting a row with NULL is_app_admin)
--    -- UPDATE public.users SET is_app_admin = TRUE WHERE id = '<test_user>';
--    -- → must raise '42501 Cannot self-escalate to admin'.
-- ============================================================================
