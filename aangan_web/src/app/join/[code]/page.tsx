import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { createSupabaseServer } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/constants';
import JoinClient from './JoinClient';

interface Props {
  params: Promise<{ code: string }>;
}

interface InviteLookup {
  found: boolean;
  state?: 'active' | 'expired' | 'claimed' | 'revoked';
  error?: string;
  inviter_display_name?: string;
  inviter_display_name_hindi?: string;
  inviter_avatar_url?: string;
  relationship_label_hindi?: string;
  reverse_relationship_label_hindi?: string;
  expires_at?: string;
}

async function fetchInvite(code: string): Promise<InviteLookup> {
  // Always-readable lookup via SECURITY DEFINER RPC (anon callable).
  // Records a click row server-side as a side effect.
  try {
    const supabase = await createSupabaseServer();
    const headerStore = await headers();
    const ua = headerStore.get('user-agent') ?? null;
    const referer = headerStore.get('referer') ?? null;

    const { data, error } = await supabase.rpc('lookup_invite', {
      p_code: code,
      p_user_agent: ua,
      p_referer: referer,
    });
    if (error) {
      return { found: false, error: 'lookup_error' };
    }
    return (data ?? { found: false, error: 'empty' }) as InviteLookup;
  } catch {
    return { found: false, error: 'network_error' };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const invite = await fetchInvite(code);

  if (!invite.found || invite.state !== 'active') {
    return {
      title: 'आमंत्रण — Family Invite | Aangan आँगन',
      description: 'You have been invited to join a family on Aangan आँगन.',
      robots: { index: false, follow: false },
    };
  }

  const inviterName =
    invite.inviter_display_name_hindi || invite.inviter_display_name || 'किसी ने';
  const relLabel = invite.relationship_label_hindi || 'परिवार में';
  const title = `${inviterName} ने आपको ${relLabel} के रूप में Aangan पर बुलाया है`;
  const description =
    `${inviterName} आपको अपने Aangan परिवार में जोड़ना चाहते हैं। ` +
    `नीचे दिए गए लिंक पर टैप करें और परिवार से जुड़ें।`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: siteUrl(`/join/${code}`),
      type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Aangan आँगन' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
    robots: { index: false, follow: false },
    alternates: { canonical: siteUrl(`/join/${code}`) },
  };
}

export default async function JoinFamilyPage({ params }: Props) {
  const { code } = await params;
  // Validate shape early — invalid codes never hit the DB lookup.
  const isShapeValid = /^[A-HJ-NP-Z2-9]{6}$/.test(code);
  const invite = isShapeValid
    ? await fetchInvite(code)
    : ({ found: false, error: 'invalid_code' } as InviteLookup);

  return <JoinClient code={code} invite={invite} />;
}
