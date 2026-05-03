'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { uploadAvatar } from '@/lib/utils/uploadMedia';
import { RELEASES } from '@/data/versions';
import FestivalNotificationsSettings from '@/components/festivals/FestivalNotificationsSettings';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const FEEDBACK_CATEGORIES = [
  { value: 'feature_request', label: 'सुझाव — Feature Request', emoji: '💡' },
  { value: 'bug_report', label: 'समस्या — Bug Report', emoji: '🐛' },
  { value: 'complaint', label: 'शिकायत — Complaint', emoji: '😟' },
  { value: 'general', label: 'सामान्य — General', emoji: '💬' },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { user, session, updateProfile, signOut, fetchProfile } = useAuthStore();
  const [name, setName] = useState('');
  const [nameHindi, setNameHindi] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Feedback state
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbCategory, setFbCategory] = useState<string>('general');
  const [fbSubject, setFbSubject] = useState('');
  const [fbMessage, setFbMessage] = useState('');
  const [fbSending, setFbSending] = useState(false);
  const [fbSuccess, setFbSuccess] = useState(false);
  const [fbError, setFbError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.display_name ?? '');
      setNameHindi(user.display_name_hindi ?? '');
      setCity(user.village_city ?? '');
      setBio(user.bio ?? '');
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke any previous blob URL so we don't leak it on repeat picks.
    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Clean up the last preview URL when the page unmounts.
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleSave = async () => {
    if (!name.trim()) { setError('नाम ज़रूरी है'); return; }
    if (!session?.user) return;
    setIsSaving(true); setError(''); setSuccess(false);
    try {
      let avatar_url = user?.avatar_url ?? null;
      if (avatarFile) avatar_url = await uploadAvatar(avatarFile, session.user.id);
      const ok = await updateProfile({ display_name: name, display_name_hindi: nameHindi || null, village_city: city || null, bio: bio || null, avatar_url });
      if (ok) { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
      else setError('सेव नहीं हो पाया');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setIsSaving(false);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    // Dadi test: a grandma could tap this by mistake. Require one explicit
    // confirmation so we don't silently drop her session. Use the Hindi-first
    // ConfirmDialog (not browser-native confirm() which is the worst grandma
    // surface in the app — see Jyotsna's "popup msgs not clear" ticket).
    const ok = await confirm({
      title: 'साइन आउट करें?',
      subtitle: 'Sign out',
      body: 'क्या आप वाकई साइन आउट करना चाहते हैं? — Are you sure you want to sign out?',
      confirmLabel: 'हाँ, साइन आउट — Yes, sign out',
      cancelLabel: 'नहीं — No',
    });
    if (!ok) return;
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace('/login');
    } catch (e) {
      console.error('[settings] signOut failed:', e);
      setIsSigningOut(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!fbMessage.trim()) { setFbError('कृपया अपना संदेश लिखें'); return; }
    if (!session?.user) return;
    setFbSending(true); setFbError('');
    try {
      // Insert ticket and return its ID in one call (no race condition)
      const { data: ticket, error: insertErr } = await supabase.from('support_tickets').insert({
        user_id: session.user.id,
        subject: fbSubject.trim() || `${FEEDBACK_CATEGORIES.find(c => c.value === fbCategory)?.label ?? 'Feedback'}`,
        category: fbCategory,
        priority: fbCategory === 'bug_report' ? 'high' : 'medium',
        status: 'open',
      }).select('id').single();
      if (insertErr) throw insertErr;
      if (!ticket) throw new Error('Ticket creation failed');

      // Insert the feedback message (column is `message`, not `content`)
      const { error: msgErr } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_id: session.user.id,
        message: fbMessage.trim(),
        is_from_support: false,
      });
      if (msgErr) throw msgErr;

      setFbSuccess(true);
      setFbSubject(''); setFbMessage(''); setFbCategory('general');
      setTimeout(() => { setFbSuccess(false); setShowFeedback(false); }, 3000);
    } catch (e: unknown) {
      setFbError(e instanceof Error ? e.message : 'सबमिट नहीं हो पाया — Could not submit');
    }
    setFbSending(false);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h2 className="font-heading text-2xl text-brown mb-1">सेटिंग्स</h2>
      <p className="font-body text-base text-brown-light mb-6">Settings & Profile</p>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <label className="cursor-pointer group relative">
          <AvatarCircle src={avatarPreview ?? user?.avatar_url} name={user?.display_name_hindi ?? user?.display_name} size={96} />
          <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="text-white text-2xl">📷</span>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
            aria-label={'फ़ोटो बदलें — Change Photo'}
          />
        </label>
        <p className="font-body text-sm text-brown-light mt-2">फ़ोटो बदलें — Change Photo</p>
      </div>

      {error && <div className="bg-red-50 border border-error rounded-lg px-4 py-3 mb-4"><p className="font-body text-base text-error">{error}</p></div>}
      {success && <div className="bg-green-50 border border-mehndi-green rounded-lg px-4 py-3 mb-4"><p className="font-body text-base text-mehndi-green">✓ प्रोफाइल सेव हो गई — Profile saved!</p></div>}

      <InputField label={'आपका नाम *'} sublabel="Display Name" value={name} onChange={(e) => setName(e.target.value)} />
      <InputField label={'हिंदी में नाम'} sublabel="Hindi Name" value={nameHindi} onChange={(e) => setNameHindi(e.target.value)} />
      <InputField label={'गाँव / शहर'} sublabel="Village or City" value={city} onChange={(e) => setCity(e.target.value)} />

      <div className="mb-4">
        <label className="block font-body font-semibold text-brown mb-1">अपने बारे में <span className="text-brown-light text-sm font-normal">Bio</span></label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={200}
          className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none resize-none" />
        <p className="text-sm text-brown-light text-right font-body">{bio.length}/200</p>
      </div>

      <GoldButton className="w-full mb-4" loading={isSaving} onClick={handleSave}>
        सेव करें — Save Changes
      </GoldButton>

      {/* Account Info — phone/email can change, but aangan_id stays stable.
          Aadhaar-style visual chunking (AAN-XXXX YYYY) + WhatsApp share
          per design review v0.13.5. */}
      <div className="bg-cream-dark rounded-2xl p-4 mb-4 space-y-3 font-body text-base text-brown-light">
        {user?.aangan_id && (() => {
          // Display form: split the 8-char body in halves so it parses like
          // a phone/Aadhaar number. Canonical form (with hyphen) is what
          // `select-all` copies + what the API expects.
          const body = user.aangan_id.replace(/^AAN-/, '');
          const display = `AAN-${body.slice(0, 4)} ${body.slice(4)}`.trim();
          const waMessage =
            `मेरी आँगन ID: ${user.aangan_id}\n` +
            `मुझे अपने परिवार में जोड़ें — Add me to your family on Aangan: https://aangan.app`;
          const waHref = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;
          return (
            <div className="bg-white border-2 border-haldi-gold rounded-xl p-3">
              <p className="font-body text-sm text-brown-light mb-1">
                आपकी आँगन आईडी — Your Aangan ID
              </p>
              <code
                className="block font-mono text-xl font-bold text-haldi-gold-dark tracking-widest select-all"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {display}
              </code>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(user.aangan_id);
                      setSuccess(true);
                      setTimeout(() => setSuccess(false), 1500);
                    } catch {
                      // Clipboard blocked — silent no-op; the code is
                      // select-all so user can long-press copy.
                    }
                  }}
                  aria-label={'कॉपी करें — Copy'}
                  className="flex-1 min-h-dadi px-3 py-2 bg-haldi-gold/10 text-haldi-gold-dark text-base font-semibold rounded-lg hover:bg-haldi-gold/20 flex items-center justify-center gap-2"
                >
                  📋 कॉपी
                </button>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={'WhatsApp पर भेजें — Share on WhatsApp'}
                  className="flex-1 min-h-dadi px-3 py-2 bg-[#25D366] text-white text-base font-semibold rounded-lg hover:bg-[#1DA851] flex items-center justify-center gap-2"
                >
                  📲 WhatsApp
                </a>
              </div>
              <p className="font-body text-sm text-brown-light mt-2">
                यह आईडी हमेशा एक जैसी रहेगी, चाहे आप मोबाइल या ईमेल बदलें
                — Stable across phone/email changes. Share this with relatives
                to add you to their family.
              </p>
            </div>
          );
        })()}
        {user?.email && <p>📧 {user.email}</p>}
        {user?.phone_number && <p>📱 {user.phone_number}</p>}
      </div>

      {/* v0.5 Voice Features */}
      <div className="bg-cream-dark rounded-2xl p-4 mb-4">
        <h3 className="font-heading text-lg text-brown mb-1">🎙️ वॉइस फ़ीचर्स</h3>
        <p className="font-body text-base text-brown-light mb-3">Voice Features (v0.5)</p>
        <ul className="space-y-3 font-body text-base text-brown">
          <li className="flex items-start gap-2">
            <span className="text-haldi-gold mt-0.5">🗣️</span>
            <div>
              <p className="font-semibold">वॉइस-टू-टेक्स्ट</p>
              <p className="text-base text-brown-light">Voice-to-Text in Hindi & English</p>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-haldi-gold mt-0.5">🎯</span>
            <div>
              <p className="font-semibold">वॉइस कमांड</p>
              <p className="text-base text-brown-light">Hands-free navigation with voice commands</p>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-haldi-gold mt-0.5">💬</span>
            <div>
              <p className="font-semibold">वॉइस मैसेज</p>
              <p className="text-base text-brown-light">Send voice messages in chat</p>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-haldi-gold mt-0.5">🌐</span>
            <div>
              <p className="font-semibold">भाषा चयन</p>
              <p className="text-base text-brown-light">Language selector on login (Hindi / English)</p>
            </div>
          </li>
        </ul>
      </div>

      {/* ─── Festival Notifications Section ─── */}
      <FestivalNotificationsSettings />

      {/* ─── Feedback Section ─── */}
      <div className="bg-white rounded-2xl p-5 mb-4 border border-haldi-gold/20 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-heading text-lg text-brown">💬 सुझाव / शिकायत</h3>
            <p className="font-body text-base text-brown-light">Feedback & Support</p>
          </div>
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            aria-label={'फीडबैक लिखें — Write Feedback'}
            className="px-4 py-2 bg-haldi-gold text-white font-body font-semibold text-base rounded-xl min-h-dadi hover:bg-haldi-gold-dark transition-colors"
          >
            {showFeedback ? 'बंद करें' : 'लिखें — Write'}
          </button>
        </div>

        {showFeedback && (
          <div className="space-y-4 pt-3 border-t border-cream-dark">
            {fbSuccess && (
              <div className="bg-green-50 border border-mehndi-green rounded-xl px-4 py-3">
                <p className="font-body text-base text-mehndi-green">✅ आपका सुझाव भेज दिया गया — Feedback submitted! धन्यवाद 🙏</p>
              </div>
            )}
            {fbError && (
              <div className="bg-red-50 border border-error/30 rounded-xl px-4 py-3">
                <p className="font-body text-base text-error">{fbError}</p>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block font-body font-semibold text-brown mb-2">श्रेणी — Category</label>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setFbCategory(cat.value)}
                    aria-label={cat.label}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 font-body text-base transition-colors min-h-dadi ${
                      fbCategory === cat.value
                        ? 'border-haldi-gold bg-haldi-gold/10 text-haldi-gold-dark'
                        : 'border-cream-dark bg-white text-brown-light hover:border-haldi-gold/50'
                    }`}
                  >
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="text-left leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="fb-subject" className="block font-body font-semibold text-brown mb-1">
                विषय <span className="text-brown-light text-sm font-normal">Subject (optional)</span>
              </label>
              <input
                id="fb-subject"
                type="text"
                value={fbSubject}
                onChange={(e) => setFbSubject(e.target.value)}
                placeholder={'संक्षेप में बताएं...'}
                maxLength={100}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none placeholder-gray-400"
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="fb-message" className="block font-body font-semibold text-brown mb-1">
                संदेश * <span className="text-brown-light text-sm font-normal">Message</span>
              </label>
              <textarea
                id="fb-message"
                value={fbMessage}
                onChange={(e) => setFbMessage(e.target.value)}
                placeholder={'अपना सुझाव या शिकायत यहाँ लिखें... Write your feedback here...'}
                rows={4}
                maxLength={1000}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none resize-none placeholder-gray-400"
              />
              <p className="text-sm text-brown-light text-right font-body mt-1">{fbMessage.length}/1000</p>
            </div>

            <GoldButton className="w-full" loading={fbSending} onClick={handleFeedbackSubmit} disabled={!fbMessage.trim()}>
              भेजें — Submit Feedback
            </GoldButton>
          </div>
        )}
      </div>

      <GoldButton variant="danger" className="w-full" loading={isSigningOut} disabled={isSigningOut} onClick={handleSignOut}>
        साइन आउट — Sign Out
      </GoldButton>

      {/* Version */}
      <p className="font-body text-sm text-brown-light text-center mt-6">Aangan v{RELEASES[0].version}</p>
    </div>
  );
}
