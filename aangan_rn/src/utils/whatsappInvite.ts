/**
 * WhatsApp invite helpers — extracted from FamilyTreeScreen in v0.16.1 so the
 * forced-invite onboarding screen and any future surfaces share one code path.
 *
 * The original two messages (`WHATSAPP_MESSAGE_AFTER_ADD`,
 * `WHATSAPP_MESSAGE_INVITE_ONLY`) remain in FamilyTreeScreen.tsx for the
 * post-add modal flow. This module adds the "forced onboarding" message and
 * the `whatsapp://send?text=...` opener so callers don't have to duplicate
 * the deep-link + permission-check boilerplate.
 *
 * Hindi-first text is wrapped in regular JS strings (this is a .ts module —
 * the v0.13.16 JSX-text-Devanagari issue only affects JSX attribute / text
 * positions, not module-level strings).
 */
import { Alert, Linking } from 'react-native';

/**
 * Message sent during the forced "Invite 3 family members" onboarding step.
 * Per CMO Loop 2 spec — friendly, Hindi-first, includes the app URL and the
 * sender's name interpolation slot.
 */
export function buildForcedInviteMessage(opts: {
  inviterName?: string | null;
  relationshipLabelHindi?: string | null;
}): string {
  const inviter = (opts.inviterName ?? '').trim();
  const inviterLine = inviter
    ? `${inviter} ने आपको Aangan में आमंत्रित किया है।\n\n`
    : '';
  return (
    'नमस्ते! 🙏\n\n' +
    inviterLine +
    'Aangan एक private family social network है — जहाँ हम family photos, ' +
    'events और updates एक जगह share करते हैं।\n\n' +
    'अभी download करें: https://aangan.app\n\n' +
    'आपका परिवार आपका इंतज़ार कर रहा है! 💛'
  );
}

/**
 * Open WhatsApp with a pre-filled message + optional E.164-style phone.
 * Returns a promise that resolves to `true` if WhatsApp opened, `false`
 * otherwise (no WhatsApp installed / OS blocked the deep link). The promise
 * never rejects — error paths surface as an `Alert` to the user AND a `false`
 * return so the caller can decide whether to record the "sent" event.
 */
export async function openWhatsAppInvite(
  message: string,
  phone?: string | null,
): Promise<boolean> {
  // whatsapp://send?phone=<digits>&text=<encoded>
  // If `phone` is empty, WhatsApp prompts the user to pick a contact.
  const trimmedPhone = (phone ?? '').replace(/[^0-9]/g, '');
  const phoneParam = trimmedPhone.length > 0 ? `phone=91${trimmedPhone}&` : '';
  const url = `whatsapp://send?${phoneParam}text=${encodeURIComponent(message)}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(
        'WhatsApp नहीं मिला',
        'आपके फोन में WhatsApp इंस्टॉल नहीं है।',
        [{ text: 'ठीक है' }],
      );
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('त्रुटि / Error', 'WhatsApp नहीं खुल सका।', [{ text: 'ठीक है' }]);
    return false;
  }
}
