-- ============================================================================
-- OFFLINE FAMILY MEMBERS TABLE
-- ============================================================================
-- For family members who are not on Aangan (no account) or are deceased.
-- These are placeholder entries managed by the user who adds them.
-- Created: 2026-04-17
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.offline_family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    added_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    display_name_hindi TEXT,
    relationship_type TEXT NOT NULL,
    relationship_label_hindi TEXT,
    connection_level INTEGER NOT NULL DEFAULT 1,
    is_deceased BOOLEAN DEFAULT FALSE,
    village_city TEXT,
    avatar_url TEXT,
    birth_year INTEGER,
    death_year INTEGER,
    notes TEXT,
    -- If this person later joins Aangan, link them to a real user
    linked_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_confirmed BOOLEAN DEFAULT FALSE, -- Other family members can confirm this relation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offline_family_added_by ON public.offline_family_members(added_by);
CREATE INDEX IF NOT EXISTS idx_offline_family_deceased ON public.offline_family_members(is_deceased);
CREATE INDEX IF NOT EXISTS idx_offline_family_linked ON public.offline_family_members(linked_user_id);

-- Enable RLS
ALTER TABLE public.offline_family_members ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view offline members added by anyone in their family
CREATE POLICY "Users can view offline family members" ON public.offline_family_members
    FOR SELECT USING (
        added_by = auth.uid()
        OR added_by IN (
            SELECT family_member_id FROM public.family_members WHERE user_id = auth.uid()
        )
    );

-- RLS: Users can add offline family members
CREATE POLICY "Users can add offline family members" ON public.offline_family_members
    FOR INSERT WITH CHECK (added_by = auth.uid());

-- RLS: Only the person who added can update
CREATE POLICY "Users can update their offline family members" ON public.offline_family_members
    FOR UPDATE USING (added_by = auth.uid());

-- RLS: Only the person who added can delete
CREATE POLICY "Users can delete their offline family members" ON public.offline_family_members
    FOR DELETE USING (added_by = auth.uid());

-- Trigger: Update updated_at
CREATE TRIGGER trigger_offline_family_updated_at
    BEFORE UPDATE ON public.offline_family_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
