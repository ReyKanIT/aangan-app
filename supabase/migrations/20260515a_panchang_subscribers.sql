-- ============================================================================
-- Migration: 20260515a_panchang_subscribers
--
-- CMO Review ICE #1 growth bet: daily panchang opt-in for unauthenticated
-- visitors on the public /panchang SEO landing page. Captures phone and/or
-- email so we can deliver the daily panchang via WhatsApp/SMS/email even to
-- people who haven't installed the app yet. Builds a list, brings users
-- back daily, viral re-share built in.
--
-- Distinct from `users` (authenticated) and `users.push_token`
-- (in-app push) — these are *prospective* users who tap "Daily reminders"
-- on the SEO panchang page without signing up. The hot path:
--
--   1. Visitor hits /panchang (SEO) → opts in with phone or email
--   2. Row written here, anon insert allowed (RLS gate)
--   3. Daily cron `panchang-nudge` (existing) gets a Pass C:
--      for each panchang_subscriber, send the daily message via
--      MSG91-WhatsApp (preferred) or email (Resend) — TBD per Kumar's
--      delivery channel choice once cost-per-recipient is known.
--
-- Privacy: this table contains only contact details the user explicitly
-- typed in for daily delivery. No social graph, no profile, no posts.
-- A unsubscribe link in every message and a self-serve unsub_token make
-- DPDP-compliant opt-out trivial.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.panchang_subscribers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164       TEXT,
    email            TEXT,
    locale           TEXT NOT NULL DEFAULT 'hi-IN',
    source           TEXT NOT NULL DEFAULT 'panchang_page',
    state_code       TEXT,
    unsub_token      UUID NOT NULL DEFAULT gen_random_uuid(),
    opted_in_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    unsubscribed_at  TIMESTAMPTZ,
    last_sent_at     TIMESTAMPTZ,
    sent_count       INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT panchang_subscribers_has_contact
        CHECK (phone_e164 IS NOT NULL OR email IS NOT NULL),
    CONSTRAINT panchang_subscribers_phone_e164_format
        CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT panchang_subscribers_email_format
        CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- Dedupe by phone (case-sensitive, E.164 is uppercase-irrelevant)
CREATE UNIQUE INDEX IF NOT EXISTS panchang_subscribers_phone_uniq
    ON public.panchang_subscribers (phone_e164)
    WHERE phone_e164 IS NOT NULL AND unsubscribed_at IS NULL;

-- Dedupe by email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS panchang_subscribers_email_uniq
    ON public.panchang_subscribers (lower(email))
    WHERE email IS NOT NULL AND unsubscribed_at IS NULL;

-- Lookup by unsub token (one-click unsubscribe link in every message)
CREATE INDEX IF NOT EXISTS panchang_subscribers_unsub_token_idx
    ON public.panchang_subscribers (unsub_token);

-- Cron scanner index: pick up everyone who hasn't been sent today
CREATE INDEX IF NOT EXISTS panchang_subscribers_active_idx
    ON public.panchang_subscribers (last_sent_at NULLS FIRST)
    WHERE unsubscribed_at IS NULL;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Anon inserts allowed (this IS the opt-in surface).
-- No anon SELECT (don't leak subscriber list to the internet).
-- No anon UPDATE/DELETE (unsubscribe goes through a server-side endpoint
-- that validates the unsub_token).
-- Service role retains full access (cron + admin).

ALTER TABLE public.panchang_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY panchang_subscribers_anon_insert
    ON public.panchang_subscribers
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- A signed-in user can read their own subscription rows (matching by email
-- if their auth email matches, or by phone if their auth phone matches).
CREATE POLICY panchang_subscribers_self_read
    ON public.panchang_subscribers
    FOR SELECT
    TO authenticated
    USING (
        (email IS NOT NULL AND email = (auth.jwt() ->> 'email'))
        OR (phone_e164 IS NOT NULL AND phone_e164 = (auth.jwt() ->> 'phone'))
    );

COMMIT;
