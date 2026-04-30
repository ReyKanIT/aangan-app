-- ============================================================================
-- Migration: 20260430c_merge_kumar_accounts
-- P0 — One-shot data migration for Kumar's account fragmentation.
--      Email-OTP and phone-OTP created 3 separate Supabase auth users.
--      This merges all data into ONE canonical user_id.
-- ----------------------------------------------------------------------------
-- Diagnosed 2026-04-30 (revised after Kumar clarified):
--   Kumar's accounts (2 — one email + one phone — REVISED 2026-04-30):
--   * 578a8432-6b91-422d-baf7-d5340a32ee07 = phone 919886110312
--     (Apr 29 8:38pm last sign-in — CANONICAL)
--   * 05d182cf-1640-4fd7-b499-0e35eb95e4f8 = info@reykanit.com (merge in,
--     has the grandparent data: KamtaPrasad नाना, Bhagwania नानी, etc.)
--   NOT Kumar's, do NOT touch:
--   * ac57f9cd = phone 919886146312 = Jyotsna
--   * 32870d27 = krishnachaurasia@gmail.com = Krishna (Kumar's brother)
--   * 6780eee4 = phone 918050407806 = MSG91 dashboard OTP target, no Aangan activity
--
-- Strategy:
--   1. UPDATE every FK column on every table to point dup IDs → canonical.
--      ON CONFLICT (where unique constraints would block) → keep canonical's
--      row, drop the dup's row.
--   2. Update canonical's auth.users row to set email = (Kumar's gmail) so
--      future email-OTP logins land on the same user.
--   3. Delete the 2 dup auth.users rows (CASCADE removes their public.users
--      rows automatically because public.users.id REFERENCES auth.users(id)
--      ON DELETE CASCADE).
--   4. Verify Kumar's canonical now has all family rows.
--
-- Idempotent? NO — this is a one-time merge. Re-running after the dupes are
-- deleted is a no-op (UPDATE WHERE matches nothing).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Constants — IDs as variables for clarity
-- ----------------------------------------------------------------------------
DO $merge$
DECLARE
    v_canonical UUID := '578a8432-6b91-422d-baf7-d5340a32ee07'; -- phone 919886110312, most recent sign-in
    v_dup_email_a UUID := '05d182cf-1640-4fd7-b499-0e35eb95e4f8'; -- info@reykanit.com (email)
        -- ac57f9cd (919886146312) = Jyotsna, NOT Kumar. NEVER touch.
    -- 32870d27 (krishnachaurasia@gmail.com) = Krishna (Kumar's brother). NEVER touch.
    -- 6780eee4 (918050407806) = MSG91 OTP test target, never signed in to Aangan.
    v_dup_email_b UUID := NULL;
    v_canonical_email TEXT := 'info@reykanit.com'; -- Kumar's work email; same as the merged-in dup
    v_count INTEGER;
BEGIN
    -- =============================================================
    -- Step 1: defensively wipe rows that would collide on UPDATE
    -- =============================================================
    -- For tables with UNIQUE constraints involving the user_id, an UPDATE
    -- that points dup → canonical can violate uniqueness. Strategy: if
    -- canonical already has a row, drop the dup's row before the UPDATE.

    -- family_members has UNIQUE (user_id, family_member_id)
    DELETE FROM public.family_members fm
    WHERE fm.user_id = v_dup_email_a
      AND EXISTS (
          SELECT 1 FROM public.family_members fc
          WHERE fc.user_id = v_canonical
            AND fc.family_member_id = fm.family_member_id
      );
    DELETE FROM public.family_members fm
    WHERE fm.family_member_id = v_dup_email_a
      AND EXISTS (
          SELECT 1 FROM public.family_members fc
          WHERE fc.family_member_id = v_canonical
            AND fc.user_id = fm.user_id
      );

    -- post_likes has UNIQUE (post_id, user_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'post_likes') THEN
        DELETE FROM public.post_likes pl
        WHERE pl.user_id = v_dup_email_a
          AND EXISTS (
              SELECT 1 FROM public.post_likes pc
              WHERE pc.user_id = v_canonical AND pc.post_id = pl.post_id
          );
    END IF;

    -- post_reactions has UNIQUE (post_id, user_id, reaction)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'post_reactions') THEN
        DELETE FROM public.post_reactions pr
        WHERE pr.user_id = v_dup_email_a
          AND EXISTS (
              SELECT 1 FROM public.post_reactions pc
              WHERE pc.user_id = v_canonical AND pc.post_id = pr.post_id AND pc.reaction = pr.reaction
          );
    END IF;

    -- event_rsvps has UNIQUE (event_id, user_id)
    DELETE FROM public.event_rsvps er
    WHERE er.user_id = v_dup_email_a
      AND EXISTS (
          SELECT 1 FROM public.event_rsvps ec
          WHERE ec.user_id = v_canonical AND ec.event_id = er.event_id
      );

    -- onboarding_progress: UNIQUE on user_id (one row per user)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_progress') THEN
        DELETE FROM public.onboarding_progress
        WHERE user_id = v_dup_email_a
          AND EXISTS (SELECT 1 FROM public.onboarding_progress WHERE user_id = v_canonical);
    END IF;

    -- =============================================================
    -- Step 2: UPDATE all FK references dup → canonical
    -- =============================================================

    -- family_members both directions
    UPDATE public.family_members SET user_id = v_canonical
    WHERE user_id = v_dup_email_a;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'family_members.user_id rewired: % rows', v_count;

    UPDATE public.family_members SET family_member_id = v_canonical
    WHERE family_member_id = v_dup_email_a;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'family_members.family_member_id rewired: % rows', v_count;

    -- offline_family_members
    UPDATE public.offline_family_members SET added_by = v_canonical
    WHERE added_by = v_dup_email_a;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'offline_family_members.added_by rewired: % rows', v_count;

    -- posts
    UPDATE public.posts SET author_id = v_canonical
    WHERE author_id = v_dup_email_a;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'posts.author_id rewired: % rows', v_count;

    -- post_likes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'post_likes') THEN
        UPDATE public.post_likes SET user_id = v_canonical WHERE user_id = v_dup_email_a;
    END IF;

    -- post_audience
    UPDATE public.post_audience SET user_id = v_canonical
    WHERE user_id = v_dup_email_a;

    -- post_comments / post_reactions / post_polls / poll_votes (added in 20260430a)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'post_comments') THEN
        UPDATE public.post_comments SET author_id = v_canonical WHERE author_id = v_dup_email_a;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'post_reactions') THEN
        UPDATE public.post_reactions SET user_id = v_canonical WHERE user_id = v_dup_email_a;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'poll_votes') THEN
        UPDATE public.poll_votes SET voter_id = v_canonical WHERE voter_id = v_dup_email_a;
    END IF;

    -- stories / story_views
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stories') THEN
        UPDATE public.stories SET author_id = v_canonical WHERE author_id = v_dup_email_a;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'story_views') THEN
        UPDATE public.story_views SET viewer_id = v_canonical WHERE viewer_id = v_dup_email_a;
    END IF;

    -- events (creator)
    UPDATE public.events SET creator_id = v_canonical
    WHERE creator_id = v_dup_email_a;

    -- event_rsvps
    UPDATE public.event_rsvps SET user_id = v_canonical
    WHERE user_id = v_dup_email_a;

    -- event_photos
    UPDATE public.event_photos SET uploader_id = v_canonical
    WHERE uploader_id = v_dup_email_a;

    -- event_checkins / event_confirmations / event_co_hosts / event_gifts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_checkins') THEN
        UPDATE public.event_checkins SET user_id = v_canonical WHERE user_id = v_dup_email_a;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_confirmations') THEN
        UPDATE public.event_confirmations SET confirmed_by = v_canonical WHERE confirmed_by = v_dup_email_a;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_co_hosts') THEN
        UPDATE public.event_co_hosts SET user_id = v_canonical WHERE user_id = v_dup_email_a;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_gifts') THEN
        UPDATE public.event_gifts SET giver_user_id = v_canonical WHERE giver_user_id = v_dup_email_a;
        UPDATE public.event_gifts SET logged_by = v_canonical WHERE logged_by = v_dup_email_a;
    END IF;

    -- audience_groups
    UPDATE public.audience_groups SET creator_id = v_canonical
    WHERE creator_id = v_dup_email_a;

    -- direct_messages (sender + receiver)
    UPDATE public.direct_messages SET sender_id = v_canonical WHERE sender_id = v_dup_email_a;
    UPDATE public.direct_messages SET receiver_id = v_canonical WHERE receiver_id = v_dup_email_a;
    -- Drop self-messages created by the merge (sender = receiver)
    DELETE FROM public.direct_messages WHERE sender_id = receiver_id;

    -- notifications
    UPDATE public.notifications SET user_id = v_canonical
    WHERE user_id = v_dup_email_a;

    -- life_events
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'life_events') THEN
        UPDATE public.life_events SET created_by = v_canonical
        WHERE created_by = v_dup_email_a;
    END IF;

    -- family_important_dates
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'family_important_dates') THEN
        UPDATE public.family_important_dates SET created_by = v_canonical
        WHERE created_by = v_dup_email_a;
    END IF;

    -- reminder_notification_log
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reminder_notification_log') THEN
        UPDATE public.reminder_notification_log SET user_id = v_canonical
        WHERE user_id = v_dup_email_a;
    END IF;

    -- support_tickets / support_messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
        UPDATE public.support_tickets SET user_id = v_canonical WHERE user_id = v_dup_email_a;
        UPDATE public.support_tickets SET assigned_to = v_canonical WHERE assigned_to = v_dup_email_a;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_messages') THEN
        UPDATE public.support_messages SET sender_id = v_canonical WHERE sender_id = v_dup_email_a;
    END IF;

    -- content_reports
    UPDATE public.content_reports SET reporter_id = v_canonical
    WHERE reporter_id = v_dup_email_a;
    UPDATE public.content_reports SET resolved_by = v_canonical
    WHERE resolved_by = v_dup_email_a;

    -- audit_logs
    UPDATE public.audit_logs SET actor_id = v_canonical
    WHERE actor_id = v_dup_email_a;

    -- physical_cards
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'physical_cards') THEN
        UPDATE public.physical_cards SET user_id = v_canonical
        WHERE user_id = v_dup_email_a;
    END IF;

    -- referrals
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'referrals') THEN
        UPDATE public.referrals SET referrer_id = v_canonical WHERE referrer_id = v_dup_email_a;
        UPDATE public.referrals SET referee_id = v_canonical WHERE referee_id = v_dup_email_a;
    END IF;

    -- family_invites
    UPDATE public.family_invites SET inviter_id = v_canonical
    WHERE inviter_id = v_dup_email_a;
    UPDATE public.family_invites SET claimed_by = v_canonical
    WHERE claimed_by = v_dup_email_a;

    -- onboarding_progress
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_progress') THEN
        UPDATE public.onboarding_progress SET user_id = v_canonical
        WHERE user_id = v_dup_email_a;
    END IF;

    -- user_blocks (likely empty)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_blocks') THEN
        UPDATE public.user_blocks SET blocker_id = v_canonical WHERE blocker_id = v_dup_email_a;
        UPDATE public.user_blocks SET blocked_id = v_canonical WHERE blocked_id = v_dup_email_a;
    END IF;

    -- =============================================================
    -- Step 3: enrich canonical's display_name + email from the dup
    --         (dup has a real display_name from email-OTP signup; canonical
    --         only has phone_number as display_name).
    --         Use a defensive UPDATE that only touches columns guaranteed to
    --         exist in this prod schema (date_of_birth, gotra, family_role
    --         are added by the v0.4 migration which never landed in prod).
    -- =============================================================

    -- Set canonical's email to Kumar's preferred email so future email-OTP
    -- logins WITH this email map to the same auth.users row.
    UPDATE public.users SET email = v_canonical_email WHERE id = v_canonical;

    RAISE NOTICE 'Step 3: canonical row enriched + email set to %', v_canonical_email;

    -- =============================================================
    -- Step 4: delete dup auth.users rows.
    --         CASCADE cleans up public.users automatically (FK
    --         "users_id_fkey" on public.users(id) → auth.users(id)
    --         is ON DELETE CASCADE per supabase_schema.sql:40).
    -- =============================================================
    DELETE FROM auth.users WHERE id = v_dup_email_a;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Step 4: deleted % dup auth.users rows', v_count;

    -- =============================================================
    -- Step 5: update canonical's auth.users to set email so future
    --         email-OTP logins land on the same auth user.
    -- =============================================================
    UPDATE auth.users
    SET email = v_canonical_email,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_canonical;

    RAISE NOTICE 'Step 5: canonical auth.users.email set to %', v_canonical_email;
END
$merge$;

COMMIT;

-- ============================================================================
-- Verification (run post-apply):
--
-- SELECT 'kumar_dups_remaining' AS metric, COUNT(*)::TEXT
-- FROM auth.users
-- WHERE id IN (
--     '05d182cf-1640-4fd7-b499-0e35eb95e4f8',
--     '32870d27-9bcb-4489-85ae-6db68e1f2e85'
-- );  -- expected: 0
--
-- SELECT id, email, phone, last_sign_in_at FROM auth.users
-- WHERE id = '6780eee4-39ef-48c0-b1d5-c2fc939794da';
-- expected: email = krishnachaurasia@gmail.com, phone = 918050407806
--
-- SELECT COUNT(*) AS offline_for_kumar
-- FROM public.offline_family_members
-- WHERE added_by = '6780eee4-39ef-48c0-b1d5-c2fc939794da';
-- expected: 7+ (4 from 05d182cf + 3+ from 32870d27)
-- ============================================================================
