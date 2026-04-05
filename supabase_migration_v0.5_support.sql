-- ============================================================
-- Aangan v0.5 — Support Tickets & Customer Queries
-- Run in Supabase SQL Editor
-- ============================================================

-- ─── Admin Role on users ────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  admin_role TEXT CHECK (admin_role IN ('super_admin','admin','manager'));

-- ─── Ticket sequence ────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1000 INCREMENT 1;

-- ─── support_tickets ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number     TEXT        UNIQUE NOT NULL
                                DEFAULT ('TKT-' || LPAD(nextval('support_ticket_seq')::TEXT, 6, '0')),
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category          TEXT        NOT NULL
                                CHECK (category IN ('billing','account','bug_report','feature_request','complaint','general')),
  subject           TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open','assigned','in_progress','waiting_for_user','resolved','closed')),
  priority          TEXT        NOT NULL DEFAULT 'medium'
                                CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to       UUID        REFERENCES users(id),
  resolution_notes  TEXT,
  resolved_at       TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── support_messages ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id        UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id        UUID        NOT NULL REFERENCES users(id),
  message          TEXT        NOT NULL,
  is_from_support  BOOLEAN     NOT NULL DEFAULT FALSE,
  attachment_url   TEXT,
  is_internal_note BOOLEAN     NOT NULL DEFAULT FALSE, -- admin-only notes
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_support_tickets_user     ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status   ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created  ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket  ON support_messages(ticket_id, created_at);

-- ─── updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_tickets_updated ON support_tickets;
CREATE TRIGGER trg_support_tickets_updated
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_support_ticket_updated_at();

-- ─── Auto set first_response_at ─────────────────────────────
CREATE OR REPLACE FUNCTION set_first_response_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_from_support = TRUE THEN
    UPDATE support_tickets
    SET first_response_at = NOW()
    WHERE id = NEW.ticket_id AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_first_response ON support_messages;
CREATE TRIGGER trg_first_response
  AFTER INSERT ON support_messages
  FOR EACH ROW EXECUTE FUNCTION set_first_response_at();

-- ─── RLS ────────────────────────────────────────────────────
ALTER TABLE support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Users can see their own tickets
DROP POLICY IF EXISTS "users_own_tickets" ON support_tickets;
CREATE POLICY "users_own_tickets" ON support_tickets
  FOR ALL USING (user_id = auth.uid());

-- Admins see all tickets
DROP POLICY IF EXISTS "admins_all_tickets" ON support_tickets;
CREATE POLICY "admins_all_tickets" ON support_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND (is_app_admin = TRUE OR admin_role IS NOT NULL)
    )
  );

-- Users see messages in their own tickets (non-internal)
DROP POLICY IF EXISTS "users_own_messages" ON support_messages;
CREATE POLICY "users_own_messages" ON support_messages
  FOR SELECT USING (
    is_internal_note = FALSE
    AND EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

-- Users can insert messages in their own open tickets
DROP POLICY IF EXISTS "users_insert_messages" ON support_messages;
CREATE POLICY "users_insert_messages" ON support_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND is_from_support = FALSE
    AND is_internal_note = FALSE
    AND EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_id
        AND user_id = auth.uid()
        AND status NOT IN ('resolved','closed')
    )
  );

-- Admins can read/write all messages
DROP POLICY IF EXISTS "admins_all_messages" ON support_messages;
CREATE POLICY "admins_all_messages" ON support_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND (is_app_admin = TRUE OR admin_role IS NOT NULL)
    )
  );
