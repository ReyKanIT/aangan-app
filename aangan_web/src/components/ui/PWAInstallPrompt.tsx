'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Mode = 'native' | 'ios';

/**
 * PWAInstallPrompt — two-branch install nudge:
 *
 *   1. Android/Chrome/Edge: intercepts the native `beforeinstallprompt`
 *      event and offers a one-tap install.
 *   2. iOS Safari: that event doesn't exist. We detect Safari-on-iOS via
 *      userAgent + `navigator.standalone` and render an instructions
 *      banner — "Tap Share → Add to Home Screen" — because that's the
 *      only way to install a PWA on iOS.
 *
 * Dismissal is sticky per browser (localStorage 'pwa-dismissed'). Both
 * branches share the dismiss key so the user doesn't keep getting nagged.
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (localStorage.getItem('pwa-dismissed')) {
      setDismissed(true);
      return;
    }

    // Native (Android Chrome / Desktop Chrome / Edge): capture the deferred prompt.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode('native');
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari detection: UA contains "iPhone|iPad|iPod" and the browser is
    // Safari (no CriOS/FxiOS). Also skip if already installed (`standalone`).
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    const isStandalone = (navigator as { standalone?: boolean }).standalone === true
      || window.matchMedia('(display-mode: standalone)').matches;

    if (isIos && isSafari && !isStandalone) {
      // Only show after a short delay so it doesn't slam the user on first paint.
      const t = setTimeout(() => {
        // If native prompt already fired by then, let that win.
        setMode((prev) => prev ?? 'ios');
      }, 4000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(t);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setMode(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setMode(null);
    try { localStorage.setItem('pwa-dismissed', '1'); } catch { /* storage off */ }
  };

  if (dismissed) return null;
  if (mode === null) return null;

  return (
    <div className="fixed bottom-4 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-20 z-[50] max-w-sm mx-auto lg:mx-0">
      <div className="bg-white border-2 border-haldi-gold rounded-2xl shadow-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">📱</span>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-lg text-brown">
              Aangan इंस्टॉल करें
            </p>
            <p className="font-body text-sm text-brown-light mt-0.5">
              {mode === 'native'
                ? 'Install for faster access'
                : 'Install on your iPhone'}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-brown-light text-lg min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-cream-dark transition-colors"
            aria-label="बंद करें"
          >
            ✕
          </button>
        </div>

        {mode === 'native' ? (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 font-body text-base text-brown-light rounded-xl border border-cream-dark min-h-dadi"
            >
              बाद में
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 font-body text-base font-semibold text-white bg-haldi-gold rounded-xl min-h-dadi hover:bg-haldi-gold-dark transition-colors"
            >
              इंस्टॉल करें
            </button>
          </div>
        ) : (
          <ol className="mt-3 space-y-2 pl-1 font-body text-base text-brown">
            <li className="flex items-center gap-2">
              <span className="inline-flex w-6 h-6 rounded-full bg-haldi-gold text-white text-sm items-center justify-center flex-shrink-0">1</span>
              <span>नीचे Share बटन दबाएं
                <svg className="inline w-5 h-5 mx-1 align-text-bottom" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14" />
                </svg>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex w-6 h-6 rounded-full bg-haldi-gold text-white text-sm items-center justify-center flex-shrink-0">2</span>
              <span>&quot;Add to Home Screen&quot; चुनें</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex w-6 h-6 rounded-full bg-mehndi-green text-white text-sm items-center justify-center flex-shrink-0">✓</span>
              <span>Aangan आपके home screen पर आ जाएगा</span>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}
