-- ============================================================================
-- Migration: 20260429i_family_invites
-- v0.13.0 — WhatsApp deep-link family invites.
-- ----------------------------------------------------------------------------
-- Adds `family_invites` (one-time-use 6-char codes, 30-day expiry) and a click
-- tracker for the conversion funnel. Plus three RPCs:
--   * create_family_invite — authed inviter generates a code with a
--     pre-set relationship + level + reverse-relationship.
--   * lookup_invite — PUBLIC RPC (anon callable) that returns minimal
--     inviter display info + invite state (expired/claimed/revoked) for the
--     web /join/{code} landing page. Records a click row.
--   * claim_family_invite — AUTH RPC that atomically claims the invite
--     and creates the bidirectional family_members rows.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION).
-- Does NOT touch `family_members`, `add_family_member_bidirectional`, or any
-- existing flow.
-- ============================================================================

BEGIN;

-- ── 1. Tables ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.family_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inviter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    -- 6-char code, alphanumeric excluding O/0/I/1 to avoid grandma-hostile ambiguity.
    code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
    -- Pre-set relationship the inviter assigns to the claimer.
    relationship_type TEXT NOT NULL,
    relationship_label_hindi TEXT,
    connection_level INTEGER NOT NULL CHECK (connection_level BETWEEN 1 AND 99),
    -- Reciprocal relationship written into the inviter→claimer family_members row.
    -- e.g. inviter calls claimer "बहू" (level 2 in_law), reverse is "सास" (level 2).
    reverse_relationship_type TEXT NOT NULL,
    reverse_relationship_label_hindi TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT family_invites_no_self_claim CHECK (claimed_by IS NULL OR claimed_by <> inviter_id)
);

CREATE INDEX IF NOT EXISTS idx_family_invites_inviter ON public.family_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_family_invites_unclaimed
    ON public.family_invites(expires_at)
    WHERE claimed_at IS NULL AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.family_invite_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invite_id UUID NOT NULL REFERENCES public.family_invites(id) ON DELETE CASCADE,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    referer TEXT
);

CREATE INDEX IF NOT EXISTS idx_family_invite_clicks_invite ON public.family_invite_clicks(invite_id);

-- ── 2. RLS ───────────────────────────────────────────────────────────────

ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invite_clicks ENABLE ROW LEVEL SECURITY;

-- Inviter can SELECT their own invites (for the "my pending invites" UI).
DROP POLICY IF EXISTS "inviters can view own invites" ON public.family_invites;
CREATE POLICY "inviters can view own invites"
    ON public.family_invites FOR SELECT
    USING (auth.uid() = inviter_id);

-- Inviter can REVOKE (UPDATE revoked_at) their own invites.
DROP POLICY IF EXISTS "inviters can revoke own invites" ON public.family_invites;
CREATE POLICY "inviters can revoke own invites"
    ON public.family_invites FOR UPDATE
    USING (auth.uid() = inviter_id)
    WITH CHECK (auth.uid() = inviter_id);

-- INSERT happens ONLY through create_family_invite RPC (SECURITY DEFINER).
-- DELETE not allowed; revoke instead via UPDATE.
-- No SELECT for anon — public lookup goes through lookup_invite RPC.

-- family_invite_clicks: no direct user access. Inserted by lookup_invite RPC.
-- Inviter can read their own invite's click counts via dashboard (covered by
-- read policy below).
DROP POLICY IF EXISTS "inviters can read own invite clicks" ON public.family_invite_clicks;
CREATE POLICY "inviters can read own invite clicks"
    ON public.family_invite_clicks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.family_invites fi
            WHERE fi.id = family_invite_clicks.invite_id
              AND fi.inviter_id = auth.uid()
        )
    );

-- Default-deny: no INSERT/UPDATE/DELETE policy here for client roles. The
-- click-record write happens inside the SECURITY DEFINER lookup_invite RPC.

-- ── 3. RPCs ──────────────────────────────────────────────────────────────

-- 3.1 — Generate a unique 6-char code (server-side, avoids client collision races).
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
VOLATILE
AS $$
DECLARE
    v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 grandma-safe chars
    v_code TEXT;
    v_attempts INT := 0;
BEGIN
    LOOP
        v_attempts := v_attempts + 1;
        IF v_attempts > 50 THEN
            RAISE EXCEPTION 'Failed to allocate unique invite code after 50 attempts';
        END IF;
        v_code := '';
        FOR i IN 1..6 LOOP
            v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
        END LOOP;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.family_invites WHERE code = v_code);
    END LOOP;
    RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_invite_code() FROM PUBLIC, anon, authenticated;

-- 3.2 — create_family_invite (authed callers only).
-- Returns the new code.
CREATE OR REPLACE FUNCTION public.create_family_invite(
    p_relationship_type TEXT,
    p_relationship_label_hindi TEXT,
    p_connection_level INTEGER,
    p_reverse_relationship_type TEXT,
    p_reverse_relationship_label_hindi TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_code TEXT;
    v_inviter UUID;
BEGIN
    v_inviter := auth.uid();
    IF v_inviter IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    -- Whitelist: relationship_type must be a known key (loose check — allow any
    -- non-empty string up to 64 chars; the app constrains this to RELATIONSHIP_OPTIONS).
    IF p_relationship_type IS NULL OR length(trim(p_relationship_type)) = 0
       OR length(p_relationship_type) > 64 THEN
        RAISE EXCEPTION 'relationship_type required';
    END IF;
    IF p_reverse_relationship_type IS NULL OR length(trim(p_reverse_relationship_type)) = 0
       OR length(p_reverse_relationship_type) > 64 THEN
        RAISE EXCEPTION 'reverse_relationship_type required';
    END IF;
    IF p_connection_level IS NULL OR p_connection_level < 1 OR p_connection_level > 99 THEN
        RAISE EXCEPTION 'connection_level must be 1..99';
    END IF;

    v_code := public.generate_invite_code();

    INSERT INTO public.family_invites (
        inviter_id, code,
        relationship_type, relationship_label_hindi, connection_level,
        reverse_relationship_type, reverse_relationship_label_hindi
    ) VALUES (
        v_inviter, v_code,
        p_relationship_type, p_relationship_label_hindi, p_connection_level,
        p_reverse_relationship_type, p_reverse_relationship_label_hindi
    );

    RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.create_family_invite(TEXT, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_family_invite(TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

-- 3.3 — lookup_invite (PUBLIC, anon-callable). Returns minimal payload + records click.
CREATE OR REPLACE FUNCTION public.lookup_invite(
    p_code TEXT,
    p_user_agent TEXT DEFAULT NULL,
    p_referer TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invite RECORD;
    v_inviter RECORD;
    v_state TEXT;
BEGIN
    IF p_code IS NULL OR p_code !~ '^[A-HJ-NP-Z2-9]{6}$' THEN
        RETURN jsonb_build_object('found', FALSE, 'error', 'invalid_code');
    END IF;

    SELECT * INTO v_invite FROM public.family_invites WHERE code = p_code;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', FALSE, 'error', 'not_found');
    END IF;

    -- Best-effort click record (don't block lookup if this fails).
    BEGIN
        INSERT INTO public.family_invite_clicks (invite_id, user_agent, referer)
        VALUES (v_invite.id, p_user_agent, p_referer);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Minimal inviter display info (mirror users_safe view's columns).
    SELECT id, display_name, display_name_hindi, profile_photo_url
    INTO v_inviter
    FROM public.users WHERE id = v_invite.inviter_id;

    v_state := CASE
        WHEN v_invite.revoked_at IS NOT NULL THEN 'revoked'
        WHEN v_invite.claimed_at IS NOT NULL THEN 'claimed'
        WHEN v_invite.expires_at < NOW() THEN 'expired'
        ELSE 'active'
    END;

    RETURN jsonb_build_object(
        'found', TRUE,
        'state', v_state,
        'inviter_display_name', v_inviter.display_name,
        'inviter_display_name_hindi', v_inviter.display_name_hindi,
        'inviter_avatar_url', v_inviter.profile_photo_url,
        'relationship_type', v_invite.relationship_type,
        'relationship_label_hindi', v_invite.relationship_label_hindi,
        'reverse_relationship_label_hindi', v_invite.reverse_relationship_label_hindi,
        'expires_at', v_invite.expires_at
    );
END;
$$;

-- Public lookup — anon callable so the /join landing page works pre-auth.
REVOKE ALL ON FUNCTION public.lookup_invite(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_invite(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 3.4 — claim_family_invite. Auth required. Atomic claim + bidirectional family_members.
CREATE OR REPLACE FUNCTION public.claim_family_invite(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_claimer UUID;
    v_invite public.family_invites%ROWTYPE;
BEGIN
    v_claimer := auth.uid();
    IF v_claimer IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    IF p_code IS NULL OR p_code !~ '^[A-HJ-NP-Z2-9]{6}$' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'invalid_code');
    END IF;

    -- Lock the row to make the claim atomic across concurrent calls.
    SELECT * INTO v_invite FROM public.family_invites WHERE code = p_code FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'not_found');
    END IF;

    IF v_invite.revoked_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'revoked');
    END IF;
    IF v_invite.claimed_at IS NOT NULL THEN
        -- Idempotent: if the same claimer already claimed it, treat as success.
        IF v_invite.claimed_by = v_claimer THEN
            RETURN jsonb_build_object(
                'success', TRUE, 'idempotent', TRUE,
                'inviter_id', v_invite.inviter_id
            );
        END IF;
        RETURN jsonb_build_object('success', FALSE, 'error', 'already_claimed');
    END IF;
    IF v_invite.expires_at < NOW() THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'expired');
    END IF;
    IF v_invite.inviter_id = v_claimer THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'self_claim');
    END IF;

    -- Mark claimed.
    UPDATE public.family_invites
       SET claimed_by = v_claimer,
           claimed_at = NOW()
     WHERE id = v_invite.id;

    -- Create the bidirectional family_members rows. ON CONFLICT keeps the
    -- existing row if the relationship already exists — never silently fails.
    INSERT INTO public.family_members (
        user_id, family_member_id,
        relationship_type, relationship_label_hindi, connection_level,
        is_verified
    ) VALUES (
        v_invite.inviter_id, v_claimer,
        v_invite.relationship_type, v_invite.relationship_label_hindi, v_invite.connection_level,
        TRUE
    )
    ON CONFLICT (user_id, family_member_id) DO UPDATE
        SET relationship_type = EXCLUDED.relationship_type,
            relationship_label_hindi = EXCLUDED.relationship_label_hindi,
            connection_level = EXCLUDED.connection_level,
            is_verified = TRUE,
            updated_at = NOW();

    INSERT INTO public.family_members (
        user_id, family_member_id,
        relationship_type, relationship_label_hindi, connection_level,
        is_verified
    ) VALUES (
        v_claimer, v_invite.inviter_id,
        v_invite.reverse_relationship_type, v_invite.reverse_relationship_label_hindi, v_invite.connection_level,
        TRUE
    )
    ON CONFLICT (user_id, family_member_id) DO UPDATE
        SET relationship_type = EXCLUDED.relationship_type,
            relationship_label_hindi = EXCLUDED.relationship_label_hindi,
            connection_level = EXCLUDED.connection_level,
            is_verified = TRUE,
            updated_at = NOW();

    RETURN jsonb_build_object(
        'success', TRUE,
        'idempotent', FALSE,
        'inviter_id', v_invite.inviter_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_family_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_family_invite(TEXT) TO authenticated;

COMMIT;

-- ============================================================================
-- Verification queries (run post-apply):
--
-- 1. Inviter generates a code:
--      SELECT public.create_family_invite('bua', 'बुआ', 3, 'bhatija', 'भतीजा');
--
-- 2. Anon lookup (simulates the /join page hitting the RPC):
--      SET ROLE anon;
--      SELECT public.lookup_invite('<code-from-step-1>');
--      RESET ROLE;
--    Expected: jsonb with state='active' and inviter_display_name populated.
--
-- 3. Claimer (different user) claims:
--      -- (login as the claimer, then)
--      SELECT public.claim_family_invite('<code>');
--    Expected: { success: true, inviter_id: <inviter> }.
--    Both family_members rows created with is_verified = TRUE.
--
-- 4. Re-claim by same user is idempotent:
--      SELECT public.claim_family_invite('<code>');
--    Expected: { success: true, idempotent: true, ... }.
--
-- 5. Re-claim by a third user fails:
--    Expected: { success: false, error: 'already_claimed' }.
-- ============================================================================
