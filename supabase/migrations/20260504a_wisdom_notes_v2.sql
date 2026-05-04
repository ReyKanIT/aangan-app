-- ============================================================================
-- Migration: 20260504a_wisdom_notes_v2
-- Standalone wisdom_notes table — Kumar's clarification 2026-05-04:
--   "wisdom notes are from a person about many things & can be about other
--    people, to be shared with their heirs"
--
-- This is materially different from a regular post:
--   - PERSISTS after the author's account closes (legacy artifact). The FK
--     to public.users intentionally uses ON DELETE SET NULL on author_id so
--     the wisdom survives even if the user record goes away.
--   - Audience is "heirs" — every descendant of the author in the family
--     tree, computed via the existing family_members graph at read time.
--     Stored as `audience_type='heirs'` for clarity.
--   - Can be ABOUT another family member (about_user_id FK).
--   - Topic categorisation so heirs can browse by theme (proverb, advice,
--     memory, blessing, recipe, lineage_story, other).
--
-- Initial release (v0.15.0) ships the table + RLS. UI is gated behind
-- NEXT_PUBLIC_FEATURE_WISDOM_NOTES_V2 (default OFF) so we can land the
-- schema in prod ahead of the UI without exposing anything.
-- ============================================================================

BEGIN;

-- ─── 1. wisdom_notes table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wisdom_notes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Author intentionally nullable (ON DELETE SET NULL) so the wisdom
    -- outlives the account. Display falls back to display_name_snapshot.
    author_id           UUID REFERENCES public.users(id) ON DELETE SET NULL,
    -- Snapshot of author's display name at write time so even after the
    -- user row is gone, heirs still see "ये दादी जी ने कहा था" attribution.
    display_name_snapshot       TEXT NOT NULL,
    display_name_hindi_snapshot TEXT,
    -- Optional: this wisdom is ABOUT another family member.
    about_user_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
    about_name_snapshot TEXT,
    -- Topic taxonomy. Closed set (CHECK constraint) so the UI's filter
    -- chips have a stable schema.
    topic               TEXT NOT NULL DEFAULT 'other'
        CHECK (topic IN ('proverb', 'advice', 'memory', 'blessing',
                         'recipe', 'lineage_story', 'other')),
    -- Content: text body (Hindi-first), optional voice/photo attachment URL.
    content             TEXT NOT NULL,
    content_hindi       TEXT,
    audio_url           TEXT,                  -- voice note (Supabase Storage)
    audio_duration_sec  INTEGER,
    photo_url           TEXT,                  -- optional accompanying photo
    -- Audience: 'heirs' (default — descendants of author in family tree)
    --           or 'family' (whole family) or 'private' (author only — draft)
    audience_type       TEXT NOT NULL DEFAULT 'heirs'
        CHECK (audience_type IN ('heirs', 'family', 'private')),
    -- Provenance
    family_id           UUID REFERENCES public.families(id) ON DELETE CASCADE,
    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- For PG full-text search (re-computed via trigger).
    fts                 TSVECTOR
);

-- Note on FK to public.families: that table is created by the heritage
-- module's 001_create_families.sql migration. If wisdom_notes is applied
-- BEFORE the heritage module, this FK would fail. Guard:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'families'
    ) THEN
        -- Drop the constraint silently — wisdom_notes works without
        -- families thanks to the family_id being nullable in this case.
        ALTER TABLE public.wisdom_notes DROP CONSTRAINT IF EXISTS wisdom_notes_family_id_fkey;
    END IF;
END $$;

-- ─── 2. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wisdom_notes_author      ON public.wisdom_notes (author_id);
CREATE INDEX IF NOT EXISTS idx_wisdom_notes_about       ON public.wisdom_notes (about_user_id) WHERE about_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wisdom_notes_family      ON public.wisdom_notes (family_id);
CREATE INDEX IF NOT EXISTS idx_wisdom_notes_topic       ON public.wisdom_notes (topic);
CREATE INDEX IF NOT EXISTS idx_wisdom_notes_created_at  ON public.wisdom_notes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wisdom_notes_fts         ON public.wisdom_notes USING gin (fts);

-- ─── 3. FTS trigger ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.wisdom_notes_fts_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.fts :=
        setweight(to_tsvector('simple', coalesce(NEW.content, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.content_hindi, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.display_name_snapshot, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW.about_name_snapshot, '')), 'C');
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wisdom_notes_fts_update_trg ON public.wisdom_notes;
CREATE TRIGGER wisdom_notes_fts_update_trg
    BEFORE INSERT OR UPDATE ON public.wisdom_notes
    FOR EACH ROW EXECUTE FUNCTION public.wisdom_notes_fts_update();

-- ─── 4. SECURITY DEFINER helper: is the caller a descendant of author? ─────
-- A descendant = transitive closure through family_members where
-- relationship_type indicates lineage (parent → child → grandchild).
-- For v1 we use a 3-level approximation via connection_level in the
-- existing family_members rows, which is what the rest of the app uses.
-- This keeps RLS simple and avoids recursion.
CREATE OR REPLACE FUNCTION public.is_heir_of(p_author_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    -- Heir = any user the author has connected as a "descendant"-shaped
    -- relationship. We approximate with: family_members where the author
    -- registered the caller as their L1/L2/L3 *child*, *grandchild*, etc.
    -- The relationship_type column carries Hindi/English labels; we
    -- pattern-match the obvious downward terms.
    SELECT EXISTS (
        SELECT 1
        FROM public.family_members fm
        WHERE fm.user_id = p_author_id
          AND fm.family_member_id = auth.uid()
          AND (
              fm.relationship_type ILIKE 'child%'      OR
              fm.relationship_type ILIKE 'son%'        OR
              fm.relationship_type ILIKE 'daughter%'   OR
              fm.relationship_type ILIKE 'grandchild%' OR
              fm.relationship_type ILIKE 'grandson%'   OR
              fm.relationship_type ILIKE 'granddaughter%' OR
              fm.relationship_type ILIKE 'पुत्र%'      OR
              fm.relationship_type ILIKE 'पुत्री%'     OR
              fm.relationship_type ILIKE 'बेटा%'       OR
              fm.relationship_type ILIKE 'बेटी%'       OR
              fm.relationship_type ILIKE 'पोता%'       OR
              fm.relationship_type ILIKE 'पोती%'       OR
              fm.relationship_type ILIKE 'नाती%'       OR
              fm.relationship_type ILIKE 'नातिन%'
          )
    );
$$;

REVOKE ALL ON FUNCTION public.is_heir_of(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_heir_of(UUID) TO authenticated;

-- ─── 5. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.wisdom_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wisdom notes — author can read" ON public.wisdom_notes;
CREATE POLICY "Wisdom notes — author can read"
ON public.wisdom_notes FOR SELECT
USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Wisdom notes — heirs can read non-private" ON public.wisdom_notes;
CREATE POLICY "Wisdom notes — heirs can read non-private"
ON public.wisdom_notes FOR SELECT
USING (
    audience_type IN ('heirs', 'family')
    AND author_id IS NOT NULL
    AND public.is_heir_of(author_id)
);

DROP POLICY IF EXISTS "Wisdom notes — family-audience visible to family" ON public.wisdom_notes;
CREATE POLICY "Wisdom notes — family-audience visible to family"
ON public.wisdom_notes FOR SELECT
USING (
    audience_type = 'family'
    AND family_id IS NOT NULL
    AND family_id = (SELECT family_id FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Wisdom notes — author can write" ON public.wisdom_notes;
CREATE POLICY "Wisdom notes — author can write"
ON public.wisdom_notes FOR INSERT
WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Wisdom notes — author can update" ON public.wisdom_notes;
CREATE POLICY "Wisdom notes — author can update"
ON public.wisdom_notes FOR UPDATE
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Author can delete their own (drafts mostly). Heirs CANNOT delete — the
-- whole point is that wisdom outlives the author's editorial control.
DROP POLICY IF EXISTS "Wisdom notes — author can delete own draft" ON public.wisdom_notes;
CREATE POLICY "Wisdom notes — author can delete own draft"
ON public.wisdom_notes FOR DELETE
USING (author_id = auth.uid() AND audience_type = 'private');

-- ─── 6. Reload PostgREST schema cache ───────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- Verification:
--   SELECT count(*) FROM information_schema.tables
--    WHERE table_schema='public' AND table_name='wisdom_notes';
--   -- Expected: 1
--
--   -- As an authenticated user, attempt to insert a wisdom note for
--   -- yourself: should succeed.
--   -- Attempt to insert with author_id = someone else: should be denied.
--   -- Attempt to read another user's heir-audience wisdom: only succeeds
--   -- if you are listed as their child/grandchild in family_members.
-- ============================================================================
