-- =================================================================
-- Tithi Events — Hindu tithi-based reminders (birthdays, shraddha, etc.)
--
-- ⚠️  DO NOT RUN without Kumar's explicit approval.
--     Currently using localStorage. This migration is drafted for
--     when we move to Supabase-backed storage.
--
-- Apply via: supabase db push --linked
-- =================================================================

CREATE TABLE IF NOT EXISTS tithi_events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- optional link to family member
  name          text NOT NULL,
  type          text NOT NULL DEFAULT 'birthday'
                CHECK (type IN ('birthday', 'anniversary', 'shraddha', 'festival', 'other')),
  tithi_number  smallint NOT NULL CHECK (tithi_number BETWEEN 1 AND 30),
  paksha        text NOT NULL CHECK (paksha IN ('shukla', 'krishna')),
  masa          smallint NOT NULL CHECK (masa BETWEEN 1 AND 12),
  gregorian_ref date,            -- optional: original Gregorian date for reference
  note          text,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL
);

-- Index for fast per-user queries
CREATE INDEX idx_tithi_events_user ON tithi_events(user_id);

-- Index for daily "does any event match today's tithi?" check
CREATE INDEX idx_tithi_events_match ON tithi_events(masa, paksha, tithi_number);

-- RLS: users can only see and manage their own events
ALTER TABLE tithi_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tithi_events"
  ON tithi_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_tithi_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tithi_events_updated_at
  BEFORE UPDATE ON tithi_events
  FOR EACH ROW EXECUTE FUNCTION update_tithi_events_updated_at();
