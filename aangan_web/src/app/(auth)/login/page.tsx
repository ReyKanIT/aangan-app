'use client';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import GoldButton from '@/components/ui/GoldButton';
import { captureReferralFromUrl } from '@/lib/utils/referral';

// Dial-code list — India default, plus main Indian diaspora countries.
// maxLen is the national number length (digits after the dial code).
const COUNTRIES = [
  { code: 'IN', name: 'India',          dial: '+91',  flag: '\u{1F1EE}\u{1F1F3}', maxLen: 10 },
  { code: 'US', name: 'United States',  dial: '+1',   flag: '\u{1F1FA}\u{1F1F8}', maxLen: 10 },
  { code: 'GB', name: 'United Kingdom', dial: '+44',  flag: '\u{1F1EC}\u{1F1E7}', maxLen: 10 },
  { code: 'CA', name: 'Canada',         dial: '+1',   flag: '\u{1F1E8}\u{1F1E6}', maxLen: 10 },
  { code: 'AE', name: 'UAE',            dial: '+971', flag: '\u{1F1E6}\u{1F1EA}', maxLen: 9 },
  { code: 'AU', name: 'Australia',      dial: '+61',  flag: '\u{1F1E6}\u{1F1FA}', maxLen: 9 },
  { code: 'SG', name: 'Singapore',      dial: '+65',  flag: '\u{1F1F8}\u{1F1EC}', maxLen: 8 },
  { code: 'NP', name: 'Nepal',          dial: '+977', flag: '\u{1F1F3}\u{1F1F5}', maxLen: 10 },
  { code: 'BD', name: 'Bangladesh',     dial: '+880', flag: '\u{1F1E7}\u{1F1E9}', maxLen: 10 },
  { code: 'LK', name: 'Sri Lanka',      dial: '+94',  flag: '\u{1F1F1}\u{1F1F0}', maxLen: 9 },
  { code: 'DE', name: 'Germany',        dial: '+49',  flag: '\u{1F1E9}\u{1F1EA}', maxLen: 11 },
  { code: 'NZ', name: 'New Zealand',    dial: '+64',  flag: '\u{1F1F3}\u{1F1FF}', maxLen: 10 },
];

function formatDisplay(dial: string, phone: string): string {
  if (!phone) return dial;
  if (dial === '+91' && phone.length === 10) return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
  if (dial === '+1' && phone.length === 10) return `+1 (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
  if (phone.length > 5) return `${dial} ${phone.slice(0, phone.length - 5)} ${phone.slice(-5)}`;
  return `${dial} ${phone}`;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-haldi-gold border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/feed';
  const authError = searchParams.get('error');
  const authErrorReason = searchParams.get('reason');
  const { sendOtp, sendEmailOtp, session, isNewUser, isLoading, initialize, error, setError } = useAuthStore();
  // Subscribed separately so we can show the raw Supabase / hook error
  // when SMS delivery fails (Vi DLT pending → MSG91 200 → telco drops).
  const rawError = useAuthStore((s) => s.rawError);

  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  // Email-OTP fallback. SMS is unreliable while Vi DLT OTP template is
  // Pending (no telco actually delivers). Email OTP keeps users (and
  // Kumar) able to log in until the template is approved.
  const [showEmailFallback, setShowEmailFallback] = useState(false);
  const [email, setEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initialize();
    // Also try to capture `?ref=` here — users often land straight on /login
    // via a shared WhatsApp link, skipping the root page.
    captureReferralFromUrl();
  }, [initialize]);

  useEffect(() => {
    if (session && !isLoading) {
      router.replace(isNewUser ? '/profile-setup' : redirectTo);
    }
  }, [session, isNewUser, isLoading, router, redirectTo]);

  const isValidPhone = phone.length === country.maxLen && /^\d+$/.test(phone);
  const fullE164 = `${country.dial}${phone}`;
  const displayPhone = formatDisplay(country.dial, phone);

  const handleNext = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isValidPhone || isSending) return;
    setError(null);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (isSending) return;
    setShowConfirm(false);
    setIsSending(true);
    const ok = await sendOtp(fullE164);
    setIsSending(false);
    if (ok) {
      sessionStorage.setItem('otp_phone', fullE164);
      sessionStorage.setItem('otp_country_dial', country.dial);
      // Clean up any stale email-OTP marker from older logins
      sessionStorage.removeItem('otp_email');
      router.push('/otp');
    }
  };

  const handleEdit = () => {
    setShowConfirm(false);
    setTimeout(() => phoneInputRef.current?.focus(), 50);
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleEmailFallback = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isValidEmail || isSendingEmail) return;
    setError(null);
    setIsSendingEmail(true);
    const ok = await sendEmailOtp(email);
    setIsSendingEmail(false);
    if (ok) {
      sessionStorage.setItem('otp_email', email);
      sessionStorage.removeItem('otp_phone');
      sessionStorage.removeItem('otp_country_dial');
      router.push('/otp');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-cream-dark p-6 sm:p-8">
      {/* Logo */}
      <div className="text-center mb-6">
        <h1 className="font-heading text-4xl text-haldi-gold font-bold tracking-wide">AANGAN</h1>
        <p className="font-heading text-2xl text-brown mt-1">{'\u0906\u0901\u0917\u0928'}</p>
        <p className="font-body text-brown-light mt-2 text-base">{'\u092A\u0930\u093F\u0935\u093E\u0930 \u0938\u0947 \u091C\u0941\u0921\u093C\u0947\u0902'}</p>
        <p className="font-body text-base text-brown-light">Connect with Family</p>
      </div>

      {/* Intro */}
      <div className="mb-6 text-center">
        <h2 className="font-heading text-xl text-brown mb-1">{'\u0905\u092A\u0928\u093E \u092B\u093C\u094B\u0928 \u0928\u0902\u092C\u0930 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902'}</h2>
        <p className="font-body text-base text-brown-light">Enter your phone number</p>
        <p className="font-body text-sm text-brown-light mt-2">
          {'\u0939\u092E \u090F\u0915 SMS \u092D\u0947\u091C\u0947\u0902\u0917\u0947 \u0906\u092A\u0915\u0947 \u0928\u0902\u092C\u0930 \u0915\u0940 \u092A\u0941\u0937\u094D\u091F\u093F \u0915\u0947 \u0932\u093F\u090F'}
          <br />
          <span className="text-xs">We&apos;ll send an SMS to verify your number</span>
        </p>
      </div>

      {/* Auth callback error */}
      {authError && (
        <div className="bg-red-50 border border-error/30 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
          <span className="text-error mt-0.5">⚠️</span>
          <div className="font-body text-base text-error">
            <p>
              {authError === 'auth_failed'
                ? 'लॉगिन विफल हो गया। कृपया पुनः प्रयास करें — Login failed. Please try again.'
                : `कुछ गलत हो गया — Something went wrong (${authError})`}
            </p>
            {authErrorReason && (
              <p className="text-base opacity-80 mt-1">({authErrorReason})</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-error/30 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-error mt-0.5">!</span>
            <p className="font-body text-base text-error whitespace-pre-line">{error}</p>
          </div>
          {rawError && rawError !== error && (
            <div className="mt-2 pl-6">
              <button
                type="button"
                onClick={() => setShowDiagnostic((v) => !v)}
                className="text-xs font-body text-error/70 underline"
              >
                {showDiagnostic ? 'विवरण छिपाएं — Hide details' : 'विवरण दिखाएं — Show details'}
              </button>
              {showDiagnostic && (
                <pre className="mt-2 text-xs font-mono text-error/80 bg-white/60 border border-error/20 rounded-md p-2 overflow-x-auto whitespace-pre-wrap">
                  {rawError}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleNext}>
        {/* Country picker */}
        <div>
          <label className="block mb-1">
            <span className="font-body font-semibold text-brown text-base">{'\u0926\u0947\u0936 \u091A\u0941\u0928\u0947\u0902'}</span>
            <span className="ml-2 text-base text-brown-light font-body">Select Country</span>
          </label>
          <div className="flex items-center border-2 border-gray-300 rounded-lg bg-white focus-within:border-haldi-gold">
            <select
              value={country.code}
              onChange={(e) => {
                const next = COUNTRIES.find((c) => c.code === e.target.value) || COUNTRIES[0];
                setCountry(next);
                setPhone('');
              }}
              className="flex-1 min-h-dadi px-4 text-brown font-body text-lg bg-transparent outline-none appearance-none cursor-pointer"
              aria-label="Country"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag}  {c.name} ({c.dial})
                </option>
              ))}
            </select>
            <span className="px-3 text-brown-light pointer-events-none">▼</span>
          </div>
        </div>

        {/* Phone number */}
        <div>
          <label className="block mb-1">
            <span className="font-body font-semibold text-brown text-base">{'\u092B\u093C\u094B\u0928 \u0928\u0902\u092C\u0930'}</span>
            <span className="ml-2 text-base text-brown-light font-body">Phone Number</span>
          </label>
          <div className="flex items-center border-2 border-gray-300 rounded-lg overflow-hidden bg-white focus-within:border-haldi-gold">
            <span className="px-4 bg-cream-dark border-r-2 border-gray-300 text-brown font-semibold text-lg self-stretch flex items-center">
              {country.dial}
            </span>
            <input
              ref={phoneInputRef}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, country.maxLen))}
              placeholder={'0'.repeat(country.maxLen)}
              maxLength={country.maxLen}
              className="flex-1 min-h-dadi px-4 text-brown font-body text-dadi bg-transparent outline-none placeholder-gray-400"
              autoFocus
            />
          </div>
        </div>

        <GoldButton type="submit" className="w-full" loading={isSending} disabled={!isValidPhone}>
          {isSending ? 'प्रतीक्षा करें…' : 'आगे बढ़ें — Next'}
        </GoldButton>
      </form>

      {/* Email-OTP fallback — collapsed by default, opens when SMS is unreliable
          (Vi DLT pending, MSG91 outage, DND on phone). Lets users still log in
          via passwordless email OTP. */}
      <div className="mt-6 border-t border-cream-dark pt-4">
        {!showEmailFallback ? (
          <button
            type="button"
            onClick={() => { setShowEmailFallback(true); setError(null); }}
            className="w-full text-center font-body text-base text-haldi-gold underline py-2"
          >
            SMS नहीं मिल रहा? ईमेल से लॉगिन करें — Email login
          </button>
        ) : (
          <form className="space-y-3" onSubmit={handleEmailFallback}>
            <label className="block">
              <span className="font-body font-semibold text-brown text-base">ईमेल</span>
              <span className="ml-2 text-base text-brown-light font-body">Email</span>
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full min-h-dadi px-4 text-brown font-body text-lg bg-white border-2 border-gray-300 rounded-lg outline-none focus:border-haldi-gold placeholder-gray-400"
            />
            <GoldButton type="submit" className="w-full" loading={isSendingEmail} disabled={!isValidEmail}>
              {isSendingEmail ? 'प्रतीक्षा करें…' : 'ईमेल OTP भेजें — Send Email OTP'}
            </GoldButton>
            <button
              type="button"
              onClick={() => { setShowEmailFallback(false); setEmail(''); setError(null); }}
              className="w-full text-center font-body text-sm text-brown-light underline py-2"
            >
              ← फ़ोन पर वापस जाएं — Back to phone
            </button>
          </form>
        )}
      </div>

      {/* Terms */}
      <p className="font-body text-base text-brown-light text-center mt-6 leading-relaxed">
        आगे बढ़कर आप हमारी{' '}
        <a href="/terms" className="text-haldi-gold hover:underline" aria-label="Terms of Service">Terms</a>{' '}
        और{' '}
        <a href="/privacy" className="text-haldi-gold hover:underline" aria-label="Privacy Policy">Privacy Policy</a>{' '}
        से सहमत होते हैं
      </p>

      {/* Confirmation modal — WhatsApp-style "Is this the right number?" */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-phone-title"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 id="confirm-phone-title" className="font-heading text-xl text-brown mb-1">
              {'\u0928\u0902\u092C\u0930 \u0915\u0940 \u092A\u0941\u0937\u094D\u091F\u093F \u0915\u0930\u0947\u0902'}
            </h3>
            <p className="font-body text-base text-brown-light mb-4">Confirm phone number</p>
            <p className="font-body text-base text-brown mb-1">
              {'\u0915\u094D\u092F\u093E \u092F\u0939 \u0928\u0902\u092C\u0930 \u0938\u0939\u0940 \u0939\u0948? \u0939\u092E SMS \u092D\u0947\u091C\u0947\u0902\u0917\u0947 \u0907\u0938\u092A\u0930\u0964'}
            </p>
            <p className="font-body text-base text-brown-light mb-5">
              Is this the correct number? We&apos;ll send an SMS.
            </p>
            <p className="font-heading text-2xl text-brown text-center py-4 bg-cream rounded-lg mb-6 tracking-wide">
              {displayPhone}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleEdit}
                className="flex-1 min-h-dadi py-3 px-4 bg-white border-2 border-gray-300 rounded-xl font-body font-semibold text-base text-brown hover:bg-cream transition-all"
              >
                {'\u092C\u0926\u0932\u0947\u0902'} / Edit
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 min-h-dadi py-3 px-4 bg-haldi-gold text-white rounded-xl font-body font-bold text-base hover:bg-haldi-gold-dark transition-all"
              >
                {'\u0920\u0940\u0915 \u0939\u0948'} / OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
