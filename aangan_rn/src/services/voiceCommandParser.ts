/**
 * Voice Command Parser for Aangan
 * Supports Hindi and English pattern matching for navigation commands.
 */

export interface VoiceCommand {
  id: string;
  patterns: { hi: string[]; en: string[] };
  screen: string;
  tab?: string;
  feedback: { hi: string; en: string };
}

export const VOICE_COMMANDS: VoiceCommand[] = [
  {
    id: 'nav_home',
    patterns: {
      hi: ['घर दिखाओ', 'होम पेज', 'मुख्य पेज', 'घर चलो'],
      en: ['go home', 'show home', 'home page', 'home'],
    },
    screen: 'Main',
    tab: 'Home',
    feedback: { hi: 'होम पेज खोल रहे हैं', en: 'Opening home page' },
  },
  {
    id: 'nav_family',
    patterns: {
      hi: ['परिवार दिखाओ', 'फैमिली ट्री', 'परिवार खोलो'],
      en: ['show family', 'family tree', 'family'],
    },
    screen: 'Main',
    tab: 'Family',
    feedback: { hi: 'परिवार पेज खोल रहे हैं', en: 'Opening family page' },
  },
  {
    id: 'nav_compose',
    patterns: {
      hi: ['नया पोस्ट लिखो', 'पोस्ट करो', 'लिखो'],
      en: ['new post', 'write post', 'compose'],
    },
    screen: 'PostComposer',
    feedback: { hi: 'नया पोस्ट लिख रहे हैं', en: 'Opening post composer' },
  },
  {
    id: 'nav_notifications',
    patterns: {
      hi: ['सूचनाएं दिखाओ', 'नोटिफिकेशन', 'सूचना'],
      en: ['show notifications', 'notifications'],
    },
    screen: 'Main',
    tab: 'Notifications',
    feedback: { hi: 'सूचनाएं दिखा रहे हैं', en: 'Showing notifications' },
  },
  {
    id: 'nav_settings',
    patterns: {
      hi: ['सेटिंग खोलो', 'सेटिंग्स'],
      en: ['open settings', 'settings'],
    },
    screen: 'Main',
    tab: 'Settings',
    feedback: { hi: 'सेटिंग्स खोल रहे हैं', en: 'Opening settings' },
  },
  {
    id: 'nav_messages',
    patterns: {
      hi: ['संदेश दिखाओ', 'चैट खोलो', 'मैसेज'],
      en: ['show messages', 'open chat', 'messages'],
    },
    screen: 'MessageList',
    feedback: { hi: 'संदेश खोल रहे हैं', en: 'Opening messages' },
  },
  {
    id: 'nav_events',
    patterns: {
      hi: ['इवेंट बनाओ', 'नया कार्यक्रम', 'इवेंट'],
      en: ['create event', 'new event'],
    },
    screen: 'EventCreator',
    feedback: { hi: 'नया इवेंट बना रहे हैं', en: 'Creating new event' },
  },
  {
    id: 'nav_search',
    patterns: {
      hi: ['खोजो', 'सर्च करो', 'ढूंढो'],
      en: ['search', 'find'],
    },
    screen: 'Main',
    tab: 'Family',
    feedback: { hi: 'खोज रहे हैं', en: 'Opening search' },
  },
];

const JACCARD_THRESHOLD = 0.6;

/**
 * Normalize a transcript string: lowercase, trim, remove punctuation.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[।,!?.\-;:'"()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compute Jaccard similarity between two sets of words.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Parse a voice transcript and return the matching VoiceCommand, or null.
 *
 * Strategy:
 * 1. Normalize the transcript.
 * 2. Check for substring matches (pattern found within transcript).
 * 3. Fall back to Jaccard word-overlap with a >= 0.6 threshold.
 *
 * Returns the best matching command, preferring exact substring matches
 * and longer patterns (more specific).
 */
export function parseCommand(
  transcript: string,
  locale: 'hi' | 'en'
): VoiceCommand | null {
  const normalized = normalize(transcript);
  if (!normalized) return null;

  // Phase 1: substring match — prefer longer (more specific) patterns
  let bestSubstring: { command: VoiceCommand; length: number } | null = null;

  for (const command of VOICE_COMMANDS) {
    const patterns = command.patterns[locale];
    for (const pattern of patterns) {
      const normalizedPattern = normalize(pattern);
      if (normalized.includes(normalizedPattern)) {
        if (!bestSubstring || normalizedPattern.length > bestSubstring.length) {
          bestSubstring = { command, length: normalizedPattern.length };
        }
      }
    }
  }

  if (bestSubstring) return bestSubstring.command;

  // Phase 2: Jaccard word-overlap fallback
  const transcriptWords = new Set(normalized.split(' ').filter(Boolean));
  let bestJaccard: { command: VoiceCommand; score: number } | null = null;

  for (const command of VOICE_COMMANDS) {
    const patterns = command.patterns[locale];
    for (const pattern of patterns) {
      const patternWords = new Set(
        normalize(pattern).split(' ').filter(Boolean)
      );
      const score = jaccardSimilarity(transcriptWords, patternWords);
      if (
        score >= JACCARD_THRESHOLD &&
        (!bestJaccard || score > bestJaccard.score)
      ) {
        bestJaccard = { command, score };
      }
    }
  }

  return bestJaccard ? bestJaccard.command : null;
}

/**
 * Get localized feedback string for a matched command.
 */
export function getCommandFeedback(
  command: VoiceCommand,
  locale: 'hi' | 'en'
): string {
  return command.feedback[locale];
}
