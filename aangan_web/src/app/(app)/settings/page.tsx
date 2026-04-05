'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { uploadAvatar } from '@/lib/utils/uploadMedia';

export default function SettingsPage() {
  const router = useRouter();
  const { user, session, updateProfile, signOut, fetchProfile } = useAuthStore();
  const [name, setName] = useState('');
  const [nameHindi, setNameHindi] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

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
    await signOut();
    router.replace('/login');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h2 className="font-heading text-2xl text-brown mb-1">सेटिंग्स</h2>
      <p className="font-body text-sm text-brown-light mb-6">Settings & Profile</p>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <label className="cursor-pointer group relative">
          <AvatarCircle src={avatarPreview ?? user?.avatar_url} name={user?.display_name_hindi ?? user?.display_name} size={96} />
          <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="text-white text-2xl">📷</span>
          </div>
          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </label>
        <p className="font-body text-xs text-brown-light mt-2">फ़ोटो बदलें — Change Photo</p>
      </div>

      {error && <div className="bg-red-50 border border-error rounded-lg px-4 py-3 mb-4"><p className="font-body text-sm text-error">{error}</p></div>}
      {success && <div className="bg-green-50 border border-mehndi-green rounded-lg px-4 py-3 mb-4"><p className="font-body text-sm text-mehndi-green">✓ प्रोफाइल सेव हो गई — Profile saved!</p></div>}

      <InputField label="आपका नाम *" sublabel="Display Name" value={name} onChange={(e) => setName(e.target.value)} />
      <InputField label="हिंदी में नाम" sublabel="Hindi Name" value={nameHindi} onChange={(e) => setNameHindi(e.target.value)} />
      <InputField label="गाँव / शहर" sublabel="Village or City" value={city} onChange={(e) => setCity(e.target.value)} />

      <div className="mb-4">
        <label className="block font-body font-semibold text-brown mb-1">अपने बारे में <span className="text-brown-light text-sm font-normal">Bio</span></label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={200}
          className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none resize-none" />
        <p className="text-xs text-brown-light text-right font-body">{bio.length}/200</p>
      </div>

      <GoldButton className="w-full mb-4" loading={isSaving} onClick={handleSave}>
        सेव करें — Save Changes
      </GoldButton>

      {/* Account Info */}
      <div className="bg-cream-dark rounded-2xl p-4 mb-4 space-y-2 font-body text-sm text-brown-light">
        {user?.email && <p>📧 {user.email}</p>}
        {user?.phone_number && <p>📱 {user.phone_number}</p>}
      </div>

      {/* v0.5 Voice Features */}
      <div className="bg-cream-dark rounded-2xl p-4 mb-4">
        <h3 className="font-heading text-lg text-brown mb-1">🎙️ वॉइस फ़ीचर्स</h3>
        <p className="font-body text-xs text-brown-light mb-3">Voice Features (v0.5)</p>
        <ul className="space-y-3 font-body text-sm text-brown">
          <li className="flex items-start gap-2">
            <span className="text-haldi-gold mt-0.5">🗣️</span>
            <div>
              <p className="font-semibold">वॉइस-टू-टेक्स्ट</p>
              <p className="text-xs text-brown-light">Voice-to-Text in Hindi & English</p>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-haldi-gold mt-0.5">🎯</span>
            <div>
              <p className="font-semibold">वॉइस कमांड</p>
              <p className="text-xs text-brown-light">Hands-free navigation with voice commands</p>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-haldi-gold mt-0.5">💬</span>
            <div>
              <p className="font-semibold">वॉइस मैसेज</p>
              <p className="text-xs text-brown-light">Send voice messages in chat</p>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-haldi-gold mt-0.5">🌐</span>
            <div>
              <p className="font-semibold">भाषा चयन</p>
              <p className="text-xs text-brown-light">Language selector on login (Hindi / English)</p>
            </div>
          </li>
        </ul>
      </div>

      <GoldButton variant="danger" className="w-full" onClick={handleSignOut}>
        साइन आउट — Sign Out
      </GoldButton>

      {/* Version */}
      <p className="font-body text-xs text-brown-light text-center mt-6">Aangan v0.5.0</p>
    </div>
  );
}
