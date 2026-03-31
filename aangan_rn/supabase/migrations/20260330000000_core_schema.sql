-- ============================================================================
-- AANGAN CORE SCHEMA - V1
-- Migration: 20260330000000_core_schema
-- ============================================================================
-- Core tables: users, family_members, audience_groups, posts, post_audience,
-- events, event_rsvps, notifications + views + helper functions
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- 1. USERS / PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    phone_number TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    display_name_hindi TEXT,
    email TEXT,
    profile_photo_url TEXT,
    bio TEXT,
    village TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    family_level INTEGER DEFAULT 1,
    family_id UUID,
    is_family_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_family_level ON public.users(family_level);
CREATE INDEX IF NOT EXISTS idx_users_village ON public.users(village);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all family members" ON public.users
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create user profile on auth signup
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

-- Reusable updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. FAMILY MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    related_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,
    relationship_level INTEGER NOT NULL,
    confirmed BOOLEAN DEFAULT FALSE,
    confirmed_by_related_user BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_relationship UNIQUE (user_id, related_user_id),
    CONSTRAINT no_self_relationship CHECK (user_id != related_user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_related_user_id ON public.family_members(related_user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_relationship_level ON public.family_members(relationship_level);
CREATE INDEX IF NOT EXISTS idx_family_members_confirmed ON public.family_members(confirmed);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their family members" ON public.family_members
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = related_user_id);

CREATE POLICY "Users can add family members" ON public.family_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update family relationships" ON public.family_members
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = related_user_id)
    WITH CHECK (auth.uid() = user_id OR auth.uid() = related_user_id);

CREATE TRIGGER trigger_family_members_updated_at
    BEFORE UPDATE ON public.family_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 3. AUDIENCE GROUPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audience_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    group_type TEXT NOT NULL DEFAULT 'custom',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_group_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_audience_groups_user_id ON public.audience_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_audience_groups_group_type ON public.audience_groups(group_type);

ALTER TABLE public.audience_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audience groups" ON public.audience_groups
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own audience groups" ON public.audience_groups
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trigger_audience_groups_updated_at
    BEFORE UPDATE ON public.audience_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. POSTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    post_type TEXT NOT NULL DEFAULT 'text',
    media_urls TEXT[],
    media_captions TEXT[],
    tags TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON public.posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON public.posts USING GIN(tags);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts visible to authorized users" ON public.posts
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.post_audience
            WHERE post_id = posts.id
            AND (viewer_user_id = auth.uid() OR audience_group_id IN (
                SELECT id FROM public.audience_groups WHERE user_id = posts.user_id
            ))
        )
    );

CREATE POLICY "Users can create own posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trigger_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. POST AUDIENCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.post_audience (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    audience_group_id UUID REFERENCES public.audience_groups(id) ON DELETE CASCADE,
    viewer_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    audience_type TEXT NOT NULL DEFAULT 'group',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT audience_has_group_or_user CHECK (
        (audience_group_id IS NOT NULL AND viewer_user_id IS NULL) OR
        (audience_group_id IS NULL AND viewer_user_id IS NOT NULL) OR
        (audience_group_id IS NULL AND viewer_user_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_post_audience_post_id ON public.post_audience(post_id);
CREATE INDEX IF NOT EXISTS idx_post_audience_audience_group_id ON public.post_audience(audience_group_id);
CREATE INDEX IF NOT EXISTS idx_post_audience_viewer_user_id ON public.post_audience(viewer_user_id);
CREATE INDEX IF NOT EXISTS idx_post_audience_type ON public.post_audience(audience_type);

ALTER TABLE public.post_audience ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post creator manages audience" ON public.post_audience
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.posts WHERE posts.id = post_audience.post_id AND posts.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts WHERE posts.id = post_audience.post_id AND posts.user_id = auth.uid()
        )
    );

CREATE POLICY "Viewers can see audience rules" ON public.post_audience
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.posts WHERE posts.id = post_audience.post_id AND posts.user_id = auth.uid()
        ) OR
        viewer_user_id = auth.uid()
    );

-- ============================================================================
-- 6. EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    duration_hours INTEGER,
    location TEXT,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    media_urls TEXT[],
    status TEXT DEFAULT 'scheduled',
    max_attendees INTEGER,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_created_by_user_id ON public.events(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events visible to authorized users" ON public.events
    FOR SELECT USING (
        is_public = TRUE OR
        created_by_user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.event_rsvps
            WHERE event_id = events.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create events" ON public.events
    FOR INSERT WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Event creator can update" ON public.events
    FOR UPDATE USING (auth.uid() = created_by_user_id)
    WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Event creator can delete" ON public.events
    FOR DELETE USING (auth.uid() = created_by_user_id);

CREATE TRIGGER trigger_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. EVENT RSVPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    response TEXT NOT NULL DEFAULT 'invited',
    number_of_guests INTEGER DEFAULT 1,
    dietary_preferences TEXT,
    additional_notes TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_event_rsvp UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_response ON public.event_rsvps(response);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view event RSVPs" ON public.event_rsvps
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.events WHERE events.id = event_rsvps.event_id AND events.created_by_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own RSVP" ON public.event_rsvps
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trigger_event_rsvps_updated_at
    BEFORE UPDATE ON public.event_rsvps
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 8. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    triggered_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notification_type TEXT NOT NULL,
    related_entity_type TEXT,
    related_entity_id UUID,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_triggered_by_user_id ON public.notifications(triggered_by_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_notification_type ON public.notifications(notification_type);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (TRUE);

CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW public.user_family_network AS
SELECT
    fm.user_id,
    fm.related_user_id,
    u.display_name,
    u.display_name_hindi,
    u.profile_photo_url,
    u.village,
    fm.relationship,
    fm.relationship_level,
    fm.confirmed
FROM public.family_members fm
JOIN public.users u ON fm.related_user_id = u.id
WHERE fm.confirmed = TRUE
ORDER BY fm.relationship_level, u.display_name;

CREATE OR REPLACE VIEW public.user_upcoming_events AS
SELECT
    e.id,
    e.title,
    e.description,
    e.event_type,
    e.event_date,
    e.event_time,
    e.location,
    u.display_name as created_by,
    COALESCE(rsvp.response, 'not_invited') as user_rsvp_status
FROM public.events e
JOIN public.users u ON e.created_by_user_id = u.id
LEFT JOIN public.event_rsvps rsvp ON e.id = rsvp.event_id AND rsvp.user_id = auth.uid()
WHERE e.event_date >= CURRENT_DATE
ORDER BY e.event_date;

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

CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_users_by_family_level(level_id INTEGER)
RETURNS TABLE (
    id UUID,
    display_name TEXT,
    phone_number TEXT,
    profile_photo_url TEXT,
    village TEXT,
    relationship TEXT
) AS $$
SELECT
    u.id,
    u.display_name,
    u.phone_number,
    u.profile_photo_url,
    u.village,
    fm.relationship
FROM public.family_members fm
JOIN public.users u ON fm.related_user_id = u.id
WHERE fm.user_id = auth.uid()
    AND fm.relationship_level = level_id
    AND fm.confirmed = TRUE
ORDER BY u.display_name;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_default_audience_groups(p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO public.audience_groups (user_id, name, group_type, is_default)
    VALUES
        (p_user_id, 'Direct Family', 'level1', TRUE),
        (p_user_id, 'Close Family', 'level2', FALSE),
        (p_user_id, 'Extended Family', 'level3', FALSE),
        (p_user_id, 'Public', 'public', FALSE)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.send_notification(
    p_user_id UUID,
    p_triggered_by_user_id UUID,
    p_notification_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_entity_type TEXT DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL,
    p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id, triggered_by_user_id, notification_type,
        title, message, related_entity_type, related_entity_id, data
    )
    VALUES (
        p_user_id, p_triggered_by_user_id, p_notification_type,
        p_title, p_message, p_related_entity_type, p_related_entity_id, p_data
    )
    RETURNING id INTO v_notification_id;
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_by_family_level TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_notification TO service_role;
