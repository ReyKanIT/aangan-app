'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';
import { VALIDATION } from '@/lib/constants';

type AuthTab = 'login' | 'signup';
type AuthMode = 'email' | 'phone';

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 6,
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['कमज़ोर Weak', 'ठीक Fair', 'अच्छा Good', 'मज़बूत Strong'];
  const colors = ['bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-mehndi-green'];
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? colors[score - 1] : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className={`font-body text-xs ${score <= 1 ? 'text-red-500' : score === 2 ? 'text-yellow-600' : 'text-mehndi-green'}`}>
        {labels[score - 1]}
      </p>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { sendOtp, sendEmailOtp, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, session, isNewUser, isLoading, initialize, error, setError } = useAuthStore();
  const [tab, setTab] = useState<AuthTab>('login');
  const [mode, setMode] = useState<AuthMode>('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
  const passwordsMatch = password === confirmPassword;
  const isValidName = fullName.trim().length >= 2;

  const switchTab = (t: AuthTab) => {
    setTab(t);
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setFullName('');
  };

  const handlePhoneOtp = async () => {
    if (!isValidPhone || isSending) return;
    if (tab === 'signup' && !isValidName) return;
    setIsSending(true);
    const ok = await sendOtp(phone);
    setIsSending(false);
    if (ok) {
      sessionStorage.setItem('otp_phone', phone);
      if (fullName.trim()) sessionStorage.setItem('signup_name', fullName.trim());
      router.push('/otp');
    }
  };

  const handleEmailLogin = async () => {
    if (!isValidEmail || !isValidPassword || isSending) return;
    setIsSending(true);
    const ok = await signInWithEmail(email, password);
    setIsSending(false);
    // error already set by signInWithEmail in the store
  };

  const handleEmailSignUp = async () => {
    if (!isValidEmail || !isValidPassword || !passwordsMatch || !isValidName || isSending) return;
    setIsSending(true);
    setError(null);
    const ok = await signUpWithEmail(email, password);
    setIsSending(false);
    if (ok) {
      sessionStorage.setItem('otp_email', email);
      if (fullName.trim()) sessionStorage.setItem('signup_name', fullName.trim());
      router.push('/otp');
    }
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
    <div className="bg-white rounded-2xl shadow-lg border border-cream-dark p-6 sm:p-8">
      {/* Logo & Branding */}
      <div className="text-center mb-6">
        <h1 className="font-heading text-4xl text-haldi-gold font-bold tracking-wide">AANGAN</h1>
        <p className="font-heading text-2xl text-brown mt-1">आँगन</p>
        <p className="font-body text-brown-light mt-2 text-base">परिवार से जुड़ें</p>
        <p className="font-body text-sm text-brown-light">Connect with Family</p>
      </div>

      {/* Google Sign-In — Primary auth method */}
      <div className="space-y-3">
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 min-h-dadi py-4 px-4 bg-haldi-gold text-white border-2 border-haldi-gold rounded-xl font-body font-bold text-lg hover:bg-haldi-gold-dark hover:border-haldi-gold-dark hover:shadow-md focus:outline-none focus:ring-2 focus:ring-haldi-gold focus:ring-offset-2 transition-all shadow-sm"
        >
          <svg width="22" height="22" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Google से साइन इन करें
        </button>

        <button
          onClick={signInWithApple}
          className="w-full flex items-center justify-center gap-3 min-h-dadi py-3.5 px-4 bg-black rounded-xl font-body font-semibold text-base text-white hover:bg-gray-900 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
        >
          <svg width="20" height="24" viewBox="0 0 17 20" fill="white">
            <path d="M13.545 10.239c-.022-2.234 1.823-3.306 1.905-3.358-.036-.053-1.063-1.575-2.704-1.575-1.138 0-2.122.693-2.693.693-.597 0-1.474-.676-2.437-.657-1.244.018-2.407.732-3.044 1.842-1.315 2.273-.336 5.614.926 7.455.632.9 1.371 1.9 2.339 1.865.948-.038 1.299-.604 2.443-.604 1.131 0 1.455.604 2.437.583.016 0-.003 0 0 0 1.003-.019 1.639-.9 2.254-1.807.724-1.03 1.013-2.042 1.027-2.095-.023-.009-1.97-.756-1.991-2.994l-.462-.348zM11.15 3.292c.503-.623.851-1.467.754-2.332-.734.032-1.652.504-2.175 1.113-.464.539-.882 1.42-.773 2.251.826.063 1.676-.416 2.194-1.032z"/>
          </svg>
          Apple से साइन इन करें
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="font-body text-xs text-brown-light uppercase tracking-wider">या / or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Login / Sign Up Tab Toggle */}
      <div className="flex bg-cream rounded-xl p-1 mb-5">
        <button
          onClick={() => switchTab('login')}
          className={`flex-1 py-3 rounded-lg font-body font-semibold text-base transition-all ${
            tab === 'login' ? 'bg-white shadow-sm text-haldi-gold' : 'text-brown-light hover:text-brown'
          }`}
        >
          लॉगिन
          <span className="block text-xs font-normal opacity-60 mt-0.5">Login</span>
        </button>
        <button
          onClick={() => switchTab('signup')}
          className={`flex-1 py-3 rounded-lg font-body font-semibold text-base transition-all ${
            tab === 'signup' ? 'bg-white shadow-sm text-haldi-gold' : 'text-brown-light hover:text-brown'
          }`}
        >
          साइन अप
          <span className="block text-xs font-normal opacity-60 mt-0.5">Sign Up</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-error/30 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
          <span className="text-error mt-0.5">!</span>
          <p className="font-body text-sm text-error">{error}</p>
        </div>
      )}

      {/* ===== LOGIN TAB ===== */}
      {tab === 'login' && (
        <>
          {/* Email / Phone toggle within Login */}
          <div className="flex bg-cream/50 rounded-lg p-1 mb-4">
            {(['email', 'phone'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-3 rounded-md font-body text-base font-medium transition-all ${
                  mode === m ? 'bg-white shadow-sm text-haldi-gold' : 'text-brown-light hover:text-brown'
                }`}
              >
                {m === 'email' ? 'ईमेल Email' : 'फ़ोन Phone'}
              </button>
            ))}
          </div>

          {mode === 'phone' ? (
            <div className="space-y-4">
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
              <GoldButton className="w-full" loading={isSending} disabled={!isValidPhone} onClick={handlePhoneOtp}>
                OTP भेजें — Send OTP
              </GoldButton>
              <p className="font-body text-xs text-brown-light/60 text-center">
                SMS OTP सीमित है — Google से साइन इन करें (सबसे तेज़)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <InputField
                label="ईमेल"
                sublabel="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
              <div className="relative">
                <InputField
                  label="पासवर्ड"
                  sublabel="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="अपना पासवर्ड डालें"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-brown-light hover:text-brown text-base font-body py-1 px-2"
                  tabIndex={-1}
                >
                  {showPassword ? 'छुपाएं' : 'दिखाएं'}
                </button>
              </div>
              <GoldButton className="w-full" loading={isSending} disabled={!isValidEmail || !isValidPassword} onClick={handleEmailLogin}>
                लॉगिन करें — Login
              </GoldButton>

              {/* Email OTP option */}
              <button
                className={`w-full py-2 font-body text-sm text-haldi-gold hover:underline transition-all ${(!isValidEmail || isSending) ? 'opacity-40 pointer-events-none' : ''}`}
                disabled={!isValidEmail || isSending}
                onClick={handleEmailOtp}
              >
                बिना पासवर्ड — Email OTP भेजें
              </button>

              <p className="font-body text-xs text-brown-light text-center">
                नए हैं? <button onClick={() => switchTab('signup')} className="text-haldi-gold font-semibold hover:underline">अकाउंट बनाएं — Sign Up</button>
              </p>
            </div>
          )}
        </>
      )}

      {/* ===== SIGN UP TAB ===== */}
      {tab === 'signup' && (
        <>
          {/* Email / Phone toggle */}
          <div className="flex bg-cream/50 rounded-lg p-1 mb-4">
            {(['phone', 'email'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-3 rounded-md font-body text-base font-medium transition-all ${
                  mode === m ? 'bg-white shadow-sm text-haldi-gold' : 'text-brown-light hover:text-brown'
                }`}
              >
                {m === 'phone' ? 'फ़ोन Phone' : 'ईमेल Email'}
              </button>
            ))}
          </div>

          {/* Name field — shown for both phone and email signup */}
          <InputField
            label="आपका नाम *"
            sublabel="Your Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="अपना नाम डालें"
            autoComplete="name"
          />

          {mode === 'phone' ? (
            <div className="space-y-4">
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
              <p className="font-body text-xs text-brown-light text-center leading-relaxed">
                OTP से खाता बनेगा — पासवर्ड की ज़रूरत नहीं
                <br /><span className="text-brown-light/60">No password needed — account created via OTP</span>
              </p>
              <GoldButton className="w-full" loading={isSending} disabled={!isValidPhone || !isValidName} onClick={handlePhoneOtp}>
                अकाउंट बनाएं — Create Account
              </GoldButton>
              <p className="font-body text-xs text-brown-light/60 text-center">
                SMS OTP सीमित है — Google से साइन इन करें (सबसे तेज़)
              </p>
              <p className="font-body text-xs text-brown-light text-center">
                पहले से अकाउंट है? <button onClick={() => switchTab('login')} className="text-haldi-gold font-semibold hover:underline">लॉगिन करें — Login</button>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <InputField
                label="ईमेल"
                sublabel="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />

              {/* Password with show/hide toggle */}
              <div className="relative">
                <InputField
                  label="पासवर्ड बनाएं"
                  sublabel="Create Password (6+ characters)"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6+ अक्षर का पासवर्ड"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-brown-light hover:text-brown text-base font-body py-1 px-2"
                  tabIndex={-1}
                >
                  {showPassword ? 'छुपाएं' : 'दिखाएं'}
                </button>
              </div>
              <PasswordStrength password={password} />

              <div className="relative">
                <InputField
                  label="पासवर्ड दोबारा डालें"
                  sublabel="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="वही पासवर्ड दोबारा"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 text-brown-light hover:text-brown text-base font-body py-1 px-2"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? 'छुपाएं' : 'दिखाएं'}
                </button>
              </div>

              {/* Password match feedback */}
              {confirmPassword.length > 0 && (
                <p className={`font-body text-xs ${passwordsMatch ? 'text-mehndi-green' : 'text-error'}`}>
                  {passwordsMatch ? 'पासवर्ड मेल खा रहे हैं ✓' : 'पासवर्ड मेल नहीं खा रहे — Passwords do not match'}
                </p>
              )}

              <GoldButton
                className="w-full"
                loading={isSending}
                disabled={!isValidEmail || !isValidPassword || !passwordsMatch || !isValidName || confirmPassword.length === 0}
                onClick={handleEmailSignUp}
              >
                अकाउंट बनाएं — Create Account
              </GoldButton>

              <p className="font-body text-xs text-brown-light text-center">
                पहले से अकाउंट है? <button onClick={() => switchTab('login')} className="text-haldi-gold font-semibold hover:underline">लॉगिन करें — Login</button>
              </p>
            </div>
          )}
        </>
      )}

      {/* Terms */}
      <p className="font-body text-xs text-brown-light text-center mt-6 leading-relaxed">
        आगे बढ़कर आप हमारी{' '}
        <a href="/terms" className="text-haldi-gold hover:underline" aria-label="Terms of Service">Terms</a>{' '}
        और{' '}
        <a href="/privacy" className="text-haldi-gold hover:underline" aria-label="Privacy Policy">Privacy Policy</a>{' '}
        से सहमत होते हैं
      </p>
    </div>
  );
}
