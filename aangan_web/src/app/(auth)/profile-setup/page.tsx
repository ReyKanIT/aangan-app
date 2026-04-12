'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { uploadAvatar } from '@/lib/utils/uploadMedia';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, updateProfile, session } = useAuthStore();
  const [name, setName] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('signup_name');
      if (saved) { sessionStorage.removeItem('signup_name'); return saved; }
    }
    return '';
  });
  const [nameHindi, setNameHindi] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('नाम ज़रूरी है'); return; }
    if (!session?.user) return;
    setIsSaving(true);
    setError('');
    try {
      let avatar_url = user?.avatar_url ?? null;
      if (avatarFile) {
        avatar_url = await uploadAvatar(avatarFile, session.user.id);
      }
      const ok = await updateProfile({
        display_name: name.trim(),
        display_name_hindi: nameHindi.trim() || null,
        village_city: city.trim() || null,
        bio: bio.trim() || null,
        avatar_url,
      });
      if (ok) router.replace('/feed');
      else setError('प्रोफाइल सेव नहीं हो पाई');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'कुछ गलत हो गया');
    }
    setIsSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <div className="bg-mehndi-green/10 border border-mehndi-green/30 rounded-xl px-4 py-3 mb-6 text-center">
        <p className="font-heading text-lg text-mehndi-green">स्वागत है! Welcome to Aangan!</p>
        <p className="font-body text-base text-brown-light">अपनी प्रोफाइल बनाएं और परिवार से जुड़ें</p>
      </div>
      <h2 className="font-heading text-2xl text-brown mb-1">प्रोफाइल बनाएं</h2>
      <p className="font-body text-base text-brown-light mb-8">Set up your profile</p>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <label className="cursor-pointer group relative">
          <AvatarCircle src={avatarPreview} name={name || 'A'} size={96} />
          <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="text-white text-2xl">📷</span>
          </div>
          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </label>
        <p className="font-body text-sm text-brown-light mt-2">फ़ोटो जोड़ें — Add Photo</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-error rounded-lg px-4 py-3 mb-4">
          <p className="font-body text-sm text-error">{error}</p>
        </div>
      )}

      <InputField label="आपका नाम *" sublabel="Your Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="अपना नाम डालें" />
      <InputField label="हिंदी में नाम" sublabel="Name in Hindi" value={nameHindi} onChange={(e) => setNameHindi(e.target.value)} placeholder="हिंदी में नाम" />
      <InputField label="गाँव / शहर" sublabel="Village or City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="अपना गाँव या शहर" />

      <div className="mb-4">
        <label className="block mb-1">
          <span className="font-body font-semibold text-brown text-base">अपने बारे में</span>
          <span className="ml-2 text-sm text-brown-light font-body">About You</span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="अपने बारे में कुछ बताएं..."
          maxLength={200}
          rows={3}
          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 font-body text-base text-brown bg-white focus:border-haldi-gold focus:outline-none placeholder-gray-400 resize-none"
        />
        <p className="text-sm text-brown-light text-right font-body">{bio.length}/200</p>
      </div>

      <GoldButton className="w-full mt-4" loading={isSaving} onClick={handleSave}>
        आगे बढ़ें — Continue
      </GoldButton>
    </div>
  );
}
