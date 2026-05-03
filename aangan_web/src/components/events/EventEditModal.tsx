'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEventStore } from '@/stores/eventStore';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';
import { uploadEventCover } from '@/lib/utils/uploadMedia';
import LocationPicker from './LocationPicker';
import { VoiceInviteRecorder } from './VoiceInvite';
import type { AanganEvent } from '@/types/database';

interface Props { event: AanganEvent; onClose: () => void; }

export default function EventEditModal({ event, onClose }: Props) {
  const router = useRouter();
  const { updateEvent, deleteEvent } = useEventStore();

  const initialDate = event.start_datetime.slice(0, 10);
  const initialTime = event.start_datetime.slice(11, 16);

  const [title, setTitle] = useState(event.title);
  const [titleHindi, setTitleHindi] = useState(event.title_hindi ?? '');
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [location, setLocation] = useState(event.location ?? '');
  const [hostedBy, setHostedBy] = useState(event.hosted_by ?? '');
  const [lat, setLat] = useState<number | null>(event.latitude ?? null);
  const [lng, setLng] = useState<number | null>(event.longitude ?? null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(event.voice_invite_url ?? null);
  const [voiceDuration, setVoiceDuration] = useState<number | null>(event.voice_invite_duration_sec ?? null);
  const [description, setDescription] = useState(event.description ?? '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(event.banner_url ?? null);
  const [removedCover, setRemovedCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleCoverPick = (file: File | null) => {
    setCoverFile(file);
    if (coverPreview && coverFile) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : (removedCover ? null : event.banner_url));
  };

  const handleRemoveCover = () => {
    if (coverPreview && coverFile) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
    setRemovedCover(true);
  };

  const handleSave = async () => {
    if (!title || !date || !time) { setError('सभी ज़रूरी जानकारी भरें'); return; }
    setIsSaving(true);

    let banner_url: string | null | undefined = undefined;
    if (coverFile) {
      try { banner_url = await uploadEventCover(coverFile); }
      catch { setError('कवर फ़ोटो अपलोड नहीं हुई'); setIsSaving(false); return; }
    } else if (removedCover) {
      banner_url = null;
    }

    const start = new Date(`${date}T${time}`).toISOString();
    const patch: Partial<AanganEvent> = {
      title,
      title_hindi: titleHindi || null,
      start_datetime: start,
      location: location || null,
      description: description || null,
      latitude: lat,
      longitude: lng,
      hosted_by: hostedBy.trim() || null,
      voice_invite_url: voiceUrl,
      voice_invite_duration_sec: voiceDuration,
    };
    if (banner_url !== undefined) patch.banner_url = banner_url;

    const ok = await updateEvent(event.id, patch);
    setIsSaving(false);
    if (ok) onClose();
    else setError('सेव नहीं हो पाया');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const ok = await deleteEvent(event.id);
    setIsDeleting(false);
    if (ok) { onClose(); router.push('/events'); }
    else setError('डिलीट नहीं हो पाया');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 mx-4 max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading text-xl text-brown">उत्सव संपादन — Edit Event</h3>
          <button onClick={onClose} className="text-brown-light text-xl min-w-dadi min-h-dadi flex items-center justify-center rounded-lg hover:bg-cream-dark transition-colors">✕</button>
        </div>

        {error && <div className="bg-red-50 border border-error rounded-lg px-4 py-3 mb-4"><p className="font-body text-base text-error">{error}</p></div>}

        <div className="mb-4">
          <label className="block font-body font-semibold text-brown mb-1">कवर फ़ोटो <span className="text-brown-light text-sm font-normal">Cover Photo</span></label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full h-36 rounded-xl border-2 border-dashed border-haldi-gold/60 bg-cream flex items-center justify-center overflow-hidden hover:bg-cream-dark transition-colors"
          >
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-1">🖼️</div>
                <p className="font-body text-base text-brown-light">कवर फ़ोटो जोड़ें</p>
              </div>
            )}
          </button>
          {coverPreview && (
            <button type="button" onClick={handleRemoveCover} className="mt-2 text-sm text-brown-light font-body underline">हटाएं — Remove</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverPick(e.target.files?.[0] ?? null)} />
        </div>

        <InputField label={'उत्सव का नाम *'} sublabel="Event Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <InputField label={'हिंदी में नाम'} sublabel="Hindi Title" value={titleHindi} onChange={(e) => setTitleHindi(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <InputField label={'तारीख *'} sublabel="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <InputField label={'समय *'} sublabel="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <InputField label={'स्थान'} sublabel="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <LocationPicker latitude={lat} longitude={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
        <InputField
          label={'किनकी ओर से — On behalf of'}
          sublabel="Elders/hosts on the invite"
          value={hostedBy}
          onChange={(e) => setHostedBy(e.target.value)}
          placeholder={'श्री सुखदेव शर्मा एवं परिवार'}
        />
        <VoiceInviteRecorder
          existingUrl={voiceUrl}
          existingDuration={voiceDuration}
          onChange={(u, d) => { setVoiceUrl(u); setVoiceDuration(d); }}
        />
        <div className="mb-4">
          <label className="block font-body font-semibold text-brown mb-1">विवरण <span className="text-brown-light text-sm font-normal">Description</span></label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none resize-none" />
        </div>

        <div className="flex gap-3 mb-4">
          <GoldButton variant="outline" className="flex-1" onClick={onClose}>रद्द करें</GoldButton>
          <GoldButton className="flex-1" loading={isSaving} onClick={handleSave}>सेव करें ✓</GoldButton>
        </div>

        {/* Destructive action quarantined at the bottom with a confirm step */}
        <div className="border-t border-gray-200 pt-4">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full min-h-dadi rounded-xl border-2 border-red-400 text-red-600 font-body font-semibold text-base hover:bg-red-50 transition-colors"
            >
              🗑️ उत्सव डिलीट करें — Delete Event
            </button>
          ) : (
            <div className="space-y-2">
              <p className="font-body text-base text-red-700 text-center">पक्का डिलीट करना है? सारे RSVP और फ़ोटो मिट जाएंगे।</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 min-h-dadi rounded-xl border-2 border-gray-300 text-brown font-body font-semibold text-base hover:bg-cream-dark transition-colors"
                >
                  नहीं — Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 min-h-dadi rounded-xl bg-red-500 text-white font-body font-semibold text-base hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {isDeleting ? '…' : 'हाँ, डिलीट करें'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
