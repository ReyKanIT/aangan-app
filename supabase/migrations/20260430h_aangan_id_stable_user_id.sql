-- ============================================================================
-- Migration: 20260430h_aangan_id_stable_user_id
-- Adds a stable, human-friendly identifier on public.users so that users keep
-- their family connections even if they later change phone or email.
-- ----------------------------------------------------------------------------
-- Why:
--   Today's only stable identifier for a user is auth.users.id (the Supabase
--   UUID). That UUID is bound to the auth IDENTITY (a phone number or email),
--   not to the human. The 2026-04-29 audit found Kumar had two parallel
--   accounts because his email login and his phone login each spawned a fresh
--   auth.users row. The merge migration (20260430c) cleaned that up, but the
--   underlying risk is unchanged: anyone who later swaps numbers or emails
--   loses their family graph the same way.
--
--   This migration introduces `aangan_id` — a short, share-able code (e.g.
--   "AAN-X7K2P9") that lives on public.users only. The value is generated
--   once at first signup and never changes. A user can show it to a relative,
--   the relative searches by it, and the link is durable across whatever
--   auth shenanigans happen later. Future flow: a "I lost my number"
--   recovery path that re-binds a new auth identity to the existing
--   aangan_id without spawning a duplicate row.
--
-- Format:
--   "AAN-" + 8 chars from 32-char grandma-safe alphabet (no O/0/I/1).
--   Mirrors the alphabet used by family invite codes (20260429i) so the
--   visual style stays consistent. 32^8 ≈ 1.1 trillion combinations — no
--   realistic collision risk for the foreseeable future.
-- ============================================================================

BEGIN;

-- ─── 1. Column ───────────────────────────────────────────────────────────────
-- TEXT (not UUID) so it can be displayed and shared by humans without copy-
-- pasting 36-character monsters. UNIQUE so it can be used as a lookup key.
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS aangan_id TEXT UNIQUE;

-- ─── 2. Generator ────────────────────────────────────────────────────────────
-- Re-uses the family-invite alphabet. Loops on the off chance of collision.
CREATE OR REPLACE FUNCTION public.generate_aangan_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
VOLATILE
AS $$
DECLARE
    v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_code TEXT;
    v_attempts INT := 0;
BEGIN
    LOOP
        v_attempts := v_attempts + 1;
        IF v_attempts > 50 THEN
            RAISE EXCEPTION 'Failed to allocate unique aangan_id after 50 attempts';
        END IF;
        v_code := 'AAN-';
        FOR i IN 1..8 LOOP
            v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
        END LOOP;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE aangan_id = v_code);
    END LOOP;
    RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_aangan_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_aangan_id() TO authenticated, service_role;

-- ─── 3. Backfill existing rows ───────────────────────────────────────────────
-- Every existing user gets a stable id NOW so legacy accounts can be looked
-- up the same way as new ones. Uses a loop because the generator is VOLATILE
-- and we need a per-row call (a single UPDATE would compute it once).
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.users WHERE aangan_id IS NULL LOOP
        UPDATE public.users
            SET aangan_id = public.generate_aangan_id()
            WHERE id = r.id;
    END LOOP;
END $$;

-- ─── 4. Auto-assign on insert ────────────────────────────────────────────────
-- Future signups get an aangan_id automatically — no client work needed.
-- Trigger is BEFORE INSERT so the value lands in the same row, not a follow-up
-- UPDATE that another trigger or RLS could interfere with.
CREATE OR REPLACE FUNCTION public.set_aangan_id_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.aangan_id IS NULL THEN
        NEW.aangan_id := public.generate_aangan_id();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_aangan_id ON public.users;
CREATE TRIGGER users_set_aangan_id
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.set_aangan_id_on_insert();

-- ─── 5. Lock the column NOT NULL once backfill is complete ───────────────────
-- Done LAST, so steps 3+4 have a chance to populate every existing and new row.
-- If any row still has NULL after the backfill loop above we bail out loudly.
DO $$
DECLARE
    n_null INT;
BEGIN
    SELECT count(*) INTO n_null FROM public.users WHERE aangan_id IS NULL;
    IF n_null > 0 THEN
        RAISE EXCEPTION 'aangan_id backfill left % rows NULL — investigate before re-running', n_null;
    END IF;
END $$;

ALTER TABLE public.users
    ALTER COLUMN aangan_id SET NOT NULL;

-- ─── 6. Lookup RPC ───────────────────────────────────────────────────────────
-- Public-safe lookup so the family-add flow can resolve "AAN-X7K2P9" to a
-- user without exposing phone/email. Returns the same shape as
-- search_users_safe (20260429b) so the UI can reuse rendering.
CREATE OR REPLACE FUNCTION public.lookup_user_by_aangan_id(p_aangan_id TEXT)
RETURNS TABLE (
    id UUID,
    aangan_id TEXT,
    display_name TEXT,
    display_name_hindi TEXT,
    avatar_url TEXT,
    village_city TEXT,
    state_code TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT u.id,
           u.aangan_id,
           u.display_name,
           u.display_name_hindi,
           u.avatar_url,
           u.village_city,
           u.state_code
    FROM public.users u
    WHERE upper(u.aangan_id) = upper(trim(p_aangan_id))
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_user_by_aangan_id(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_aangan_id(TEXT) TO authenticated;

-- ─── 7. Extend search_users_safe to also return aangan_id ────────────────────
-- The phase-A RLS lockdown (20260429b) introduced search_users_safe, but it
-- predated this column. Updating the signature requires DROP+CREATE because
-- Postgres won't let CREATE OR REPLACE change the OUT columns. Also fixes a
-- latent column-name mismatch — the original body referenced u.village /
-- u.state which don't exist on public.users (real names are village_city /
-- state_code). The web UI was silently dropping the place chip because of it.
DROP FUNCTION IF EXISTS public.search_users_safe(TEXT);

CREATE OR REPLACE FUNCTION public.search_users_safe(p_query TEXT)
RETURNS TABLE (
    id UUID,
    aangan_id TEXT,
    display_name TEXT,
    display_name_hindi TEXT,
    avatar_url TEXT,
    village_city TEXT,
    state_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_query TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    v_query := TRIM(p_query);
    IF length(v_query) < 2 THEN RETURN; END IF;
    IF length(v_query) > 64 THEN v_query := substring(v_query FROM 1 FOR 64); END IF;

    v_query := replace(v_query, '\', '\\');
    v_query := replace(v_query, '%', '\%');
    v_query := replace(v_query, '_', '\_');

    RETURN QUERY
    SELECT u.id,
           u.aangan_id,
           u.display_name,
           u.display_name_hindi,
           u.avatar_url,
           u.village_city,
           u.state_code
    FROM public.users u
    WHERE (u.display_name ILIKE '%' || v_query || '%' ESCAPE '\'
           OR u.display_name_hindi ILIKE '%' || v_query || '%' ESCAPE '\')
      AND u.id <> auth.uid()
    ORDER BY u.last_seen_at DESC NULLS LAST
    LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.search_users_safe(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_users_safe(TEXT) TO authenticated;

COMMIT;

-- ============================================================================
-- Verification:
--   SELECT count(*) AS total, count(aangan_id) AS with_id FROM public.users;
--   -- expect total = with_id (zero NULL)
--   SELECT id, aangan_id, display_name FROM public.users LIMIT 5;
--   SELECT * FROM public.lookup_user_by_aangan_id('AAN-XXXXXXXX');
-- ============================================================================
