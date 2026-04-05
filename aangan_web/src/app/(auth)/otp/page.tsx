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
    const digit = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[i] = digit;
    setDigits(newDigits);
    if (digit && i < VALIDATION.otpLength - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, VALIDATION.otpLength);
    if (pasted.length === VALIDATION.otpLength) {
      setDigits(pasted.split(''));
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
      <button onClick={() => router.back()} className="text-brown-light font-body text-sm mb-6 flex items-center gap-1">
        ← वापस जाएं
      </button>
      <h2 className="font-heading text-2xl text-brown mb-2">OTP दर्ज करें</h2>
      <p className="font-body text-sm text-brown-light mb-1">Enter OTP</p>
      <p className="font-body text-sm text-brown-light mb-8">
        {isEmail
          ? `${email} पर भेजा गया`
          : `+91 ${phone} पर भेजा गया`}
      </p>

      {error && (
        <div className="bg-red-50 border border-error rounded-lg px-4 py-3 mb-4">
          <p className="font-body text-sm text-error">{error}</p>
        </div>
      )}

      <div className="flex gap-2 justify-center mb-8" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-12 h-14 text-center text-xl font-bold font-body text-brown border-2 border-gray-300 rounded-lg focus:border-haldi-gold focus:outline-none"
          />
        ))}
      </div>

      <GoldButton className="w-full" loading={isVerifying} disabled={!isComplete} onClick={handleVerify}>
        सत्यापित करें — Verify
      </GoldButton>

      <button
        className={`w-full mt-4 font-body text-sm py-2 ${resendTimer > 0 ? 'text-brown-light' : 'text-haldi-gold underline'}`}
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
