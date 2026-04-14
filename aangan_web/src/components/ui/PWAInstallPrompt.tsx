'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user already dismissed
    if (typeof window !== 'undefined' && localStorage.getItem('pwa-dismissed')) {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    localStorage.setItem('pwa-dismissed', '1');
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-20 z-[50] max-w-sm">
      <div className="bg-white border-2 border-haldi-gold rounded-2xl shadow-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">📱</span>
          <div className="flex-1">
            <p className="font-heading text-lg text-brown">
              Aangan इंस्टॉल करें
            </p>
            <p className="font-body text-sm text-brown-light mt-0.5">
              Install for faster access
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-brown-light text-lg min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="बंद करें"
          >
            ✕
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleDismiss}
            className="flex-1 font-body text-base text-brown-light py-2.5 rounded-xl border border-cream-dark min-h-dadi"
          >
            बाद में
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 font-body text-base font-semibold text-white bg-haldi-gold rounded-xl py-2.5 min-h-dadi hover:bg-haldi-gold-dark transition-colors"
          >
            इंस्टॉल करें
          </button>
        </div>
      </div>
    </div>
  );
}
