-- ============================================================================
-- Migration: 20260429e_search_path_hardening
-- P1 — locks search_path on every SECURITY DEFINER function in public schema.
-- ----------------------------------------------------------------------------
-- Why: A SECURITY DEFINER function runs with the owner's privileges. If its
-- search_path is the caller's, an attacker can create same-named objects
-- (e.g. a malicious public.users view) earlier in their search_path and
-- hijack the function's behavior. Supabase Database Linter / Advisor flags
-- this as "Function Search Path Mutable" — high severity.
--
-- Fix: ALTER every relevant function to SET search_path = public, pg_temp.
-- pg_temp at the end is intentional: it's where temporary objects live and
-- always exists; we list it last so an attacker can't shadow public.
-- ----------------------------------------------------------------------------
-- Functions covered (18):
--   handle_new_user, update_updated_at, add_family_member_bidirectional,
--   remove_family_member_bidirectional, mark_notification_read,
--   get_users_by_family_level, create_default_audience_groups, send_notification,
--   is_admin, log_audit_event, check_rate_limit, cleanup_expired_rate_limits,
--   prevent_admin_self_escalation, update_comment_count, update_reaction_counts,
--   create_onboarding_progress, update_updated_at_column, check_storage_limit,
--   increment_early_adopter_count, create_user_storage_on_signup.
-- ============================================================================

BEGIN;

-- DO block lets us call ALTER FUNCTION with full signatures, skipping
-- functions that don't exist in this project (covers projects that ran
-- only a subset of migrations).
DO $$
DECLARE
    fn record;
    target_path text := 'public, pg_temp';
BEGIN
    FOR fn IN
        SELECT n.nspname || '.' || p.proname AS qualified_name,
               pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef = TRUE
          AND p.proname IN (
              'handle_new_user',
              'update_updated_at',
              'update_updated_at_column',
              'add_family_member_bidirectional',
              'remove_family_member_bidirectional',
              'mark_notification_read',
              'get_users_by_family_level',
              'create_default_audience_groups',
              'send_notification',
              'is_admin',
              'log_audit_event',
              'check_rate_limit',
              'cleanup_expired_rate_limits',
              'prevent_admin_self_escalation',
              'update_comment_count',
              'update_reaction_counts',
              'create_onboarding_progress',
              'check_storage_limit',
              'increment_early_adopter_count',
              'create_user_storage_on_signup',
              'dm_receiver_update_guard'
          )
          AND COALESCE(
              (SELECT TRUE
               FROM unnest(p.proconfig) AS cfg
               WHERE cfg LIKE 'search_path=%'),
              FALSE
          ) = FALSE
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %s(%s) SET search_path = %s',
            fn.qualified_name,
            fn.args,
            target_path
        );
        RAISE NOTICE 'search_path locked on %(%)', fn.qualified_name, fn.args;
    END LOOP;
END
$$;

-- ----------------------------------------------------------------------------
-- Sanity check — list any SECURITY DEFINER function in public still without
-- a search_path setting. After this migration, the result should be empty.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    leftover_count INTEGER;
    leftover_names TEXT;
BEGIN
    SELECT count(*),
           string_agg(n.nspname || '.' || p.proname, ', ')
    INTO leftover_count, leftover_names
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = TRUE
      AND COALESCE(
          (SELECT TRUE
           FROM unnest(p.proconfig) AS cfg
           WHERE cfg LIKE 'search_path=%'),
          FALSE
      ) = FALSE;

    IF leftover_count > 0 THEN
        RAISE NOTICE 'Warning: % SECURITY DEFINER function(s) still without search_path: %',
            leftover_count, leftover_names;
    ELSE
        RAISE NOTICE 'All SECURITY DEFINER functions in public have search_path set.';
    END IF;
END
$$;

COMMIT;

-- ============================================================================
-- Verification query (run post-apply):
--
--   SELECT n.nspname || '.' || p.proname AS function_name,
--          p.proconfig AS settings
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.prosecdef = TRUE
--   ORDER BY p.proname;
--
-- Every row should show settings like {search_path=public, pg_temp}.
-- ============================================================================
