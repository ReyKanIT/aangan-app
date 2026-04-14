'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toastError } from '@/lib/toast';

type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  reporter?: { display_name: string };
}

const STATUS_OPTIONS: ReportStatus[] = ['pending', 'reviewing', 'resolved', 'dismissed'];

const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: 'bg-haldi-gold/20 text-haldi-gold-dark',
  reviewing: 'bg-blue-100 text-blue-700',
  resolved: 'bg-mehndi-green/20 text-mehndi-green',
  dismissed: 'bg-cream-dark text-brown-light',
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState<{ id: string; status: ReportStatus } | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('content_reports')
        .select('*, reporter:users!content_reports_reporter_id_fkey(display_name)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setReports(data ?? []);
    } catch (err) {
      setError('रिपोर्ट लोड नहीं हो सकीं। पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function updateStatus(reportId: string, newStatus: ReportStatus, note?: string) {
    try {
      setActionTarget(reportId);
      const updateData: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
      if (note) updateData.resolution_note = note;

      const { error: updateError } = await supabase
        .from('content_reports')
        .update(updateData)
        .eq('id', reportId);

      if (updateError) throw updateError;
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, status: newStatus, resolution_note: note ?? r.resolution_note } : r
        )
      );
      setShowNoteModal(null);
      setResolutionNote('');
    } catch (err) {
      toastError('अपडेट नहीं हो सका', 'Could not update. Please try again.');
    } finally {
      setActionTarget(null);
    }
  }

  function handleAction(reportId: string, newStatus: ReportStatus) {
    if (newStatus === 'resolved' || newStatus === 'dismissed') {
      setShowNoteModal({ id: reportId, status: newStatus });
    } else {
      updateStatus(reportId, newStatus);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-brown">Content Reports</h1>
        <p className="text-brown-light text-sm mt-1">Review and moderate reported content</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', ...STATUS_OPTIONS] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
              statusFilter === status
                ? 'bg-brown text-cream font-medium'
                : 'bg-white border border-cream-dark text-brown-light hover:bg-cream'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-error/10 text-error px-4 py-3 rounded-lg text-base mb-4">
          {error}
          <button onClick={fetchReports} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Reports list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-cream-dark p-4">
              <div className="h-4 w-48 bg-cream-dark rounded animate-pulse mb-2" />
              <div className="h-3 w-32 bg-cream-dark rounded animate-pulse mb-2" />
              <div className="h-3 w-64 bg-cream-dark rounded animate-pulse" />
            </div>
          ))
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-brown-light">
            No reports found{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl border border-cream-dark p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[report.status]}`}>
                    {report.status}
                  </span>
                  <span className="ml-2 text-xs text-brown-light">
                    {report.content_type} &middot; {new Date(report.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </span>
                </div>
                <span className="text-xs text-brown-light">
                  Reporter: <span className="font-medium text-brown">{report.reporter?.display_name ?? 'Unknown'}</span>
                </span>
              </div>

              <p className="text-sm text-brown font-medium mb-1">Reason: {report.reason}</p>
              {report.description && (
                <p className="text-sm text-brown-light mb-2">{report.description}</p>
              )}
              {report.resolution_note && (
                <p className="text-xs text-mehndi-green bg-mehndi-green/10 rounded px-2 py-1 mb-2">
                  Resolution: {report.resolution_note}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                {report.status === 'pending' && (
                  <button
                    disabled={actionTarget === report.id}
                    onClick={() => handleAction(report.id, 'reviewing')}
                    className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    Mark Reviewing
                  </button>
                )}
                {(report.status === 'pending' || report.status === 'reviewing') && (
                  <>
                    <button
                      disabled={actionTarget === report.id}
                      onClick={() => handleAction(report.id, 'resolved')}
                      className="px-3 py-1.5 text-xs rounded-lg bg-mehndi-green/10 text-mehndi-green hover:bg-mehndi-green/20 transition-colors disabled:opacity-50"
                    >
                      Resolve
                    </button>
                    <button
                      disabled={actionTarget === report.id}
                      onClick={() => handleAction(report.id, 'dismissed')}
                      className="px-3 py-1.5 text-xs rounded-lg bg-cream-dark text-brown-light hover:bg-cream transition-colors disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolution note modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="font-heading text-lg text-brown mb-3">
              {showNoteModal.status === 'resolved' ? 'Resolve Report' : 'Dismiss Report'}
            </h3>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Add a resolution note (optional)..."
              rows={3}
              className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm text-brown placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-haldi-gold/40 resize-none"
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => {
                  setShowNoteModal(null);
                  setResolutionNote('');
                }}
                className="px-4 py-2 text-sm rounded-lg border border-cream-dark text-brown-light hover:bg-cream transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={actionTarget === showNoteModal.id}
                onClick={() => updateStatus(showNoteModal.id, showNoteModal.status, resolutionNote || undefined)}
                className="px-4 py-2 text-sm rounded-lg bg-haldi-gold text-brown font-medium hover:bg-haldi-gold-dark transition-colors disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
