import type { Metadata } from 'next';
import { createSupabaseServer } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ eventId: string }>;
}

/**
 * Rich OG metadata for event links — turns a raw `/events/<uuid>` URL into
 * a preview card when pasted into WhatsApp, iMessage, or Telegram. This is
 * the single most effective growth lever: every forward becomes an invite.
 *
 * Falls back to generic metadata if the event is private or not found, so
 * bots crawling unauthenticated don't leak event details.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  try {
    const supabase = await createSupabaseServer();
    // Only select fields that are safe to expose publicly. Note: this runs as
    // the caller (anon for unauth WhatsApp crawl); RLS may legitimately hide
    // the row. That's fine — we fall through to generic metadata.
    const { data } = await supabase
      .from('events')
      .select('title, title_hindi, description, start_datetime, location, banner_url, hosted_by')
      .eq('id', eventId)
      .maybeSingle();

    if (!data) {
      return {
        title: 'Aangan — आपको न्यौता है',
        description: 'परिवार के लिए इवेंट ऐप',
      };
    }

    const title = data.title_hindi || data.title || 'Aangan Event';
    const dateStr = data.start_datetime
      ? new Date(data.start_datetime).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
      : '';
    const timeStr = data.start_datetime
      ? new Date(data.start_datetime).toLocaleTimeString('hi-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
      : '';
    const description = [
      data.hosted_by ? `${data.hosted_by} की ओर से 🙏` : null,
      dateStr ? `📅 ${dateStr}` : null,
      timeStr ? `🕐 ${timeStr}` : null,
      data.location ? `📍 ${data.location}` : null,
      data.description?.slice(0, 120),
    ].filter(Boolean).join(' · ');

    const images = data.banner_url ? [{ url: data.banner_url, alt: title }] : undefined;

    return {
      title: `${title} — Aangan`,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        siteName: 'Aangan — आँगन',
        locale: 'hi_IN',
        images,
      },
      twitter: {
        card: images ? 'summary_large_image' : 'summary',
        title,
        description,
        images: data.banner_url ? [data.banner_url] : undefined,
      },
    };
  } catch {
    return {
      title: 'Aangan — आपको न्यौता है',
      description: 'परिवार के लिए इवेंट ऐप',
    };
  }
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
