'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.15) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);
  return isVisible;
}

function FadeIn({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useInView(ref);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const FEATURES = [
  {
    emoji: '🎤',
    title: 'Voice Control',
    hindi: 'बोलकर लिखें',
    desc: 'Voice-to-text in Hindi & English. Just speak and Aangan writes.',
  },
  {
    emoji: '👨‍👩‍👧‍👦',
    title: 'Family Tree',
    hindi: 'परिवार का पेड़',
    desc: '3 levels of relationships — from grandparents to grandchildren.',
  },
  {
    emoji: '📅',
    title: 'Panchang & Festivals',
    hindi: 'पंचांग और त्योहार',
    desc: 'Hindu calendar with tithi, nakshatra & upcoming festivals.',
  },
  {
    emoji: '💬',
    title: 'Voice Messages',
    hindi: 'आवाज़ भेजें',
    desc: 'WhatsApp-style voice notes for the whole family.',
  },
  {
    emoji: '🎉',
    title: 'Events & RSVP',
    hindi: 'कार्यक्रम',
    desc: 'Plan family events with RSVP tracking & photo sharing.',
  },
  {
    emoji: '🛕',
    title: 'Kuldevi',
    hindi: 'कुलदेवी/कुलदेवता',
    desc: 'Preserve family traditions, kuldevi info & spiritual roots.',
  },
];

const APK_URL = 'https://expo.dev/artifacts/eas/build-placeholder';

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/feed');
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-haldi-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream font-body text-brown overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-haldi-gold/20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-heading text-2xl text-haldi-gold tracking-wide">
            Aangan <span className="text-haldi-gold-dark">आँगन</span>
          </span>
          <a
            href="/login"
            className="px-5 py-2 rounded-full bg-haldi-gold text-white font-semibold text-sm hover:bg-haldi-gold-dark transition-colors"
          >
            Login / Sign Up
          </a>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative py-20 md:py-32 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-cream via-cream to-cream-dark pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <FadeIn>
            <h1 className="font-heading text-5xl md:text-7xl text-haldi-gold leading-tight">
              Aangan <span className="block text-haldi-gold-dark">आँगन</span>
            </h1>
          </FadeIn>

          <FadeIn delay={150}>
            <p className="mt-6 text-xl md:text-2xl font-semibold text-brown">
              Your Family&rsquo;s Digital Home
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <p className="mt-3 text-lg md:text-xl text-brown-light font-heading">
              परिवार से जुड़ें, पल साझा करें
            </p>
          </FadeIn>

          <FadeIn delay={450}>
            <p className="mt-2 text-base text-brown-light/80">
              India&rsquo;s first family social network with Hindi voice control
            </p>
          </FadeIn>

          <FadeIn delay={600}>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={APK_URL}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 min-h-dadi rounded-2xl bg-mehndi-green text-white font-semibold text-lg hover:bg-mehndi-green-light hover:text-brown transition-colors shadow-lg shadow-mehndi-green/25"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 2.246l1.718 2.978a.5.5 0 01-.183.683l-.566.327a10.1 10.1 0 00-2.2-2.37l1.048-.606a.187.187 0 01.183-.012zM6.477 2.246L4.76 5.224a.5.5 0 00.183.683l.566.327a10.1 10.1 0 012.2-2.37L6.66 2.258a.187.187 0 00-.183-.012zM12 6C7.589 6 4 9.589 4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4c0-4.411-3.589-8-8-8zm-2 10a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
                Download Android APK
              </a>
              <span className="inline-flex items-center justify-center gap-2 px-8 py-4 min-h-dadi rounded-2xl bg-cream-dark text-brown-light font-semibold text-lg border-2 border-haldi-gold/30 cursor-default">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Coming Soon on iOS
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="py-16 md:py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <h2 className="font-heading text-3xl md:text-4xl text-center text-haldi-gold mb-4">
              Everything Your Family Needs
            </h2>
            <p className="text-center text-brown-light mb-12 text-lg">
              परिवार के लिए सब कुछ एक जगह
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 100}>
                <div className="bg-cream rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-haldi-gold/10 h-full">
                  <div className="text-4xl mb-3">{f.emoji}</div>
                  <h3 className="text-xl font-semibold text-brown">{f.title}</h3>
                  <p className="font-heading text-haldi-gold-dark text-base mt-1">{f.hindi}</p>
                  <p className="text-brown-light mt-2 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Dadi Test ─── */}
      <section className="py-16 md:py-24 px-4 bg-cream">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-mehndi-green/10 border-2 border-mehndi-green mb-8">
              <span className="text-2xl">{"✔️"}</span>
              <span className="font-heading text-2xl text-mehndi-green">
                दादी टेस्ट पास
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <h2 className="font-heading text-3xl md:text-4xl text-haldi-gold mb-4">
              Designed So Even Grandmothers Can Use It
            </h2>
            <p className="text-brown-light text-lg mb-10 max-w-2xl mx-auto">
              Every screen passes the &ldquo;Dadi Test&rdquo; &mdash; big buttons, large text, and Hindi-first design
              so every generation feels at home.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: '👆', label: 'Big Buttons', detail: '52px+ tap targets', hindi: 'बड़े बटन' },
                { icon: '🔤', label: 'Large Text', detail: '16px+ body text', hindi: 'बड़े अक्षर' },
                { icon: '🇮🇳', label: 'Hindi First', detail: 'Native language UI', hindi: 'हिंदी पहले' },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-2xl p-6 border border-haldi-gold/10">
                  <div className="text-4xl mb-2">{item.icon}</div>
                  <h3 className="text-lg font-semibold text-brown">{item.label}</h3>
                  <p className="font-heading text-haldi-gold-dark text-sm">{item.hindi}</p>
                  <p className="text-brown-light text-sm mt-1">{item.detail}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Download Section ─── */}
      <section className="py-16 md:py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <h2 className="font-heading text-3xl md:text-4xl text-haldi-gold mb-4">
              Download Aangan
            </h2>
            <p className="text-brown-light text-lg mb-10">
              अभी डाउनलोड करें
            </p>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {/* Android */}
              <a
                href={APK_URL}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-mehndi-green/5 border-2 border-mehndi-green hover:bg-mehndi-green/10 transition-colors group"
              >
                <svg className="w-12 h-12 text-mehndi-green" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 2.246l1.718 2.978a.5.5 0 01-.183.683l-.566.327a10.1 10.1 0 00-2.2-2.37l1.048-.606a.187.187 0 01.183-.012zM6.477 2.246L4.76 5.224a.5.5 0 00.183.683l.566.327a10.1 10.1 0 012.2-2.37L6.66 2.258a.187.187 0 00-.183-.012zM12 6C7.589 6 4 9.589 4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4c0-4.411-3.589-8-8-8zm-2 10a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
                <span className="font-semibold text-brown text-lg">Android</span>
                <span className="text-sm text-mehndi-green font-medium group-hover:underline">Download APK</span>
              </a>

              {/* iOS */}
              <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-cream-dark border-2 border-haldi-gold/20">
                <svg className="w-12 h-12 text-brown-light" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <span className="font-semibold text-brown text-lg">iOS</span>
                <span className="inline-block px-3 py-1 rounded-full bg-haldi-gold/15 text-haldi-gold-dark text-xs font-semibold">
                  Coming Soon
                </span>
              </div>

              {/* Indus App Store */}
              <a href="https://store.indusappstore.com/app/aangan" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-cream-dark border-2 border-haldi-gold/20 hover:border-haldi-gold hover:shadow-lg transition-all cursor-pointer">
                <svg className="w-12 h-12 text-brown-light" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v12h16V6H4zm2 2h4v4H6V8zm6 0h6v2h-6V8zm0 4h6v2h-6v-2zM6 14h4v2H6v-2z" />
                </svg>
                <span className="font-semibold text-brown text-lg">Indus App Store</span>
                <span className="inline-block px-3 py-1 rounded-full bg-mehndi-green/15 text-mehndi-green text-xs font-semibold">
                  Available on Indus
                </span>
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-12 px-4 bg-brown text-cream">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <span className="font-heading text-2xl text-haldi-gold">Aangan आँगन</span>
              <p className="text-cream-dark text-sm mt-1">Your Family&rsquo;s Digital Home</p>
            </div>

            <div className="flex gap-6 text-sm">
              <a href="/privacy" className="text-cream-dark hover:text-haldi-gold transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-cream-dark hover:text-haldi-gold transition-colors">
                Terms of Service
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-cream/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-cream-dark">
            <p>{"Made with ❤️ in India"}</p>
            <p>&copy; 2026 ReyKan IT &middot; v0.5.0</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
