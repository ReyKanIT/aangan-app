'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const APP_URL = 'https://aangan.app';

const DEFAULT_HINDI_MESSAGE = (referrerName: string | undefined, url: string) => {
  const opener = referrerName
    ? `${referrerName} ने आपको Aangan आँगन पर बुलाया है! 🏠`
    : 'नमस्ते! 🙏 मैं आपको Aangan आँगन पर बुलाना चाहता/चाहती हूँ।';
  return `${opener}

Aangan एक हिंदी-फर्स्ट परिवार सोशल नेटवर्क है — परिवार से जुड़ें, पल साझा करें, पंचांग देखें, त्योहार मनाएं।

✨ आवाज़ से लिखें (Hindi voice-to-text)
👨‍👩‍👧‍👦 परिवार का पेड़ बनाएं
📅 पंचांग और त्योहार
🎉 इवेंट और RSVP

अभी डाउनलोड करें — दादी भी आसानी से चला सकती हैं!
${url}`;
};

function InviteContent() {
  const params = useSearchParams();
  const ref = params.get('ref') ?? undefined;
  const inviterName = params.get('name') ?? undefined;

  const [copied, setCopied] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  const shareUrl = ref ? `${APP_URL}/?ref=${encodeURIComponent(ref)}` : APP_URL;

  useEffect(() => {
    setCustomMsg(DEFAULT_HINDI_MESSAGE(inviterName, shareUrl));
  }, [inviterName, shareUrl]);

  const finalMessage = customMsg || DEFAULT_HINDI_MESSAGE(inviterName, shareUrl);

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(finalMessage)}`;
  const smsHref = `sms:?&body=${encodeURIComponent(finalMessage)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent('Aangan आँगन — परिवार से जुड़ें')}&body=${encodeURIComponent(finalMessage)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('लिंक कॉपी करें — Copy link:', finalMessage);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Aangan — आँगन',
          text: finalMessage,
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <main className="min-h-screen bg-cream font-body text-brown">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-haldi-gold/20">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="font-heading text-2xl text-haldi-gold tracking-wide">
            Aangan <span className="text-haldi-gold-dark">आँगन</span>
          </a>
          <a
            href="/login"
            className="px-5 py-2 rounded-full bg-haldi-gold text-white font-semibold text-base hover:bg-haldi-gold-dark transition-colors"
          >
            Login
          </a>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10 md:py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl mb-3 block">💌</span>
          <h1 className="font-heading text-3xl md:text-4xl text-haldi-gold">
            परिवार को आमंत्रित करें
          </h1>
          <p className="text-lg text-brown-light mt-2">Invite Your Family to Aangan</p>
          <p className="text-base text-brown-light/70 mt-3 max-w-md mx-auto">
            WhatsApp पर एक क्लिक में अपने परिवार को बुलाएं — संदेश पहले से तैयार है।
          </p>
        </div>

        {/* Big WhatsApp CTA */}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full px-6 py-5 min-h-dadi rounded-2xl bg-[#25D366] text-white font-semibold text-xl hover:bg-[#1DA851] transition-colors shadow-lg shadow-[#25D366]/25 mb-4"
        >
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp पर भेजें
        </a>

        {/* Secondary share row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <button
            onClick={handleNativeShare}
            className="flex flex-col items-center justify-center gap-1 px-3 py-3 min-h-dadi rounded-xl bg-haldi-gold text-white font-semibold text-base hover:bg-haldi-gold-dark transition-colors"
          >
            <span className="text-xl">📱</span>
            <span className="text-sm">शेयर</span>
          </button>
          <a
            href={smsHref}
            className="flex flex-col items-center justify-center gap-1 px-3 py-3 min-h-dadi rounded-xl bg-mehndi-green text-white font-semibold text-base hover:bg-mehndi-green-light hover:text-brown transition-colors"
          >
            <span className="text-xl">💬</span>
            <span className="text-sm">SMS</span>
          </a>
          <a
            href={emailHref}
            className="flex flex-col items-center justify-center gap-1 px-3 py-3 min-h-dadi rounded-xl bg-brown text-cream font-semibold text-base hover:bg-brown-light transition-colors"
          >
            <span className="text-xl">✉️</span>
            <span className="text-sm">Email</span>
          </a>
        </div>

        {/* Editable message preview */}
        <div className="bg-white rounded-2xl border border-haldi-gold/20 p-5 mb-6">
          <label className="block font-heading text-lg text-brown mb-2">
            संदेश — Your invite message
          </label>
          <textarea
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 rounded-xl border border-haldi-gold/30 bg-cream/30 text-base text-brown focus:outline-none focus:border-haldi-gold resize-y min-h-[180px]"
          />
          <button
            onClick={handleCopy}
            className="mt-3 inline-flex items-center gap-2 px-5 py-3 min-h-dadi rounded-xl bg-cream-dark text-brown font-semibold text-base hover:bg-haldi-gold/10 transition-colors"
          >
            {copied ? '✅ कॉपी हो गया!' : '📋 संदेश कॉपी करें'}
          </button>
        </div>

        {/* Why invite */}
        <section className="bg-white rounded-2xl border border-haldi-gold/10 p-6 mb-8">
          <h2 className="font-heading text-xl text-haldi-gold-dark mb-3">
            परिवार क्यों जोड़ें? — Why invite family?
          </h2>
          <ul className="space-y-2 text-base text-brown-light">
            <li className="flex gap-2"><span>👨‍👩‍👧‍👦</span><span>परिवार का पेड़ बनाएं — 3 स्तर तक</span></li>
            <li className="flex gap-2"><span>💬</span><span>निजी फ़ीड — सिर्फ़ परिवार देख सकता है</span></li>
            <li className="flex gap-2"><span>🎉</span><span>इवेंट और RSVP एक जगह</span></li>
            <li className="flex gap-2"><span>📅</span><span>हिंदू पंचांग और त्योहार</span></li>
          </ul>
        </section>

        {/* CTA back to landing */}
        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-haldi-gold font-semibold text-base hover:bg-haldi-gold/10 transition-colors"
          >
            ← Aangan के बारे में और जानें
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 bg-brown text-cream mt-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-cream-dark">
          <span className="font-heading text-haldi-gold">Aangan आँगन</span>
          <div className="flex gap-4">
            <a href="/festivals" className="hover:text-haldi-gold transition-colors">Festivals</a>
            <a href="/panchang" className="hover:text-haldi-gold transition-colors">Panchang</a>
            <a href="/privacy" className="hover:text-haldi-gold transition-colors">Privacy</a>
          </div>
          <p>&copy; 2026 ReyKan IT Private Limited</p>
        </div>
      </footer>
    </main>
  );
}

export default function InviteClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <InviteContent />
    </Suspense>
  );
}
