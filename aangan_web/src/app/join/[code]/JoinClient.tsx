'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

interface Props {
  code: string;
  invite: InviteLookup;
}

const PLAY_URL =
  'https://play.google.com/store/apps/details?id=app.aangan.family';
const APK_URL = 'https://media.aangan.app/releases/Aangan-latest.apk';
const INDUS_URL = 'https://www.indusappstore.com/apps/social/aangan';

/**
 * Detect whether the visitor is on a mobile device. Used to pick the
 * primary CTA: "Open in app" (mobile) vs "Download" (desktop).
 */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent || '';
    setMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(ua));
  }, []);
  return mobile;
}

function Avatar({ url, name }: { url?: string; name?: string }) {
  const initials = (name || 'A').slice(0, 2).toUpperCase();
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name || 'Inviter'}
        className="w-24 h-24 rounded-full object-cover border-4 border-[#C8A84B]"
      />
    );
  }
  return (
    <div className="w-24 h-24 rounded-full bg-[#7A9A3A] text-white flex items-center justify-center text-3xl font-bold border-4 border-[#C8A84B]">
      {initials}
    </div>
  );
}

export default function JoinClient({ code, invite }: Props) {
  const isMobile = useIsMobile();
  // Universal link form — works as a deep link on Android (App Links) and
  // the iOS Universal Links system once those are configured. Until then,
  // tapping the deep-link CTA will fall back to the install path on iOS.
  const deepLink = `aangan://join/${code}`;
  const inviterName =
    invite.inviter_display_name_hindi ||
    invite.inviter_display_name ||
    'किसी';
  const relLabel = invite.relationship_label_hindi || 'परिवार';
  const reverseLabel = invite.reverse_relationship_label_hindi;

  const expiresOn = invite.expires_at
    ? new Date(invite.expires_at).toLocaleDateString('hi-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : null;

  // ── Error/expired/claimed/revoked states ────────────────────────────────
  if (!invite.found || invite.state !== 'active') {
    const reason = invite.error || invite.state || 'unknown';
    return (
      <main className="min-h-dvh bg-[#FDFAF0] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border border-[#C8A84B]/20 text-center">
          <div className="text-5xl mb-4">🤔</div>
          <h1 className="text-2xl font-bold text-[#4A2C2A] mb-2">
            यह आमंत्रण उपलब्ध नहीं है
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            {reason === 'invalid_code' && 'कोड सही नहीं है। कृपया अपने परिवार के सदस्य से दोबारा लिंक मांगें।'}
            {reason === 'not_found' && 'यह आमंत्रण कोड मौजूद नहीं है।'}
            {reason === 'expired' && 'यह आमंत्रण समाप्त हो गया है। नया लिंक मांगें।'}
            {reason === 'claimed' && 'यह आमंत्रण पहले ही उपयोग किया जा चुका है।'}
            {reason === 'revoked' && 'यह आमंत्रण रद्द कर दिया गया है।'}
            {reason === 'lookup_error' && 'सर्वर से जुड़ने में दिक्कत हुई। कुछ देर में फिर कोशिश करें।'}
            {reason === 'network_error' && 'नेटवर्क की दिक्कत है। कुछ देर में फिर कोशिश करें।'}
            {!['invalid_code', 'not_found', 'expired', 'claimed', 'revoked', 'lookup_error', 'network_error'].includes(reason) &&
              'कुछ गड़बड़ हुई। कृपया अपने परिवार के सदस्य से नया लिंक मांगें।'}
          </p>
          <p className="text-xs text-gray-500 mb-6">
            <span className="block">{`Invite ${reason === 'invalid_code' ? 'code is invalid' :
              reason === 'not_found' ? 'not found' :
              reason === 'expired' ? 'has expired' :
              reason === 'claimed' ? 'already used' :
              reason === 'revoked' ? 'was revoked' :
              'could not be loaded'}.`}</span>
          </p>
          <Link
            href="/"
            className="inline-block w-full min-h-dadi bg-[#C8A84B] hover:bg-[#B79740] text-white font-semibold py-4 rounded-xl text-center transition-colors"
          >
            Aangan के बारे में जानें
          </Link>
        </div>
      </main>
    );
  }

  // ── Active invite — show inviter card + CTAs ────────────────────────────
  return (
    <main className="min-h-dvh bg-[#FDFAF0] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border border-[#C8A84B]/20">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Avatar url={invite.inviter_avatar_url} name={inviterName} />
          </div>
          <p className="text-sm text-gray-500 mb-1">परिवार आमंत्रण</p>
          <h1 className="text-2xl font-bold text-[#4A2C2A] mb-2">
            {inviterName}
          </h1>
          <p className="text-base text-gray-700">
            ने आपको <strong className="text-[#C8A84B]">{relLabel}</strong> के रूप में
            अपने Aangan परिवार में जोड़ा है
          </p>
          {reverseLabel && (
            <p className="text-sm text-gray-500 mt-1">
              आप उन्हें <strong>{reverseLabel}</strong> कहेंगे
            </p>
          )}
        </div>

        <div className="bg-[#FDFAF0] rounded-xl p-4 mb-6 border border-[#C8A84B]/10">
          <p className="text-sm text-[#4A2C2A] text-center mb-2">
            🏡 क्या आप जुड़ना चाहते हैं?
          </p>
          <p className="text-xs text-gray-500 text-center">
            Aangan एक हिंदी-फर्स्ट परिवार सोशल नेटवर्क है।
            <br />
            India&apos;s first family social network in Hindi.
          </p>
        </div>

        {/* Mobile primary: open the app via deep link. App-installed users
            land directly on JoinFamilyScreen and complete the claim. */}
        {isMobile && (
          <a
            href={deepLink}
            className="block w-full min-h-dadi bg-[#7A9A3A] hover:bg-[#658030] text-white font-bold py-4 rounded-xl text-center text-lg mb-3 transition-colors"
            data-testid="open-in-app"
          >
            📱 Aangan ऐप में खोलें
          </a>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <a
            href={PLAY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 min-h-dadi bg-[#C8A84B] hover:bg-[#B79740] text-white font-semibold py-3 rounded-xl transition-colors"
          >
            <span>📲</span>
            <span>Play Store</span>
          </a>
          <a
            href={APK_URL}
            className="flex items-center justify-center gap-2 min-h-dadi bg-white hover:bg-gray-50 text-[#4A2C2A] font-semibold py-3 rounded-xl border-2 border-[#C8A84B] transition-colors"
          >
            <span>⬇️</span>
            <span>APK</span>
          </a>
        </div>
        <a
          href={INDUS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 min-h-dadi bg-white hover:bg-gray-50 text-[#4A2C2A] font-medium py-3 rounded-xl border border-gray-300 mb-6 transition-colors text-sm"
        >
          <span>🇮🇳</span>
          <span>Indus App Store पर भी उपलब्ध</span>
        </a>

        <div className="text-center text-xs text-gray-400 space-y-1">
          {expiresOn && <p>आमंत्रण की समाप्ति: {expiresOn}</p>}
          <p className="font-mono tracking-wider">कोड: {code}</p>
          <p className="pt-3">
            <Link href="/" className="text-[#C8A84B] underline">
              Aangan के बारे में और जानें
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
