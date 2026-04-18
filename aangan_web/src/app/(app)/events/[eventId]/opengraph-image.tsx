import { ImageResponse } from 'next/og';
import { createSupabaseServer } from '@/lib/supabase/server';

// Next's built-in route handler — serves /events/:id/opengraph-image.png
// referenced from the Metadata `openGraph.images` via Next's convention.
export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Aangan event invite';

interface Props {
  params: Promise<{ eventId: string }>;
}

const EVENT_EMOJI: Record<string, string> = {
  wedding: '💍', engagement: '💐', puja: '🪔',
  birthday: '🎂', gathering: '🎉', mundan: '✂️',
  housewarming: '🏡', festival: '🪔', reunion: '👨‍👩‍👧‍👦', other: '📅',
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
    });
  } catch { return ''; }
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    });
  } catch { return ''; }
}

/**
 * Renders a 1200x630 branded preview card for every shared event link.
 * This is the difference between WhatsApp showing a plain-text fallback
 * and showing a "real invite" card — dramatically higher CTR on forwards.
 *
 * Falls back to a generic "Aangan event" card if the event can't be read
 * (private event, RLS hides from anon crawler, or missing).
 */
export default async function OpengraphImage({ params }: Props) {
  const { eventId } = await params;

  let title = "You're invited";
  let subtitle = 'Aangan — Family Events';
  let emoji = '📅';
  let date = '';
  let time = '';
  let location = '';
  let hostedBy = '';

  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from('events')
      .select('title, title_hindi, event_type, start_datetime, location, hosted_by')
      .eq('id', eventId)
      .maybeSingle();

    if (data) {
      title = (data.title_hindi as string) || (data.title as string) || title;
      emoji = EVENT_EMOJI[(data.event_type as string) ?? 'other'] ?? '📅';
      date = formatDate(data.start_datetime as string | null);
      time = formatTime(data.start_datetime as string | null);
      location = (data.location as string) || '';
      hostedBy = (data.hosted_by as string) || '';
      subtitle = hostedBy ? `${hostedBy} की ओर से` : 'You are invited';
    }
  } catch {
    // RLS hid the row or DB hiccuped — render the generic fallback card.
  }

  const CREAM = '#FDFAF0';
  const HALDI = '#C8A84B';
  const HALDI_DARK = '#9F8436';
  const MEHNDI = '#7A9A3A';
  const BROWN = '#5A4A32';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(135deg, ${CREAM} 0%, #F4EDD6 100%)`,
          padding: '60px 80px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Decorative corner ornament — mimics traditional invite motif */}
        <div style={{ position: 'absolute', top: 40, right: 60, fontSize: 90, opacity: 0.25 }}>🪔</div>
        <div style={{ position: 'absolute', bottom: 40, left: 60, fontSize: 90, opacity: 0.25 }}>🪔</div>

        {/* Brand header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: HALDI,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, color: 'white',
          }}>
            आ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 38, fontWeight: 700, color: HALDI_DARK, lineHeight: 1 }}>Aangan</span>
            <span style={{ fontSize: 22, color: BROWN, marginTop: 4 }}>आँगन · Family Events</span>
          </div>
        </div>

        {/* Event body */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 40 }}>
          <div style={{
            fontSize: 200, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 220,
          }}>
            {emoji}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: 26, color: MEHNDI, fontWeight: 600, marginBottom: 12,
              textTransform: 'uppercase', letterSpacing: 2,
            }}>
              🎊 {subtitle}
            </span>
            <span style={{
              fontSize: 68, fontWeight: 700, color: BROWN, lineHeight: 1.15,
              marginBottom: 24, display: 'flex', flexWrap: 'wrap',
            }}>
              {title.length > 60 ? title.slice(0, 58) + '…' : title}
            </span>
            {(date || time) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 32, color: HALDI_DARK, fontWeight: 600, marginBottom: 8 }}>
                <span>📅 {date}</span>
                {time && <span>· 🕐 {time}</span>}
              </div>
            )}
            {location && (
              <div style={{ fontSize: 28, color: BROWN, display: 'flex', alignItems: 'center' }}>
                📍 {location.length > 50 ? location.slice(0, 48) + '…' : location}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 40, paddingTop: 24, borderTop: `2px solid ${HALDI}33`,
          fontSize: 22, color: BROWN,
        }}>
          <span>🙏 Tap to RSVP</span>
          <span style={{ color: HALDI_DARK, fontWeight: 600 }}>aangan.app</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
