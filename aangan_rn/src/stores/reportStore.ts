import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { secureLog } from '../utils/security';

export interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
}

interface ReportState {
  isSubmitting: boolean;
  error: string | null;
  submitReport: (contentType: string, contentId: string, reason: string, description?: string) => Promise<boolean>;
  fetchMyReports: () => Promise<ContentReport[]>;
}

export const useReportStore = create<ReportState>((set) => ({
  isSubmitting: false,
  error: null,

  submitReport: async (contentType, contentId, reason, description) => {
    set({ isSubmitting: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isSubmitting: false, error: 'User not authenticated' });
        return false;
      }

      const { error } = await supabase.from('content_reports').insert({
        reporter_id: user.id,
        content_type: contentType,
        content_id: contentId,
        reason,
        description: description || null,
        status: 'pending',
      });

      if (error) {
        secureLog.error('[ReportStore] Submit error:', error.message);
        set({ isSubmitting: false, error: error.message });
        return false;
      }

      secureLog.info('[ReportStore] Report submitted:', contentType, contentId);
      set({ isSubmitting: false });
      return true;
    } catch (err: any) {
      secureLog.error('[ReportStore] Submit exception:', err.message);
      set({ isSubmitting: false, error: err.message });
      return false;
    }
  },

  fetchMyReports: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('content_reports')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        secureLog.error('[ReportStore] Fetch error:', error.message);
        return [];
      }

      return (data as ContentReport[]) || [];
    } catch (err: any) {
      secureLog.error('[ReportStore] Fetch exception:', err.message);
      return [];
    }
  },
}));
