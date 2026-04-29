-- ============================================================================
-- Migration: 20260429f_indexes_corrected
-- P1 — supersedes the broken supabase_migration_v0.2.2_indexes.sql.
-- ----------------------------------------------------------------------------
-- The original v0.2.2 migration referenced columns that do not exist:
--   * events.author_id          → real column is creator_id
--   * events.start_time         → real column is event_date
--   * audit_logs.user_id        → real column is actor_id
--   * rate_limits.expires_at    → real column is blocked_until
-- Re-running v0.2.2 raises "column does not exist". Anyone who applied it
-- has none of these performance indexes — feed/event queries do seqscans.
--
-- This migration:
--   1. Re-creates the indexes from v0.2.2 with correct column names.
--   2. Adds the missing FK indexes flagged in the audit (saves cascade-delete
--      and join scans).
-- All CREATE INDEX statements use IF NOT EXISTS so re-runs are safe.
-- ============================================================================

BEGIN;

-- ── Posts: feed queries (already in schema, listed here for completeness) ──
CREATE INDEX IF NOT EXISTS idx_posts_created_at      ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id       ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_audience_type   ON public.posts(audience_type);
CREATE INDEX IF NOT EXISTS idx_posts_audience_group  ON public.posts(audience_group_id);

-- ── Notifications: unread inbox + per-user count ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_id     ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read)
  WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at  ON public.notifications(created_at DESC);

-- ── Family members: relationship lookups ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_family_members_user_id            ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_member_id   ON public.family_members(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_level         ON public.family_members(user_id, connection_level);
CREATE INDEX IF NOT EXISTS idx_family_members_is_verified        ON public.family_members(is_verified);

-- ── Events: corrected column names (creator_id, event_date) ───────────────
CREATE INDEX IF NOT EXISTS idx_events_creator_id        ON public.events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date        ON public.events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_audience_type     ON public.events(audience_type);
CREATE INDEX IF NOT EXISTS idx_events_audience_group_id ON public.events(audience_group_id);

-- ── Event RSVPs: per-event attendee list + per-user RSVP filter ──────────
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id  ON public.event_rsvps(user_id);

-- ── Event photos: moderation lookups + creator listing ───────────────────
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id     ON public.event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_uploaded_by  ON public.event_photos(uploaded_by);
-- moderated_by is NULL until reviewed — partial index keeps it small
CREATE INDEX IF NOT EXISTS idx_event_photos_moderated_by ON public.event_photos(moderated_by)
  WHERE moderated_by IS NOT NULL;

-- ── Event check-ins / confirmations / co-hosts ───────────────────────────
DO $$ BEGIN
    -- Some tables/columns added in later migrations may not exist in every project.
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'event_checkins') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins(event_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_event_checkins_user_id  ON public.event_checkins(user_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'event_confirmations') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_event_confirmations_event_id    ON public.event_confirmations(event_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_event_confirmations_confirmed_by ON public.event_confirmations(confirmed_by)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'event_co_hosts') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_event_co_hosts_event_id ON public.event_co_hosts(event_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_event_co_hosts_user_id  ON public.event_co_hosts(user_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'event_gifts') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_event_gifts_event_id      ON public.event_gifts(event_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_event_gifts_giver_user_id ON public.event_gifts(giver_user_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'event_bundles') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_events_bundle_id ON public.events(bundle_id)
                  WHERE bundle_id IS NOT NULL';
    END IF;
END $$;

-- ── Content reports / audit logs: corrected column names ─────────────────
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'content_reports') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_content_reports_status      ON public.content_reports(status)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_content_reports_reporter    ON public.content_reports(reporter_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_content_reports_resolved_by ON public.content_reports(resolved_by)
                  WHERE resolved_by IS NOT NULL';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_content_reports_created_at  ON public.content_reports(created_at DESC)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        -- column is actor_id, not user_id (corrected from v0.2.2)
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id   ON public.audit_logs(actor_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON public.audit_logs(action)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC)';
    END IF;
END $$;

-- ── Rate limits: corrected column name (blocked_until, not expires_at) ───
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'rate_limits') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup        ON public.rate_limits(identifier, action)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until ON public.rate_limits(blocked_until)
                  WHERE blocked_until IS NOT NULL';
    END IF;
END $$;

-- ── User blocks ──────────────────────────────────────────────────────────
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'user_blocks') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id)';
    END IF;
END $$;

-- ── Users: phone lookup (already in schema), last_seen, admin flag ───────
CREATE INDEX IF NOT EXISTS idx_users_last_seen      ON public.users(last_seen_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_users_is_app_admin   ON public.users(is_app_admin)
  WHERE is_app_admin = TRUE;

-- ── Post audience / comments / reactions FK indexes ──────────────────────
CREATE INDEX IF NOT EXISTS idx_post_audience_post_id       ON public.post_audience(post_id);
CREATE INDEX IF NOT EXISTS idx_post_audience_user_id       ON public.post_audience(user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_post_audience_group_id      ON public.post_audience(audience_group_id)
  WHERE audience_group_id IS NOT NULL;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'post_comments') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_post_comments_post_id   ON public.post_comments(post_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_post_comments_author_id ON public.post_comments(author_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'post_reactions') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON public.post_reactions(user_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'poll_votes') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id  ON public.poll_votes(poll_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_poll_votes_voter_id ON public.poll_votes(voter_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'story_views') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_story_views_story_id  ON public.story_views(story_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON public.story_views(viewer_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'physical_cards') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_physical_cards_user_id ON public.physical_cards(user_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to)
                  WHERE assigned_to IS NOT NULL';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_support_tickets_status      ON public.support_tickets(status)';
    END IF;
END $$;

-- ── Cleanup expired rate-limit rows (defensive — function may or may not exist) ──
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname = 'public' AND p.proname = 'cleanup_expired_rate_limits') THEN
        PERFORM public.cleanup_expired_rate_limits();
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification:
--
--   SELECT schemaname, tablename, indexname
--   FROM pg_indexes
--   WHERE schemaname = 'public'
--     AND indexname LIKE 'idx_%'
--   ORDER BY tablename, indexname;
--
-- Expected: every table with a foreign-key column (creator_id, author_id,
-- user_id, family_member_id, etc.) should have a matching idx_<table>_<col>.
-- ============================================================================
