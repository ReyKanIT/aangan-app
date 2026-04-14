import { useState, useEffect } from "react";

// ===== AANGAN ICON (Official SVG) =====
const AanganIcon = ({ size = 80 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width={size} height={size}>
    <defs>
      <linearGradient id="goldBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor:'#DBBA4E'}}/>
        <stop offset="100%" style={{stopColor:'#B8963A'}}/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="44" ry="44" fill="url(#goldBg)"/>
    <polygon points="100,28 26,76 26,178 174,178 174,76" fill="#FFFFFF"/>
    <rect x="26" y="76" width="148" height="102" rx="8" ry="8" fill="#FFFFFF"/>
    <line x1="26" y1="76" x2="26" y2="172" stroke="#5C3D1E" strokeWidth="3.5"/>
    <line x1="174" y1="76" x2="174" y2="172" stroke="#5C3D1E" strokeWidth="3.5"/>
    <path d="M26,172 Q26,178 34,178 L166,178 Q174,178 174,172" fill="none" stroke="#5C3D1E" strokeWidth="3.5"/>
    <line x1="100" y1="28" x2="20" y2="76" stroke="#5C3D1E" strokeWidth="4" strokeLinecap="round"/>
    <line x1="100" y1="28" x2="180" y2="76" stroke="#5C3D1E" strokeWidth="4" strokeLinecap="round"/>
    <line x1="100" y1="72" x2="100" y2="86" stroke="#B03060" strokeWidth="3" strokeLinecap="round"/>
    <line x1="100" y1="86" x2="72" y2="94" stroke="#1A8C7E" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="100" y1="86" x2="128" y2="94" stroke="#1A8C7E" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="100" cy="86" r="3" fill="#B03060"/>
    <line x1="72" y1="120" x2="72" y2="134" stroke="#E8863A" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="128" y1="120" x2="128" y2="134" stroke="#E8863A" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="46" y1="134" x2="154" y2="134" stroke="#3DAA5C" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="46" y1="134" x2="46" y2="142" stroke="#E8863A" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="82" y1="134" x2="82" y2="142" stroke="#E8863A" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="118" y1="134" x2="118" y2="142" stroke="#E8863A" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="154" y1="134" x2="154" y2="142" stroke="#E8863A" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="58" y1="154" x2="70" y2="154" stroke="#9C5BBD" strokeWidth="2" strokeDasharray="3,3" strokeLinecap="round"/>
    <line x1="94" y1="154" x2="106" y2="154" stroke="#9C5BBD" strokeWidth="2" strokeDasharray="3,3" strokeLinecap="round"/>
    <line x1="130" y1="154" x2="142" y2="154" stroke="#9C5BBD" strokeWidth="2" strokeDasharray="3,3" strokeLinecap="round"/>
    <circle cx="100" cy="56" r="16" fill="#EDCAAE" stroke="#5C3D1E" strokeWidth="2"/>
    <circle cx="95" cy="53" r="2.2" fill="#3D2B1F"/>
    <circle cx="105" cy="53" r="2.2" fill="#3D2B1F"/>
    <path d="M92,58 Q96,63 100,59 Q104,63 108,58" fill="#3D2B1F" stroke="#3D2B1F" strokeWidth="1.5"/>
    <path d="M95,63 Q100,69 105,63" fill="none" stroke="#3D2B1F" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="72" cy="107" r="14" fill="#5B9BD5" stroke="#3A78B0" strokeWidth="2"/>
    <circle cx="68" cy="104" r="2" fill="#FFFFFF"/><circle cx="68" cy="104" r="1.2" fill="#3D2B1F"/>
    <circle cx="76" cy="104" r="2" fill="#FFFFFF"/><circle cx="76" cy="104" r="1.2" fill="#3D2B1F"/>
    <path d="M68,111 Q72,116 76,111" fill="none" stroke="#3D2B1F" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="128" cy="107" r="14" fill="#F2A0B0" stroke="#D87A90" strokeWidth="2"/>
    <circle cx="124" cy="104" r="2" fill="#FFFFFF"/><circle cx="124" cy="104" r="1.2" fill="#3D2B1F"/>
    <circle cx="132" cy="104" r="2" fill="#FFFFFF"/><circle cx="132" cy="104" r="1.2" fill="#3D2B1F"/>
    <path d="M124,111 Q128,116 132,111" fill="none" stroke="#3D2B1F" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="128" cy="96" r="2" fill="#D4382C"/>
    <circle cx="46" cy="154" r="11" fill="#8FC4E8" stroke="#5A9BD5" strokeWidth="1.5"/>
    <circle cx="43" cy="152" r="1.5" fill="#3D2B1F"/><circle cx="49" cy="152" r="1.5" fill="#3D2B1F"/>
    <path d="M43,158 Q46,162 49,158" fill="none" stroke="#3D2B1F" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="82" cy="154" r="11" fill="#F7C4CC" stroke="#E89AAA" strokeWidth="1.5"/>
    <circle cx="79" cy="152" r="1.5" fill="#3D2B1F"/><circle cx="85" cy="152" r="1.5" fill="#3D2B1F"/>
    <path d="M79,158 Q82,162 85,158" fill="none" stroke="#3D2B1F" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="90" cy="146" r="2.5" fill="#E8637A"/>
    <circle cx="118" cy="154" r="11" fill="#8FC4E8" stroke="#5A9BD5" strokeWidth="1.5"/>
    <circle cx="115" cy="152" r="1.5" fill="#3D2B1F"/><circle cx="121" cy="152" r="1.5" fill="#3D2B1F"/>
    <path d="M115,158 Q118,162 121,158" fill="none" stroke="#3D2B1F" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="154" cy="154" r="11" fill="#F7C4CC" stroke="#E89AAA" strokeWidth="1.5"/>
    <circle cx="151" cy="152" r="1.5" fill="#3D2B1F"/><circle cx="157" cy="152" r="1.5" fill="#3D2B1F"/>
    <path d="M151,158 Q154,162 157,158" fill="none" stroke="#3D2B1F" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="162" cy="146" r="2.5" fill="#E8637A"/>
  </svg>
);

// ===== COLOR PALETTE =====
const C = {
  haldi: '#C8A84B', haldiDark: '#B8963A', haldiLight: '#DBBA4E',
  mehndi: '#7A9A3A', cream: '#FDFAF0', brown: '#5C3D1E',
  white: '#FFFFFF', grey: '#8B8680', lightGrey: '#E8E4DD',
  text: '#2D1F0E', textLight: '#6B5E4F',
  danger: '#D4382C', success: '#2E8B57',
};

// ===== SHARED COMPONENTS =====
const GoldButton = ({ children, onClick, style = {}, secondary = false }) => (
  <button onClick={onClick} style={{
    width: '100%', padding: '16px', fontSize: 18, fontWeight: 700,
    background: secondary ? C.white : `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
    color: secondary ? C.text : C.white,
    border: secondary ? `2px solid ${C.lightGrey}` : 'none',
    borderRadius: 12, cursor: 'pointer', minHeight: 52,
    boxShadow: secondary ? 'none' : '0 4px 16px rgba(200,168,75,0.35)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    ...style,
  }}>{children}</button>
);

const GoldHeader = ({ children, compact = false }) => (
  <div style={{
    background: `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
    padding: compact ? '12px 16px' : '48px 24px 36px',
    textAlign: compact ? 'left' : 'center',
    borderRadius: compact ? 0 : '0 0 32px 32px',
    display: compact ? 'flex' : 'block',
    alignItems: 'center', justifyContent: 'space-between',
  }}>{children}</div>
);

const BottomNav = ({ active, onNavigate }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-around', padding: '10px 0 14px',
    background: C.white, borderTop: `1px solid ${C.lightGrey}`,
    boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
  }}>
    {[
      { icon: '🏠', label: 'होम', key: 'home' },
      { icon: '🌳', label: 'परिवार', key: 'tree' },
      { icon: '➕', label: '', key: 'compose', isAdd: true },
      { icon: '🔔', label: 'सूचना', key: 'notifications' },
      { icon: '👤', label: 'प्रोफ़ाइल', key: 'settings' },
    ].map((item, i) => (
      <div key={i} onClick={() => onNavigate(item.key)}
        style={{ textAlign: 'center', cursor: 'pointer', minWidth: 48 }}>
        {item.isAdd ? (
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: -20, boxShadow: '0 4px 12px rgba(200,168,75,0.4)',
          }}>
            <span style={{ fontSize: 24, color: C.white }}>➕</span>
          </div>
        ) : (
          <>
            <span style={{ fontSize: 22, filter: active === item.key ? 'none' : 'grayscale(50%)' }}>{item.icon}</span>
            <p style={{ fontSize: 10, margin: '2px 0 0', color: active === item.key ? C.haldi : C.grey, fontWeight: active === item.key ? 700 : 400 }}>{item.label}</p>
            {item.key === 'notifications' && (
              <div style={{
                position: 'absolute', marginTop: -38, marginLeft: 28,
                width: 8, height: 8, borderRadius: '50%', background: C.danger,
              }} />
            )}
          </>
        )}
      </div>
    ))}
  </div>
);

const BackButton = ({ onClick }) => (
  <button onClick={onClick} style={{
    background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
    color: C.text, padding: 8, marginLeft: -8,
  }}>←</button>
);

// ===== SCREEN 1: SPLASH (NEW) =====
const SplashScreen = ({ onNavigate }) => {
  useEffect(() => {
    const timer = setTimeout(() => onNavigate('login'), 2500);
    return () => clearTimeout(timer);
  }, [onNavigate]);

  return (
    <div style={{
      background: `linear-gradient(160deg, ${C.haldiLight}, ${C.haldiDark}, ${C.brown})`,
      minHeight: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        <AanganIcon size={120} />
      </div>
      <h1 style={{
        fontFamily: 'serif', fontSize: 52, color: C.white, margin: '20px 0 4px',
        textShadow: '0 4px 20px rgba(0,0,0,0.3)',
        letterSpacing: 2,
      }}>आँगन</h1>
      <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, margin: 0, fontWeight: 500 }}>Your Family</p>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '8px 0 0' }}>परिवार को जोड़ता है</p>

      <div style={{
        position: 'absolute', bottom: 60,
        display: 'flex', gap: 6, alignItems: 'center',
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            animation: `dot ${1.4}s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes dot { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }
      `}</style>
    </div>
  );
};

// ===== SCREEN 2: LOGIN PAGE =====
const LoginPage = ({ onNavigate }) => (
  <div style={{ background: C.cream, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
    <GoldHeader>
      <AanganIcon size={90} />
      <h1 style={{ fontFamily: 'serif', fontSize: 42, color: C.white, margin: '12px 0 4px', textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>आँगन</h1>
      <p style={{ color: C.white, fontSize: 18, margin: 0, opacity: 0.95, fontWeight: 500 }}>Your Family</p>
      <p style={{ color: C.white, fontSize: 14, margin: '4px 0 0', opacity: 0.8 }}>परिवार को जोड़ता है</p>
    </GoldHeader>

    <div style={{ padding: '32px 24px', flex: 1 }}>
      <p style={{ fontSize: 16, color: C.text, fontWeight: 600, marginBottom: 12 }}>मोबाइल नंबर दर्ज करें</p>
      <div style={{
        display: 'flex', alignItems: 'center', border: `2px solid ${C.haldi}`,
        borderRadius: 12, padding: '14px 16px', background: C.white, marginBottom: 20,
      }}>
        <span style={{ fontSize: 20, marginRight: 8 }}>🇮🇳</span>
        <span style={{ color: C.grey, fontSize: 16, fontWeight: 500, marginRight: 12 }}>+91</span>
        <span style={{ color: '#BBB', fontSize: 16 }}>98765 43210</span>
      </div>

      <GoldButton onClick={() => onNavigate('otp')}>OTP भेजें (Send OTP)</GoldButton>

      <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: C.lightGrey }} />
        <span style={{ color: C.grey, fontSize: 14 }}>या</span>
        <div style={{ flex: 1, height: 1, background: C.lightGrey }} />
      </div>

      <GoldButton secondary>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>G</span> Google से जारी रखें
        </span>
      </GoldButton>
    </div>

    <p style={{ textAlign: 'center', color: C.grey, fontSize: 13, padding: '0 24px 20px' }}>
      अपने परिवार से जुड़ें — आँगन पर
    </p>
  </div>
);

// ===== SCREEN 3: OTP VERIFICATION =====
const OTPPage = ({ onNavigate }) => {
  const filled = [true, true, true, false, false, false];
  return (
    <div style={{ background: C.cream, minHeight: '100%', padding: '16px 24px' }}>
      <BackButton onClick={() => onNavigate('login')} />

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <AanganIcon size={64} />
        <h2 style={{ fontSize: 28, color: C.text, margin: '20px 0 8px', fontFamily: 'serif' }}>OTP दर्ज करें</h2>
        <p style={{ color: C.grey, fontSize: 15, margin: '0 0 8px' }}>हमने आपके नंबर पर 6 अंकों का OTP भेजा है</p>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>+91 98765 43210</p>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '36px 0' }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{
            width: 48, height: 56, border: `2px solid ${filled[i] ? C.haldi : C.lightGrey}`,
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: C.text, background: C.white,
            boxShadow: filled[i] ? `0 0 0 1px ${C.haldi}30` : 'none',
          }}>
            {filled[i] ? '•' : ''}
          </div>
        ))}
      </div>

      <GoldButton onClick={() => onNavigate('profile')}>सत्यापित करें (Verify)</GoldButton>

      <div style={{ textAlign: 'center', marginTop: 28 }}>
        <span style={{ color: C.grey, fontSize: 15 }}>OTP नहीं मिला? </span>
        <span style={{ color: C.haldi, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>दोबारा भेजें</span>
      </div>
      <p style={{ textAlign: 'center', color: C.grey, fontSize: 13, marginTop: 8 }}>00:28 में पुनः भेजें</p>
    </div>
  );
};

// ===== SCREEN 4: PROFILE SETUP =====
const ProfilePage = ({ onNavigate }) => (
  <div style={{ background: C.cream, minHeight: '100%', padding: '16px 24px' }}>
    <BackButton onClick={() => onNavigate('otp')} />

    <div style={{ textAlign: 'center', marginTop: 8 }}>
      <h2 style={{ fontSize: 26, color: C.text, margin: '0 0 4px', fontFamily: 'serif' }}>प्रोफ़ाइल बनाएं</h2>
      <p style={{ color: C.grey, fontSize: 14 }}>अपने परिवार को आपको पहचानने दें</p>
    </div>

    <div style={{ textAlign: 'center', margin: '24px 0' }}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: `3px solid ${C.white}`, boxShadow: '0 4px 16px rgba(200,168,75,0.3)',
        position: 'relative',
      }}>
        <span style={{ fontSize: 40, color: C.white }}>📷</span>
        <div style={{
          position: 'absolute', bottom: -2, right: -2, width: 28, height: 28,
          borderRadius: '50%', background: C.mehndi, display: 'flex',
          alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.white}`,
        }}>
          <span style={{ fontSize: 14, color: C.white }}>+</span>
        </div>
      </div>
      <p style={{ color: C.haldi, fontSize: 14, fontWeight: 600, marginTop: 8, cursor: 'pointer' }}>फ़ोटो जोड़ें</p>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[
        { label: 'पूरा नाम', placeholder: 'अपना नाम लिखें', value: 'Kumar Arya', icon: '👤' },
        { label: 'परिवार में भूमिका', placeholder: 'जैसे: बेटा, पिता, माँ...', icon: '👨‍👩‍👦', dropdown: true },
        { label: 'जन्मतिथि', placeholder: 'DD/MM/YYYY', icon: '📅' },
        { label: 'शहर', placeholder: 'आपका शहर', icon: '📍' },
        { label: 'गोत्र / कुल', placeholder: 'वैकल्पिक', icon: '🏛️' },
      ].map((field, i) => (
        <div key={i}>
          <label style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>{field.icon}</span> {field.label}
          </label>
          <div style={{
            padding: '14px 16px', border: `2px solid ${field.value ? C.haldi : C.lightGrey}`,
            borderRadius: 12, background: C.white, fontSize: 16,
            color: field.value ? C.text : '#BBB',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>{field.value || field.placeholder}</span>
            {field.dropdown && <span style={{ color: C.grey }}>▾</span>}
          </div>
        </div>
      ))}
    </div>

    <GoldButton onClick={() => onNavigate('home')} style={{ marginTop: 24 }}>
      आगे बढ़ें (Continue)
    </GoldButton>
  </div>
);

// ===== SCREEN 5: HOME FEED =====
const HomeFeed = ({ onNavigate }) => (
  <div style={{ background: C.cream, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
    <GoldHeader compact>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AanganIcon size={36} />
        <span style={{ color: C.white, fontSize: 22, fontWeight: 700, fontFamily: 'serif' }}>आँगन</span>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <span style={{ fontSize: 22, cursor: 'pointer' }}>🔔</span>
        <span style={{ fontSize: 22, cursor: 'pointer' }}>💬</span>
      </div>
    </GoldHeader>

    {/* Stories */}
    <div style={{ padding: '14px 16px 8px', display: 'flex', gap: 12, overflowX: 'auto' }}>
      {[
        { name: 'आप', emoji: '+', color: C.white, borderStyle: `2px dashed ${C.haldi}` },
        { name: 'दादी जी', emoji: '🙏', color: '#EDCAAE', borderStyle: `3px solid ${C.mehndi}` },
        { name: 'पापा', emoji: '😊', color: '#5B9BD5', borderStyle: `3px solid ${C.mehndi}` },
        { name: 'मम्मी', emoji: '😊', color: '#F2A0B0', borderStyle: `3px solid ${C.mehndi}` },
        { name: 'भाई', emoji: '😎', color: '#8FC4E8', borderStyle: `3px solid ${C.mehndi}` },
        { name: 'बहन', emoji: '🥰', color: '#F7C4CC', borderStyle: `3px solid ${C.mehndi}` },
      ].map((s, i) => (
        <div key={i} style={{ textAlign: 'center', minWidth: 60 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', border: s.borderStyle,
            background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: i === 0 ? 22 : 26, color: i === 0 ? C.haldi : undefined }}>{s.emoji}</span>
          </div>
          <p style={{ fontSize: 11, color: C.text, marginTop: 4, fontWeight: i === 0 ? 600 : 400 }}>{s.name}</p>
        </div>
      ))}
    </div>

    {/* Posts */}
    <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
      {/* Post 1: Photo post */}
      <div style={{ background: C.white, borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F2A0B0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20 }}>😊</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>मम्मी</p>
            <p style={{ fontSize: 12, color: C.grey, margin: 0 }}>2 घंटे पहले • परिवार</p>
          </div>
          <span style={{ color: C.grey, cursor: 'pointer' }}>⋮</span>
        </div>
        <p style={{ fontSize: 15, color: C.text, lineHeight: 1.5, margin: '0 0 12px' }}>
          आज का खाना बहुत स्वादिष्ट बना! सबके लिए पनीर की सब्जी और गरमा गरम रोटी 🍛
        </p>
        <div style={{ background: 'linear-gradient(135deg, #FFF5E0, #FFECC8)', borderRadius: 12, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 64 }}>🍛</span>
        </div>
        <div style={{ display: 'flex', gap: 20, color: C.grey, fontSize: 13, padding: '4px 0' }}>
          <span style={{ cursor: 'pointer' }}>❤️ 12</span>
          <span style={{ cursor: 'pointer' }}>💬 4</span>
          <span style={{ cursor: 'pointer' }}>🔄 शेयर</span>
          <span style={{ cursor: 'pointer', marginLeft: 'auto' }}>🔖</span>
        </div>
        {/* Read receipts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.lightGrey}` }}>
          <span style={{ fontSize: 11, color: C.grey }}>✓✓ देखा: </span>
          {['#5B9BD5','#EDCAAE','#8FC4E8'].map((c,i) => (
            <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: c, marginLeft: i > 0 ? -6 : 0, border: `1.5px solid ${C.white}` }} />
          ))}
          <span style={{ fontSize: 11, color: C.grey, marginLeft: 4 }}>+9</span>
        </div>
      </div>

      {/* Post 2: Event Invitation */}
      <div style={{
        background: C.white, borderRadius: 16, padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: `2px solid ${C.haldi}25`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
          padding: '6px 12px', background: `${C.haldi}10`, borderRadius: 8, width: 'fit-content',
        }}>
          <span style={{ fontSize: 16 }}>🎉</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.haldi }}>कार्यक्रम निमंत्रण</span>
        </div>
        <h3 style={{ fontSize: 18, color: C.text, margin: '0 0 8px', fontFamily: 'serif' }}>दादी जी का 75वां जन्मदिन 🎂</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          <p style={{ fontSize: 14, color: C.textLight, margin: 0 }}>📅 15 अप्रैल 2026 • शाम 6 बजे</p>
          <p style={{ fontSize: 14, color: C.textLight, margin: 0 }}>📍 घर पर — सभी को आमंत्रित</p>
          <p style={{ fontSize: 13, color: C.mehndi, margin: '4px 0 0', fontWeight: 600 }}>✓ 18 ने स्वीकार किया • 3 लंबित</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{
            flex: 1, padding: '12px', fontSize: 15, fontWeight: 600,
            background: `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
            color: C.white, border: 'none', borderRadius: 10, cursor: 'pointer',
          }}>✅ हाँ, आऊँगा</button>
          <button style={{
            padding: '12px 20px', fontSize: 15, fontWeight: 600,
            background: C.white, color: C.grey, border: `1px solid ${C.lightGrey}`,
            borderRadius: 10, cursor: 'pointer',
          }}>❌</button>
        </div>
      </div>

      {/* Post 3: Family Milestone */}
      <div style={{ background: C.white, borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#5B9BD5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20 }}>😊</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>पापा</p>
            <p style={{ fontSize: 12, color: C.grey, margin: 0 }}>कल • करीबी परिवार</p>
          </div>
        </div>
        <p style={{ fontSize: 15, color: C.text, lineHeight: 1.5, margin: '0 0 12px' }}>
          बेटे ने आज अपनी पहली नौकरी में जॉइन किया! बहुत गर्व हो रहा है 🎓🏢 भगवान उसे सफलता दे।
        </p>
        <div style={{ background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)', borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 48 }}>🎓</span>
          <p style={{ fontSize: 14, color: C.mehndi, fontWeight: 600, margin: '8px 0 0' }}>परिवार का गर्व का पल</p>
        </div>
        <div style={{ display: 'flex', gap: 20, color: C.grey, fontSize: 13 }}>
          <span>🙏 24 आशीर्वाद</span>
          <span>💬 8 टिप्पणी</span>
        </div>
      </div>
    </div>

    <BottomNav active="home" onNavigate={onNavigate} />
  </div>
);

// ===== SCREEN 6: FAMILY TREE =====
const FamilyTree = ({ onNavigate }) => (
  <div style={{ background: C.cream, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
    <GoldHeader compact>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', color: C.white, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ color: C.white, fontSize: 20, fontWeight: 700, fontFamily: 'serif' }}>परिवार वृक्ष</span>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ color: C.white, fontSize: 14, cursor: 'pointer' }}>🔍</span>
        <span style={{ color: C.white, fontSize: 14, cursor: 'pointer', background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: 16 }}>+ जोड़ें</span>
      </div>
    </GoldHeader>

    {/* Level Tabs */}
    <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto' }}>
      {['सभी', 'स्तर 1 (करीबी)', 'स्तर 2 (नज़दीकी)', 'स्तर 3 (विस्तृत)'].map((tab, i) => (
        <span key={i} style={{
          padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
          background: i === 0 ? C.haldi : C.white, color: i === 0 ? C.white : C.text,
          border: i === 0 ? 'none' : `1px solid ${C.lightGrey}`, cursor: 'pointer',
        }}>{tab}</span>
      ))}
    </div>

    {/* Members */}
    <div style={{ padding: '4px 16px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: C.grey, margin: 0 }}>12 सदस्य • 3 निमंत्रण भेजे</p>
        <span style={{ fontSize: 12, color: C.haldi, fontWeight: 600, cursor: 'pointer' }}>वृक्ष दृश्य ↗</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { name: 'दादा जी', role: 'बड़े', color: '#EDCAAE', badge: '👑', online: true },
          { name: 'दादी जी', role: 'बड़ी माँ', color: '#F2A0B0', badge: '🙏', online: true },
          { name: 'पापा', role: 'पिता', color: '#5B9BD5', online: true },
          { name: 'मम्मी', role: 'माँ', color: '#F2A0B0', online: false },
          { name: 'भाई', role: 'बड़ा भाई', color: '#8FC4E8', online: true },
          { name: 'बहन', role: 'छोटी बहन', color: '#F7C4CC', online: false },
          { name: 'चाचा जी', role: 'चाचा', color: '#5B9BD5', online: false },
          { name: 'चाची जी', role: 'चाची', color: '#F2A0B0', online: true },
          { name: 'आप', role: 'मैं', color: C.haldi, isSelf: true, online: true },
        ].map((m, i) => (
          <div key={i} style={{
            background: C.white, borderRadius: 14, padding: 10, textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            border: m.isSelf ? `2px solid ${C.haldi}` : 'none',
          }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: m.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 22 }}>😊</span>
              </div>
              {m.badge && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 12 }}>{m.badge}</span>}
              {m.online && (
                <div style={{
                  position: 'absolute', bottom: 0, right: 0, width: 12, height: 12,
                  borderRadius: '50%', background: C.success, border: `2px solid ${C.white}`,
                }} />
              )}
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: '5px 0 1px' }}>{m.name}</p>
            <p style={{ fontSize: 10, color: C.grey, margin: 0 }}>{m.role}</p>
          </div>
        ))}
      </div>

      {/* Invite Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${C.mehndi}15, ${C.mehndi}08)`,
        borderRadius: 14, padding: 14, marginTop: 14, textAlign: 'center',
        border: `1px solid ${C.mehndi}30`,
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.mehndi, margin: '0 0 6px' }}>🌿 और सदस्य जोड़ें</p>
        <p style={{ fontSize: 12, color: C.grey, margin: '0 0 10px' }}>WhatsApp या SMS से निमंत्रण भेजें</p>
        <button style={{
          padding: '10px 24px', fontSize: 14, fontWeight: 600, background: C.mehndi,
          color: C.white, border: 'none', borderRadius: 10, cursor: 'pointer',
        }}>📩 निमंत्रण भेजें</button>
      </div>
    </div>

    <BottomNav active="tree" onNavigate={onNavigate} />
  </div>
);

// ===== SCREEN 7: POST COMPOSER (NEW) =====
const PostComposer = ({ onNavigate }) => {
  const [audience, setAudience] = useState('family');
  return (
    <div style={{ background: C.cream, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: `1px solid ${C.lightGrey}`, background: C.white,
      }}>
        <button onClick={() => onNavigate('home')} style={{
          background: 'none', border: 'none', fontSize: 16, color: C.grey, cursor: 'pointer', fontWeight: 600,
        }}>✕ रद्द</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>नई पोस्ट</span>
        <button style={{
          background: `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
          color: C.white, border: 'none', borderRadius: 20, padding: '8px 20px',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>पोस्ट करें</button>
      </div>

      {/* Author Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: C.haldi,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 22, color: C.white }}>K</span>
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>Kumar Arya</p>
          {/* Audience Selector */}
          <div style={{
            display: 'flex', gap: 6, marginTop: 6,
          }}>
            {[
              { key: 'family', label: '👨‍👩‍👦 पूरा परिवार' },
              { key: 'close', label: '💛 करीबी' },
              { key: 'custom', label: '🎯 चुनें' },
            ].map(a => (
              <span key={a.key} onClick={() => setAudience(a.key)} style={{
                padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                background: audience === a.key ? `${C.haldi}20` : C.white,
                color: audience === a.key ? C.haldi : C.grey,
                border: `1px solid ${audience === a.key ? C.haldi : C.lightGrey}`,
                cursor: 'pointer',
              }}>{a.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Compose Area */}
      <div style={{ flex: 1, padding: '0 16px' }}>
        <div style={{
          fontSize: 17, color: '#BBB', lineHeight: 1.6, minHeight: 150,
          padding: '8px 0',
        }}>
          अपने परिवार के साथ कुछ साझा करें...
        </div>

        {/* Media Preview */}
        <div style={{
          display: 'flex', gap: 8, marginTop: 8,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 12, background: '#FFF5E0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px dashed ${C.haldi}50`,
          }}>
            <span style={{ fontSize: 28 }}>📷</span>
          </div>
          <div style={{
            width: 80, height: 80, borderRadius: 12, background: '#F0F7FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px dashed ${C.lightGrey}`,
          }}>
            <span style={{ fontSize: 28 }}>🎥</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{
        display: 'flex', gap: 16, padding: '12px 16px',
        borderTop: `1px solid ${C.lightGrey}`, background: C.white,
        alignItems: 'center',
      }}>
        {[
          { icon: '📷', label: 'फ़ोटो' },
          { icon: '🎥', label: 'वीडियो' },
          { icon: '📍', label: 'स्थान' },
          { icon: '🎉', label: 'कार्यक्रम' },
          { icon: '🗳️', label: 'पोल' },
        ].map((a, i) => (
          <div key={i} style={{ textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: 20 }}>{a.icon}</span>
            <p style={{ fontSize: 9, color: C.grey, margin: '2px 0 0' }}>{a.label}</p>
          </div>
        ))}
      </div>

      {/* Post Type Selector */}
      <div style={{
        display: 'flex', gap: 8, padding: '8px 16px 16px', overflowX: 'auto',
      }}>
        {['📝 पोस्ट', '🎉 निमंत्रण', '🎂 बधाई', '📸 एल्बम', '🙏 प्रार्थना'].map((type, i) => (
          <span key={i} style={{
            padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: i === 0 ? `${C.haldi}15` : C.white,
            color: i === 0 ? C.haldi : C.grey, whiteSpace: 'nowrap',
            border: `1px solid ${i === 0 ? C.haldi : C.lightGrey}`, cursor: 'pointer',
          }}>{type}</span>
        ))}
      </div>
    </div>
  );
};

// ===== SCREEN 8: NOTIFICATIONS (NEW) =====
const NotificationsPage = ({ onNavigate }) => (
  <div style={{ background: C.cream, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
    <GoldHeader compact>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', color: C.white, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ color: C.white, fontSize: 20, fontWeight: 700, fontFamily: 'serif' }}>सूचनाएं</span>
      </div>
      <span style={{ color: C.white, fontSize: 13, cursor: 'pointer', opacity: 0.9 }}>सभी पढ़ें ✓</span>
    </GoldHeader>

    {/* Tabs */}
    <div style={{ display: 'flex', borderBottom: `1px solid ${C.lightGrey}`, background: C.white }}>
      {['सभी', 'निमंत्रण', 'टिप्पणी', 'प्रतिक्रिया'].map((tab, i) => (
        <div key={i} style={{
          flex: 1, textAlign: 'center', padding: '12px 0', fontSize: 13, fontWeight: 600,
          color: i === 0 ? C.haldi : C.grey, cursor: 'pointer',
          borderBottom: i === 0 ? `2px solid ${C.haldi}` : 'none',
        }}>{tab}</div>
      ))}
    </div>

    {/* Today */}
    <div style={{ padding: '12px 16px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: C.grey, margin: '0 0 10px', textTransform: 'uppercase' }}>आज</p>
      {[
        { avatar: '#F2A0B0', emoji: '😊', name: 'मम्मी', action: 'ने आपकी पोस्ट पर ❤️ किया', time: '2 मिनट', unread: true },
        { avatar: '#5B9BD5', emoji: '😊', name: 'पापा', action: 'ने लिखा: "बहुत अच्छा बेटा!"', time: '15 मिनट', unread: true },
        { avatar: '#EDCAAE', emoji: '🙏', name: 'दादी जी', action: 'ने आपको कार्यक्रम में आमंत्रित किया', time: '1 घंटा', unread: true, isEvent: true },
        { avatar: '#8FC4E8', emoji: '😎', name: 'भाई', action: 'ने एक नई फ़ोटो साझा की', time: '3 घंटे', unread: false },
      ].map((n, i) => (
        <div key={i} style={{
          display: 'flex', gap: 12, padding: '12px', marginBottom: 4,
          borderRadius: 12, background: n.unread ? `${C.haldi}08` : 'transparent',
          cursor: 'pointer',
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: n.avatar,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 22 }}>{n.emoji}</span>
            </div>
            {n.unread && <div style={{
              position: 'absolute', top: 0, right: 0, width: 10, height: 10,
              borderRadius: '50%', background: C.danger, border: `2px solid ${C.cream}`,
            }} />}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, color: C.text, margin: '0 0 4px', lineHeight: 1.4 }}>
              <strong>{n.name}</strong> {n.action}
            </p>
            <p style={{ fontSize: 12, color: C.grey, margin: 0 }}>{n.time} पहले</p>
            {n.isEvent && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={{
                  padding: '6px 16px', fontSize: 12, fontWeight: 600,
                  background: C.haldi, color: C.white, border: 'none', borderRadius: 8, cursor: 'pointer',
                }}>स्वीकार</button>
                <button style={{
                  padding: '6px 16px', fontSize: 12, fontWeight: 600,
                  background: C.white, color: C.grey, border: `1px solid ${C.lightGrey}`, borderRadius: 8, cursor: 'pointer',
                }}>अस्वीकार</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>

    {/* Yesterday */}
    <div style={{ padding: '0 16px 16px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: C.grey, margin: '8px 0 10px', textTransform: 'uppercase' }}>कल</p>
      {[
        { avatar: '#F7C4CC', emoji: '🥰', name: 'बहन', action: 'ने परिवार वृक्ष अनुरोध स्वीकार किया', time: 'कल' },
        { avatar: '#F2A0B0', emoji: '😊', name: 'चाची जी', action: 'आँगन पर नई हैं! स्वागत करें', time: 'कल' },
      ].map((n, i) => (
        <div key={i} style={{
          display: 'flex', gap: 12, padding: '12px', marginBottom: 4,
          borderRadius: 12, cursor: 'pointer',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: n.avatar,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 22 }}>{n.emoji}</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, color: C.text, margin: '0 0 4px', lineHeight: 1.4 }}>
              <strong>{n.name}</strong> {n.action}
            </p>
            <p style={{ fontSize: 12, color: C.grey, margin: 0 }}>{n.time}</p>
          </div>
        </div>
      ))}
    </div>

    <BottomNav active="notifications" onNavigate={onNavigate} />
  </div>
);

// ===== SCREEN 9: SETTINGS / PROFILE VIEW (NEW) =====
const SettingsPage = ({ onNavigate }) => (
  <div style={{ background: C.cream, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
    <GoldHeader compact>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', color: C.white, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ color: C.white, fontSize: 20, fontWeight: 700, fontFamily: 'serif' }}>मेरा प्रोफ़ाइल</span>
      </div>
      <span style={{ color: C.white, fontSize: 13, cursor: 'pointer' }}>✏️ बदलें</span>
    </GoldHeader>

    {/* Profile Card */}
    <div style={{ padding: '20px 16px', textAlign: 'center' }}>
      <div style={{
        width: 88, height: 88, borderRadius: '50%', background: C.haldi,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: `3px solid ${C.white}`, boxShadow: '0 4px 16px rgba(200,168,75,0.3)',
      }}>
        <span style={{ fontSize: 36, color: C.white, fontWeight: 700 }}>K</span>
      </div>
      <h3 style={{ fontSize: 22, color: C.text, margin: '12px 0 2px', fontFamily: 'serif' }}>Kumar Arya</h3>
      <p style={{ fontSize: 14, color: C.grey, margin: 0 }}>बेटा • Arya परिवार</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
        {[
          { num: '12', label: 'सदस्य' },
          { num: '28', label: 'पोस्ट' },
          { num: '5', label: 'कार्यक्रम' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: C.haldi, margin: 0 }}>{s.num}</p>
            <p style={{ fontSize: 11, color: C.grey, margin: '2px 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Settings Sections */}
    <div style={{ padding: '0 16px', flex: 1 }}>
      {[
        { title: 'खाता', items: [
          { icon: '👤', label: 'प्रोफ़ाइल संपादित करें' },
          { icon: '🔒', label: 'गोपनीयता सेटिंग' },
          { icon: '🔔', label: 'सूचना प्राथमिकताएं' },
        ]},
        { title: 'परिवार', items: [
          { icon: '🌳', label: 'परिवार वृक्ष प्रबंधित करें' },
          { icon: '📩', label: 'निमंत्रण प्रबंधित करें' },
          { icon: '👥', label: 'स्तर सेटिंग (Level 1/2/3)' },
        ]},
        { title: 'ऐप', items: [
          { icon: '🌐', label: 'भाषा: हिंदी' },
          { icon: '🎨', label: 'थीम: हल्दी गोल्ड' },
          { icon: '📱', label: 'ऐप के बारे में' },
        ]},
      ].map((section, si) => (
        <div key={si} style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.grey, margin: '0 0 8px', textTransform: 'uppercase' }}>{section.title}</p>
          <div style={{ background: C.white, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            {section.items.map((item, ii) => (
              <div key={ii} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderBottom: ii < section.items.length - 1 ? `1px solid ${C.lightGrey}` : 'none',
                cursor: 'pointer',
              }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontSize: 15, color: C.text, flex: 1 }}>{item.label}</span>
                <span style={{ color: C.grey, fontSize: 14 }}>›</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button style={{
        width: '100%', padding: '14px', fontSize: 16, fontWeight: 600,
        background: '#FEE', color: C.danger, border: `1px solid ${C.danger}30`,
        borderRadius: 12, cursor: 'pointer', marginBottom: 20,
      }}>🚪 लॉग आउट</button>
    </div>

    <BottomNav active="settings" onNavigate={onNavigate} />
  </div>
);

// ===== MAIN APP =====
export default function AanganApp() {
  const [screen, setScreen] = useState('splash');

  const screens = {
    splash: <SplashScreen onNavigate={setScreen} />,
    login: <LoginPage onNavigate={setScreen} />,
    otp: <OTPPage onNavigate={setScreen} />,
    profile: <ProfilePage onNavigate={setScreen} />,
    home: <HomeFeed onNavigate={setScreen} />,
    tree: <FamilyTree onNavigate={setScreen} />,
    compose: <PostComposer onNavigate={setScreen} />,
    notifications: <NotificationsPage onNavigate={setScreen} />,
    settings: <SettingsPage onNavigate={setScreen} />,
  };

  const screenNames = {
    splash: '0. Splash',
    login: '1. Login',
    otp: '2. OTP',
    profile: '3. Profile',
    home: '4. Feed',
    tree: '5. Tree',
    compose: '6. Compose',
    notifications: '7. Alerts',
    settings: '8. Settings',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#1a1a2e', minHeight: '100vh', padding: '20px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <AanganIcon size={32} />
        <h2 style={{ color: '#DBBA4E', fontFamily: 'serif', fontSize: 26, margin: 0 }}>आँगन — Aangan App</h2>
      </div>
      <p style={{ color: '#888', fontSize: 13, margin: '4px 0 14px' }}>Interactive Mockups v2.0 — 9 Screens • Tap to navigate</p>

      {/* Screen Switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center', padding: '0 8px', maxWidth: 420 }}>
        {Object.entries(screenNames).map(([key, label]) => (
          <button key={key} onClick={() => setScreen(key)} style={{
            padding: '5px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600,
            background: screen === key ? '#C8A84B' : '#2a2a4e', border: 'none',
            color: screen === key ? '#FFF' : '#AAA', cursor: 'pointer',
            transition: 'all 0.2s',
          }}>{label}</button>
        ))}
      </div>

      {/* Phone Frame */}
      <div style={{
        width: 375, height: 812, borderRadius: 40, overflow: 'hidden',
        border: '4px solid #333', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        background: C.cream, position: 'relative',
      }}>
        {/* Notch */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 150, height: 28, background: '#000', borderRadius: '0 0 16px 16px', zIndex: 20,
        }} />
        {/* Status Bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 15,
          padding: '6px 24px', display: 'flex', justifyContent: 'space-between',
          fontSize: 12, fontWeight: 600,
          color: ['home','login','tree','notifications','settings','splash'].includes(screen) ? '#FFF' : '#333',
        }}>
          <span>9:41</span>
          <span style={{ marginLeft: 60 }}></span>
          <span>📶 🔋</span>
        </div>
        {/* Screen Content */}
        <div style={{ height: '100%', overflowY: 'auto', paddingTop: 28 }}>
          {screens[screen]}
        </div>
      </div>

      <p style={{ color: '#666', fontSize: 12, marginTop: 16, fontWeight: 500 }}>
        ✨ Milestone v2.0 — {new Date().toLocaleDateString('en-IN')} — 9 screens with your official icon
      </p>
    </div>
  );
}