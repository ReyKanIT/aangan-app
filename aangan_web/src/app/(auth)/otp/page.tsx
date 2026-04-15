'use client';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import GoldButton from '@/components/ui/GoldButton';
import { VALIDATION } from '@/lib/constants';

function OtpForm() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const isEmail = !!email;

  useEffect(() => {
    const storedPhone = sessionStorage.getItem('otp_phone');
    const storedEmail = sessionStorage.getItem('otp_email');
    if (storedPhone) setPhone(storedPhone);
    else if (storedEmail) setEmail(storedEmail);
    else router.replace('/login');
    // Autofocus first OTP box so Dadi doesn't have to tap it
    setTimeout(() => refs.current[0]?.focus(), 50);
  }, [router]);

  const { verifyOtp, verifyEmailOtp, sendOtp, sendEmailOtp, session, isNewUser, isLoading, error, setError } = useAuthStore();
  const [digits, setDigits] = useState<string[]>(Array(VALIDATION.otpLength).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(VALIDATION.otpTimer);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (session && !isLoading) {
      router.replace(isNewUser ? '/profile-setup' : '/feed');
    }
  }, [session, isNewUser, isLoading, router]);

  useEffect(() => {
    const t = setInterval(() => setResendTimer((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleChange = (i: number, val: string) => {
    // Handle SMS auto-fill: if full 6 digits dumped into one input, split them
    const clean = val.replace(/\D/g, '');
    if (clean.length >= VALIDATION.otpLength) {
      const filled = clean.slice(0, VALIDATION.otpLength).split('');
      setDigits(filled);
      refs.current[VALIDATION.otpLength - 1]?.focus();
      return;
    }
    const digit = clean.slice(-1);
    const newDigits = [...digits];
    newDigits[i] = digit;
    setDigits(newDigits);
    if (digit && i < VALIDATION.otpLength - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, VALIDATION.otpLength);
    if (pasted.length === VALIDATION.otpLength) {
      setDigits(pasted.split(''));
      refs.current[VALIDATION.otpLength - 1]?.focus();
    } else if (pasted.length > 0) {
      // Partial paste — fill what we have starting from current position
      const newDigits = [...digits];
      for (let j = 0; j < pasted.length && j < VALIDATION.otpLength; j++) {
        newDigits[j] = pasted[j];
      }
      setDigits(newDigits);
      const nextFocus = Math.min(pasted.length, VALIDATION.otpLength - 1);
      refs.current[nextFocus]?.focus();
    }
  };

  const otp = digits.join('');
  const isComplete = otp.length === VALIDATION.otpLength;

  const handleVerify = async () => {
    if (!isComplete || isVerifying) return;
    setIsVerifying(true);
    setError(null);
    let ok = false;
    if (isEmail && email) ok = await verifyEmailOtp(email, otp);
    else if (phone) ok = await verifyOtp(phone, otp);
    if (ok) {
      sessionStorage.removeItem('otp_phone');
      sessionStorage.removeItem('otp_email');
    }
    setIsVerifying(false);
    if (!ok) setError('गलत OTP है। कृपया फिर से कोशिश करें।');
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResendTimer(VALIDATION.otpTimer);
    if (isEmail && email) await sendEmailOtp(email);
    else if (phone) await sendOtp(phone);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <button onClick={() => router.back()} className="text-brown-light font-body text-base mb-6 flex items-center gap-1 py-2">
        ← वापस जाएं — Go Back
      </button>
      <h2 className="font-heading text-2xl text-brown mb-2">OTP दर्ज करें</h2>
      <p className="font-body text-base text-brown-light mb-1">Enter OTP</p>
      <p className="font-body text-base text-brown-light mb-2">
        {isEmail
          ? `${email} पर भेजा गया`
          : `+91 ${phone} पर भेजा गया`}
      </p>
      <p className="font-body text-base text-brown-light/70 mb-6">
        {isEmail
          ? 'ईमेल में 6 अंकों का कोड आया है — वो यहाँ डालें'
          : 'SMS में 6 अंकों का कोड आया है — वो यहाँ डालें'}
        <br />
        <span className="text-base">
          {isEmail ? 'Check your email for a 6-digit code' : 'Check your SMS for a 6-digit code'}
        </span>
      </p>

      {error && (
        <div className="bg-red-50 border border-error rounded-lg px-4 py-3 mb-4">
          <p className="font-body text-base text-error">{error}</p>
        </div>
      )}

      <div className="flex gap-2 justify-center mb-8">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            // maxLength allows SMS auto-fill to paste full code; handleChange splits it
            maxLength={VALIDATION.otpLength}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            aria-label={`OTP digit ${i + 1}`}
            className="w-12 h-[52px] sm:w-14 sm:h-[56px] text-center text-2xl font-bold font-body text-brown border-2 border-gray-300 rounded-lg focus:border-haldi-gold focus:outline-none"
          />
        ))}
      </div>

      <GoldButton className="w-full" loading={isVerifying} disabled={!isComplete} onClick={handleVerify}>
        {isVerifying ? 'प्रतीक्षा करें…' : 'सत्यापित करें — Verify'}
      </GoldButton>

      <button
        className={`w-full mt-4 font-body text-base py-3 ${resendTimer > 0 ? 'text-brown-light' : 'text-haldi-gold underline'}`}
        disabled={resendTimer > 0}
        onClick={handleResend}
      >
        {resendTimer > 0 ? `फिर से भेजें ${resendTimer}s में — Resend in ${resendTimer}s` : 'OTP फिर से भेजें — Resend OTP'}
      </button>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<div />}>
      <OtpForm />
    </Suspense>
  );
}
