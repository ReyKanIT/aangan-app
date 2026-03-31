-- ============================================================================
-- AANGAN FAMILY SOCIAL NETWORK - SUPABASE SQL SCHEMA
-- ============================================================================
--
-- This schema defines the complete database structure for Aangan, a family
-- social network platform designed for Indian families.
--
-- Core Features:
--   - Family tree with layered connections (Level 1, 2, 3)
--   - Phone/OTP-based authentication (Indian phone numbers)
--   - Posts with granular audience control
--   - Events management with RSVP functionality
--   - Real-time notifications
--   - Audience groups for reusable access control
--
-- Security:
--   - Row Level Security (RLS) enabled on all tables
--   - Auth integration with Supabase auth.users
--   - Trigger-based profile sync
--   - Audit timestamps on all tables
--
-- Column naming convention:
--   - Posts use author_id (matches app TypeScript types)
--   - Events use creator_id (matches app TypeScript types)
--   - Family members use family_member_id / connection_level / relationship_type
--
-- Created: 2026-03-30
-- Updated: 2026-03-31 — aligned column names with app code
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- 1. USERS / PROFILES TABLE
-- ============================================================================
-- Extends Supabase auth.users with family-specific fields
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    phone_number TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    display_name_hindi TEXT, -- Support for Hindi display names
    email TEXT,
    profile_photo_url TEXT,
    bio TEXT,
    village TEXT, -- Village/city information
    state TEXT, -- State for geographical organization
    country TEXT DEFAULT 'India',
    family_level INTEGER DEFAULT 1, -- 1=Direct, 2=Close, 3=Extended
    family_id UUID, -- Reference to main family group (can be NULL for now)
    is_family_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on phone number for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_family_level ON public.users(family_level);
CREATE INDEX IF NOT EXISTS idx_users_village ON public.users(village);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see all other users (family members visible by default)
CREATE POLICY "Users can view all family members" ON public.users
    FOR SELECT USING (TRUE);

-- RLS Policy: Users can only update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- RLS Policy: Users can only insert their own profile
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger: Automatically create user profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, phone_number, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.phone,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.phone)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 2. FAMILY MEMBERS TABLE
-- ============================================================================
-- Represents relationships between users (family connections)
-- Column names match app TypeScript types (FamilyMember interface)
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    family_member_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL, -- 'पिता', 'माता', 'भाई', 'बहन', etc.
    relationship_label_hindi TEXT, -- Human-readable Hindi label
    connection_level INTEGER NOT NULL, -- 1=Direct, 2=Close, 3=Extended (up to 99)
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_family_relationship UNIQUE (user_id, family_member_id),
    CONSTRAINT no_self_relationship CHECK (user_id != family_member_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_member_id ON public.family_members(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_members_connection_level ON public.family_members(connection_level);
CREATE INDEX IF NOT EXISTS idx_family_members_is_verified ON public.family_members(is_verified);

-- Enable RLS on family_members
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own family connections
CREATE POLICY "Users can view their family members" ON public.family_members
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = family_member_id);

-- RLS Policy: Users can insert family connections
CREATE POLICY "Users can add family members" ON public.family_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their confirmed relationships
CREATE POLICY "Users can update family relationships" ON public.family_members
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = family_member_id)
    WITH CHECK (auth.uid() = user_id OR auth.uid() = family_member_id);

-- RLS Policy: Users can delete their own family connections
CREATE POLICY "Users can delete family members" ON public.family_members
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = family_member_id);

-- Trigger: Update updated_at
CREATE TRIGGER trigger_family_members_updated_at
    BEFORE UPDATE ON public.family_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ATOMIC BIDIRECTIONAL FAMILY MEMBER INSERT
-- ============================================================================
-- Used by familyStore.addMember to atomically insert both directions
CREATE OR REPLACE FUNCTION public.add_family_member_bidirectional(
    p_member_id UUID,
    p_rel_type TEXT,
    p_rel_hindi TEXT,
    p_level INTEGER,
    p_reverse_type TEXT
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.family_members (user_id, family_member_id, relationship_type, relationship_label_hindi, connection_level)
    VALUES (auth.uid(), p_member_id, p_rel_type, p_rel_hindi, p_level)
    ON CONFLICT (user_id, family_member_id) DO UPDATE
    SET relationship_type = EXCLUDED.relationship_type,
        relationship_label_hindi = EXCLUDED.relationship_label_hindi,
        connection_level = EXCLUDED.connection_level,
        updated_at = NOW();

    INSERT INTO public.family_members (user_id, family_member_id, relationship_type, relationship_label_hindi, connection_level)
    VALUES (p_member_id, auth.uid(), p_reverse_type, NULL, p_level)
    ON CONFLICT (user_id, family_member_id) DO UPDATE
    SET relationship_type = EXCLUDED.relationship_type,
        connection_level = EXCLUDED.connection_level,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ATOMIC BIDIRECTIONAL FAMILY MEMBER DELETE
-- ============================================================================
-- Used by familyStore.removeMember to atomically remove both directions
CREATE OR REPLACE FUNCTION public.remove_family_member_bidirectional(
    p_member_id UUID
)
RETURNS void AS $$
BEGIN
    DELETE FROM public.family_members
    WHERE (user_id = auth.uid() AND family_member_id = p_member_id)
       OR (user_id = p_member_id AND family_member_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. AUDIENCE GROUPS TABLE
-- ============================================================================
-- Predefined audience groups for easy content sharing
CREATE TABLE IF NOT EXISTS public.audience_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_hindi TEXT,
    group_type TEXT NOT NULL DEFAULT 'custom', -- 'custom', 'level_based'
    family_level INTEGER, -- For level-based groups
    member_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_creator_group_name UNIQUE (creator_id, name)
);

CREATE INDEX IF NOT EXISTS idx_audience_groups_creator_id ON public.audience_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_audience_groups_group_type ON public.audience_groups(group_type);

-- Enable RLS
ALTER TABLE public.audience_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own audience groups
CREATE POLICY "Users can view own audience groups" ON public.audience_groups
    FOR SELECT USING (auth.uid() = creator_id);

-- RLS Policy: Users can manage their own audience groups
CREATE POLICY "Users can manage own audience groups" ON public.audience_groups
    FOR ALL USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

-- Trigger: Update updated_at
CREATE TRIGGER trigger_audience_groups_updated_at
    BEFORE UPDATE ON public.audience_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 4. POSTS TABLE
-- ============================================================================
-- User-generated posts (text, photos, videos)
-- Uses author_id to match app TypeScript types (Post interface)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT,
    media_urls TEXT[] DEFAULT '{}',
    post_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'photo', 'video', 'document'
    audience_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'level', 'custom'
    audience_level INTEGER, -- For level-based audience
    audience_level_max INTEGER,
    audience_group_id UUID REFERENCES public.audience_groups(id) ON DELETE SET NULL,
    delivery_status TEXT DEFAULT 'sent',
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_audience_type ON public.posts(audience_type);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Posts are visible based on audience_type or post_audience rules
CREATE POLICY "Posts visible to authorized users" ON public.posts
    FOR SELECT USING (
        author_id = auth.uid() OR
        audience_type = 'all' OR
        EXISTS (
            SELECT 1 FROM public.post_audience
            WHERE post_id = posts.id
            AND (user_id = auth.uid() OR audience_group_id IN (
                SELECT id FROM public.audience_groups WHERE creator_id = posts.author_id
            ))
        )
    );

-- RLS Policy: Users can only create their own posts
CREATE POLICY "Users can create own posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);

-- RLS Policy: Users can only update/delete their own posts
CREATE POLICY "Users can update own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts" ON public.posts
    FOR DELETE USING (auth.uid() = author_id);

-- Trigger: Update updated_at
CREATE TRIGGER trigger_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 5. POST AUDIENCE TABLE
-- ============================================================================
-- Controls who can view each post
CREATE TABLE IF NOT EXISTS public.post_audience (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    audience_group_id UUID REFERENCES public.audience_groups(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT TRUE,
    can_respond BOOLEAN DEFAULT TRUE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_audience_post_id ON public.post_audience(post_id);
CREATE INDEX IF NOT EXISTS idx_post_audience_user_id ON public.post_audience(user_id);
CREATE INDEX IF NOT EXISTS idx_post_audience_audience_group_id ON public.post_audience(audience_group_id);

-- Enable RLS
ALTER TABLE public.post_audience ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only post creator can modify audience
CREATE POLICY "Post creator manages audience" ON public.post_audience
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.posts WHERE posts.id = post_audience.post_id AND posts.author_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts WHERE posts.id = post_audience.post_id AND posts.author_id = auth.uid()
        )
    );

-- RLS Policy: Authorized viewers can read audience rules
CREATE POLICY "Viewers can see audience rules" ON public.post_audience
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.posts WHERE posts.id = post_audience.post_id AND posts.author_id = auth.uid()
        ) OR
        user_id = auth.uid()
    );

-- ============================================================================
-- 6. EVENTS TABLE
-- ============================================================================
-- Family events (weddings, pujas, gatherings, etc.)
-- Uses creator_id to match app TypeScript types (AanganEvent interface)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_hindi TEXT,
    event_type TEXT NOT NULL, -- 'wedding', 'engagement', 'puja', 'birthday', etc.
    event_date TEXT NOT NULL, -- ISO date string
    end_date TEXT,
    location TEXT,
    location_hindi TEXT,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    audience_type TEXT NOT NULL DEFAULT 'all',
    audience_level INTEGER,
    audience_level_max INTEGER,
    audience_group_id UUID REFERENCES public.audience_groups(id) ON DELETE SET NULL,
    rsvp_deadline TEXT,
    max_attendees INTEGER,
    ceremonies JSONB DEFAULT '[]',
    description TEXT,
    description_hindi TEXT,
    banner_url TEXT,
    bundle_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_creator_id ON public.events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events(event_type);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Events visible to creator or invited users
CREATE POLICY "Events visible to authorized users" ON public.events
    FOR SELECT USING (
        creator_id = auth.uid() OR
        audience_type = 'all' OR
        EXISTS (
            SELECT 1 FROM public.event_rsvps
            WHERE event_id = events.id AND user_id = auth.uid()
        )
    );

-- RLS Policy: Users can create events
CREATE POLICY "Users can create events" ON public.events
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- RLS Policy: Event creator can update
CREATE POLICY "Event creator can update" ON public.events
    FOR UPDATE USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

-- RLS Policy: Event creator can delete
CREATE POLICY "Event creator can delete" ON public.events
    FOR DELETE USING (auth.uid() = creator_id);

-- Trigger: Update updated_at
CREATE TRIGGER trigger_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 7. EVENT RSVPS TABLE
-- ============================================================================
-- RSVP responses for events
-- Uses status values: 'pending', 'accepted', 'declined', 'maybe'
CREATE TABLE IF NOT EXISTS public.event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'maybe'
    response_note TEXT,
    plus_count INTEGER DEFAULT 0,
    dietary_preferences TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_event_rsvp UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON public.event_rsvps(status);

-- Enable RLS
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view RSVPs for events they're involved with
CREATE POLICY "Users can view event RSVPs" ON public.event_rsvps
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.events WHERE events.id = event_rsvps.event_id AND events.creator_id = auth.uid()
        )
    );

-- RLS Policy: Users can manage their own RSVP
CREATE POLICY "Users can manage own RSVP" ON public.event_rsvps
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger: Update updated_at
CREATE TRIGGER trigger_event_rsvps_updated_at
    BEFORE UPDATE ON public.event_rsvps
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 8. NOTIFICATIONS TABLE
-- ============================================================================
-- Real-time notifications for user activities
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'new_post', 'event_invite', 'rsvp_update', etc.
    title TEXT NOT NULL,
    title_hindi TEXT,
    body TEXT,
    body_hindi TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Only authenticated users can insert notifications for themselves
-- or via SECURITY DEFINER functions (send_notification)
CREATE POLICY "Authenticated users insert own notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger: No updated_at needed — notifications are append-only with read toggle

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. EVENT PHOTOS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    moderated_by UUID REFERENCES public.users(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    privacy_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'level', 'individual'
    privacy_level_min INTEGER DEFAULT 1,
    privacy_level_max INTEGER DEFAULT 99,
    privacy_user_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_uploader_id ON public.event_photos(uploader_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_status ON public.event_photos(status);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photos visible to event participants" ON public.event_photos
    FOR SELECT USING (
        uploader_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.events WHERE events.id = event_photos.event_id AND events.creator_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.event_rsvps WHERE event_rsvps.event_id = event_photos.event_id AND event_rsvps.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload photos" ON public.event_photos
    FOR INSERT WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Event creator or uploader can update photos" ON public.event_photos
    FOR UPDATE USING (
        uploader_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.events WHERE events.id = event_photos.event_id AND events.creator_id = auth.uid()
        )
    );

CREATE TRIGGER trigger_event_photos_updated_at
    BEFORE UPDATE ON public.event_photos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 10. EVENT CHECKINS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    checkin_type TEXT NOT NULL DEFAULT 'gps', -- 'gps', 'manual', 'qr'
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy_meters DECIMAL(8, 2),
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_user_id ON public.event_checkins(user_id);

ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checkins visible to event participants" ON public.event_checkins
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.events WHERE events.id = event_checkins.event_id AND events.creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can check in" ON public.event_checkins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 11. EVENT CONFIRMATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    confirmation_method TEXT NOT NULL, -- 'app', 'call', 'meeting'
    confirmed_by UUID REFERENCES public.users(id),
    notes TEXT,
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.event_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Confirmations visible to event creator" ON public.event_confirmations
    FOR SELECT USING (
        user_id = auth.uid() OR confirmed_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.events WHERE events.id = event_confirmations.event_id AND events.creator_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can insert confirmations" ON public.event_confirmations
    FOR INSERT WITH CHECK (auth.uid() = confirmed_by OR auth.uid() = user_id);

-- ============================================================================
-- 12. PHYSICAL CARDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.physical_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    card_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_via TEXT, -- 'hand', 'post', 'courier'
    tracking_number TEXT,
    CONSTRAINT unique_event_card UNIQUE (event_id, user_id)
);

ALTER TABLE public.physical_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cards visible to event creator" ON public.physical_cards
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.events WHERE events.id = physical_cards.event_id AND events.creator_id = auth.uid()
        )
    );

CREATE POLICY "Event creator can manage cards" ON public.physical_cards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events WHERE events.id = physical_cards.event_id AND events.creator_id = auth.uid()
        )
    );

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: User's family network (all connected members with relationship info)
CREATE OR REPLACE VIEW public.user_family_network AS
SELECT
    fm.user_id,
    fm.family_member_id,
    u.display_name,
    u.display_name_hindi,
    u.profile_photo_url,
    u.village,
    fm.relationship_type,
    fm.connection_level,
    fm.is_verified
FROM public.family_members fm
JOIN public.users u ON fm.family_member_id = u.id
WHERE fm.is_verified = TRUE
ORDER BY fm.connection_level, u.display_name;

-- View: User's upcoming events
CREATE OR REPLACE VIEW public.user_upcoming_events AS
SELECT
    e.id,
    e.title,
    e.title_hindi,
    e.description,
    e.event_type,
    e.event_date,
    e.location,
    u.display_name as created_by,
    COALESCE(rsvp.status, 'not_invited') as user_rsvp_status
FROM public.events e
JOIN public.users u ON e.creator_id = u.id
LEFT JOIN public.event_rsvps rsvp ON e.id = rsvp.event_id AND rsvp.user_id = auth.uid()
ORDER BY e.event_date;

-- View: User's unread notifications count
CREATE OR REPLACE VIEW public.user_notification_summary AS
SELECT
    user_id,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_count,
    MAX(created_at) as latest_notification_at
FROM public.notifications
GROUP BY user_id;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get all users at a specific family level for current user
CREATE OR REPLACE FUNCTION public.get_users_by_family_level(level_id INTEGER)
RETURNS TABLE (
    id UUID,
    display_name TEXT,
    display_name_hindi TEXT,
    profile_photo_url TEXT,
    village TEXT,
    relationship_type TEXT
) AS $$
SELECT
    u.id,
    u.display_name,
    u.display_name_hindi,
    u.profile_photo_url,
    u.village,
    fm.relationship_type
FROM public.family_members fm
JOIN public.users u ON fm.family_member_id = u.id
WHERE fm.user_id = auth.uid()
    AND fm.connection_level = level_id
    AND fm.is_verified = TRUE
ORDER BY u.display_name;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function: Create default audience groups for a user
CREATE OR REPLACE FUNCTION public.create_default_audience_groups(p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO public.audience_groups (creator_id, name, group_type, family_level)
    VALUES
        (p_user_id, 'Direct Family', 'level_based', 1),
        (p_user_id, 'Close Family', 'level_based', 2),
        (p_user_id, 'Extended Family', 'level_based', 3)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Send notification (SECURITY DEFINER — bypasses RLS INSERT restriction)
CREATE OR REPLACE FUNCTION public.send_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_title_hindi TEXT DEFAULT NULL,
    p_body_hindi TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        title_hindi,
        body,
        body_hindi,
        data
    )
    VALUES (
        p_user_id,
        p_type,
        p_title,
        p_title_hindi,
        p_body,
        p_body_hindi,
        p_data
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INITIALIZATION
-- ============================================================================

-- Grant minimal permissions to anon (unauthenticated) — SELECT only on users
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.users TO anon;

-- Authenticated users get full access (RLS enforces row-level restrictions)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Function permissions
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_by_family_level TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_family_member_bidirectional TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_family_member_bidirectional TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_audience_groups TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_notification TO service_role;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
