'use client';
import { useEffect, useRef, useState } from 'react';
import { uploadEventAudio } from '@/lib/utils/uploadMedia';

interface PlayerProps {
  url: string;
  durationSec: number | null;
  speaker?: string | null;
}

const MAX_RECORD_SECONDS = 30;

/**
 * VoiceInvitePlayer — Plays the elder's voice invite inline.
 * Bigger-than-usual play button per Dadi Test (52px+).
 */
export function VoiceInvitePlayer({ url, durationSec, speaker }: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().catch(() => setPlaying(false)); setPlaying(true); }
  };

  const total = durationSec ?? 0;
  const pct = total > 0 ? Math.min(100, (progress / total) * 100) : 0;
  const timeLabel = total > 0 ? `0:${String(Math.round(total - progress)).padStart(2, '0')}` : '';

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-haldi-gold/10 border border-haldi-gold/30">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={toggle}
        className="w-14 h-14 rounded-full bg-haldi-gold text-white text-2xl flex items-center justify-center flex-shrink-0 hover:bg-haldi-gold-dark transition-colors shadow-sm"
        aria-label={playing ? 'रोकें' : 'चलाएँ'}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-body text-base text-brown font-semibold">
          🎙️ {speaker ? `${speaker} का संदेश` : 'न्यौते का संदेश सुनें'}
        </p>
        <div className="mt-1 h-1.5 rounded-full bg-haldi-gold/20 overflow-hidden">
          <div className="h-full bg-haldi-gold transition-all" style={{ width: `${pct}%` }} />
        </div>
        {timeLabel && <p className="font-body text-xs text-brown-light mt-1">{timeLabel}</p>}
      </div>
    </div>
  );
}

interface RecorderProps {
  existingUrl: string | null;
  existingDuration: number | null;
  onChange: (url: string | null, durationSec: number | null) => void;
}

/**
 * VoiceInviteRecorder — Records up to 30s of elder's voice and uploads to B2.
 * Used inside event create/edit. Auto-stops at 30s so Dadaji's rambling
 * doesn't blow up the file size.
 */
export function VoiceInviteRecorder({ existingUrl, existingDuration, onChange }: RecorderProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl);
  const [previewDuration, setPreviewDuration] = useState<number | null>(existingDuration);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTicker = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  };

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => { stopTicker(); cleanupStream(); }, []);

  const mimeType = (() => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
  })();

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('आपका ब्राउज़र रिकॉर्डिंग नहीं कर पा रहा');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        cleanupStream();
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const duration = Math.round(seconds);
        setUploading(true);
        try {
          const ext = (mimeType.split('/')[1] ?? 'webm').split(';')[0];
          const file = new File([blob], `voice-invite-${Date.now()}.${ext}`, { type: blob.type });
          const url = await uploadEventAudio(file);
          setPreviewUrl(url);
          setPreviewDuration(duration);
          onChange(url, duration);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'अपलोड फेल');
        }
        setUploading(false);
      };
      rec.start();
      mediaRecorderRef.current = rec;
      setSeconds(0);
      setRecording(true);
      tickRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_RECORD_SECONDS) { stop(); }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'माइक्रोफोन एक्सेस नहीं मिला');
    }
  };

  const stop = () => {
    stopTicker();
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const clear = () => {
    setPreviewUrl(null);
    setPreviewDuration(null);
    onChange(null, null);
  };

  return (
    <div className="mb-4">
      <label className="block font-body font-semibold text-brown mb-1">
        🎙️ आवाज़ का न्यौता <span className="text-brown-light text-sm font-normal">Voice invite (max 30 sec)</span>
      </label>
      <p className="font-body text-sm text-brown-light mb-2">
        दादाजी/नानाजी की आवाज़ में 15 सेकेंड का न्यौता — Record elders&rsquo; blessing in their own voice
      </p>

      {error && <p className="font-body text-sm text-error mb-2">{error}</p>}

      {previewUrl && !recording && !uploading && (
        <div className="mb-2">
          <VoiceInvitePlayer url={previewUrl} durationSec={previewDuration} />
          <button type="button" onClick={clear} className="mt-1 text-sm text-brown-light font-body underline">
            हटाकर दोबारा रिकॉर्ड करें
          </button>
        </div>
      )}

      {!previewUrl && !recording && !uploading && (
        <button
          type="button"
          onClick={start}
          className="min-h-dadi px-5 rounded-xl bg-red-500 text-white font-body font-semibold text-base hover:bg-red-600 transition-colors"
        >
          🎙️ रिकॉर्ड शुरू करें
        </button>
      )}

      {recording && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={stop}
            className="min-h-dadi px-5 rounded-xl bg-gray-800 text-white font-body font-semibold text-base hover:bg-gray-900 transition-colors"
          >
            ⏹ रोकें
          </button>
          <span className="font-body text-base text-red-600">● रिकॉर्ड हो रहा है · {seconds}s / {MAX_RECORD_SECONDS}s</span>
        </div>
      )}

      {uploading && <p className="font-body text-base text-brown-light">अपलोड हो रहा है…</p>}
    </div>
  );
}
