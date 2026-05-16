'use client';

/**
 * Daily Panchang opt-in card — CMO growth bet #1.
 *
 * Renders on /panchang (and reusable on /festivals, in PanchangWidget, etc).
 * Captures phone or email and POSTs to /api/panchang/subscribe.
 *
 * UX:
 *  - Hindi-first heading + English subtitle
 *  - Two fields, only one required (validates client-side too)
 *  - Phone gets a +91 prefix by default (overridable typing)
 *  - On success, replaces the form with a thank-you state
 *  - On error, shows a single bilingual error string
 */

import { useState } from 'react';

interface Props {
  source?: 'panchang_page' | 'festival_page' | 'feed_widget' | 'whatsapp_share';
}

type Status = 'idle' | 'submitting' | 'subscribed' | 'already-subscribed' | 'error';

export default function DailyPanchangOptIn({ source = 'panchang_page' }: Props) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const phoneRaw = phone.trim().replace(/\s|-/g, '');
    const emailRaw = email.trim();

    if (!phoneRaw && !emailRaw) {
      setErrorMsg('कृपया फ़ोन या ईमेल दें — Please enter phone or email');
      return;
    }

    // Normalize phone: if user typed only digits, prepend +91 (India default).
    // If they typed a non-+91 number with full country code, respect it.
    let phoneE164: string | null = null;
    if (phoneRaw) {
      if (phoneRaw.startsWith('+')) {
        phoneE164 = phoneRaw;
      } else if (/^\d{10}$/.test(phoneRaw)) {
        phoneE164 = `+91${phoneRaw}`;
      } else if (/^91\d{10}$/.test(phoneRaw)) {
        phoneE164 = `+${phoneRaw}`;
      } else {
        setErrorMsg('फ़ोन नंबर सही नहीं है — Phone number not valid (use 10 digits or +countrycode)');
        return;
      }
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/panchang/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_e164: phoneE164,
          email: emailRaw || null,
          locale: 'hi-IN',
          source,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.message || data.error || `Failed (${res.status})`);
        return;
      }
      setStatus(data.status === 'already-subscribed' ? 'already-subscribed' : 'subscribed');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
    }
  };

  if (status === 'subscribed' || status === 'already-subscribed') {
    return (
      <section className="mt-6 bg-mehndi-green/5 border-2 border-mehndi-green/30 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-2">{'🪷'}</div>
        <h3 className="font-heading text-xl text-mehndi-green mb-1">
          {status === 'already-subscribed'
            ? 'आप पहले से सब्सक्राइब हैं'
            : 'धन्यवाद — आपकी सब्सक्रिप्शन हो गई!'}
        </h3>
        <p className="text-base text-brown-light">
          {status === 'already-subscribed'
            ? 'You’re already on the daily panchang list.'
            : 'Daily panchang every morning at 7am IST.'}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 bg-white rounded-2xl border border-haldi-gold/30 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-haldi-gold/10 border-b border-haldi-gold/20">
        <h3 className="font-heading text-xl text-haldi-gold-dark">
          {'रोज़ का पंचांग पाएँ'}
        </h3>
        <p className="text-base text-brown-light mt-0.5">
          Get daily panchang at 7am — phone or email
        </p>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
        <div>
          <label htmlFor="dp-phone" className="block text-sm text-brown-light mb-1">
            {'फ़ोन / WhatsApp · Phone / WhatsApp'}
          </label>
          <input
            id="dp-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setErrorMsg(''); }}
            disabled={status === 'submitting'}
            className="w-full min-h-dadi px-4 py-3 rounded-xl border-2 border-cream-dark bg-white text-brown text-base placeholder:text-brown-light/40 focus:outline-none focus:border-haldi-gold"
          />
        </div>

        <div className="flex items-center gap-3 my-1">
          <span className="flex-1 h-px bg-cream-dark" />
          <span className="text-sm text-brown-light/60">{'या · or'}</span>
          <span className="flex-1 h-px bg-cream-dark" />
        </div>

        <div>
          <label htmlFor="dp-email" className="block text-sm text-brown-light mb-1">
            {'ईमेल · Email'}
          </label>
          <input
            id="dp-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
            disabled={status === 'submitting'}
            className="w-full min-h-dadi px-4 py-3 rounded-xl border-2 border-cream-dark bg-white text-brown text-base placeholder:text-brown-light/40 focus:outline-none focus:border-haldi-gold"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting' || (!phone.trim() && !email.trim())}
          className="w-full min-h-dadi px-6 py-3 rounded-2xl bg-haldi-gold text-white font-semibold text-base hover:bg-haldi-gold-dark disabled:bg-haldi-gold/40 disabled:cursor-not-allowed transition-colors shadow-md shadow-haldi-gold/25"
        >
          {status === 'submitting'
            ? 'भेजा जा रहा है… — Sending…'
            : 'रोज़ का पंचांग भेजें — Send me daily panchang'}
        </button>

        <p className="text-xs text-brown-light/60 text-center">
          {'फ्री · कभी भी unsubscribe कर सकते हैं · No spam'}
        </p>
      </form>
    </section>
  );
}
