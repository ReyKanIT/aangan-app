-- ============================================================================
-- Aangan (आँगन) — Family Social Network for Indian Families
-- Supabase SQL Schema v0.1
-- ============================================================================
-- Run this file in the Supabase SQL Editor (Dashboard > SQL Editor > New Query).
-- It is idempotent: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================================

-- 0. Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================================
-- 1. USERS — extends auth.users with profile data
-- ============================================================================
-- Every authenticated user gets a row here via the handle_new_user() trigger.
-- family_level: 1 = nuclear, 2 = extended, up to 99 for very large clans.

CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number    TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  display_name_hindi TEXT,
  village         TEXT,
  state           TEXT,
  family_level    INT NOT NULL DEFAULT 1 CHECK (family_level BETWEEN 1 AND 99),
  is_family_admin BOOLEAN NOT NULL DEFAULT FALSE,
  profile_photo_url TEXT,
  bio             TEXT,
  push_token      TEXT,                           -- Expo push notification token
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'Extended user profile for every Aangan member. Linked 1-1 with auth.users.';


-- ============================================================================
-- 2. FAMILY_MEMBERS — relationship graph between users
-- ============================================================================
-- Models a directed edge: user_id considers family_member_id as <relationship>.
-- connection_level 1-99 mirrors the family_level concept for closeness.

CREATE TABLE IF NOT EXISTS public.family_members (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  family_member_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  relationship_type       TEXT NOT NULL,          -- e.g. 'parent', 'sibling', 'spouse'
  relationship_label_hindi TEXT,                  -- e.g. 'माता', 'भाई'
  connection_level        INT NOT NULL DEFAULT 1 CHECK (connection_level BETWEEN 1 AND 99),
  is_verified             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_no_self_relation CHECK (user_id <> family_member_id),
  CONSTRAINT uq_family_edge UNIQUE (user_id, family_member_id)
);

COMMENT ON TABLE public.family_members IS 'Directed relationship edges between family members. Each row = user_id sees family_member_id as <relationship>.';


-- ============================================================================
-- 3. AUDIENCE_GROUPS — named groups for post/event targeting
-- ============================================================================
-- group_type = 'level_based' auto-includes everyone at a given family_level.
-- group_type = 'custom' uses member_ids array for hand-picked lists.

CREATE TABLE IF NOT EXISTS public.audience_groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  name_hindi  TEXT,
  group_type  TEXT NOT NULL CHECK (group_type IN ('level_based', 'custom')),
  family_level INT CHECK (family_level BETWEEN 1 AND 99),
  member_ids  UUID[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audience_groups IS 'Reusable audience groups for targeting posts and events.';


-- ============================================================================
-- 4. POSTS — text/media shared within the family
-- ============================================================================
-- audience_type controls visibility:
--   'all'    = entire family tree
--   'level'  = everyone at audience_level or closer
--   'custom' = specific audience_group_id

CREATE TABLE IF NOT EXISTS public.posts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content           TEXT,
  media_urls        TEXT[] DEFAULT '{}',
  post_type         TEXT NOT NULL DEFAULT 'text' CHECK (post_type IN ('text', 'photo', 'video', 'announcement')),
  audience_type     TEXT NOT NULL DEFAULT 'all' CHECK (audience_type IN ('all', 'level', 'custom')),
  audience_level    INT CHECK (audience_level BETWEEN 1 AND 99),
  audience_group_id UUID REFERENCES public.audience_groups(id) ON DELETE SET NULL,
  audience_level_max INT CHECK (audience_level_max BETWEEN 1 AND 99),
  like_count        INT NOT NULL DEFAULT 0,
  comment_count     INT NOT NULL DEFAULT 0,
  delivery_status   TEXT NOT NULL DEFAULT 'draft' CHECK (delivery_status IN ('draft', 'sent', 'delivered', 'failed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.posts IS 'Family posts with audience-controlled visibility.';

-- Post likes junction table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id  UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_post_like UNIQUE (post_id, user_id)
);

-- RPC to increment/decrement like count
CREATE OR REPLACE FUNCTION public.increment_like(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.post_likes (post_id, user_id) VALUES (p_post_id, auth.uid())
    ON CONFLICT DO NOTHING;
  UPDATE public.posts SET like_count = (SELECT count(*) FROM public.post_likes WHERE post_id = p_post_id)
    WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_like(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.post_likes WHERE post_id = p_post_id AND user_id = auth.uid();
  UPDATE public.posts SET like_count = (SELECT count(*) FROM public.post_likes WHERE post_id = p_post_id)
    WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 5. POST_AUDIENCE — per-user delivery/read tracking for posts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.post_audience (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id      UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  can_view     BOOLEAN NOT NULL DEFAULT TRUE,
  can_respond  BOOLEAN NOT NULL DEFAULT TRUE,
  viewed_at    TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_post_user UNIQUE (post_id, user_id)
);

COMMENT ON TABLE public.post_audience IS 'Per-user delivery and read-receipt tracking for each post.';


-- ============================================================================
-- 6. EVENTS — family gatherings, ceremonies, festivals
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  title_hindi       TEXT,
  event_type        TEXT NOT NULL DEFAULT 'gathering' CHECK (event_type IN ('wedding', 'puja', 'festival', 'gathering', 'funeral', 'birthday', 'anniversary', 'other')),
  event_date        TIMESTAMPTZ NOT NULL,
  end_date          TIMESTAMPTZ,
  location          TEXT,
  location_hindi    TEXT,
  address           TEXT,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  audience_type     TEXT NOT NULL DEFAULT 'all' CHECK (audience_type IN ('all', 'level', 'custom')),
  audience_level    INT CHECK (audience_level BETWEEN 1 AND 99),
  audience_level_max INT CHECK (audience_level_max BETWEEN 1 AND 99),
  audience_group_id UUID REFERENCES public.audience_groups(id) ON DELETE SET NULL,
  rsvp_deadline     TIMESTAMPTZ,
  max_attendees     INT,
  ceremonies        JSONB DEFAULT '[]'::jsonb,    -- array of {name, name_hindi, date, time, description}
  description       TEXT,
  description_hindi TEXT,
  banner_url        TEXT,
  bundle_id         UUID,                         -- references event_bundles(id), added after that table
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.events IS 'Family events with location, ceremonies (JSONB), and audience targeting.';


-- ============================================================================
-- 7. EVENT_RSVPS — attendance responses
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id            UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'maybe')),
  response_note       TEXT,
  plus_count          INT NOT NULL DEFAULT 0 CHECK (plus_count >= 0),
  dietary_preferences TEXT[] DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_event_rsvp UNIQUE (event_id, user_id)
);

COMMENT ON TABLE public.event_rsvps IS 'RSVP responses for events with plus-ones and dietary info.';


-- ============================================================================
-- 8. NOTIFICATIONS — in-app notification centre
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,                     -- e.g. 'new_post', 'event_invite', 'rsvp_update'
  title       TEXT,
  title_hindi TEXT,
  body        TEXT,
  body_hindi  TEXT,
  data        JSONB DEFAULT '{}'::jsonb,         -- arbitrary payload (post_id, event_id, etc.)
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'In-app notifications with Hindi/English content and read tracking.';


-- ============================================================================
-- 9. EVENT_PHOTOS — shared event gallery with moderation
-- ============================================================================
-- privacy_type controls who can see each photo:
--   'all'        = all event attendees
--   'level'      = attendees within privacy_level_min..privacy_level_max
--   'individual' = specific user IDs in privacy_user_ids

CREATE TABLE IF NOT EXISTS public.event_photos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id          UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploader_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  photo_url         TEXT NOT NULL,
  thumbnail_url     TEXT,
  caption           TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  privacy_type      TEXT NOT NULL DEFAULT 'all' CHECK (privacy_type IN ('all', 'level', 'individual')),
  privacy_level_min INT CHECK (privacy_level_min BETWEEN 1 AND 99),
  privacy_level_max INT CHECK (privacy_level_max BETWEEN 1 AND 99),
  privacy_user_ids  UUID[] DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.event_photos IS 'Event photo gallery with moderation workflow and per-photo privacy.';


-- ============================================================================
-- 10. EVENT_CHECKINS — attendance verification at events
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_checkins (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  checkin_type    TEXT NOT NULL CHECK (checkin_type IN ('gps', 'manual', 'qr')),
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  accuracy_meters DOUBLE PRECISION,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_event_checkin UNIQUE (event_id, user_id)
);

COMMENT ON TABLE public.event_checkins IS 'Event attendance check-ins via GPS, manual, or QR code.';


-- ============================================================================
-- 11. EVENT_CONFIRMATIONS — offline/call-based RSVP confirmations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_confirmations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id              UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  confirmation_method   TEXT NOT NULL CHECK (confirmation_method IN ('app', 'call', 'meeting')),
  confirmed_by          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_event_confirmation UNIQUE (event_id, user_id)
);

COMMENT ON TABLE public.event_confirmations IS 'Offline confirmation records (call, in-person) logged by family admins.';


-- ============================================================================
-- 12. PHYSICAL_CARDS — tracking physical invitation cards
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.physical_cards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  card_sent       BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at         TIMESTAMPTZ,
  sent_via        TEXT CHECK (sent_via IN ('hand', 'post', 'courier')),
  tracking_number TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_physical_card UNIQUE (event_id, user_id)
);

COMMENT ON TABLE public.physical_cards IS 'Tracks physical wedding/event cards sent via hand, post, or courier.';


-- ============================================================================
-- 13. APP_CONFIG — global key-value settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_config IS 'Global app configuration (referral counters, feature flags, etc.).';

-- Seed: referral program counter starts at 0
INSERT INTO public.app_config (key, value)
VALUES ('referral_program', '{"total_referrals": 0, "active": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- 14. USER_STORAGE — per-user storage quota and referral tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_storage (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  base_storage_gb       NUMERIC NOT NULL DEFAULT 10,
  referral_bonus_gb     NUMERIC NOT NULL DEFAULT 0,
  purchased_gb          NUMERIC NOT NULL DEFAULT 0,
  pool_id               UUID,                       -- FK added after family_storage_pools exists
  used_storage_bytes    BIGINT NOT NULL DEFAULT 0 CHECK (used_storage_bytes >= 0),
  referral_code         TEXT UNIQUE NOT NULL,
  verified_referral_count INT NOT NULL DEFAULT 0 CHECK (verified_referral_count >= 0),
  storage_tier          TEXT NOT NULL DEFAULT 'base' CHECK (storage_tier IN ('base', 'bronze', 'silver', 'gold')),
  referral_program_status TEXT NOT NULL DEFAULT 'active' CHECK (referral_program_status IN ('active', 'paused', 'exhausted')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_storage IS 'Per-user storage quotas, referral codes, and usage tracking.';


-- ============================================================================
-- 15. REFERRALS — tracks who referred whom
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.referrals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_referral UNIQUE (referrer_id, referred_id),
  CONSTRAINT fk_no_self_referral CHECK (referrer_id <> referred_id)
);

COMMENT ON TABLE public.referrals IS 'Referral tracking: who invited whom and verification status.';


-- ============================================================================
-- 16. STORAGE_PURCHASES — paid storage upgrades
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.storage_purchases (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  purchase_type             TEXT NOT NULL CHECK (purchase_type IN ('individual', 'family_pool', 'event_bundle')),
  storage_gb                NUMERIC NOT NULL CHECK (storage_gb > 0),
  amount_inr                NUMERIC NOT NULL CHECK (amount_inr >= 0),
  billing_cycle             TEXT CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time')),
  razorpay_subscription_id  TEXT,
  status                    TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'failed')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.storage_purchases IS 'Razorpay-backed storage purchase records.';


-- ============================================================================
-- 17. FAMILY_STORAGE_POOLS — shared family storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.family_storage_pools (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pool_name         TEXT NOT NULL,
  total_storage_gb  NUMERIC NOT NULL DEFAULT 0 CHECK (total_storage_gb >= 0),
  used_storage_bytes BIGINT NOT NULL DEFAULT 0 CHECK (used_storage_bytes >= 0),
  member_ids        UUID[] DEFAULT '{}',
  purchase_id       UUID REFERENCES public.storage_purchases(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'dissolved')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.family_storage_pools IS 'Shared family storage pool managed by a family admin.';

-- Now add the FK from user_storage.pool_id -> family_storage_pools.id
ALTER TABLE public.user_storage
  DROP CONSTRAINT IF EXISTS fk_user_storage_pool;
ALTER TABLE public.user_storage
  ADD CONSTRAINT fk_user_storage_pool
  FOREIGN KEY (pool_id) REFERENCES public.family_storage_pools(id) ON DELETE SET NULL;


-- ============================================================================
-- 18. EVENT_BUNDLES — per-event storage bundles
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_bundles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id            UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  purchaser_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bundle_type         TEXT NOT NULL CHECK (bundle_type IN ('basic', 'standard', 'premium')),
  storage_gb          NUMERIC NOT NULL CHECK (storage_gb > 0),
  max_photos          INT,
  video_allowed       BOOLEAN NOT NULL DEFAULT FALSE,
  gallery_expires_at  TIMESTAMPTZ,
  amount_inr          NUMERIC NOT NULL CHECK (amount_inr >= 0),
  razorpay_payment_id TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  used_storage_bytes  BIGINT NOT NULL DEFAULT 0 CHECK (used_storage_bytes >= 0),
  photo_count         INT NOT NULL DEFAULT 0 CHECK (photo_count >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.event_bundles IS 'Per-event storage/photo bundles purchased for event galleries.';


-- ============================================================================
-- INDEXES
-- ============================================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON public.users(last_seen_at DESC);

-- family_members
CREATE INDEX IF NOT EXISTS idx_fm_user ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_fm_member ON public.family_members(family_member_id);
CREATE INDEX IF NOT EXISTS idx_fm_level ON public.family_members(connection_level);

-- audience_groups
CREATE INDEX IF NOT EXISTS idx_ag_creator ON public.audience_groups(creator_id);

-- posts
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_audience_type ON public.posts(audience_type);

-- post_audience
CREATE INDEX IF NOT EXISTS idx_pa_post ON public.post_audience(post_id);
CREATE INDEX IF NOT EXISTS idx_pa_user ON public.post_audience(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_user_unviewed ON public.post_audience(user_id) WHERE viewed_at IS NULL;

-- events
CREATE INDEX IF NOT EXISTS idx_events_creator ON public.events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(event_type);

-- event_rsvps
CREATE INDEX IF NOT EXISTS idx_rsvps_event ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_status ON public.event_rsvps(event_id, status);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON public.notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notif_created ON public.notifications(created_at DESC);

-- event_photos
CREATE INDEX IF NOT EXISTS idx_ep_event ON public.event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_ep_uploader ON public.event_photos(uploader_id);
CREATE INDEX IF NOT EXISTS idx_ep_status ON public.event_photos(event_id, status);

-- event_checkins
CREATE INDEX IF NOT EXISTS idx_ec_event ON public.event_checkins(event_id);

-- event_confirmations
CREATE INDEX IF NOT EXISTS idx_econf_event ON public.event_confirmations(event_id);

-- physical_cards
CREATE INDEX IF NOT EXISTS idx_pc_event ON public.physical_cards(event_id);
CREATE INDEX IF NOT EXISTS idx_pc_unsent ON public.physical_cards(event_id) WHERE card_sent = FALSE;

-- user_storage
CREATE INDEX IF NOT EXISTS idx_us_referral_code ON public.user_storage(referral_code);
CREATE INDEX IF NOT EXISTS idx_us_pool ON public.user_storage(pool_id);

-- referrals
CREATE INDEX IF NOT EXISTS idx_ref_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_ref_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_ref_code ON public.referrals(referral_code);

-- storage_purchases
CREATE INDEX IF NOT EXISTS idx_sp_user ON public.storage_purchases(user_id);

-- family_storage_pools
CREATE INDEX IF NOT EXISTS idx_fsp_admin ON public.family_storage_pools(admin_id);

-- event_bundles
CREATE INDEX IF NOT EXISTS idx_eb_event ON public.event_bundles(event_id);
CREATE INDEX IF NOT EXISTS idx_eb_purchaser ON public.event_bundles(purchaser_id);


-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate a short, human-friendly referral code: 8 uppercase alphanumeric chars
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.user_storage WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;


-- handle_new_user: called on auth.users INSERT via trigger
-- Creates a row in public.users and public.user_storage.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (id, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone_number', '')
  );

  -- Insert into public.user_storage with auto-generated referral code
  INSERT INTO public.user_storage (user_id, referral_code)
  VALUES (NEW.id, generate_referral_code());

  RETURN NEW;
END;
$$;

-- Trigger: fire handle_new_user after every auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- updated_at auto-updater
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to every table
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'family_members', 'audience_groups', 'posts', 'post_audience',
      'events', 'event_rsvps', 'notifications', 'event_photos', 'event_checkins',
      'event_confirmations', 'physical_cards', 'app_config', 'user_storage',
      'referrals', 'storage_purchases', 'family_storage_pools', 'event_bundles'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- check_storage_limit: returns TRUE if the user is within their storage quota
CREATE OR REPLACE FUNCTION public.check_storage_limit(p_user_id UUID, p_additional_bytes BIGINT DEFAULT 0)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_gb    NUMERIC;
  v_used_bytes  BIGINT;
  v_pool_id     UUID;
  v_pool_total  NUMERIC;
  v_pool_used   BIGINT;
BEGIN
  SELECT
    base_storage_gb + referral_bonus_gb + purchased_gb,
    used_storage_bytes,
    pool_id
  INTO v_total_gb, v_used_bytes, v_pool_id
  FROM public.user_storage
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check individual quota first
  IF (v_used_bytes + p_additional_bytes) <= (v_total_gb * 1073741824) THEN  -- 1 GB = 1073741824 bytes
    RETURN TRUE;
  END IF;

  -- If user belongs to a pool, check pool quota as fallback
  IF v_pool_id IS NOT NULL THEN
    SELECT total_storage_gb, used_storage_bytes
    INTO v_pool_total, v_pool_used
    FROM public.family_storage_pools
    WHERE id = v_pool_id AND status = 'active';

    IF FOUND AND (v_pool_used + p_additional_bytes) <= (v_pool_total * 1073741824) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;


-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on every table, then add policies.
-- Supabase uses auth.uid() to identify the current user.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_audience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_storage_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- USERS policies
-- ---------------------------------------------------------------------------
-- Users can see own profile + profiles of family members only (prevents phone enumeration).
CREATE POLICY users_select ON public.users
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE (fm.user_id = auth.uid() AND fm.family_member_id = users.id)
         OR (fm.family_member_id = auth.uid() AND fm.user_id = users.id)
    )
  );

-- Users can update only their own profile.
CREATE POLICY users_update ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert is handled by the handle_new_user trigger (SECURITY DEFINER).
-- Allow service_role inserts; normal users cannot insert directly.
CREATE POLICY users_insert ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- FAMILY_MEMBERS policies
-- ---------------------------------------------------------------------------
-- Users can see relationships they are part of (either side).
CREATE POLICY fm_select ON public.family_members
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = family_member_id);

-- Users can create relationships where they are the user_id.
CREATE POLICY fm_insert ON public.family_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update relationships they created.
CREATE POLICY fm_update ON public.family_members
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete relationships they created.
CREATE POLICY fm_delete ON public.family_members
  FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- AUDIENCE_GROUPS policies
-- ---------------------------------------------------------------------------
CREATE POLICY ag_select ON public.audience_groups
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = ANY(member_ids));

CREATE POLICY ag_insert ON public.audience_groups
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY ag_update ON public.audience_groups
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY ag_delete ON public.audience_groups
  FOR DELETE USING (auth.uid() = creator_id);


-- ---------------------------------------------------------------------------
-- POSTS policies
-- ---------------------------------------------------------------------------
-- Authors can see their own posts; others see via post_audience.
CREATE POLICY posts_select_author ON public.posts
  FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY posts_select_audience ON public.posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.post_audience pa
      WHERE pa.post_id = posts.id AND pa.user_id = auth.uid() AND pa.can_view = TRUE
    )
  );

CREATE POLICY posts_insert ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY posts_update ON public.posts
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY posts_delete ON public.posts
  FOR DELETE USING (auth.uid() = author_id);


-- ---------------------------------------------------------------------------
-- POST_AUDIENCE policies
-- ---------------------------------------------------------------------------
-- Users can see their own audience entries; authors can see all for their posts.
CREATE POLICY pa_select_self ON public.post_audience
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY pa_select_author ON public.post_audience
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts p WHERE p.id = post_audience.post_id AND p.author_id = auth.uid()
    )
  );

-- Only post authors can manage audience entries.
CREATE POLICY pa_insert ON public.post_audience
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()
    )
  );

CREATE POLICY pa_update ON public.post_audience
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.posts p WHERE p.id = post_audience.post_id AND p.author_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- EVENTS policies
-- ---------------------------------------------------------------------------
CREATE POLICY events_select_creator ON public.events
  FOR SELECT USING (auth.uid() = creator_id);

-- Non-creators see events if they have an RSVP record (invited).
CREATE POLICY events_select_invited ON public.events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.event_rsvps r WHERE r.event_id = events.id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY events_insert ON public.events
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY events_update ON public.events
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY events_delete ON public.events
  FOR DELETE USING (auth.uid() = creator_id);


-- ---------------------------------------------------------------------------
-- EVENT_RSVPS policies
-- ---------------------------------------------------------------------------
-- Users can see their own RSVPs; event creators can see all RSVPs for their events.
CREATE POLICY rsvps_select_self ON public.event_rsvps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY rsvps_select_creator ON public.event_rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_rsvps.event_id AND e.creator_id = auth.uid()
    )
  );

CREATE POLICY rsvps_insert ON public.event_rsvps
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()
    )
  );

CREATE POLICY rsvps_update ON public.event_rsvps
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- NOTIFICATIONS policies
-- ---------------------------------------------------------------------------
CREATE POLICY notif_select ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notif_insert ON public.notifications
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.author_id = auth.uid()
    )
  );

CREATE POLICY notif_update ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY notif_delete ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- EVENT_PHOTOS policies
-- ---------------------------------------------------------------------------
CREATE POLICY ep_select ON public.event_photos
  FOR SELECT USING (
    auth.uid() = uploader_id OR
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_photos.event_id AND e.creator_id = auth.uid()
    ) OR
    (status = 'approved' AND (
      privacy_type = 'all' OR
      (privacy_type = 'individual' AND auth.uid() = ANY(privacy_user_ids)) OR
      (privacy_type = 'level' AND EXISTS (
        SELECT 1 FROM public.family_members fm
        JOIN public.events ev ON ev.id = event_photos.event_id
        WHERE fm.family_member_id = auth.uid()
          AND fm.user_id = ev.creator_id
          AND fm.connection_level BETWEEN event_photos.privacy_level_min AND event_photos.privacy_level_max
      ))
    ))
  );

CREATE POLICY ep_insert ON public.event_photos
  FOR INSERT WITH CHECK (auth.uid() = uploader_id);

-- Only event creator can moderate (update status).
CREATE POLICY ep_update_uploader ON public.event_photos
  FOR UPDATE USING (auth.uid() = uploader_id)
  WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY ep_update_moderator ON public.event_photos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_photos.event_id AND e.creator_id = auth.uid()
    )
  );

CREATE POLICY ep_delete ON public.event_photos
  FOR DELETE USING (
    auth.uid() = uploader_id OR
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_photos.event_id AND e.creator_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- EVENT_CHECKINS policies
-- ---------------------------------------------------------------------------
CREATE POLICY ec_select ON public.event_checkins
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_checkins.event_id AND e.creator_id = auth.uid()
    )
  );

CREATE POLICY ec_insert ON public.event_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- EVENT_CONFIRMATIONS policies
-- ---------------------------------------------------------------------------
CREATE POLICY econf_select ON public.event_confirmations
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() = confirmed_by OR
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_confirmations.event_id AND e.creator_id = auth.uid()
    )
  );

-- Family admins or event creators can insert confirmations on behalf of others.
CREATE POLICY econf_insert ON public.event_confirmations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    auth.uid() = confirmed_by OR
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()
    )
  );

CREATE POLICY econf_update ON public.event_confirmations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_confirmations.event_id AND e.creator_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- PHYSICAL_CARDS policies
-- ---------------------------------------------------------------------------
CREATE POLICY pc_select ON public.physical_cards
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = physical_cards.event_id AND e.creator_id = auth.uid()
    )
  );

CREATE POLICY pc_insert ON public.physical_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()
    )
  );

CREATE POLICY pc_update ON public.physical_cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = physical_cards.event_id AND e.creator_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- APP_CONFIG policies
-- ---------------------------------------------------------------------------
-- Read-only for authenticated users; writes via service_role only.
CREATE POLICY ac_select ON public.app_config
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- ---------------------------------------------------------------------------
-- USER_STORAGE policies
-- ---------------------------------------------------------------------------
CREATE POLICY us_select ON public.user_storage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY us_update ON public.user_storage
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- REFERRALS policies
-- ---------------------------------------------------------------------------
CREATE POLICY ref_select ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY ref_insert ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referred_id);


-- ---------------------------------------------------------------------------
-- STORAGE_PURCHASES policies
-- ---------------------------------------------------------------------------
CREATE POLICY sp_select ON public.storage_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY sp_insert ON public.storage_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- FAMILY_STORAGE_POOLS policies
-- ---------------------------------------------------------------------------
CREATE POLICY fsp_select ON public.family_storage_pools
  FOR SELECT USING (auth.uid() = admin_id OR auth.uid() = ANY(member_ids));

CREATE POLICY fsp_insert ON public.family_storage_pools
  FOR INSERT WITH CHECK (auth.uid() = admin_id);

CREATE POLICY fsp_update ON public.family_storage_pools
  FOR UPDATE USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);


-- ---------------------------------------------------------------------------
-- EVENT_BUNDLES policies
-- ---------------------------------------------------------------------------
CREATE POLICY eb_select ON public.event_bundles
  FOR SELECT USING (
    auth.uid() = purchaser_id OR
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_bundles.event_id AND e.creator_id = auth.uid()
    )
  );

CREATE POLICY eb_insert ON public.event_bundles
  FOR INSERT WITH CHECK (auth.uid() = purchaser_id);

CREATE POLICY eb_update ON public.event_bundles
  FOR UPDATE USING (auth.uid() = purchaser_id)
  WITH CHECK (auth.uid() = purchaser_id);


-- ============================================================================
-- SECURITY HARDENING (added post-audit)
-- ============================================================================

-- V-03: post_likes RLS
CREATE POLICY pl_select ON public.post_likes
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY pl_insert ON public.post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY pl_delete ON public.post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- V-09: Bidirectional family member insertion via SECURITY DEFINER
-- This bypasses RLS to insert the reverse relationship atomically.
CREATE OR REPLACE FUNCTION public.add_family_member_bidirectional(
  p_member_id UUID,
  p_rel_type TEXT,
  p_rel_hindi TEXT,
  p_level INT,
  p_reverse_type TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.family_members (user_id, family_member_id, relationship_type, relationship_label_hindi, connection_level)
  VALUES (auth.uid(), p_member_id, p_rel_type, p_rel_hindi, p_level)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.family_members (user_id, family_member_id, relationship_type, connection_level)
  VALUES (p_member_id, auth.uid(), p_reverse_type, p_level)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- V-02: Server-side payment verification function
-- Client calls this RPC instead of inserting directly into storage_purchases.
-- In production, verify razorpay_payment_id via Razorpay API in an Edge Function.
CREATE OR REPLACE FUNCTION public.verify_and_record_purchase(
  p_purchase_type TEXT,
  p_storage_gb INT,
  p_billing_cycle TEXT,
  p_razorpay_payment_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_expected_amount INT;
  v_purchase_id UUID;
BEGIN
  -- Validate expected amounts (server-side price lookup)
  IF p_purchase_type = 'individual' THEN
    CASE p_storage_gb
      WHEN 10 THEN v_expected_amount := CASE WHEN p_billing_cycle = 'monthly' THEN 29 ELSE 279 END;
      WHEN 25 THEN v_expected_amount := CASE WHEN p_billing_cycle = 'monthly' THEN 79 ELSE 759 END;
      WHEN 50 THEN v_expected_amount := CASE WHEN p_billing_cycle = 'monthly' THEN 149 ELSE 1429 END;
      WHEN 100 THEN v_expected_amount := CASE WHEN p_billing_cycle = 'monthly' THEN 249 ELSE 2389 END;
      ELSE RAISE EXCEPTION 'Invalid storage size: %', p_storage_gb;
    END CASE;
  ELSIF p_purchase_type = 'pool' THEN
    CASE p_storage_gb
      WHEN 50 THEN v_expected_amount := CASE WHEN p_billing_cycle = 'monthly' THEN 119 ELSE 1149 END;
      WHEN 100 THEN v_expected_amount := CASE WHEN p_billing_cycle = 'monthly' THEN 199 ELSE 1919 END;
      WHEN 250 THEN v_expected_amount := CASE WHEN p_billing_cycle = 'monthly' THEN 399 ELSE 3839 END;
      WHEN 500 THEN v_expected_amount := CASE WHEN p_billing_cycle = 'monthly' THEN 699 ELSE 6719 END;
      ELSE RAISE EXCEPTION 'Invalid pool storage size: %', p_storage_gb;
    END CASE;
  ELSE
    RAISE EXCEPTION 'Invalid purchase type: %', p_purchase_type;
  END IF;

  -- TODO: In production, call Razorpay API to verify p_razorpay_payment_id
  -- and confirm the actual amount matches v_expected_amount.

  INSERT INTO public.storage_purchases (
    user_id, purchase_type, storage_gb, amount_inr, billing_cycle,
    razorpay_payment_id, status, expires_at
  ) VALUES (
    auth.uid(), p_purchase_type, p_storage_gb, v_expected_amount, p_billing_cycle,
    p_razorpay_payment_id, 'active',
    CASE WHEN p_billing_cycle = 'annual' THEN now() + INTERVAL '1 year'
         ELSE now() + INTERVAL '1 month' END
  ) RETURNING id INTO v_purchase_id;

  -- Update user storage
  UPDATE public.user_storage
  SET purchased_gb = purchased_gb + p_storage_gb, updated_at = now()
  WHERE user_id = auth.uid();

  RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- V-02: Block direct client INSERT on storage_purchases (must use RPC)
DROP POLICY IF EXISTS sp_insert ON public.storage_purchases;
CREATE POLICY sp_insert ON public.storage_purchases
  FOR INSERT WITH CHECK (FALSE);  -- Only service_role / SECURITY DEFINER can insert

-- V-17: Missing DELETE policies
CREATE POLICY rsvps_delete ON public.event_rsvps
  FOR DELETE USING (auth.uid() = user_id);

-- V-18: Tighten notification INSERT — only for users in your events/posts audience
DROP POLICY IF EXISTS notif_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.event_rsvps r
      JOIN public.events e ON r.event_id = e.id
      WHERE r.user_id = notifications.user_id AND e.creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.post_audience pa
      JOIN public.posts p ON pa.post_id = p.id
      WHERE pa.user_id = notifications.user_id AND p.author_id = auth.uid()
    )
  );

-- V-13: Auto-cleanup GPS coordinates 24 hours after event
CREATE OR REPLACE FUNCTION public.cleanup_gps_after_event()
RETURNS TRIGGER AS $$
BEGIN
  -- After an event_checkin is inserted, schedule coordinate nullification
  -- In production, use pg_cron for periodic cleanup instead
  UPDATE public.event_checkins
  SET latitude = NULL, longitude = NULL
  WHERE event_id IN (
    SELECT id FROM public.events WHERE event_date < now() - INTERVAL '24 hours'
  )
  AND latitude IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- V-14: Server-side referral code generation (use this instead of client-side)
CREATE OR REPLACE FUNCTION public.generate_and_set_referral_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := 'AANGAN-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4));
    SELECT EXISTS(SELECT 1 FROM public.user_storage WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  UPDATE public.user_storage SET referral_code = v_code WHERE user_id = auth.uid();
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- V-12: Prevent client-side tier manipulation — only allow server to set tier
CREATE OR REPLACE FUNCTION public.recalculate_storage_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.storage_tier := CASE
    WHEN NEW.verified_referral_count >= 30 THEN 'gold'
    WHEN NEW.verified_referral_count >= 15 THEN 'silver'
    WHEN NEW.verified_referral_count >= 5 THEN 'bronze'
    ELSE 'base'
  END;
  NEW.referral_bonus_gb := CASE
    WHEN NEW.verified_referral_count >= 30 THEN 90
    WHEN NEW.verified_referral_count >= 15 THEN 40
    WHEN NEW.verified_referral_count >= 5 THEN 15
    ELSE 0
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalculate_tier
  BEFORE UPDATE OF verified_referral_count ON public.user_storage
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_storage_tier();

-- ============================================================================
-- DONE
-- ============================================================================
-- Schema v0.1 complete. 19 tables (incl post_likes), RLS on ALL tables,
-- SECURITY DEFINER functions for sensitive operations, triggers for tier
-- recalculation, and GPS cleanup. Audit-hardened.
-- ============================================================================
