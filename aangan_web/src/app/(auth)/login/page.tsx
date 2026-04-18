'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';
import { VALIDATION } from '@/lib/constants';
import { captureReferralFromUrl } from '@/lib/utils/referral';

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 6,
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['बहुत कमज़ोर Very Weak', 'कमज़ोर Weak', 'ठीक Fair', 'अच्छा Good', 'मज़बूत Strong'];
  const colors = ['bg-red-500', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-mehndi-green'];
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? colors[score] : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className={`font-body text-base ${score <= 1 ? 'text-red-500' : score === 2 ? 'text-yellow-600' : 'text-mehndi-green'}`}>
        {labels[score]}
      </p>
    </div>
  );
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
  const { sendOtp, sendEmailOtp, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, session, isNewUser, isLoading, initialize, error, setError } = useAuthStore();

  // State
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

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

  // Validation
  const isValidPhone = VALIDATION.phoneRegex.test(phone);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = password.length >= 6;
  const passwordsMatch = password === confirmPassword;

  // ========== HANDLERS ==========

  // Phone OTP — works for both login & signup (auto-detect)
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

  // Email OTP — passwordless, works for both login & signup
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

  // Password login — for existing users
  const handlePasswordLogin = async () => {
    if (!isValidEmail || !isValidPassword || isSending) return;
    setIsSending(true);
    const ok = await signInWithEmail(email, password);
    setIsSending(false);
    // error shown via store's error state
  };

  // Password signup — for new email+password users
  const handlePasswordSignUp = async () => {
    if (!isValidEmail || !isValidPassword || !passwordsMatch || isSending) return;
    setIsSending(true);
    setError(null);
    const ok = await signUpWithEmail(email, password);
    setIsSending(false);
    if (ok) {
      sessionStorage.setItem('otp_email', email);
      router.push('/otp');
    }
  };

  // ========== RENDER ==========

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-cream-dark p-6 sm:p-8">
      {/* Logo */}
      <div className="text-center mb-6">
        <h1 className="font-heading text-4xl text-haldi-gold font-bold tracking-wide">AANGAN</h1>
        <p className="font-heading text-2xl text-brown mt-1">{'\u0906\u0901\u0917\u0928'}</p>
        <p className="font-body text-brown-light mt-2 text-base">{'\u092A\u0930\u093F\u0935\u093E\u0930 \u0938\u0947 \u091C\u0941\u0921\u093C\u0947\u0902'}</p>
        <p className="font-body text-base text-brown-light">Connect with Family</p>
      </div>

      {/* ===== 1. SOCIAL LOGIN — Primary (like Instagram/ShareChat) ===== */}
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
          Google से जारी रखें
        </button>

        <button
          onClick={signInWithApple}
          className="w-full flex items-center justify-center gap-3 min-h-dadi py-3.5 px-4 bg-black rounded-xl font-body font-semibold text-base text-white hover:bg-gray-900 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
        >
          <svg width="20" height="24" viewBox="0 0 17 20" fill="white">
            <path d="M13.545 10.239c-.022-2.234 1.823-3.306 1.905-3.358-.036-.053-1.063-1.575-2.704-1.575-1.138 0-2.122.693-2.693.693-.597 0-1.474-.676-2.437-.657-1.244.018-2.407.732-3.044 1.842-1.315 2.273-.336 5.614.926 7.455.632.9 1.371 1.9 2.339 1.865.948-.038 1.299-.604 2.443-.604 1.131 0 1.455.604 2.437.583.016 0-.003 0 0 0 1.003-.019 1.639-.9 2.254-1.807.724-1.03 1.013-2.042 1.027-2.095-.023-.009-1.97-.756-1.991-2.994l-.462-.348zM11.15 3.292c.503-.623.851-1.467.754-2.332-.734.032-1.652.504-2.175 1.113-.464.539-.882 1.42-.773 2.251.826.063 1.676-.416 2.194-1.032z"/>
          </svg>
          Apple से जारी रखें
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="font-body text-base text-brown-light uppercase tracking-wider">या / or</span>
        <div className="flex-1 h-px bg-gray-200" />
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-error/30 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
          <span className="text-error mt-0.5">!</span>
          <p className="font-body text-base text-error">{error}</p>
        </div>
      )}

      {/* ===== 2. PHONE OTP — India's default (like WhatsApp/PhonePe) ===== */}
      <form
        className="space-y-3"
        onSubmit={(e) => { e.preventDefault(); handlePhoneOtp(); }}
      >
        <InputField
          label="फ़ोन नंबर"
          sublabel="Phone Number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          prefix="+91"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="9876543210"
          maxLength={10}
        />
        <GoldButton type="submit" className="w-full" loading={isSending && !showEmailSection} disabled={!isValidPhone}>
          {isSending && !showEmailSection ? 'प्रतीक्षा करें…' : 'OTP भेजें — Send OTP'}
        </GoldButton>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="font-body text-base text-brown-light uppercase tracking-wider">या / or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* ===== 3. EMAIL — Expandable (like Notion/Slack) ===== */}
      {!showEmailSection ? (
        <button
          onClick={() => { setShowEmailSection(true); setError(null); }}
          className="w-full flex items-center justify-center gap-3 min-h-dadi py-3 px-4 bg-cream rounded-xl border border-gray-200 font-body text-base text-brown hover:bg-cream-dark hover:shadow-sm transition-all"
        >
          <span className="text-xl">📧</span>
          <span className="font-semibold">ईमेल से जारी रखें</span>
          <span className="text-base text-brown-light">Continue with Email</span>
        </button>
      ) : (
        <div className="space-y-3 bg-cream/50 rounded-xl p-4 border border-gray-100">
          <InputField
            label="ईमेल"
            sublabel="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            autoFocus
          />

          {/* Default: OTP (passwordless) */}
          {!showPasswordField ? (
            <>
              <GoldButton className="w-full" loading={isSending} disabled={!isValidEmail} onClick={handleEmailOtp}>
                OTP भेजें — Send OTP
              </GoldButton>

              <button
                onClick={() => { setShowPasswordField(true); setError(null); }}
                className="w-full py-2 font-body text-base text-haldi-gold font-semibold hover:underline transition-all"
              >
                🔑 पासवर्ड से लॉगिन — Use Password
              </button>
            </>
          ) : (
            <>
              {/* Password field */}
              <div className="relative">
                <InputField
                  label="पासवर्ड"
                  sublabel="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? '6+ अक्षर का पासवर्ड' : 'अपना पासवर्ड डालें'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  autoFocus
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

              {isSignUp && (
                <>
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
                  {confirmPassword.length > 0 && (
                    <p className={`font-body text-base ${passwordsMatch ? 'text-mehndi-green' : 'text-error'}`}>
                      {passwordsMatch ? 'पासवर्ड मेल खा रहे हैं ✓' : 'पासवर्ड मेल नहीं खा रहे'}
                    </p>
                  )}
                </>
              )}

              {/* Login or SignUp button */}
              {isSignUp ? (
                <GoldButton
                  className="w-full !bg-mehndi-green hover:!bg-mehndi-green-dark"
                  loading={isSending}
                  disabled={!isValidEmail || !isValidPassword || !passwordsMatch || confirmPassword.length === 0}
                  onClick={handlePasswordSignUp}
                >
                  खाता बनाएँ — Sign Up
                </GoldButton>
              ) : (
                <GoldButton
                  className="w-full"
                  loading={isSending}
                  disabled={!isValidEmail || !isValidPassword}
                  onClick={handlePasswordLogin}
                >
                  लॉगिन करें — Login
                </GoldButton>
              )}

              {/* Toggle login/signup */}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setConfirmPassword('');
                  setError(null);
                }}
                className="w-full py-2 font-body text-base text-haldi-gold font-semibold hover:underline transition-all"
              >
                {isSignUp ? 'पहले से खाता है? लॉगिन करें →' : 'नए हैं? नया खाता बनाएँ →'}
              </button>

              {/* Back to OTP */}
              <button
                onClick={() => {
                  setShowPasswordField(false);
                  setPassword('');
                  setConfirmPassword('');
                  setIsSignUp(false);
                  setError(null);
                }}
                className="w-full py-2 min-h-dadi font-body text-base text-brown-light hover:text-brown hover:underline transition-all"
              >
                ← बिना पासवर्ड — OTP से जारी रखें
              </button>
            </>
          )}

          {/* Collapse email */}
          <button
            onClick={() => {
              setShowEmailSection(false);
              setShowPasswordField(false);
              setEmail('');
              setPassword('');
              setConfirmPassword('');
              setIsSignUp(false);
              setError(null);
            }}
            className="w-full py-2 min-h-dadi font-body text-base text-gray-400 hover:text-gray-600 transition-all"
          >
            ▲ बंद करें
          </button>
        </div>
      )}

      {/* Terms */}
      <p className="font-body text-base text-brown-light text-center mt-6 leading-relaxed">
        आगे बढ़कर आप हमारी{' '}
        <a href="/terms" className="text-haldi-gold hover:underline" aria-label="Terms of Service">Terms</a>{' '}
        और{' '}
        <a href="/privacy" className="text-haldi-gold hover:underline" aria-label="Privacy Policy">Privacy Policy</a>{' '}
        से सहमत होते हैं
      </p>
    </div>
  );
}
