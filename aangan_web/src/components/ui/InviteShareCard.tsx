'use client';
import { useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';

const INVITE_LINK = 'https://aangan.app';

/**
 * InviteShareCard — Dadi-Test compliant invite CTA
 * Shows WhatsApp button + Copy Link button + native share (on supported devices).
 * Used on /family page and anywhere we want a quick invite flow.
 *
 * Personalization (added 2026-04-30 v0.13.5):
 * The shared message now includes the inviter's display name and Aangan ID
 * (AAN-XXXXXXXX), so the recipient knows who's inviting them and can find
 * the inviter directly via "Search by Aangan ID" once installed. The full
 * per-relative deep-link flow (with pre-set relationship) lives on the
 * AddMemberDrawer's "Invite by WhatsApp" path — this card is the generic
 * "share Aangan with anyone" surface.
 */
export default function InviteShareCard({ className = '' }: { className?: string }) {
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const inviteMessage = useMemo(() => {
    const inviterName = user?.display_name_hindi || user?.display_name || '';
    const aanganId = user?.aangan_id ? `\n\n🆔 मेरी Aangan ID: ${user.aangan_id}` : '';
    const greeting = inviterName
      ? `नमस्ते! 🙏 मैं ${inviterName} हूँ — आपको Aangan आँगन पर बुलाना चाहता/चाहती हूँ।`
      : 'नमस्ते! 🙏 आपको Aangan आँगन पर बुलाना चाहता/चाहती हूँ।';
    return `${greeting}

👨‍👩‍👧‍👦 परिवार का पेड़ बनाएं
📅 पंचांग और त्योहार
🎉 इवेंट और RSVP${aanganId}

अभी जुड़ें: https://aangan.app`;
  }, [user?.display_name_hindi, user?.display_name, user?.aangan_id]);

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(INVITE_LINK);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      window.prompt('लिंक कॉपी करें — Copy this link:', INVITE_LINK);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('संदेश कॉपी करें — Copy this message:', inviteMessage);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Aangan — आँगन',
          text: inviteMessage,
          url: INVITE_LINK,
        });
      } catch {
        // User cancelled
      }
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className={`rounded-2xl border border-[#25D366]/30 bg-[#25D366]/5 overflow-hidden ${className}`}>
      {/* Primary row: WhatsApp + Copy Link */}
      <div className="flex gap-2 p-3">
        {/* WhatsApp — primary action */}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 min-h-dadi px-4 py-3 rounded-xl bg-[#25D366] text-white font-body font-semibold text-base hover:bg-[#1DA851] transition-colors shadow-sm"
          aria-label={'WhatsApp पर भेजें — Send on WhatsApp'}
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span>WhatsApp पर भेजें</span>
        </a>

        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 min-h-dadi px-4 py-3 rounded-xl bg-white border border-gray-200 text-brown font-body font-semibold text-base hover:bg-cream-dark transition-colors"
          aria-label={'लिंक कॉपी करें — Copy link'}
        >
          {copied ? (
            <>
              <span className="text-lg">✅</span>
              <span className="hidden sm:inline">कॉपी हुआ!</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">लिंक कॉपी</span>
            </>
          )}
        </button>

        {/* Native share (mobile only) */}
        {hasNativeShare && (
          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center min-h-dadi min-w-dadi px-3 py-3 rounded-xl bg-white border border-gray-200 text-brown hover:bg-cream-dark transition-colors"
            aria-label={'शेयर करें — Share'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        )}
      </div>

      {/* Expandable: more options */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-2 text-center font-body text-base text-[#1DA851] hover:bg-[#25D366]/10 transition-colors border-t border-[#25D366]/15"
      >
        {expanded ? '▲ बंद करें' : '▼ और विकल्प — More options'}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Copy full message */}
          <button
            onClick={handleCopyMessage}
            className="w-full flex items-center gap-3 min-h-dadi px-4 py-3 rounded-xl bg-white border border-gray-200 text-brown font-body text-base hover:bg-cream-dark transition-colors text-left"
          >
            <span className="text-xl shrink-0">📋</span>
            <div>
              <p className="font-semibold">पूरा संदेश कॉपी करें</p>
              <p className="text-brown-light">Copy full invite message</p>
            </div>
          </button>

          {/* SMS */}
          <a
            href={`sms:?&body=${encodeURIComponent(inviteMessage)}`}
            className="w-full flex items-center gap-3 min-h-dadi px-4 py-3 rounded-xl bg-white border border-gray-200 text-brown font-body text-base hover:bg-cream-dark transition-colors"
          >
            <span className="text-xl shrink-0">💬</span>
            <div>
              <p className="font-semibold">SMS से भेजें</p>
              <p className="text-brown-light">Send via SMS</p>
            </div>
          </a>

          {/* Email */}
          <a
            href={`mailto:?subject=${encodeURIComponent('Aangan आँगन — परिवार से जुड़ें')}&body=${encodeURIComponent(inviteMessage)}`}
            className="w-full flex items-center gap-3 min-h-dadi px-4 py-3 rounded-xl bg-white border border-gray-200 text-brown font-body text-base hover:bg-cream-dark transition-colors"
          >
            <span className="text-xl shrink-0">✉️</span>
            <div>
              <p className="font-semibold">ईमेल से भेजें</p>
              <p className="text-brown-light">Send via Email</p>
            </div>
          </a>

          {/* Full invite page link */}
          <a
            href="/invite"
            className="w-full flex items-center gap-3 min-h-dadi px-4 py-3 rounded-xl bg-white border border-gray-200 text-brown font-body text-base hover:bg-cream-dark transition-colors"
          >
            <span className="text-xl shrink-0">💌</span>
            <div>
              <p className="font-semibold">आमंत्रण पेज खोलें</p>
              <p className="text-brown-light">Open full invite page</p>
            </div>
          </a>
        </div>
      )}
    </div>
  );
}
