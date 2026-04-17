-- ============================================================================
-- Aangan v0.9.7 — User-issue reply plumbing
-- Adds: report_messages (reply thread for content_reports), surfaces content
--       reports in the notifications pipeline.
-- Safe to re-run — everything is IF NOT EXISTS / DROP POLICY IF EXISTS.
-- ============================================================================

-- 1. Reply thread for content reports — mirrors support_messages shape so the
-- admin UI can share the same ReplyComposer.
CREATE TABLE IF NOT EXISTS public.report_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.content_reports(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    message_hindi TEXT,                 -- optional — populated when admin used a bilingual template
    is_from_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_internal_note BOOLEAN NOT NULL DEFAULT FALSE, -- hidden from reporter
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_messages_report_id ON public.report_messages(report_id);
CREATE INDEX IF NOT EXISTS idx_report_messages_created_at ON public.report_messages(created_at DESC);

ALTER TABLE public.report_messages ENABLE ROW LEVEL SECURITY;

-- Reporter sees non-internal messages on their own reports.
DROP POLICY IF EXISTS "Reporter sees own thread" ON public.report_messages;
CREATE POLICY "Reporter sees own thread" ON public.report_messages
    FOR SELECT
    USING (
        is_internal_note = FALSE
        AND EXISTS (
            SELECT 1 FROM public.content_reports
            WHERE content_reports.id = report_messages.report_id
              AND content_reports.reporter_id = auth.uid()
        )
    );

-- Admin (is_app_admin) sees everything including internal notes.
DROP POLICY IF EXISTS "Admin sees all report messages" ON public.report_messages;
CREATE POLICY "Admin sees all report messages" ON public.report_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND (users.is_app_admin = TRUE OR users.admin_role IS NOT NULL)
        )
    );

-- Reporter can write back on their own report (non-admin messages).
DROP POLICY IF EXISTS "Reporter replies to own thread" ON public.report_messages;
CREATE POLICY "Reporter replies to own thread" ON public.report_messages
    FOR INSERT
    WITH CHECK (
        is_from_admin = FALSE
        AND is_internal_note = FALSE
        AND sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.content_reports
            WHERE content_reports.id = report_messages.report_id
              AND content_reports.reporter_id = auth.uid()
        )
    );

-- Admins can write any message.
DROP POLICY IF EXISTS "Admin writes report messages" ON public.report_messages;
CREATE POLICY "Admin writes report messages" ON public.report_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND (users.is_app_admin = TRUE OR users.admin_role IS NOT NULL)
        )
    );

-- 2. Notification type expansion — no schema change, just a convention. The
-- existing `notifications.type` is TEXT so new values like 'support_reply',
-- 'report_reply', 'issue_resolved' work without an ALTER.
--
-- Client code prefers title_hindi/body_hindi with English fallback.

-- 3. Optional: an index to speed the unified-inbox query that sorts pending
-- items across all three channels by updated_at.
CREATE INDEX IF NOT EXISTS idx_content_reports_status_updated ON public.content_reports(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_updated ON public.support_tickets(status, updated_at DESC);
