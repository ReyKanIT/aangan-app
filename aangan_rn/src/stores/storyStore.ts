import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { safeError } from '../utils/security';
import type { Story } from '../types/database';

interface StoryState {
  stories: Story[];
  isLoading: boolean;
  error: string | null;
  fetchStories: () => Promise<void>;
  addStory: (mediaUri: string, mediaType: 'image' | 'video', caption?: string) => Promise<boolean>;
  markViewed: (storyId: string) => Promise<void>;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  stories: [],
  isLoading: false,
  error: null,

  fetchStories: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { set({ isLoading: false }); return; }

      // Fetch non-expired stories from family members
      const { data, error } = await supabase
        .from('stories')
        .select('*, author:users!stories_author_id_fkey(id, display_name, display_name_hindi, profile_photo_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) { set({ error: safeError(error, 'कहानियाँ नहीं मिलीं'), isLoading: false }); return; }

      // Mark which stories current user has viewed
      const storyIds = (data ?? []).map((s: any) => s.id);
      let viewedIds = new Set<string>();
      if (storyIds.length > 0) {
        const { data: views } = await supabase
          .from('story_views')
          .select('story_id')
          .eq('viewer_id', session.user.id)
          .in('story_id', storyIds);
        viewedIds = new Set((views ?? []).map((v: any) => v.story_id));
      }

      const storiesWithViewStatus = (data ?? []).map((s: any) => ({
        ...s,
        is_viewed: viewedIds.has(s.id),
      }));

      set({ stories: storiesWithViewStatus, isLoading: false });
    } catch (error) {
      set({ error: safeError(error, 'कहानियाँ लोड नहीं हुईं'), isLoading: false });
    }
  },

  addStory: async (mediaUri, mediaType, caption) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const fileExt = mediaType === 'video' ? 'mp4' : 'jpg';
      const filePath = `stories/${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, { uri: mediaUri, type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg', name: `story.${fileExt}` } as any);

      if (uploadError) { set({ error: safeError(uploadError, 'अपलोड नहीं हुआ') }); return false; }

      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(filePath);

      const { error } = await supabase.from('stories').insert({
        author_id: session.user.id,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        caption: caption || null,
      });

      if (error) { set({ error: safeError(error, 'कहानी नहीं बनी') }); return false; }

      await get().fetchStories();
      return true;
    } catch (error) {
      set({ error: safeError(error, 'कहानी नहीं बनी') });
      return false;
    }
  },

  markViewed: async (storyId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      await supabase.from('story_views').insert({
        story_id: storyId,
        viewer_id: session.user.id,
      }).single();

      // Update local state
      set((state) => ({
        stories: state.stories.map((s) =>
          s.id === storyId ? { ...s, is_viewed: true, view_count: s.view_count + 1 } : s
        ),
      }));

      // Update count in DB
      await supabase.rpc('increment_story_views', { story_id: storyId }).maybeSingle();
    } catch {
      // Silently fail — view tracking is best-effort
    }
  },
}));
