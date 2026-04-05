-- Migration v0.4.2: Kuldevi / Kuldevta fields on users table
-- Add optional family deity information: name, temple location,
-- puja procedure, and puja rules/notes.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS kuldevi_name            TEXT,
  ADD COLUMN IF NOT EXISTS kuldevi_temple_location TEXT,
  ADD COLUMN IF NOT EXISTS kuldevta_name           TEXT,
  ADD COLUMN IF NOT EXISTS kuldevta_temple_location TEXT,
  ADD COLUMN IF NOT EXISTS puja_paddhati           TEXT,    -- puja method / procedure
  ADD COLUMN IF NOT EXISTS puja_niyam              TEXT;    -- rules & special notes about puja

-- Optional: index for searching by kuldevi name (gotra/kuldevi directories)
CREATE INDEX IF NOT EXISTS idx_users_kuldevi_name
  ON public.users (kuldevi_name)
  WHERE kuldevi_name IS NOT NULL;
