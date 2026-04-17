import type { AanganEvent } from '@/types/database';

/**
 * Format a Date into the compact UTC form ICS expects: YYYYMMDDTHHMMSSZ.
 * ICS parsers are strict about this — spaces, colons, or fractional seconds break Apple Calendar.
 */
function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Escape per RFC 5545 — commas, semicolons, and newlines are field-delimiters in ICS. */
function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildEventIcs(event: AanganEvent): string {
  const uid = `${event.id}@aangan.app`;
  const dtstamp = toIcsUtc(new Date().toISOString());
  const dtstart = toIcsUtc(event.start_datetime);
  // 3-hour default duration if end isn't specified — matches typical Indian family event length.
  const dtend = toIcsUtc(event.end_datetime ?? new Date(new Date(event.start_datetime).getTime() + 3 * 60 * 60 * 1000).toISOString());
  const summary = escapeIcs(event.title_hindi || event.title);
  const description = escapeIcs([event.description || '', `https://aangan.app/events/${event.id}`].filter(Boolean).join('\n\n'));
  const location = event.location ? escapeIcs(event.location_hindi || event.location) : '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Aangan//Event//HI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : '',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export function downloadEventIcs(event: AanganEvent): void {
  const ics = buildEventIcs(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(event.title_hindi || event.title).replace(/[^\w\u0900-\u097F]+/g, '_').slice(0, 40) || 'event'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
