/**
 * Hindi-first error message mapping for Aangan.
 * Maps English errors (from Supabase, network, etc.) to
 * user-friendly Hindi + English messages.
 *
 * Dadi Test compliant: Hindi first, English subtitle.
 */

/** Known Supabase / auth error mappings */
const ERROR_MAP: Record<string, { hindi: string; english: string }> = {
  // Auth errors
  'invalid login credentials': {
    hindi: 'गलत जानकारी दी गई है',
    english: 'Invalid login credentials',
  },
  'email not confirmed': {
    hindi: 'ईमेल अभी वेरिफ़ाई नहीं हुआ',
    english: 'Email not verified yet',
  },
  'user already registered': {
    hindi: 'यह अकाउंट पहले से है',
    english: 'This account already exists',
  },
  'email rate limit exceeded': {
    hindi: 'बहुत ज़्यादा कोशिशें हो गईं। थोड़ी देर बाद दोबारा करें',
    english: 'Too many attempts. Please try after some time',
  },
  'otp expired': {
    hindi: 'OTP का समय खत्म हो गया। नया OTP भेजें',
    english: 'OTP expired. Please request a new one',
  },
  'invalid otp': {
    hindi: 'गलत OTP है। कृपया फिर से कोशिश करें',
    english: 'Invalid OTP. Please try again',
  },
  'jwt expired': {
    hindi: 'सत्र समाप्त हो गया। फिर से लॉगिन करें',
    english: 'Session expired. Please login again',
  },
  'refresh_token_not_found': {
    hindi: 'सत्र समाप्त हो गया। फिर से लॉगिन करें',
    english: 'Session expired. Please login again',
  },
  'user not found': {
    hindi: 'यह अकाउंट नहीं मिला',
    english: 'Account not found',
  },
  'signups not allowed for otp': {
    hindi: 'इस नंबर से रजिस्ट्रेशन बंद है',
    english: 'Signups not allowed via OTP',
  },
  'sms send failed': {
    hindi: 'SMS नहीं भेज पाए। कृपया दोबारा कोशिश करें',
    english: 'SMS could not be sent. Please try again',
  },
  'sms provider error': {
    hindi: 'SMS सेवा में समस्या है। कुछ देर बाद कोशिश करें',
    english: 'SMS service error. Please try after some time',
  },
  'phone number not valid': {
    hindi: 'सही फ़ोन नंबर डालें (10 अंक)',
    english: 'Enter a valid 10-digit phone number',
  },
  'over email sending rate limit': {
    hindi: 'बहुत ज़्यादा OTP भेजे गए। 1 मिनट बाद कोशिश करें',
    english: 'Too many OTPs sent. Wait 1 minute',
  },
  'over sms sending rate limit': {
    hindi: 'बहुत ज़्यादा SMS भेजे गए। 1 मिनट बाद कोशिश करें',
    english: 'Too many SMS sent. Wait 1 minute',
  },

  // Network errors
  'failed to fetch': {
    hindi: 'इंटरनेट कनेक्शन जाँचें',
    english: 'Check your internet connection',
  },
  'network request failed': {
    hindi: 'इंटरनेट कनेक्शन जाँचें',
    english: 'Check your internet connection',
  },
  'load failed': {
    hindi: 'लोड नहीं हो पाया। इंटरनेट जाँचें',
    english: 'Could not load. Check your internet',
  },

  // Database/RLS errors
  'new row violates row-level security': {
    hindi: 'यह कार्य करने की अनुमति नहीं है',
    english: 'You do not have permission for this action',
  },
  'permission denied': {
    hindi: 'यह कार्य करने की अनुमति नहीं है',
    english: 'Permission denied',
  },

  // Rate limiting
  'rate limit': {
    hindi: 'बहुत तेज़ी से कोशिश की। थोड़ा रुकें',
    english: 'Too many requests. Please wait',
  },
};

/**
 * Default fallback messages for common action contexts
 */
const FALLBACK_MAP: Record<string, { hindi: string; english: string }> = {
  'failed to initialize': {
    hindi: 'ऐप शुरू नहीं हो पाया',
    english: 'App could not start. Please refresh',
  },
  'failed to send otp': {
    hindi: 'OTP नहीं भेज पाए',
    english: 'Could not send OTP. Please try again',
  },
  'verification failed': {
    hindi: 'वेरिफिकेशन नहीं हो पाया',
    english: 'Verification failed. Please try again',
  },
  'sign in failed': {
    hindi: 'लॉगिन नहीं हो पाया',
    english: 'Sign in failed. Please try again',
  },
  'sign up failed': {
    hindi: 'रजिस्ट्रेशन नहीं हो पाया',
    english: 'Sign up failed. Please try again',
  },
  'google sign-in failed': {
    hindi: 'Google से लॉगिन नहीं हो पाया',
    english: 'Google sign-in failed. Please try again',
  },
  'apple sign-in failed': {
    hindi: 'Apple से लॉगिन नहीं हो पाया',
    english: 'Apple sign-in failed. Please try again',
  },
  'failed to fetch profile': {
    hindi: 'प्रोफाइल लोड नहीं हो पाई',
    english: 'Could not load profile',
  },
  'update failed': {
    hindi: 'अपडेट नहीं हो पाया',
    english: 'Update failed. Please try again',
  },
  'failed to fetch posts': {
    hindi: 'पोस्ट लोड नहीं हो पाए',
    english: 'Could not load posts',
  },
  'failed to create post': {
    hindi: 'पोस्ट नहीं बना पाए',
    english: 'Could not create post. Please try again',
  },
  'failed to fetch notifications': {
    hindi: 'सूचनाएं लोड नहीं हो पाईं',
    english: 'Could not load notifications',
  },
  'failed to mark as read': {
    hindi: 'पढ़ा गया नहीं दिखा पाए',
    english: 'Could not mark as read',
  },
  'failed to mark all as read': {
    hindi: 'सब पढ़ा गया नहीं दिखा पाए',
    english: 'Could not mark all as read',
  },
  'failed to fetch family': {
    hindi: 'परिवार की जानकारी लोड नहीं हो पाई',
    english: 'Could not load family data',
  },
  'search failed': {
    hindi: 'खोज नहीं हो पाई',
    english: 'Search failed. Please try again',
  },
  'failed to add member': {
    hindi: 'सदस्य नहीं जोड़ पाए',
    english: 'Could not add member. Please try again',
  },
  'failed to remove member': {
    hindi: 'सदस्य हटा नहीं पाए',
    english: 'Could not remove member',
  },
  'failed to fetch events': {
    hindi: 'कार्यक्रम लोड नहीं हो पाए',
    english: 'Could not load events',
  },
  'failed to fetch event': {
    hindi: 'कार्यक्रम की जानकारी लोड नहीं हो पाई',
    english: 'Could not load event details',
  },
  'failed to create event': {
    hindi: 'कार्यक्रम नहीं बना पाए',
    english: 'Could not create event. Please try again',
  },
  'rsvp failed': {
    hindi: 'RSVP नहीं हो पाया',
    english: 'RSVP failed. Please try again',
  },
  'failed to fetch rsvps': {
    hindi: 'RSVP जानकारी लोड नहीं हो पाई',
    english: 'Could not load RSVPs',
  },
  'failed to fetch conversations': {
    hindi: 'बातचीत लोड नहीं हो पाई',
    english: 'Could not load conversations',
  },
  'failed to fetch messages': {
    hindi: 'संदेश लोड नहीं हो पाए',
    english: 'Could not load messages',
  },
  'failed to send message': {
    hindi: 'संदेश नहीं भेज पाए',
    english: 'Could not send message. Please try again',
  },
  'failed to load settings': {
    hindi: 'सेटिंग्स लोड नहीं हो पाईं',
    english: 'Could not load settings',
  },
  'failed to save setting': {
    hindi: 'सेटिंग सेव नहीं हो पाई',
    english: 'Could not save setting',
  },
  'failed to load analytics': {
    hindi: 'एनालिटिक्स लोड नहीं हो पाए',
    english: 'Could not load analytics',
  },
  'failed to load dashboard': {
    hindi: 'डैशबोर्ड लोड नहीं हो पाया',
    english: 'Could not load dashboard',
  },
  'failed to load audit logs': {
    hindi: 'ऑडिट लॉग लोड नहीं हो पाए',
    english: 'Could not load audit logs',
  },
  'error': {
    hindi: 'कुछ गलत हो गया',
    english: 'Something went wrong',
  },
};

/**
 * Convert any error message to Hindi-first format.
 * Checks known Supabase errors first, then fallback map, then generic.
 */
export function friendlyError(errorMsg: string): string {
  const lower = errorMsg.toLowerCase().trim();

  // Check exact Supabase error matches
  for (const [key, val] of Object.entries(ERROR_MAP)) {
    if (lower.includes(key)) {
      return `${val.hindi}\n${val.english}`;
    }
  }

  // Check fallback action-context matches
  for (const [key, val] of Object.entries(FALLBACK_MAP)) {
    if (lower === key || lower.includes(key)) {
      return `${val.hindi}\n${val.english}`;
    }
  }

  // Generic fallback
  return `कुछ गलत हो गया। कृपया दोबारा कोशिश करें\nSomething went wrong. Please try again`;
}

/**
 * Get Hindi + English pair for a known fallback key.
 * Returns { hindi, english } or generic fallback.
 */
export function getErrorPair(key: string): { hindi: string; english: string } {
  const lower = key.toLowerCase().trim();
  return (
    FALLBACK_MAP[lower] ??
    ERROR_MAP[lower] ?? {
      hindi: 'कुछ गलत हो गया। कृपया दोबारा कोशिश करें',
      english: 'Something went wrong. Please try again',
    }
  );
}
