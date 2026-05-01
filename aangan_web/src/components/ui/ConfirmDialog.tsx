'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmDialog — Hindi-first replacement for window.confirm()
//
// Background:
//   Browser-native confirm() is the worst grandma surface in the app —
//   tiny system font, English-only OK/Cancel, no Hindi context, often
//   stacked over a half-rendered page. Jyotsna's 12-Apr support ticket
//   "Popup msgs not clear" most likely referred to these (closed
//   2026-05-01 with that hypothesis on record).
//
//   This file ships a drop-in replacement: a context-mounted dialog
//   that's bilingual, Dadi-test sized, and async-friendly.
//
// Usage:
//   1. Wrap your app once (already done in (app)/layout.tsx):
//        <ConfirmProvider>...</ConfirmProvider>
//
//   2. In any client component:
//        const confirm = useConfirm();
//        const ok = await confirm({
//          title: 'सदस्य हटाएं?',
//          subtitle: 'Remove member',
//          body: `${name} को परिवार से हटाएं?`,
//          confirmLabel: 'हाँ, हटाएं',
//          cancelLabel: 'नहीं',
//          danger: true,
//        });
//        if (!ok) return;
//
// API matches window.confirm()'s "boolean Promise" semantics so
// migrating callers is mechanical: replace `if (!confirm(msg)) return;`
// with `if (!await confirm({ body: msg })) return;`.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react';

export interface ConfirmOptions {
  /** Big Hindi title at the top of the dialog. */
  title?: string;
  /** Smaller English subtitle right under the title. */
  subtitle?: string;
  /** The actual question — usually bilingual "X को हटाएं? — Remove X?" */
  body: string;
  /** Confirm-button label. Defaults to bilingual "हाँ — Yes". */
  confirmLabel?: string;
  /** Cancel-button label. Defaults to bilingual "नहीं — No". */
  cancelLabel?: string;
  /** True when the action is destructive — paints the confirm button red. */
  danger?: boolean;
}

type Resolver = (value: boolean) => void;

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Safety fallback so a missing provider doesn't crash the page —
    // logs a one-time warning and falls back to native confirm() so the
    // user can still proceed. Should never trigger in prod once the
    // provider is mounted at the layout root.
    if (typeof window !== 'undefined') {
      console.warn('[useConfirm] ConfirmProvider not mounted — falling back to window.confirm()');
    }
    return async (opts: ConfirmOptions) =>
      typeof window !== 'undefined' ? window.confirm(opts.body) : false;
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  // When the dialog closes, fire the pending resolver with the chosen value.
  const close = useCallback((result: boolean) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setOpen(false);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  // Keyboard shortcuts: Esc cancels, Enter confirms — feels like
  // window.confirm() did, but with a Hindi face.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {open && opts && (
        <div
          // Backdrop. Click outside the panel = cancel (matches native
          // dialog behavior on mobile).
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => close(false)}
          role="presentation"
        >
          <div
            // Panel — Dadi sized, gold-bordered for warmth, max-w-md so
            // it doesn't span a desktop screen edge-to-edge.
            className="bg-cream w-full max-w-md rounded-2xl border-2 border-haldi-gold shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-body"
          >
            {opts.title && (
              <h2
                id="confirm-title"
                className="font-heading text-2xl text-brown text-center"
              >
                {opts.title}
              </h2>
            )}
            {opts.subtitle && (
              <p className="font-body text-base text-brown-light text-center mt-1">
                {opts.subtitle}
              </p>
            )}
            <p
              id="confirm-body"
              className="font-body text-lg text-brown text-center mt-4 whitespace-pre-line"
            >
              {opts.body}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => close(false)}
                // 52px Dadi tap target on both buttons. Cancel is on
                // the LEFT so a user who drags-to-confirm doesn't hit
                // it by accident on a phone.
                className="flex-1 min-h-dadi px-4 py-3 rounded-xl border-2 border-cream-dark bg-white text-brown font-body font-semibold text-base hover:bg-cream-dark transition-colors"
              >
                {opts.cancelLabel || 'नहीं — No'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                autoFocus
                className={`flex-1 min-h-dadi px-4 py-3 rounded-xl font-body font-semibold text-base transition-colors ${
                  opts.danger
                    ? 'bg-error text-white hover:bg-red-700'
                    : 'bg-haldi-gold text-white hover:bg-haldi-gold-dark'
                }`}
              >
                {opts.confirmLabel || 'हाँ — Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
