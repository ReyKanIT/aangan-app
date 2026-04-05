-- ============================================================
-- Aangan v0.2.2 — Performance Indexes
-- Run in Supabase SQL Editor AFTER v0.2 and v0.2.1 migrations
-- ============================================================

-- Posts: feed queries order by created_at, filter by author
CREATE INDEX IF NOT EXISTS idx_posts_created_at
  ON public.posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_author_id
  ON public.posts(author_id);

CREATE INDEX IF NOT EXISTS idx_posts_audience_type
  ON public.posts(audience_type);

-- Notifications: per-user unread count and inbox feed
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications(created_at DESC);

-- Family members: relationship lookups
CREATE INDEX IF NOT EXISTS idx_family_members_user_id
  ON public.family_members(user_id);

CREATE INDEX IF NOT EXISTS idx_family_members_member_id
  ON public.family_members(family_member_id);

CREATE INDEX IF NOT EXISTS idx_family_members_level
  ON public.family_members(user_id, connection_level);

-- Events: time-sorted listing and author lookup
CREATE INDEX IF NOT EXISTS idx_events_author_id
  ON public.events(author_id);

CREATE INDEX IF NOT EXISTS idx_events_start_time
  ON public.events(start_time DESC);

-- Event RSVPs: per-event attendee list
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id
  ON public.event_rsvps(event_id);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id
  ON public.event_rsvps(user_id);

-- Content reports: status filtering for admin moderation queue
CREATE INDEX IF NOT EXISTS idx_content_reports_status
  ON public.content_reports(status);

CREATE INDEX IF NOT EXISTS idx_content_reports_reporter
  ON public.content_reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_content_reports_created_at
  ON public.content_reports(created_at DESC);

-- Audit logs: admin filters by user and action
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON public.audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs(created_at DESC);

-- Rate limits: fast lookup by identifier+action (hot path)
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits(identifier, action);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at
  ON public.rate_limits(expires_at);

-- User blocks: fast is-blocked check
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker
  ON public.user_blocks(blocker_id);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked
  ON public.user_blocks(blocked_id);

-- Users: phone lookup (auth), admin flag, last seen (activity dashboard)
CREATE INDEX IF NOT EXISTS idx_users_phone
  ON public.users(phone_number)
  WHERE phone_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_last_seen
  ON public.users(last_seen_at DESC);

-- ============================================================
-- Cleanup expired rate limit rows (run periodically via cron)
-- ============================================================
SELECT public.cleanup_expired_rate_limits();
