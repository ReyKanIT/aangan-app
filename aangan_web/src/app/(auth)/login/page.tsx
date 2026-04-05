'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';
import { VALIDATION } from '@/lib/constants';

type AuthMode = 'email' | 'phone';
type AppLanguage = 'hi' | 'en';

const LANGUAGES: { value: AppLanguage; hindi: string; english: string }[] = [
  { value: 'hi', hindi: 'हिंदी', english: 'Hindi' },
  { value: 'en', hindi: 'अंग्रेज़ी', english: 'English' },
];

export default function LoginPage() {
  const router = useRouter();
  const { sendOtp, sendEmailOtp, signInWithEmail, signUpWithEmail, session, isNewUser, isLoading, initialize, error, setError } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>('email');
  const [language, setLanguage] = useState<AppLanguage>('hi');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (session && !isLoading) {
      router.replace(isNewUser ? '/profile-setup' : '/feed');
    }
  }, [session, isNewUser, isLoading, router]);

  const isValidPhone = VALIDATION.phoneRegex.test(phone);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = password.length >= 6;

  const handlePhoneOtp = async () => {
    if (!isValidPhone || isSending) return;
    setIsSending(true);
    const ok = await sendOtp(phone);
    setIsSending(false);
    if (ok) {
      sessionStorage.setItem('otp_phone', phone);
      router.push('/otp');
    }
  };

  const handleEmailLogin = async () => {
    if (!isValidEmail || !isValidPassword || isSending) return;
    setIsSending(true);
    const signInOk = await signInWithEmail(email, password);
    if (signInOk) { setIsSending(false); return; }
    setError(null);
    const signUpOk = await signUpWithEmail(email, password);
    setIsSending(false);
    if (!signUpOk) setError('ईमेल या पासवर्ड गलत है');
  };

  const handleEmailOtp = async () => {
    if (!isValidEmail || isSending) return;
    setIsSending(true);
    const ok = await sendEmailOtp(email);
    setIsSending(false);
    if (ok) {
      sessionStorage.setItem('otp_email', email);
      router.push('/otp');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="font-heading text-4xl text-haldi-gold font-bold">AANGAN</h1>
        <p className="font-heading text-2xl text-brown">आँगन</p>
        <p className="font-body text-brown-light mt-2">परिवार से जुड़ें</p>
        <p className="font-body text-sm text-brown-light">Connect with Family</p>
      </div>

      {/* Language Selector */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="font-body text-sm text-brown-light">🌐</span>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.value}
            onClick={() => setLanguage(lang.value)}
            className={`px-3 py-1.5 rounded-lg font-body text-sm transition-all ${
              language === lang.value
                ? 'bg-haldi-gold text-white font-semibold'
                : 'bg-cream-dark text-brown-light hover:bg-gray-200'
            }`}
          >
            {lang.hindi} <span className="opacity-70">({lang.english})</span>
          </button>
        ))}
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-cream-dark rounded-xl p-1 mb-6">
        {(['email', 'phone'] as AuthMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(null); }}
            aria-pressed={mode === m}
            aria-label={m === 'email' ? 'ईमेल से लॉगिन — Login with Email' : 'फ़ोन OTP से लॉगिन — Login with Phone OTP'}
            className={`flex-1 py-3 rounded-lg font-body font-semibold text-base transition-all ${mode === m ? 'bg-white shadow text-haldi-gold' : 'text-brown-light'}`}
          >
            {m === 'email' ? 'ईमेल' : 'फ़ोन'}
            <span className="block text-xs font-normal opacity-70">{m === 'email' ? 'Email' : 'Phone'}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-error rounded-lg px-4 py-3 mb-4">
          <p className="font-body text-sm text-error">{error}</p>
        </div>
      )}

      {mode === 'phone' ? (
        <div>
          <InputField
            label="फ़ोन नंबर"
            sublabel="Phone Number"
            type="tel"
            inputMode="numeric"
            prefix="+91"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210"
            maxLength={10}
          />
          <GoldButton className="w-full mt-2" loading={isSending} disabled={!isValidPhone} onClick={handlePhoneOtp}>
            OTP भेजें — Send OTP
          </GoldButton>
        </div>
      ) : (
        <div>
          <InputField
            label="ईमेल"
            sublabel="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
          />
          <InputField
            label="पासवर्ड"
            sublabel="Password (6+ characters)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6+ अक्षर"
            autoComplete="current-password"
          />
          <GoldButton className="w-full mt-2" loading={isSending} disabled={!isValidEmail || !isValidPassword} onClick={handleEmailLogin}>
            लॉगिन / साइन अप
          </GoldButton>
          <button
            className={`w-full mt-3 py-3 font-body text-sm text-haldi-gold underline ${(!isValidEmail || isSending) ? 'opacity-40' : ''}`}
            disabled={!isValidEmail || isSending}
            onClick={handleEmailOtp}
          >
            बिना पासवर्ड — Email OTP भेजें
          </button>
        </div>
      )}

      <p className="font-body text-xs text-brown-light text-center mt-6">
        आगे बढ़कर आप हमारी{' '}
        <a href="/terms" className="text-haldi-gold underline" aria-label="Terms of Service">Terms of Service</a>{' '}
        और{' '}
        <a href="/privacy" className="text-haldi-gold underline" aria-label="Privacy Policy">Privacy Policy</a>{' '}
        से सहमत होते हैं
      </p>
    </div>
  );
}
