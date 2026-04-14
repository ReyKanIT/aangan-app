import { useState } from "react";

// Aangan Icon as inline SVG component
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

// Color palette
const C = {
  haldi: '#C8A84B', haldiDark: '#B8963A', haldiLight: '#DBBA4E',
  mehndi: '#7A9A3A', cream: '#FDFAF0', brown: '#5C3D1E',
  white: '#FFFFFF', grey: '#8B8680', lightGrey: '#E8E4DD',
  text: '#2D1F0E', textLight: '#6B5E4F',
};

// ===== SCREEN 1: LOGIN PAGE =====
const LoginPage = ({ onNavigate }) => (
  <div style={{ background: C.cream, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
    {/* Gold Header */}
    <div style={{
      background: `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
      padding: '48px 24px 36px', textAlign: 'center', borderRadius: '0 0 32px 32px',
    }}>
      <AanganIcon size={90} />
      <h1 style={{ fontFamily: 'serif', fontSize: 42, color: C.white, margin: '12px 0 4px', textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>आँगन</h1>
      <p style={{ color: C.white, fontSize: 18, margin: 0, opacity: 0.95, fontWeight: 500 }}>Your Family</p>
      <p style={{ color: C.white, fontSize: 14, margin: '4px 0 0', opacity: 0.8 }}>परिवार को जोड़ता है</p>
    </div>

    {/* Form Section */}
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

      <button onClick={() => onNavigate('otp')} style={{
        width: '100%', padding: '16px', fontSize: 18, fontWeight: 700,
        background: `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
        color: C.white, border: 'none', borderRadius: 12, cursor: 'pointer',
        minHeight: 52, boxShadow: '0 4px 16px rgba(200,168,75,0.35)',
      }}>
        OTP भेजें (Send OTP)
      </button>

      <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: C.lightGrey }} />
        <span style={{ color: C.grey, fontSize: 14 }}>या</span>
        <div style={{ flex: 1, height: 1, background: C.lightGrey }} />
      </div>

      <button style={{
        width: '100%', padding: '14px', fontSize: 16, fontWeight: 600,
        background: C.white, color: C.text, border: `2px solid ${C.lightGrey}`,
        borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>G</span> Google से जारी रखें
      </button>
    </div>

    <p style={{ textAlign: 'center', color: C.grey, fontSize: 13, padding: '0 24px 20px' }}>
      अपने परिवार से जुड़ें — आँगन पर
    </p>
  </div>
);

// ===== SCREEN 2: OTP VERIFICATION =====
const OTPPage = ({ onNavigate }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  return (
    <div style={{ background: C.cream, minHeight: '100%', padding: '16px 24px' }}>
      <button onClick={() => onNavigate('login')} style={{
        background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: C.text, padding: 8, marginLeft: -8,
      }}>←</button>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <AanganIcon size={64} />
        <h2 style={{ fontSize: 28, color: C.text, margin: '20px 0 8px', fontFamily: 'serif' }}>OTP दर्ज करें</h2>
        <p style={{ color: C.grey, fontSize: 15, margin: '0 0 8px' }}>हमने आपके नंबर पर 6 अंकों का OTP भेजा है</p>
        <p style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>+91 98765 43210</p>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '36px 0' }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{
            width: 48, height: 56, border: `2px solid ${otp[i] ? C.haldi : C.lightGrey}`,
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: C.text, background: C.white,
            transition: 'border-color 0.2s',
          }}>
            {i < 3 ? '•' : ''}
          </div>
        ))}
      </div>

      <button onClick={() => onNavigate('profile')} style={{
        width: '100%', padding: '16px', fontSize: 18, fontWeight: 700,
        background: `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
        color: C.white, border: 'none', borderRadius: 12, cursor: 'pointer',
        minHeight: 52, boxShadow: '0 4px 16px rgba(200,168,75,0.35)',
      }}>
        सत्यापित करें (Verify)
      </button>

      <div style={{ textAlign: 'center', marginTop: 28 }}>
        <span style={{ color: C.grey, fontSize: 15 }}>OTP नहीं मिला? </span>
        <span style={{ color: C.haldi, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>दोबारा भेजें</span>
      </div>
      <p style={{ textAlign: 'center', color: C.grey, fontSize: 13, marginTop: 8 }}>00:28 में पुनः भेजें</p>
    </div>
  );
};

// ===== SCREEN 3: PROFILE SETUP =====
const ProfilePage = ({ onNavigate }) => (
  <div style={{ background: C.cream, minHeight: '100%', padding: '16px 24px' }}>
    <button onClick={() => onNavigate('otp')} style={{
      background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: C.text, padding: 8, marginLeft: -8,
    }}>←</button>

    <div style={{ textAlign: 'center', marginTop: 16 }}>
      <h2 style={{ fontSize: 26, color: C.text, margin: '0 0 4px', fontFamily: 'serif' }}>प्रोफ़ाइल बनाएं</h2>
      <p style={{ color: C.grey, fontSize: 14 }}>अपने परिवार को आपको पहचानने दें</p>
    </div>

    {/* Avatar */}
    <div style={{ textAlign: 'center', margin: '28px 0' }}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%', background: `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: `3px solid ${C.white}`, boxShadow: '0 4px 16px rgba(200,168,75,0.3)',
      }}>
        <span style={{ fontSize: 40, color: C.white }}>📷</span>
      </div>
      <p style={{ color: C.haldi, fontSize: 14, fontWeight: 600, marginTop: 8, cursor: 'pointer' }}>फ़ोटो जोड़ें</p>
    </div>

    {/* Form Fields */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[
        { label: 'पूरा नाम', placeholder: 'अपना नाम लिखें', value: 'Kumar Arya' },
        { label: 'परिवार में भूमिका', placeholder: 'जैसे: बेटा, पिता, माँ...' },
        { label: 'जन्मतिथि', placeholder: 'DD/MM/YYYY' },
        { label: 'शहर', placeholder: 'आपका शहर' },
      ].map((field, i) => (
        <div key={i}>
          <label style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6, display: 'block' }}>{field.label}</label>
          <div style={{
            padding: '14px 16px', border: `2px solid ${field.value ? C.haldi : C.lightGrey}`,
            borderRadius: 12, background: C.white, fontSize: 16,
            color: field.value ? C.text : '#BBB',
          }}>
            {field.value || field.placeholder}
          </div>
        </div>
      ))}
    </div>

    <button onClick={() => onNavigate('home')} style={{
      width: '100%', padding: '16px', fontSize: 18, fontWeight: 700, marginTop: 28,
      background: `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
      color: C.white, border: 'none', borderRadius: 12, cursor: 'pointer',
      minHeight: 52, boxShadow: '0 4px 16px rgba(200,168,75,0.35)',
    }}>
      आगे बढ़ें (Continue)
    </button>
  </div>
);

// ===== SCREEN 4: HOME FEED =====
const HomeFeed = ({ onNavigate }) => (
  <div style={{ background: C.cream, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
    {/* Top Bar */}
    <div style={{
      background: `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
      padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AanganIcon size={36} />
        <span style={{ color: C.white, fontSize: 22, fontWeight: 700, fontFamily: 'serif' }}>आँगन</span>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <span style={{ fontSize: 22, cursor: 'pointer' }}>🔔</span>
        <span style={{ fontSize: 22, cursor: 'pointer' }}>💬</span>
      </div>
    </div>

    {/* Stories Row */}
    <div style={{ padding: '16px 16px 8px', display: 'flex', gap: 12, overflowX: 'auto' }}>
      {['आप', 'दादी जी', 'पापा', 'मम्मी', 'भाई'].map((name, i) => (
        <div key={i} style={{ textAlign: 'center', minWidth: 64 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            border: i === 0 ? `2px dashed ${C.haldi}` : `3px solid ${C.mehndi}`,
            background: i === 0 ? C.white : ['#EDCAAE','#5B9BD5','#F2A0B0','#8FC4E8'][i-1],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {i === 0 ? <span style={{ fontSize: 24, color: C.haldi }}>+</span> : <span style={{ fontSize: 28 }}>😊</span>}
          </div>
          <p style={{ fontSize: 11, color: C.text, marginTop: 4, fontWeight: i === 0 ? 600 : 400 }}>{name}</p>
        </div>
      ))}
    </div>

    {/* Post Cards */}
    <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Post 1 */}
      <div style={{ background: C.white, borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F2A0B0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20 }}>😊</span>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>मम्मी</p>
            <p style={{ fontSize: 12, color: C.grey, margin: 0 }}>2 घंटे पहले • परिवार</p>
          </div>
        </div>
        <p style={{ fontSize: 15, color: C.text, lineHeight: 1.5, margin: '0 0 12px' }}>
          आज का खाना बहुत स्वादिष्ट बना! सबके लिए पनीर की सब्जी और गरमा गरम रोटी 🍛
        </p>
        <div style={{ background: '#FFF5E0', borderRadius: 12, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 64 }}>🍛</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: C.grey, fontSize: 13 }}>
          <span>❤️ 12 प्यार</span>
          <span>💬 4 टिप्पणी</span>
          <span>🙏 नमस्ते</span>
        </div>
      </div>

      {/* Post 2 - Event */}
      <div style={{
        background: C.white, borderRadius: 16, padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: `2px solid ${C.haldi}20`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>🎉</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.haldi }}>कार्यक्रम निमंत्रण</span>
        </div>
        <h3 style={{ fontSize: 18, color: C.text, margin: '0 0 6px' }}>दादी जी का 75वां जन्मदिन</h3>
        <p style={{ fontSize: 14, color: C.grey, margin: '0 0 4px' }}>📅 15 अप्रैल 2026 • शाम 6 बजे</p>
        <p style={{ fontSize: 14, color: C.grey, margin: '0 0 12px' }}>📍 घर पर — सभी को आमंत्रित</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{
            flex: 1, padding: '10px', fontSize: 15, fontWeight: 600,
            background: `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
            color: C.white, border: 'none', borderRadius: 10, cursor: 'pointer',
          }}>✅ हाँ, आऊँगा</button>
          <button style={{
            flex: 1, padding: '10px', fontSize: 15, fontWeight: 600,
            background: C.white, color: C.grey, border: `1px solid ${C.lightGrey}`,
            borderRadius: 10, cursor: 'pointer',
          }}>❌ नहीं</button>
        </div>
      </div>
    </div>

    {/* Bottom Navigation */}
    <div style={{
      display: 'flex', justifyContent: 'space-around', padding: '12px 0 16px',
      background: C.white, borderTop: `1px solid ${C.lightGrey}`,
      boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
    }}>
      {[
        { icon: '🏠', label: 'होम', active: true },
        { icon: '🌳', label: 'परिवार', active: false },
        { icon: '➕', label: '', active: false, isAdd: true },
        { icon: '🔔', label: 'सूचना', active: false },
        { icon: '👤', label: 'प्रोफ़ाइल', active: false },
      ].map((item, i) => (
        <div key={i} onClick={() => item.label === 'परिवार' ? onNavigate('tree') : null}
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
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <p style={{ fontSize: 10, margin: '2px 0 0', color: item.active ? C.haldi : C.grey, fontWeight: item.active ? 700 : 400 }}>{item.label}</p>
            </>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ===== SCREEN 5: FAMILY TREE =====
const FamilyTree = ({ onNavigate }) => (
  <div style={{ background: C.cream, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
    <div style={{
      background: `linear-gradient(135deg, ${C.haldiLight}, ${C.haldiDark})`,
      padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', color: C.white, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ color: C.white, fontSize: 20, fontWeight: 700, fontFamily: 'serif' }}>परिवार वृक्ष</span>
      </div>
      <span style={{ color: C.white, fontSize: 14, cursor: 'pointer' }}>+ जोड़ें</span>
    </div>

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

    {/* Family Members Grid */}
    <div style={{ padding: '8px 16px', flex: 1 }}>
      <p style={{ fontSize: 13, color: C.grey, marginBottom: 12 }}>12 सदस्य • 3 निमंत्रण भेजे</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { name: 'दादा जी', role: 'बड़े', color: '#EDCAAE', badge: '👑' },
          { name: 'दादी जी', role: 'बड़ी माँ', color: '#F2A0B0', badge: '🙏' },
          { name: 'पापा', role: 'पिता', color: '#5B9BD5' },
          { name: 'मम्मी', role: 'माँ', color: '#F2A0B0' },
          { name: 'भाई', role: 'बड़ा भाई', color: '#8FC4E8' },
          { name: 'बहन', role: 'छोटी बहन', color: '#F7C4CC' },
          { name: 'चाचा जी', role: 'चाचा', color: '#5B9BD5' },
          { name: 'चाची जी', role: 'चाची', color: '#F2A0B0' },
          { name: 'आप', role: 'मैं', color: C.haldi, isSelf: true },
        ].map((member, i) => (
          <div key={i} style={{
            background: C.white, borderRadius: 16, padding: 12, textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            border: member.isSelf ? `2px solid ${C.haldi}` : 'none',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: member.color,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
            }}>
              <span style={{ fontSize: 24 }}>😊</span>
              {member.badge && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 14 }}>{member.badge}</span>}
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '6px 0 2px' }}>{member.name}</p>
            <p style={{ fontSize: 11, color: C.grey, margin: 0 }}>{member.role}</p>
          </div>
        ))}
      </div>

      {/* Invite Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${C.mehndi}15, ${C.mehndi}08)`,
        borderRadius: 16, padding: 16, marginTop: 16, textAlign: 'center',
        border: `1px solid ${C.mehndi}30`,
      }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: C.mehndi, margin: '0 0 8px' }}>🌿 और सदस्य जोड़ें</p>
        <p style={{ fontSize: 13, color: C.grey, margin: '0 0 12px' }}>WhatsApp या SMS से निमंत्रण भेजें</p>
        <button style={{
          padding: '10px 24px', fontSize: 14, fontWeight: 600, background: C.mehndi,
          color: C.white, border: 'none', borderRadius: 10, cursor: 'pointer',
        }}>📩 निमंत्रण भेजें</button>
      </div>
    </div>

    {/* Bottom Nav */}
    <div style={{
      display: 'flex', justifyContent: 'space-around', padding: '12px 0 16px',
      background: C.white, borderTop: `1px solid ${C.lightGrey}`,
    }}>
      {[
        { icon: '🏠', label: 'होम' },
        { icon: '🌳', label: 'परिवार', active: true },
        { icon: '➕', label: '', isAdd: true },
        { icon: '🔔', label: 'सूचना' },
        { icon: '👤', label: 'प्रोफ़ाइल' },
      ].map((item, i) => (
        <div key={i} onClick={() => item.label === 'होम' ? onNavigate('home') : null}
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
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <p style={{ fontSize: 10, margin: '2px 0 0', color: item.active ? C.haldi : C.grey, fontWeight: item.active ? 700 : 400 }}>{item.label}</p>
            </>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ===== MAIN APP =====
export default function AanganApp() {
  const [screen, setScreen] = useState('login');

  const screens = {
    login: <LoginPage onNavigate={setScreen} />,
    otp: <OTPPage onNavigate={setScreen} />,
    profile: <ProfilePage onNavigate={setScreen} />,
    home: <HomeFeed onNavigate={setScreen} />,
    tree: <FamilyTree onNavigate={setScreen} />,
  };

  const screenNames = {
    login: '1. Login', otp: '2. OTP Verify', profile: '3. Profile Setup',
    home: '4. Home Feed', tree: '5. Family Tree'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#1a1a2e', minHeight: '100vh', padding: '20px 0' }}>
      <h2 style={{ color: '#DBBA4E', fontFamily: 'serif', fontSize: 28, margin: '0 0 4px' }}>आँगन — Aangan App</h2>
      <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px' }}>Interactive Screen Mockups v1.0 — Tap buttons to navigate</p>

      {/* Screen Switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center', padding: '0 12px' }}>
        {Object.entries(screenNames).map(([key, label]) => (
          <button key={key} onClick={() => setScreen(key)} style={{
            padding: '6px 14px', borderRadius: 16, fontSize: 12, fontWeight: 600,
            background: screen === key ? '#C8A84B' : '#2a2a4e', border: 'none',
            color: screen === key ? '#FFF' : '#AAA', cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {/* Phone Frame */}
      <div style={{
        width: 375, height: 812, borderRadius: 40, overflow: 'hidden',
        border: '4px solid #333', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        background: '#FDFAF0', position: 'relative',
      }}>
        {/* Status Bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          padding: '8px 24px', display: 'flex', justifyContent: 'space-between',
          fontSize: 12, fontWeight: 600, color: screen === 'home' || screen === 'login' || screen === 'tree' ? '#FFF' : '#333',
        }}>
          <span>9:41</span>
          <span>📶 🔋</span>
        </div>
        {/* Screen Content */}
        <div style={{ height: '100%', overflowY: 'auto', paddingTop: 28 }}>
          {screens[screen]}
        </div>
      </div>

      <p style={{ color: '#555', fontSize: 11, marginTop: 16 }}>Milestone v1.0 — {new Date().toLocaleDateString('en-IN')}</p>
    </div>
  );
}
