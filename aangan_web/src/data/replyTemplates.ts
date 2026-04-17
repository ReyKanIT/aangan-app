/**
 * Reply templates — Hindi/English canned responses for common user issues.
 *
 * Categorized by the pattern the admin matches against, not by ticket category
 * (one ticket may be "bug_report" but actually an OTP issue). The admin picks
 * the template that matches what the user is actually complaining about.
 *
 * Placeholders: `{{name}}` (ticket reporter), `{{ticket}}` (TKT-xxxxxx), `{{link}}` (context url)
 * Replaced by ReplyComposer at send time. Unreplaced placeholders stay visible
 * so we notice gaps.
 */

export interface ReplyTemplate {
  id: string;
  label: string;           // short name for picker
  subject: string;         // keywords admin searches on
  category: 'account' | 'media' | 'family' | 'event' | 'moderation' | 'general';
  bodyHi: string;
  bodyEn: string;
  resolveAfterSending?: boolean; // mark ticket resolved alongside the reply
}

export const REPLY_TEMPLATES: ReplyTemplate[] = [
  // ── OTP / Login ─────────────────────────────────────────────
  {
    id: 'otp_not_received',
    label: 'OTP not received',
    subject: 'otp code sms verify login',
    category: 'account',
    bodyHi: `नमस्ते {{name}} जी 🙏

OTP SMS आने में कभी-कभी 30-60 सेकेंड लगते हैं। कृपया:

1. नेटवर्क signal चेक करें (2 bars या ज़्यादा)
2. 60 सेकेंड रुककर "Resend OTP" दबाएं
3. DND (Do Not Disturb) बंद हो — Settings > DND में जाकर transactional SMS allow करें
4. अगर फिर भी नहीं आए — दूसरा SIM/phone try करें

5 गलत OTP के बाद 5 मिनट का block लगता है — उतना रुकें फिर retry करें।

धन्यवाद,
Aangan टीम`,
    bodyEn: `Hello {{name}} 🙏

OTP SMS usually arrives in 30-60 seconds. Please:

1. Check network signal (2+ bars)
2. Wait 60 seconds, then tap "Resend OTP"
3. Confirm DND is off — in Settings > DND, allow transactional SMS
4. Still nothing? Try a different SIM/phone

After 5 wrong OTPs we block for 5 minutes — wait that out then retry.

Thanks,
Aangan Team`,
    resolveAfterSending: true,
  },

  // ── Photo upload issues ─────────────────────────────────────
  {
    id: 'photo_upload_failed',
    label: 'Photo upload not working',
    subject: 'photo image upload stuck slow fail',
    category: 'media',
    bodyHi: `नमस्ते {{name}} जी 🙏

फ़ोटो अपलोड में दिक़्क़त के लिए:

1. WiFi पर try करें (mobile data पर बड़ी फ़ोटो slow होती हैं)
2. app को update करें — latest version में compression तेज़ है
3. फ़ोटो का size 25 MB से कम हो
4. एक बार में 5 से कम फ़ोटो choose करें
5. ब्राउज़र / app बंद करके दोबारा खोलें

हम अपनी तरफ़ से भी जाँच रहे हैं। अगर फिर भी नहीं हो — फ़ोटो का resolution और नेटवर्क speed बताएं।

धन्यवाद,
Aangan टीम`,
    bodyEn: `Hello {{name}} 🙏

For photo upload trouble:

1. Try on WiFi (mobile data is slow for large photos)
2. Update the app — latest version compresses faster
3. Keep photos under 25 MB each
4. Upload fewer than 5 at once
5. Close & reopen the browser/app

We're also investigating on our end. If still stuck, share the photo resolution and your network speed.

Thanks,
Aangan Team`,
  },

  // ── Family tree ──────────────────────────────────────────────
  {
    id: 'family_member_not_linking',
    label: 'Family member won\'t link',
    subject: 'family tree add member link invite brother sister',
    category: 'family',
    bodyHi: `नमस्ते {{name}} जी 🙏

परिवार के सदस्य को जोड़ने के दो तरीक़े हैं:

1. **जो Aangan पर हैं** — उनका फ़ोन नंबर search करें → Family > "+ सदस्य जोड़ें" > relationship चुनें → request भेजें। दूसरे पक्ष के accept करने पर tree में जुड़ जाएंगे।

2. **जो Aangan पर नहीं हैं** — "Offline Member" के रूप में जोड़ सकते हैं (बिना उनके account के)। बाद में जब वो app पर आएं तो link कर सकते हैं।

अगर request भेजी है और accept नहीं हो रहा — उनको invite link भेजें: https://aangan.app

धन्यवाद,
Aangan टीम`,
    bodyEn: `Hello {{name}} 🙏

Two ways to add a family member:

1. **If they're already on Aangan** — search their phone number → Family > "+ Add Member" > pick relationship → send request. Once they accept, they're in your tree.

2. **If they're not on Aangan** — add them as an "Offline Member" (no account needed). Link them later when they sign up.

If you sent a request and nothing's happening, share the invite link: https://aangan.app

Thanks,
Aangan Team`,
  },

  // ── Event RSVP / invite ──────────────────────────────────────
  {
    id: 'event_invite_not_showing',
    label: 'Event not visible / no invite',
    subject: 'event invite wedding not showing missing rsvp',
    category: 'event',
    bodyHi: `नमस्ते {{name}} जी 🙏

इवेंट दिख नहीं रहा — कारण:

1. मेज़बान ने audience "Level 1" या "Level 2" चुना हो और आप उस level में न हों। Family tree में connection verify कराएं।
2. RSVP deadline निकल गई हो।
3. Capacity (max attendees) पूरी हो गई हो।

मेज़बान से सीधे पूछें कि invite किसे-किसे भेजा है। अगर invite link मिला है तो उसे खोलने पर सीधा event page दिखेगा।

धन्यवाद,
Aangan टीम`,
    bodyEn: `Hello {{name}} 🙏

Event not visible — likely causes:

1. Host set audience to "Level 1" or "Level 2" and you're not at that level. Verify your connection in the family tree.
2. RSVP deadline passed.
3. Capacity (max attendees) reached.

Ask the host directly who they invited. If you have an invite link, opening it takes you straight to the event page.

Thanks,
Aangan Team`,
  },

  // ── Content moderation ──────────────────────────────────────
  {
    id: 'report_resolved_removed',
    label: 'Report resolved — content removed',
    subject: 'inappropriate spam report content removed',
    category: 'moderation',
    bodyHi: `नमस्ते {{name}} जी 🙏

आपकी शिकायत की जाँच हुई। जो content आपने flag किया था वो हमारी community guidelines के against था — हमने उसे हटा दिया है।

रिपोर्ट करने के लिए धन्यवाद — इस तरह की चौकसी से Aangan सुरक्षित परिवार-space बना रहता है।

धन्यवाद,
Aangan टीम`,
    bodyEn: `Hello {{name}} 🙏

We reviewed your report. The content you flagged violated our community guidelines and has been removed.

Thank you for flagging — this kind of vigilance keeps Aangan a safe family space.

Thanks,
Aangan Team`,
    resolveAfterSending: true,
  },
  {
    id: 'report_resolved_no_action',
    label: 'Report resolved — no action needed',
    subject: 'report reviewed no violation',
    category: 'moderation',
    bodyHi: `नमस्ते {{name}} जी 🙏

आपकी शिकायत की हमारी टीम ने जाँच की। इस मामले में guidelines का उल्लंघन नहीं मिला, इसलिए content को रहने दिया गया है।

अगर आप उस व्यक्ति से परेशान हैं तो Settings > Privacy से उन्हें block कर सकते हैं।

धन्यवाद,
Aangan टीम`,
    bodyEn: `Hello {{name}} 🙏

Our team reviewed your report. We didn't find a guidelines violation in this case, so the content stays.

If you want distance from that person, you can block them from Settings > Privacy.

Thanks,
Aangan Team`,
    resolveAfterSending: true,
  },

  // ── Profile / date of birth ──────────────────────────────────
  {
    id: 'wrong_dob',
    label: 'Wrong date of birth / profile detail',
    subject: 'birthday dob profile edit wrong date',
    category: 'account',
    bodyHi: `नमस्ते {{name}} जी 🙏

Profile details आप ख़ुद edit कर सकते हैं:

1. नीचे दाएँ Profile icon दबाएं
2. Settings > Profile > Edit चुनें
3. जन्मतिथि / नाम / गाँव जो बदलना हो update करें
4. Save दबाएं

अगर कोई field locked दिखे तो हमें बताएं — हम manually update कर देंगे।

धन्यवाद,
Aangan टीम`,
    bodyEn: `Hello {{name}} 🙏

You can edit profile details yourself:

1. Tap Profile icon (bottom right)
2. Settings > Profile > Edit
3. Update date of birth / name / village
4. Tap Save

If a field is locked, let us know — we'll update it manually.

Thanks,
Aangan Team`,
    resolveAfterSending: true,
  },

  // ── Generic acknowledgement ──────────────────────────────────
  {
    id: 'acknowledge_investigating',
    label: 'Ack — we\'re on it',
    subject: 'thank you investigating',
    category: 'general',
    bodyHi: `नमस्ते {{name}} जी 🙏

आपका संदेश मिला। हमारी टीम देख रही है और जल्द ही update देंगे।

धन्यवाद,
Aangan टीम`,
    bodyEn: `Hello {{name}} 🙏

We got your message. Our team is looking into it and will update you soon.

Thanks,
Aangan Team`,
  },
  {
    id: 'generic_resolved',
    label: 'Generic — resolved',
    subject: 'resolved fixed done',
    category: 'general',
    bodyHi: `नमस्ते {{name}} जी 🙏

आपकी बात का हल हो गया है। कृपया app को refresh करें और देखें कि ठीक हो गया या नहीं। अगर कोई और परेशानी हो तो यहीं reply करें।

धन्यवाद,
Aangan टीम`,
    bodyEn: `Hello {{name}} 🙏

This is now resolved. Please refresh the app and confirm. If anything's still off, reply here and we'll look again.

Thanks,
Aangan Team`,
    resolveAfterSending: true,
  },
  {
    id: 'feature_request_noted',
    label: 'Feature request — noted',
    subject: 'feature request suggestion idea',
    category: 'general',
    bodyHi: `नमस्ते {{name}} जी 🙏

सुझाव के लिए धन्यवाद! हमने इसे अपनी feature list में जोड़ दिया है। जब priority आए तब release notes में बताएंगे।

Aangan को बेहतर बनाने में आपकी मदद क़ीमती है।

धन्यवाद,
Aangan टीम`,
    bodyEn: `Hello {{name}} 🙏

Thanks for the suggestion! We've added it to our feature list. When it ships, we'll call it out in the release notes.

Your input makes Aangan better.

Thanks,
Aangan Team`,
    resolveAfterSending: true,
  },
];

export function fillTemplate(body: string, vars: { name?: string; ticket?: string; link?: string }): string {
  return body
    .replace(/\{\{name\}\}/g, vars.name ?? 'मित्र')
    .replace(/\{\{ticket\}\}/g, vars.ticket ?? '')
    .replace(/\{\{link\}\}/g, vars.link ?? '');
}
