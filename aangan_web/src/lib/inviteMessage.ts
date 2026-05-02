// ─────────────────────────────────────────────────────────────────────────────
// Centralized WhatsApp invite-message builder
//
// Single source of truth for the bilingual Aangan description block, the
// per-relationship invite copy, and the deep-link path used everywhere we
// surface a WhatsApp share. Three callers as of v0.13.12:
//   • InviteShareCard (generic share, no specific relationship)
//   • AddMemberDrawer Manual tab (per-relative invite with deep-link code)
//   • Settings → Aangan ID card (share-my-id message)
//
// Why centralize:
//   The Aangan description blurb was being rewritten ad-hoc in three
//   places; small drift in tone between them confused users (and made
//   it impossible to keep the messaging A/B-friendly). Now any tweak
//   to the value-prop copy lands here and propagates everywhere.
//
// Hindi-first per CLAUDE.md Dadi rules. Keep total length under
// WhatsApp's recommended ~700-char threshold so the preview card
// shows the message in full without "Read more".
// ─────────────────────────────────────────────────────────────────────────────

export interface InviteMessageOptions {
  /** Inviter's display name (Hindi preferred) — e.g. "Kumar" or "कुमार". */
  inviterName?: string | null;
  /** Inviter's stable Aangan ID (AAN-XXXXXXXX). Optional — appended as
   *  a discovery handle in the message footer when present. */
  inviterAanganId?: string | null;
  /** Relationship the inviter is offering, in Hindi (e.g. "भाभी"). When
   *  set, the headline reads "X ने आपको [भाभी] के रूप में बुलाया है".
   *  Omit for generic "join Aangan" invites. */
  relationshipHindi?: string | null;
  /** Optional invite-code (from create_family_invite RPC). When provided,
   *  the join URL becomes /join/<code> with the relationship pre-set
   *  on landing. Without it, falls back to the generic homepage. */
  inviteCode?: string | null;
  /** Preferred locale ('hi' = Hindi-only message; 'bilingual' = both).
   *  Default 'bilingual' — most Indian families code-switch and the
   *  English fallback helps recipients who only read English. */
  locale?: 'hi' | 'bilingual';
}

/** The Aangan value-prop blurb — kept short enough to fit in a WhatsApp
 *  preview card without "Read more" truncation. */
const APP_DESCRIPTION_BILINGUAL =
  '🏠 आँगन — आपके परिवार के लिए डिजिटल घर\n' +
  '🌳 3-level family tree (offline + स्वर्गवासी सदस्य भी)\n' +
  '🪔 50+ त्योहार reminders + दैनिक पंचांग\n' +
  '🎉 इवेंट + RSVP + voice invites\n' +
  '🆔 Stable Aangan ID — phone/email बदलें, परिवार वही रहे';

/** Build the WhatsApp invite message body. Returns plain text — caller
 *  is responsible for `encodeURIComponent` before stuffing into wa.me/. */
export function buildInviteMessage(opts: InviteMessageOptions = {}): string {
  const { inviterName, inviterAanganId, relationshipHindi, inviteCode } = opts;

  const inviterShortName = (inviterName || '').split(' ')[0] || '';

  // Headline — varies by what context the caller supplied:
  //   • inviter + relationship → personal invite
  //   • inviter only           → generic friendly invite
  //   • neither                → minimal "join Aangan" pitch
  let headline: string;
  if (inviterShortName && relationshipHindi) {
    headline = `नमस्ते 🙏\n${inviterShortName} ने आपको Aangan पर ${relationshipHindi} के रूप में बुलाया है।`;
  } else if (inviterShortName) {
    headline = `नमस्ते 🙏\n${inviterShortName} ने आपको Aangan पर बुलाया है — हमारा पारिवारिक सोशल नेटवर्क।`;
  } else {
    headline = 'नमस्ते 🙏\nआपको Aangan पर बुलाना चाहता/चाहती हूँ — हमारा पारिवारिक सोशल नेटवर्क।';
  }

  // Join link — code-bound deep link if we have a code, generic homepage
  // otherwise. The /join/<code> route is server-rendered with dynamic
  // OG metadata so the WhatsApp preview shows "X ने आपको ... बुलाया है".
  const joinUrl = inviteCode
    ? `https://aangan.app/join/${inviteCode}`
    : 'https://aangan.app';

  // Footer — inviter's stable AAN handle as a discoverability hook so
  // even if the deep link fails, the recipient can find them post-install.
  const footer = inviterAanganId
    ? `\n\n— ${inviterShortName || 'आँगन'} ने भेजा\nमेरी Aangan ID: ${inviterAanganId}`
    : '';

  return `${headline}\n\n${APP_DESCRIPTION_BILINGUAL}\n\nएक tap में जुड़ें — Join in one tap:\n${joinUrl}${footer}`;
}

/** Convenience: build the full wa.me URL with the message URL-encoded. */
export function buildWhatsAppShareUrl(opts: InviteMessageOptions = {}): string {
  return `https://wa.me/?text=${encodeURIComponent(buildInviteMessage(opts))}`;
}
