/**
 * Parse free-form paste into a list of { name, phone } invitees.
 *
 * Accepts one entry per line. Each line can be:
 *   - "Ram Sharma, 9876543210"
 *   - "Ram Sharma 9876543210"
 *   - "Ram Sharma - 9876543210"
 *   - "+91 98765 43210" (phone only — name defaults to phone)
 *   - "9876543210"       (same)
 *   - "Ram, +91-98765-43210, cousin"
 *
 * Returns normalized { name, phone (digits-only with +91 country code),
 * relationship }.
 *
 * Invalid lines collected separately so the user can fix them without losing
 * the rest of the paste.
 */

export interface ParsedInvitee {
  name: string;
  phone: string;         // normalized to +91XXXXXXXXXX
  relationship?: string;
}

export interface ParseResult {
  ok: ParsedInvitee[];
  skipped: Array<{ line: string; reason: string }>;
}

// Matches 10-digit Indian mobile starting 6-9, optionally with +91 / 91 / 0 prefix.
// Allows spaces, dashes, parens inside.
const PHONE_RE = /(?:\+?91[-\s]?|0)?([6-9]\d{4})[-\s]?(\d{5})/;

function extractPhone(line: string): string | null {
  const m = line.match(PHONE_RE);
  if (!m) return null;
  const digits = `${m[1]}${m[2]}`;
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `+91${digits}`;
}

function extractName(line: string, phoneRaw: string): string {
  // Strip the phone span from the line, then clean trailing punctuation.
  const withoutPhone = line.replace(phoneRaw, '').trim();
  const cleaned = withoutPhone
    .replace(/[,\-–—|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

function extractRelationship(line: string): string | undefined {
  // Anything after the second comma is treated as relationship hint.
  // e.g. "Ram, 9876543210, cousin" → relationship = "cousin"
  const parts = line.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 1];
  return undefined;
}

export function parseInviteePaste(input: string): ParseResult {
  const ok: ParsedInvitee[] = [];
  const skipped: Array<{ line: string; reason: string }> = [];
  const seenPhones = new Set<string>();

  const lines = input.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const phone = extractPhone(line);
    if (!phone) {
      skipped.push({ line, reason: 'No valid 10-digit Indian mobile found (must start 6-9)' });
      continue;
    }
    if (seenPhones.has(phone)) {
      skipped.push({ line, reason: 'Duplicate phone in paste' });
      continue;
    }
    seenPhones.add(phone);

    // Find the raw phone substring to strip it cleanly.
    const rawMatch = line.match(PHONE_RE);
    const rawPhone = rawMatch?.[0] ?? phone;
    let name = extractName(line, rawPhone);
    if (!name) name = phone; // default to phone as name when line is phone-only

    const relationship = extractRelationship(line);

    ok.push({ name, phone, relationship });
  }

  return { ok, skipped };
}
