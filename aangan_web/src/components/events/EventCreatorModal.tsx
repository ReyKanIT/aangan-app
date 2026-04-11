'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEventStore } from '@/stores/eventStore';
import GoldButton from '@/components/ui/GoldButton';
import InputField from '@/components/ui/InputField';
import { EVENT_TYPES } from '@/lib/constants';

interface Props { onClose: () => void; }

export default function EventCreatorModal({ onClose }: Props) {
  const router = useRouter();
  const { createEvent } = useEventStore();
  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState('');
  const [title, setTitle] = useState('');
  const [titleHindi, setTitleHindi] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!title || !date || !time || !eventType) { setError('सभी ज़रूरी जानकारी भरें'); return; }
    setIsSaving(true);
    const start = new Date(`${date}T${time}`).toISOString();
    const id = await createEvent({
      title, title_hindi: titleHindi || null,
      event_type: eventType as never,
      start_datetime: start,
      location: location || null,
      description: description || null,
      ceremonies: [],
      is_public: true,
    });
    setIsSaving(false);
    if (id) { onClose(); router.push(`/events/${id}`); }
    else setError('उत्सव नहीं बना पाए');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl lg:rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading text-xl text-brown">
            {step === 1 ? 'उत्सव का प्रकार' : 'विवरण भरें'}
          </h3>
          <button onClick={onClose} className="text-brown-light text-xl min-w-dadi min-h-dadi flex items-center justify-center rounded-lg hover:bg-cream-dark transition-colors">✕</button>
        </div>

        {error && <div className="bg-red-50 border border-error rounded-lg px-4 py-2 mb-4"><p className="font-body text-sm text-error">{error}</p></div>}

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
                  <span className="font-body text-xs text-brown font-semibold">{t.label}</span>
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
            <InputField label="उत्सव का नाम *" sublabel="Event Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. शादी समारोह" />
            <InputField label="हिंदी में नाम" sublabel="Hindi Title" value={titleHindi} onChange={(e) => setTitleHindi(e.target.value)} placeholder="हिंदी में नाम" />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="तारीख *" sublabel="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <InputField label="समय *" sublabel="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <InputField label="स्थान" sublabel="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="गाँव / शहर / हॉल" />
            <div className="mb-4">
              <label className="block font-body font-semibold text-brown mb-1">विवरण <span className="text-brown-light text-sm font-normal">Description</span></label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="उत्सव के बारे में..." rows={3} className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none resize-none" />
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
