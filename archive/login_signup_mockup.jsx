import React, { useState, useEffect } from 'react';

export default function AanganLoginSignup() {
  const [screen, setScreen] = useState('welcome'); // welcome, phone, otp, profile
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [showOtpTimer, setShowOtpTimer] = useState(false);

  // OTP Timer Effect
  useEffect(() => {
    if (screen === 'otp' && showOtpTimer && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, screen, showOtpTimer]);

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only one digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  // Format phone number with +91
  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setPhone(cleaned);
    }
  };

  // Rangoli/Mandala background pattern
  const MandalaPattern = () => (
    <svg
      className="absolute inset-0 w-full h-full opacity-5"
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="200" cy="200" r="150" fill="none" stroke="#7A9A3A" strokeWidth="1" />
      <circle cx="200" cy="200" r="120" fill="none" stroke="#C8A84B" strokeWidth="1" />
      <circle cx="200" cy="200" r="90" fill="none" stroke="#7A9A3A" strokeWidth="1" />
      <circle cx="200" cy="200" r="60" fill="none" stroke="#C8A84B" strokeWidth="1" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x = 200 + 140 * Math.cos(rad);
        const y = 200 + 140 * Math.sin(rad);
        return (
          <line
            key={angle}
            x1="200"
            y1="200"
            x2={x}
            y2={y}
            stroke="#7A9A3A"
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );

  // Welcome Screen
  if (screen === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#C8A84B] to-[#FDFAF0] p-4">
        <div className="w-full max-w-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Mandala Background */}
            <div className="absolute inset-0">
              <MandalaPattern />
            </div>

            {/* Header with Haldi Gold */}
            <div className="relative bg-gradient-to-b from-[#C8A84B] to-[#B8982B] px-6 pt-12 pb-8 text-center">
              {/* Decorative circles */}
              <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white opacity-20"></div>
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white opacity-20"></div>

              <h1 className="text-5xl font-bold text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                आँगन
              </h1>
              <p className="text-sm text-white opacity-90 tracking-wider">AANGAN</p>
            </div>

            {/* Content Area */}
            <div className="relative px-6 py-8 text-center">
              {/* Warm Illustration Placeholder */}
              <div className="mb-8">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#FDFAF0] to-[#F5F0E8] flex items-center justify-center border-4 border-[#C8A84B] shadow-lg">
                  <svg
                    className="w-20 h-20 text-[#7A9A3A]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {/* Family icon - representing togetherness */}
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
                </div>
              </div>

              {/* Tagline */}
              <h2 className="text-2xl font-bold text-[#2C3E2D] mb-2">
                Your Family
              </h2>
              <p className="text-sm text-[#7A9A3A] mb-8 leading-relaxed px-2">
                Connect with your loved ones. Share memories. Stay together.
              </p>

              {/* Call to Action */}
              <button
                onClick={() => {
                  setScreen('phone');
                  setShowOtpTimer(false);
                  setTimeLeft(60);
                }}
                className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #C8A84B 0%, #B8982B 100%)',
                }}
              >
                शुरू करें (Get Started)
              </button>

              {/* Bottom decorative element */}
              <div className="mt-8 flex justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#C8A84B]"></div>
                <div className="w-2 h-2 rounded-full bg-[#7A9A3A]"></div>
                <div className="w-2 h-2 rounded-full bg-[#C8A84B]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Phone Entry Screen
  if (screen === 'phone') {
    const isPhoneValid = phone.length === 10;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#C8A84B] to-[#FDFAF0] p-4">
        <div className="w-full max-w-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Mandala Background */}
            <div className="absolute inset-0">
              <MandalaPattern />
            </div>

            {/* Header */}
            <div className="relative bg-gradient-to-b from-[#C8A84B] to-[#B8982B] px-6 pt-8 pb-6 flex items-center gap-3">
              <button
                onClick={() => setScreen('welcome')}
                className="text-white hover:opacity-80 transition"
              >
                ←
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                  आँगन
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="relative px-6 py-8">
              {/* Title */}
              <h3 className="text-2xl font-bold text-[#2C3E2D] mb-2 text-center" style={{ fontFamily: 'Georgia, serif' }}>
                अपना फ़ोन नंबर दें
              </h3>
              <p className="text-sm text-[#666] text-center mb-8">
                Enter your phone number
              </p>

              {/* Phone Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[#2C3E2D] mb-3">
                  Mobile Number
                </label>
                <div className="flex gap-2 bg-[#FDFAF0] rounded-lg border-2 border-[#E8DCC8] overflow-hidden focus-within:border-[#C8A84B] transition">
                  {/* Flag + Country Code */}
                  <div className="flex items-center px-4 bg-white border-r border-[#E8DCC8]">
                    <span className="text-xl">🇮🇳</span>
                    <span className="ml-2 font-semibold text-[#2C3E2D]">+91</span>
                  </div>
                  {/* Input */}
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => formatPhone(e.target.value)}
                    className="flex-1 bg-transparent px-4 py-4 text-lg font-semibold text-[#2C3E2D] placeholder-[#999] outline-none"
                  />
                </div>
                <p className="text-xs text-[#999] mt-2">10-digit Indian mobile number</p>
              </div>

              {/* Info Box */}
              <div className="bg-[#FFF9E6] border-l-4 border-[#C8A84B] rounded px-4 py-3 mb-6">
                <p className="text-xs text-[#666] leading-relaxed">
                  📱 We'll send an OTP to verify your number. Standard SMS rates apply.
                </p>
              </div>

              {/* Send OTP Button */}
              <button
                onClick={() => {
                  if (isPhoneValid) {
                    setScreen('otp');
                    setShowOtpTimer(true);
                    setTimeLeft(60);
                  }
                }}
                disabled={!isPhoneValid}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 transform ${
                  isPhoneValid
                    ? 'hover:scale-105 active:scale-95 text-white shadow-lg'
                    : 'opacity-50 cursor-not-allowed text-white'
                }`}
                style={{
                  background: isPhoneValid
                    ? 'linear-gradient(135deg, #C8A84B 0%, #B8982B 100%)'
                    : '#CCCCCC',
                }}
              >
                OTP भेजें (Send OTP)
              </button>

              {/* Footer Info */}
              <p className="text-xs text-[#999] text-center mt-6">
                आपके नंबर की गोपनीयता सुरक्षित है
                <br />
                Your privacy is protected
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // OTP Verification Screen
  if (screen === 'otp') {
    const otpFilled = otp.every((digit) => digit !== '');
    const isExpired = timeLeft === 0;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#C8A84B] to-[#FDFAF0] p-4">
        <div className="w-full max-w-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Mandala Background */}
            <div className="absolute inset-0">
              <MandalaPattern />
            </div>

            {/* Header */}
            <div className="relative bg-gradient-to-b from-[#C8A84B] to-[#B8982B] px-6 pt-8 pb-6 flex items-center gap-3">
              <button
                onClick={() => setScreen('phone')}
                className="text-white hover:opacity-80 transition"
              >
                ←
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                  आँगन
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="relative px-6 py-8">
              {/* Title */}
              <h3 className="text-2xl font-bold text-[#2C3E2D] mb-2 text-center" style={{ fontFamily: 'Georgia, serif' }}>
                OTP दर्ज करें
              </h3>
              <p className="text-sm text-[#666] text-center mb-2">
                Enter verification code
              </p>
              <p className="text-xs text-[#999] text-center mb-8">
                Sent to +91{phone}
              </p>

              {/* OTP Input Boxes */}
              <div className="flex gap-3 mb-6 justify-center">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !digit && index > 0) {
                        document.getElementById(`otp-${index - 1}`)?.focus();
                      }
                    }}
                    className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 border-[#E8DCC8] text-[#2C3E2D] focus:border-[#C8A84B] focus:outline-none transition bg-[#FDFAF0]"
                  />
                ))}
              </div>

              {/* Timer */}
              <div className="text-center mb-6">
                {isExpired ? (
                  <p className="text-sm font-semibold text-red-600">OTP expired</p>
                ) : (
                  <p className="text-sm font-semibold text-[#7A9A3A]">
                    {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
                    {String(timeLeft % 60).padStart(2, '0')}
                  </p>
                )}
              </div>

              {/* Verify Button */}
              <button
                onClick={() => {
                  if (otpFilled && !isExpired) {
                    setScreen('profile');
                    setOtp(['', '', '', '', '', '']);
                  }
                }}
                disabled={!otpFilled || isExpired}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 transform ${
                  otpFilled && !isExpired
                    ? 'hover:scale-105 active:scale-95 text-white shadow-lg'
                    : 'opacity-50 cursor-not-allowed text-white'
                }`}
                style={{
                  background:
                    otpFilled && !isExpired
                      ? 'linear-gradient(135deg, #C8A84B 0%, #B8982B 100%)'
                      : '#CCCCCC',
                }}
              >
                सत्यापित करें (Verify)
              </button>

              {/* Resend OTP */}
              <div className="text-center mt-6">
                {isExpired ? (
                  <button
                    onClick={() => {
                      setOtp(['', '', '', '', '', '']);
                      setTimeLeft(60);
                      setShowOtpTimer(true);
                    }}
                    className="text-sm font-semibold text-[#C8A84B] hover:text-[#B8982B] transition"
                  >
                    OTP फिर से भेजें (Resend OTP)
                  </button>
                ) : (
                  <p className="text-xs text-[#999]">
                    Didn't receive the code?{' '}
                    <button className="text-[#C8A84B] font-semibold hover:text-[#B8982B] transition">
                      Resend
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Profile Setup Screen
  if (screen === 'profile') {
    const isProfileValid = name.trim() !== '';

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#C8A84B] to-[#FDFAF0] p-4">
        <div className="w-full max-w-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Mandala Background */}
            <div className="absolute inset-0">
              <MandalaPattern />
            </div>

            {/* Header */}
            <div className="relative bg-gradient-to-b from-[#C8A84B] to-[#B8982B] px-6 pt-8 pb-6 flex items-center gap-3">
              <button
                onClick={() => setScreen('otp')}
                className="text-white hover:opacity-80 transition"
              >
                ←
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                  आँगन
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="relative px-6 py-8">
              {/* Title */}
              <h3 className="text-2xl font-bold text-[#2C3E2D] mb-2 text-center" style={{ fontFamily: 'Georgia, serif' }}>
                अपनी प्रोफ़ाइल बनाएँ
              </h3>
              <p className="text-sm text-[#666] text-center mb-8">
                Set up your profile
              </p>

              {/* Profile Photo Upload */}
              <div className="flex justify-center mb-8">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#C8A84B] to-[#7A9A3A] flex items-center justify-center text-white text-3xl font-bold shadow-lg group-hover:shadow-xl transition cursor-pointer">
                    📷
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#7A9A3A] rounded-full border-2 border-white flex items-center justify-center text-white text-xs">
                    +
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-[#2C3E2D] mb-2">
                  आपका नाम (Your Name)
                </label>
                <input
                  type="text"
                  placeholder="अपना नाम लिखिए"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#E8DCC8] text-[#2C3E2D] placeholder-[#999] focus:border-[#C8A84B] focus:outline-none transition bg-[#FDFAF0]"
                />
              </div>

              {/* Village/City Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[#2C3E2D] mb-2">
                  गाँव / शहर (Village / City)
                </label>
                <input
                  type="text"
                  placeholder="अपने गाँव या शहर का नाम"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#E8DCC8] text-[#2C3E2D] placeholder-[#999] focus:border-[#C8A84B] focus:outline-none transition bg-[#FDFAF0]"
                />
              </div>

              {/* Welcome Note */}
              <div className="bg-[#F5F0E8] rounded-lg px-4 py-3 mb-6 border-l-4 border-[#7A9A3A]">
                <p className="text-xs text-[#666] leading-relaxed">
                  ✓ नाम से आपका परिवार आपको आसानी से खोज सकेगा
                  <br />
                  Family members can find you by name
                </p>
              </div>

              {/* Join Button */}
              <button
                onClick={() => {
                  if (isProfileValid) {
                    // Simulate successful signup
                    alert(
                      `स्वागत है, ${name}! \nWelcome to Aangan! 🎉\n\nYour account has been created.`
                    );
                    // Reset to welcome screen
                    setScreen('welcome');
                    setPhone('');
                    setName('');
                    setVillage('');
                    setOtp(['', '', '', '', '', '']);
                  }
                }}
                disabled={!isProfileValid}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 transform ${
                  isProfileValid
                    ? 'hover:scale-105 active:scale-95 text-white shadow-lg'
                    : 'opacity-50 cursor-not-allowed text-white'
                }`}
                style={{
                  background: isProfileValid
                    ? 'linear-gradient(135deg, #7A9A3A 0%, #5A7A1A 100%)'
                    : '#CCCCCC',
                }}
              >
                आँगन में शामिल हों (Join Aangan)
              </button>

              {/* Footer */}
              <p className="text-xs text-[#999] text-center mt-6">
                आप कभी भी अपनी प्रोफ़ाइल बदल सकते हैं
                <br />
                You can edit your profile anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
