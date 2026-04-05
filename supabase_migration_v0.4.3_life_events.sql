-- Migration v0.4.3: Major Life Events (Birth & Death) with Sutak
-- Stores birth/death events for a family with fully customisable Sutak rules.
-- All Sutak settings are optional and editable per event.

CREATE TABLE IF NOT EXISTS public.life_events (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by            UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Event identity
  event_type            TEXT        NOT NULL CHECK (event_type IN ('birth', 'death')),
  person_name           TEXT        NOT NULL,
  person_name_hindi     TEXT,
  event_date            DATE        NOT NULL,
  relationship          TEXT,       -- e.g. 'बेटा', 'माता', 'पत्नी'

  -- Birth-specific (optional)
  baby_gender           TEXT        CHECK (baby_gender IN ('boy', 'girl', 'not_disclosed')),
  birth_place           TEXT,

  -- Death-specific (optional)
  age_at_death          INTEGER,

  -- Sutak / Paatak
  sutak_enabled         BOOLEAN     NOT NULL DEFAULT TRUE,
  sutak_days            INTEGER     NOT NULL DEFAULT 10,   -- days of observance
  sutak_start_date      DATE,       -- usually = event_date
  sutak_end_date        DATE,       -- computed: start + days - 1
  sutak_rules           JSONB       NOT NULL DEFAULT '{
    "noTempleVisit": true,
    "noReligiousCeremonies": true,
    "noPujaAtHome": false,
    "noAuspiciousWork": true,
    "noFoodSharing": true,
    "noNewVentures": false,
    "customNotes": ""
  }'::jsonb,

  -- General
  notes                 TEXT,
  is_visible_to_family  BOOLEAN     NOT NULL DEFAULT TRUE,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_life_events_created_by  ON public.life_events (created_by);
CREATE INDEX IF NOT EXISTS idx_life_events_event_type  ON public.life_events (event_type);
CREATE INDEX IF NOT EXISTS idx_life_events_event_date  ON public.life_events (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_life_events_sutak_end   ON public.life_events (sutak_end_date)
  WHERE sutak_enabled = TRUE AND sutak_end_date IS NOT NULL;

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_life_events_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_life_events_updated_at
  BEFORE UPDATE ON public.life_events
  FOR EACH ROW EXECUTE FUNCTION public.update_life_events_updated_at();

-- RLS
ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;

-- Anyone in the same family network can view visible events
CREATE POLICY "Family can view life events" ON public.life_events
  FOR SELECT USING (
    is_visible_to_family = TRUE
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.user_id = auth.uid()
          AND fm.family_member_id = life_events.created_by
      )
    )
  );

-- Only the creator can insert / update / delete their own events
CREATE POLICY "Creator can manage life events" ON public.life_events
  FOR ALL USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
