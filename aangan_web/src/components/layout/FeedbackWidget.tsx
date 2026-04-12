'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import GoldButton from '@/components/ui/GoldButton';

const CATEGORIES = [
  { value: 'feature_request', label: 'सुझाव', sub: 'Feature', emoji: '💡' },
  { value: 'bug_report', label: 'समस्या', sub: 'Bug', emoji: '🐛' },
  { value: 'complaint', label: 'शिकायत', sub: 'Complaint', emoji: '😟' },
  { value: 'general', label: 'सामान्य', sub: 'General', emoji: '💬' },
] as const;

export default function FeedbackWidget() {
  const session = useAuthStore((s) => s.session);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>('general');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Don't show if not logged in
  if (!session?.user) return null;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError('');
    try {
      const { data: ticket, error: ticketErr } = await supabase
        .from('support_tickets')
        .insert({
          user_id: session.user.id,
          subject: `${CATEGORIES.find((c) => c.value === category)?.label ?? 'Feedback'}`,
          category,
          priority: category === 'bug_report' ? 'high' : 'medium',
          status: 'open',
        })
        .select('id')
        .single();
      if (ticketErr) throw ticketErr;
      if (!ticket) throw new Error('Ticket creation failed');

      const { error: msgErr } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_id: session.user.id,
        message: message.trim(),
        is_from_support: false,
      });
      if (msgErr) throw msgErr;

      setDone(true);
      setMessage('');
      setCategory('general');
      setTimeout(() => {
        setDone(false);
        setOpen(false);
      }, 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'भेज नहीं पाए — Could not submit');
    }
    setSending(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-[55] bg-haldi-gold text-white rounded-full shadow-lg hover:bg-haldi-gold-dark transition-all flex items-center gap-2 px-4 py-3 min-h-dadi font-body font-semibold text-base"
          aria-label="सुझाव दें — Give Feedback"
        >
          <span className="text-xl">💬</span>
          <span className="hidden sm:inline">सुझाव दें</span>
        </button>
      )}

      {/* Feedback Panel */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md bg-white rounded-t-3xl lg:rounded-2xl p-5 max-h-[80vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading text-xl text-brown">सुझाव / शिकायत</h3>
                <p className="font-body text-sm text-brown-light">Feedback & Support</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-brown-light text-xl min-w-dadi min-h-dadi flex items-center justify-center rounded-lg hover:bg-cream-dark transition-colors"
              >
                ✕
              </button>
            </div>

            {done ? (
              <div className="bg-green-50 border border-mehndi-green rounded-xl px-4 py-6 text-center">
                <p className="text-3xl mb-2">🙏</p>
                <p className="font-body text-lg text-mehndi-green font-semibold">धन्यवाद!</p>
                <p className="font-body text-base text-mehndi-green">आपका सुझाव भेज दिया गया</p>
                <p className="font-body text-sm text-brown-light mt-1">Feedback submitted successfully</p>
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-error/30 rounded-xl px-4 py-3">
                    <p className="font-body text-base text-error">{error}</p>
                  </div>
                )}

                {/* Category */}
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 font-body text-sm transition-colors min-h-dadi ${
                        category === cat.value
                          ? 'border-haldi-gold bg-haldi-gold/10 text-haldi-gold-dark'
                          : 'border-cream-dark bg-white text-brown-light hover:border-haldi-gold/50'
                      }`}
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="font-semibold leading-tight">{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="fw-message" className="block font-body font-semibold text-brown mb-1">
                    संदेश * <span className="text-brown-light text-sm font-normal">Message</span>
                  </label>
                  <textarea
                    id="fw-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="अपना सुझाव या शिकायत यहाँ लिखें..."
                    rows={3}
                    maxLength={1000}
                    autoFocus
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none resize-none placeholder-gray-400"
                  />
                  <p className="text-sm text-brown-light text-right font-body mt-0.5">{message.length}/1000</p>
                </div>

                <GoldButton className="w-full" loading={sending} onClick={handleSubmit} disabled={!message.trim()}>
                  भेजें — Submit
                </GoldButton>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
