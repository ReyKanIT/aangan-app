import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { EventPhoto, PhotoStatus, PrivacyType } from '../types/database';

interface PhotoState {
  photos: EventPhoto[];
  pendingPhotos: EventPhoto[];
  isLoading: boolean;
  error: string | null;

  fetchPhotos: (eventId: string, userConnectionLevel?: number) => Promise<void>;
  uploadPhotos: (
    eventId: string,
    files: { uri: string; type: string; name: string }[],
    caption?: string | null,
    privacyType?: PrivacyType,
    privacyLevelMin?: number,
    privacyLevelMax?: number,
    privacyUserIds?: string[],
  ) => Promise<boolean>;
  moderatePhoto: (photoId: string, status: 'approved' | 'rejected') => Promise<boolean>;
  setPhotoPrivacy: (
    photoId: string,
    privacyType: PrivacyType,
    levelMin?: number,
    levelMax?: number,
    userIds?: string[],
  ) => Promise<boolean>;
  fetchPendingPhotos: (eventId: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const usePhotoStore = create<PhotoState>((set, get) => ({
  photos: [],
  pendingPhotos: [],
  isLoading: false,
  error: null,

  fetchPhotos: async (eventId, userConnectionLevel) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('event_photos')
        .select('*, uploader:users!event_photos_uploader_id_fkey(*)')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      // Apply privacy filter based on user's connection level
      if (userConnectionLevel !== undefined) {
        query = query
          .lte('privacy_level_min', userConnectionLevel)
          .gte('privacy_level_max', userConnectionLevel);
      }

      const { data, error } = await query;

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      set({ photos: data ?? [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch photos', isLoading: false });
    }
  },

  uploadPhotos: async (
    eventId,
    files,
    caption = null,
    privacyType = 'all',
    privacyLevelMin = 1,
    privacyLevelMax = 99,
    privacyUserIds = [],
  ) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const now = new Date().toISOString();
      const uploadedPhotos: EventPhoto[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const filePath = `${eventId}/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('event-photos')
          .upload(filePath, {
            uri: file.uri,
            type: file.type,
            name: file.name,
          } as any);

        if (uploadError) {
          set({ error: `Upload failed: ${uploadError.message}` });
          return false;
        }

        const { data: urlData } = supabase.storage
          .from('event-photos')
          .getPublicUrl(filePath);

        const { data: photo, error: insertError } = await supabase
          .from('event_photos')
          .insert({
            event_id: eventId,
            uploader_id: session.user.id,
            photo_url: urlData.publicUrl,
            thumbnail_url: null,
            caption,
            status: 'pending' as PhotoStatus,
            privacy_type: privacyType,
            privacy_level_min: privacyLevelMin,
            privacy_level_max: privacyLevelMax,
            privacy_user_ids: privacyUserIds,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (insertError) {
          set({ error: insertError.message });
          return false;
        }

        if (photo) {
          uploadedPhotos.push(photo as EventPhoto);
        }
      }

      set((state) => ({
        pendingPhotos: [...state.pendingPhotos, ...uploadedPhotos],
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to upload photos' });
      return false;
    }
  },

  moderatePhoto: async (photoId, status) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const now = new Date().toISOString();

      const { error } = await supabase
        .from('event_photos')
        .update({
          status,
          moderated_by: session.user.id,
          moderated_at: now,
          updated_at: now,
        })
        .eq('id', photoId);

      if (error) {
        set({ error: error.message });
        return false;
      }

      set((state) => ({
        pendingPhotos: state.pendingPhotos.filter((p) => p.id !== photoId),
        photos:
          status === 'approved'
            ? [...state.photos, ...state.pendingPhotos.filter((p) => p.id === photoId).map((p) => ({ ...p, status: 'approved' as PhotoStatus }))]
            : state.photos,
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to moderate photo' });
      return false;
    }
  },

  setPhotoPrivacy: async (photoId, privacyType, levelMin = 1, levelMax = 99, userIds = []) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('event_photos')
        .update({
          privacy_type: privacyType,
          privacy_level_min: levelMin,
          privacy_level_max: levelMax,
          privacy_user_ids: userIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', photoId);

      if (error) {
        set({ error: error.message });
        return false;
      }

      set((state) => ({
        photos: state.photos.map((p) =>
          p.id === photoId
            ? { ...p, privacy_type: privacyType, privacy_level_min: levelMin, privacy_level_max: levelMax, privacy_user_ids: userIds }
            : p
        ),
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to update privacy' });
      return false;
    }
  },

  fetchPendingPhotos: async (eventId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('event_photos')
        .select('*, uploader:users!event_photos_uploader_id_fkey(*)')
        .eq('event_id', eventId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      set({ pendingPhotos: data ?? [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch pending photos', isLoading: false });
    }
  },

  setError: (error) => set({ error }),
}));
