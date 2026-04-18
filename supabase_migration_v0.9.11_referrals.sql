-- ============================================================================
-- Aangan v0.9.11 — Referral attribution
-- Adds `referred_by` column to users so we can track who invited whom.
-- Idempotent. Kumar: run AFTER v0.9.9 migration.
-- ============================================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS referred_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users(referred_by)
    WHERE referred_by IS NOT NULL;

-- Optional view used by /admin/referrals (future): top referrers.
CREATE OR REPLACE VIEW public.user_referral_leaderboard AS
SELECT
    referrer.id AS referrer_id,
    referrer.display_name AS referrer_name,
    referrer.display_name_hindi AS referrer_name_hindi,
    COUNT(*) AS invited_count,
    MAX(referred.referred_at) AS last_invite_at
FROM public.users referred
JOIN public.users referrer ON referrer.id = referred.referred_by
GROUP BY referrer.id, referrer.display_name, referrer.display_name_hindi
ORDER BY invited_count DESC;

GRANT SELECT ON public.user_referral_leaderboard TO authenticated;
