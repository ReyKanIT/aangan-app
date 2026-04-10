'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import VoiceButton from '@/components/ui/VoiceButton';

export default function KuldeviPage() {
  const { user, isLoading, updateProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [kuldeviName, setKuldeviName] = useState('');
  const [kuldeviTemple, setKuldeviTemple] = useState('');
  const [kuldevtaName, setKuldevtaName] = useState('');
  const [kuldevtaTemple, setKuldevtaTemple] = useState('');
  const [pujaPaddhati, setPujaPaddhati] = useState('');
  const [pujaNiyam, setPujaNiyam] = useState('');

  useEffect(() => {
    if (user) {
      setKuldeviName(user.kuldevi_name ?? '');
      setKuldeviTemple(user.kuldevi_temple_location ?? '');
      setKuldevtaName(user.kuldevta_name ?? '');
      setKuldevtaTemple(user.kuldevta_temple_location ?? '');
      setPujaPaddhati(user.puja_paddhati ?? '');
      setPujaNiyam(user.puja_niyam ?? '');
    }
  }, [user]);

  const hasData = !!(
    user?.kuldevi_name ||
    user?.kuldevta_name ||
    user?.kuldevi_temple_location ||
    user?.kuldevta_temple_location ||
    user?.puja_paddhati ||
    user?.puja_niyam
  );

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess(false);
    const ok = await updateProfile({
      kuldevi_name: kuldeviName || null,
      kuldevi_temple_location: kuldeviTemple || null,
      kuldevta_name: kuldevtaName || null,
      kuldevta_temple_location: kuldevtaTemple || null,
      puja_paddhati: pujaPaddhati || null,
      puja_niyam: pujaNiyam || null,
    });
    setIsSaving(false);
    if (ok) {
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError('सेव नहीं हो पाया — Could not save');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      setKuldeviName(user.kuldevi_name ?? '');
      setKuldeviTemple(user.kuldevi_temple_location ?? '');
      setKuldevtaName(user.kuldevta_name ?? '');
      setKuldevtaTemple(user.kuldevta_temple_location ?? '');
      setPujaPaddhati(user.puja_paddhati ?? '');
      setPujaNiyam(user.puja_niyam ?? '');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl text-brown">कुलदेवी / कुलदेवता</h2>
          <p className="font-body text-base text-brown-light">Family Deity</p>
        </div>
        {!isEditing && (
          <GoldButton variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            ✏️ संपादन — Edit
          </GoldButton>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-error rounded-lg px-4 py-3 mb-4">
          <p className="font-body text-sm text-error">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-mehndi-green rounded-lg px-4 py-3 mb-4">
          <p className="font-body text-sm text-mehndi-green">✓ जानकारी सेव हो गई — Information saved!</p>
        </div>
      )}

      {!hasData && !isEditing ? (
        <EmptyState
          emoji="🛕"
          title="अभी तक जानकारी नहीं भरी"
          subtitle="Add your family deity information"
          action={
            <GoldButton onClick={() => setIsEditing(true)}>
              जानकारी जोड़ें — Add Info
            </GoldButton>
          }
        />
      ) : (
        <>
          {/* Deity Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Kuldevi Card */}
            <div className="bg-white rounded-2xl border-2 border-cream-dark p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🙏</span>
                <div>
                  <h3 className="font-heading text-lg text-haldi-gold">कुलदेवी</h3>
                  <p className="font-body text-xs text-brown-light">Kuldevi</p>
                </div>
              </div>
              {isEditing ? (
                <>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <InputField
                        label="नाम"
                        sublabel="Name"
                        value={kuldeviName}
                        onChange={(e) => setKuldeviName(e.target.value)}
                        placeholder="कुलदेवी का नाम"
                      />
                    </div>
                    <div className="mb-4">
                      <VoiceButton onResult={(text) => setKuldeviName((prev) => (prev + ' ' + text).trim())} />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <InputField
                        label="मंदिर स्थान"
                        sublabel="Temple Location"
                        value={kuldeviTemple}
                        onChange={(e) => setKuldeviTemple(e.target.value)}
                        placeholder="मंदिर कहाँ है"
                      />
                    </div>
                    <div className="mb-4">
                      <VoiceButton onResult={(text) => setKuldeviTemple((prev) => (prev + ' ' + text).trim())} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="font-body text-xs text-brown-light">नाम — Name</p>
                    <p className="font-body text-base text-brown">{kuldeviName || '—'}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-brown-light">मंदिर स्थान — Temple Location</p>
                    <p className="font-body text-base text-brown">{kuldeviTemple || '—'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Kuldevta Card */}
            <div className="bg-white rounded-2xl border-2 border-cream-dark p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🙏</span>
                <div>
                  <h3 className="font-heading text-lg text-haldi-gold">कुलदेवता</h3>
                  <p className="font-body text-xs text-brown-light">Kuldevta</p>
                </div>
              </div>
              {isEditing ? (
                <>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <InputField
                        label="नाम"
                        sublabel="Name"
                        value={kuldevtaName}
                        onChange={(e) => setKuldevtaName(e.target.value)}
                        placeholder="कुलदेवता का नाम"
                      />
                    </div>
                    <div className="mb-4">
                      <VoiceButton onResult={(text) => setKuldevtaName((prev) => (prev + ' ' + text).trim())} />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <InputField
                        label="मंदिर स्थान"
                        sublabel="Temple Location"
                        value={kuldevtaTemple}
                        onChange={(e) => setKuldevtaTemple(e.target.value)}
                        placeholder="मंदिर कहाँ है"
                      />
                    </div>
                    <div className="mb-4">
                      <VoiceButton onResult={(text) => setKuldevtaTemple((prev) => (prev + ' ' + text).trim())} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="font-body text-xs text-brown-light">नाम — Name</p>
                    <p className="font-body text-base text-brown">{kuldevtaName || '—'}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-brown-light">मंदिर स्थान — Temple Location</p>
                    <p className="font-body text-base text-brown">{kuldevtaTemple || '—'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Puja Paddhati */}
          <div className="bg-white rounded-2xl border-2 border-cream-dark p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📿</span>
                <div>
                  <h3 className="font-heading text-lg text-brown">पूजा पद्धति</h3>
                  <p className="font-body text-xs text-brown-light">Puja Method</p>
                </div>
              </div>
              {isEditing && (
                <VoiceButton onResult={(text) => setPujaPaddhati((prev) => (prev + ' ' + text).trim())} />
              )}
            </div>
            {isEditing ? (
              <textarea
                value={pujaPaddhati}
                onChange={(e) => setPujaPaddhati(e.target.value)}
                placeholder="पूजा की विधि यहाँ लिखें..."
                rows={4}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none resize-none"
              />
            ) : (
              <p className="font-body text-base text-brown whitespace-pre-wrap">{pujaPaddhati || '—'}</p>
            )}
          </div>

          {/* Puja Niyam */}
          <div className="bg-white rounded-2xl border-2 border-cream-dark p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <div>
                  <h3 className="font-heading text-lg text-brown">पूजा नियम</h3>
                  <p className="font-body text-xs text-brown-light">Puja Rules</p>
                </div>
              </div>
              {isEditing && (
                <VoiceButton onResult={(text) => setPujaNiyam((prev) => (prev + ' ' + text).trim())} />
              )}
            </div>
            {isEditing ? (
              <textarea
                value={pujaNiyam}
                onChange={(e) => setPujaNiyam(e.target.value)}
                placeholder="पूजा के नियम और विशेष बातें..."
                rows={4}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none resize-none"
              />
            ) : (
              <p className="font-body text-base text-brown whitespace-pre-wrap">{pujaNiyam || '—'}</p>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-3">
              <GoldButton variant="ghost" className="flex-1" onClick={handleCancel}>
                रद्द करें — Cancel
              </GoldButton>
              <GoldButton className="flex-1" loading={isSaving} onClick={handleSave}>
                सेव करें — Save
              </GoldButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}
