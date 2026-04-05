-- Migration v0.4.4: Family Important Dates & Reminder Notifications
-- Stores birthdays, anniversaries, barsi and custom recurring dates.
-- A daily Supabase Edge Function reads this table + users.date_of_birth
-- and sends push notifications to all relevant family members.

-- ─── wedding_anniversary on users ───────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS wedding_anniversary DATE;

-- ─── family_important_dates table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_important_dates (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by            UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- What kind of event
  category              TEXT        NOT NULL CHECK (category IN (
                          'birthday',        -- जन्मदिन
                          'anniversary',     -- शादी की सालगिरह
                          'barsi',           -- बरसी (death anniversary)
                          'puja',            -- वार्षिक पूजा
                          'other'            -- अन्य
                        )),

  -- Person/event this date belongs to
  person_name           TEXT        NOT NULL,
  person_name_hindi     TEXT,

  -- Date — store as MM-DD for annual recurrence (year is ignored for recurring)
  event_month           SMALLINT    NOT NULL CHECK (event_month BETWEEN 1 AND 12),
  event_day             SMALLINT    NOT NULL CHECK (event_day BETWEEN 1 AND 31),
  event_year            SMALLINT,   -- optional birth/event year (for age calc)

  -- Notification settings
  notify_days_before    INTEGER[]   NOT NULL DEFAULT '{1,3,7}',
  notify_family         BOOLEAN     NOT NULL DEFAULT TRUE,   -- notify L1+L2 family
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,

  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fid_created_by    ON public.family_important_dates (created_by);
CREATE INDEX IF NOT EXISTS idx_fid_category      ON public.family_important_dates (category);
CREATE INDEX IF NOT EXISTS idx_fid_month_day     ON public.family_important_dates (event_month, event_day)
  WHERE is_active = TRUE;

CREATE TRIGGER trg_fid_updated_at
  BEFORE UPDATE ON public.family_important_dates
  FOR EACH ROW EXECUTE FUNCTION public.update_life_events_updated_at();

ALTER TABLE public.family_important_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family can view important dates" ON public.family_important_dates
  FOR SELECT USING (
    notify_family = TRUE
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.user_id = auth.uid()
          AND fm.family_member_id = family_important_dates.created_by
      )
    )
  );

CREATE POLICY "Creator manages own dates" ON public.family_important_dates
  FOR ALL USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ─── notification_log to avoid duplicate reminders ───────────────────────────
CREATE TABLE IF NOT EXISTS public.reminder_notification_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_type TEXT        NOT NULL, -- 'birthday' | 'anniversary' | 'important_date' | 'event'
  source_id   TEXT        NOT NULL, -- user_id or important_date_id or event_id
  notify_date DATE        NOT NULL, -- the calendar date notification was sent
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source_type, source_id, notify_date)
);

CREATE INDEX IF NOT EXISTS idx_rnl_user_date ON public.reminder_notification_log (user_id, notify_date);

ALTER TABLE public.reminder_notification_log ENABLE ROW LEVEL SECURITY;
-- Only the Edge Function (service_role) writes to this table; no user-level access needed.

-- ─── pg_cron: schedule daily-reminders Edge Function at 08:00 IST (02:30 UTC) ─
-- Run this AFTER enabling pg_cron in Supabase Dashboard → Extensions
-- Replace YOUR_PROJECT_REF and SERVICE_ROLE_KEY with real values.
--
-- SELECT cron.schedule(
--   'daily-family-reminders',
--   '30 2 * * *',   -- 02:30 UTC = 08:00 IST every day
--   $$
--   SELECT net.http_post(
--     url    := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-reminders',
--     headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
--     body   := '{}'::jsonb
--   ) AS request_id;
--   $$
-- );
