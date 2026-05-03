'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEventStore } from '@/stores/eventStore';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';
import { EVENT_TYPES } from '@/lib/constants';
import { uploadEventCover } from '@/lib/utils/uploadMedia';
import LocationPicker from './LocationPicker';
import { VoiceInviteRecorder } from './VoiceInvite';

interface Props { onClose: () => void; parentEventId?: string | null; }

export default function EventCreatorModal({ onClose, parentEventId = null }: Props) {
  const router = useRouter();
  const { createEvent } = useEventStore();
  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState('');
  const [title, setTitle] = useState('');
  const [titleHindi, setTitleHindi] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [hostedBy, setHostedBy] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleCoverPick = (file: File | null) => {
    setCoverFile(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleCreate = async () => {
    if (!title || !date || !time || !eventType) { setError('सभी ज़रूरी जानकारी भरें'); return; }
    setIsSaving(true);

    let banner_url: string | null = null;
    if (coverFile) {
      try {
        banner_url = await uploadEventCover(coverFile);
      } catch {
        // Cover upload failed — save event without it rather than blocking Dadi
        setError('कवर फ़ोटो अपलोड नहीं हुई — बाकी जानकारी सेव कर रहे हैं');
      }
    }

    const start = new Date(`${date}T${time}`).toISOString();
    const id = await createEvent({
      title, title_hindi: titleHindi || null,
      event_type: eventType as never,
      start_datetime: start,
      location: location || null,
      description: description || null,
      ceremonies: [],
      is_public: true,
      banner_url,
      latitude: lat,
      longitude: lng,
      hosted_by: hostedBy.trim() || null,
      voice_invite_url: voiceUrl,
      voice_invite_duration_sec: voiceDuration,
      parent_event_id: parentEventId,
    });
    setIsSaving(false);
    if (id) { onClose(); router.push(`/events/${id}`); }
    else if (!error) setError('उत्सव नहीं बना पाए');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 mx-4 max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading text-xl text-brown">
            {step === 1 ? 'उत्सव का प्रकार' : 'विवरण भरें'}
          </h3>
          <button onClick={onClose} className="text-brown-light text-xl min-w-dadi min-h-dadi flex items-center justify-center rounded-lg hover:bg-cream-dark transition-colors">✕</button>
        </div>

        {error && <div className="bg-red-50 border border-error rounded-lg px-4 py-3 mb-4"><p className="font-body text-base text-error">{error}</p></div>}

        {step === 1 && (
          <div>
            <p className="font-body text-sm text-brown-light mb-4">उत्सव का प्रकार चुनें — Select event type</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setEventType(t.value)}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all min-h-[80px] ${eventType === t.value ? 'border-haldi-gold bg-unread-bg' : 'border-gray-200 hover:border-haldi-gold-light'}`}
                >
                  <span className="text-3xl">{t.emoji}</span>
                  <span className="font-body text-base text-brown font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
            <GoldButton className="w-full" disabled={!eventType} onClick={() => setStep(2)}>
              आगे बढ़ें →
            </GoldButton>
          </div>
        )}

        {step === 2 && (
          <div>
            {/* Cover photo picker */}
            <div className="mb-4">
              <label className="block font-body font-semibold text-brown mb-1">कवर फ़ोटो <span className="text-brown-light text-sm font-normal">Cover Photo</span></label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-36 rounded-xl border-2 border-dashed border-haldi-gold/60 bg-cream flex items-center justify-center overflow-hidden hover:bg-cream-dark transition-colors"
                aria-label={'कवर फ़ोटो जोड़ें'}
              >
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="cover preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <div className="text-4xl mb-1">🖼️</div>
                    <p className="font-body text-base text-brown-light">कवर फ़ोटो जोड़ें — Add cover photo</p>
                  </div>
                )}
              </button>
              {coverPreview && (
                <button
                  type="button"
                  onClick={() => handleCoverPick(null)}
                  className="mt-2 text-sm text-brown-light font-body underline"
                >
                  हटाएं — Remove
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleCoverPick(e.target.files?.[0] ?? null)}
              />
            </div>
            <InputField label={'उत्सव का नाम *'} sublabel="Event Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={'e.g. शादी समारोह'} />
            <InputField label={'हिंदी में नाम'} sublabel="Hindi Title" value={titleHindi} onChange={(e) => setTitleHindi(e.target.value)} placeholder={'हिंदी में नाम'} />
            <div className="grid grid-cols-2 gap-3">
              <InputField label={'तारीख *'} sublabel="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <InputField label={'समय *'} sublabel="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <InputField label={'स्थान'} sublabel="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={'गाँव / शहर / हॉल'} />
            <LocationPicker latitude={lat} longitude={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
            <InputField
              label={'किनकी ओर से — On behalf of'}
              sublabel="Elders/hosts whose name appears on the invite"
              value={hostedBy}
              onChange={(e) => setHostedBy(e.target.value)}
              placeholder={'जैसे — श्री सुखदेव शर्मा एवं परिवार'}
            />
            <VoiceInviteRecorder
              existingUrl={voiceUrl}
              existingDuration={voiceDuration}
              onChange={(u, d) => { setVoiceUrl(u); setVoiceDuration(d); }}
            />
            {parentEventId && (
              <p className="font-body text-sm text-haldi-gold-dark mb-2">
                🔗 This will be added as a sub-event to the parent wedding/series
              </p>
            )}
            <div className="mb-4">
              <label className="block font-body font-semibold text-brown mb-1">विवरण <span className="text-brown-light text-sm font-normal">Description</span></label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={'उत्सव के बारे में...'} rows={3} className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none resize-none" />
            </div>
            <div className="flex gap-3">
              <GoldButton variant="outline" className="flex-1" onClick={() => setStep(1)}>← वापस</GoldButton>
              <GoldButton className="flex-1" loading={isSaving} onClick={handleCreate}>उत्सव बनाएं ✓</GoldButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
