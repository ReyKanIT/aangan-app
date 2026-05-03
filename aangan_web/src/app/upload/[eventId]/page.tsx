'use client';

import { useState, useRef, useCallback, useEffect, use } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Toaster } from 'react-hot-toast';
import { toastError } from '@/lib/toast';

// ─── Types ─────────────────────────────────────────────────────

interface EventInfo {
  id: string;
  title: string;
  title_hindi: string | null;
  start_datetime: string;
  end_datetime: string | null;
  location: string | null;
  creator_id: string;
}

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  isVideo: boolean;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

const MAX_FILES = 20;
const MAX_FILE_SIZE_MB = 100;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/mov'];

// ─── Helpers ───────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('hi-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
}

function fileId() {
  return Math.random().toString(36).slice(2) + Date.now();
}

// ─── Component ─────────────────────────────────────────────────

export default function GuestUploadPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);

  const [guestName, setGuestName] = useState('');
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ── Load event info ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, title_hindi, start_datetime, end_datetime, location, creator_id')
        .eq('id', eventId)
        .single();

      if (error || !data) {
        setEventError('इवेंट नहीं मिला। लिंक जांचें। / Event not found. Check your link.');
      } else {
        setEvent(data as EventInfo);
      }
      setEventLoading(false);
    }
    load();
  }, [eventId, supabase]);

  // ── File selection ───────────────────────────────────────────
  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const added: UploadFile[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i];

      if (!ALLOWED_TYPES.includes(f.type)) {
        toastError(`${f.name} — यह फ़ाइल प्रकार समर्थित नहीं है`, 'Unsupported file type');
        continue;
      }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toastError(`${f.name} — फ़ाइल ${MAX_FILE_SIZE_MB}MB से बड़ी नहीं होनी चाहिए`, `File too large (max ${MAX_FILE_SIZE_MB}MB)`);
        continue;
      }
      if (files.length + added.length >= MAX_FILES) {
        toastError(`अधिकतम ${MAX_FILES} फ़ाइलें एक साथ अपलोड कर सकते हैं`, `Max ${MAX_FILES} files at once`);
        break;
      }

      added.push({
        id: fileId(),
        file: f,
        preview: URL.createObjectURL(f),
        isVideo: f.type.startsWith('video/'),
        progress: 0,
        status: 'pending',
      });
    }

    setFiles((prev) => [...prev, ...added]);
  }, [files.length]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      // Revoke the blob URL for the removed preview to release memory.
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // When the page unmounts (or the file list is replaced on "Upload More"),
  // revoke every outstanding preview URL so we don't leak blobs.
  useEffect(() => {
    return () => {
      for (const uf of files) {
        if (uf.preview?.startsWith('blob:')) {
          URL.revokeObjectURL(uf.preview);
        }
      }
    };
    // Intentionally only on unmount — mid-session revocation is handled in
    // removeFile / the "Upload More" reset below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drag & Drop ──────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  // ── Upload ───────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!guestName.trim()) {
      toastError('कृपया अपना नाम लिखें', 'Please enter your name');
      return;
    }
    if (files.length === 0) {
      toastError('कम से कम एक फ़ोटो या वीडियो चुनें', 'Please select at least one photo or video');
      return;
    }

    setUploading(true);
    setUploadError(null);

    let allOk = true;

    for (const uf of files) {
      if (uf.status === 'done') continue;

      // Mark as uploading
      setFiles((prev) => prev.map((f) => f.id === uf.id ? { ...f, status: 'uploading', progress: 5 } : f));

      try {
        const ext = uf.file.name.split('.').pop() ?? (uf.isVideo ? 'mp4' : 'jpg');
        const safeGuest = guestName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 30);
        const filePath = `${eventId}/guest_${safeGuest}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        // Upload to Supabase storage
        const { error: storageErr } = await supabase.storage
          .from('event-photos')
          .upload(filePath, uf.file, {
            contentType: uf.file.type,
            upsert: false,
          });

        if (storageErr) throw new Error(storageErr.message);

        setFiles((prev) => prev.map((f) => f.id === uf.id ? { ...f, progress: 70 } : f));

        const { data: urlData } = supabase.storage
          .from('event-photos')
          .getPublicUrl(filePath);

        // Insert metadata row via Edge Function (bypasses RLS for anonymous users)
        const res = await fetch('/api/guest-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            guest_name: guestName.trim(),
            photo_url: urlData.publicUrl,
            storage_path: filePath,
            is_video: uf.isVideo,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'Insert failed');
        }

        setFiles((prev) => prev.map((f) => f.id === uf.id ? { ...f, status: 'done', progress: 100 } : f));
      } catch (err) {
        allOk = false;
        setFiles((prev) => prev.map((f) =>
          f.id === uf.id ? { ...f, status: 'error', error: 'अपलोड नहीं हो सका' } : f
        ));
      }
    }

    setUploading(false);
    if (allOk) setDone(true);
    else setUploadError('कुछ फ़ाइलें अपलोड नहीं हो सकीं। / Some files failed to upload.');
  };

  // ─── Loading / Error states ──────────────────────────────────
  if (eventLoading) {
    return (
      <div className="min-h-screen bg-[#FDFAF0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#C8A84B] border-t-transparent mx-auto mb-4" />
          <p className="font-body text-[#5C4033]">लोड हो रहा है… / Loading…</p>
        </div>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="min-h-screen bg-[#FDFAF0] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
          <p className="text-4xl mb-4">😕</p>
          <p className="font-body text-[#5C4033] text-lg">{eventError}</p>
        </div>
      </div>
    );
  }

  // ─── Success screen ──────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-[#FDFAF0] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
          <p className="text-6xl mb-4">✅</p>
          <h2 className="font-heading text-2xl text-[#C8A84B] font-bold mb-2">धन्यवाद!</h2>
          <p className="font-body text-[#7A9A3A] font-semibold mb-1">Thank you, {guestName}!</p>
          <p className="font-body text-[#5C4033] text-sm mt-3">
            आपके फ़ोटो/वीडियो होस्ट को समीक्षा के लिए भेज दिए गए हैं।
          </p>
          <p className="font-body text-[#8D6E63] text-sm mt-1">
            Your photos/videos have been sent to the event host for review.
          </p>
          <button
            onClick={() => {
              // Revoke previous previews before replacing the list so blobs
              // from the just-completed batch are freed.
              for (const uf of files) {
                if (uf.preview?.startsWith('blob:')) URL.revokeObjectURL(uf.preview);
              }
              setDone(false);
              setFiles([]);
            }}
            className="mt-6 w-full min-h-[52px] bg-[#C8A84B] text-white font-body font-semibold rounded-xl text-base"
          >
            और फ़ोटो अपलोड करें / Upload More
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Upload Page ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FDFAF0]">
      <Toaster position="top-center" toastOptions={{ className: 'font-body' }} />
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-5">
        <div className="max-w-lg mx-auto">
          <p className="text-[#C8A84B] text-sm font-body font-semibold mb-1">AANGAN आँगन</p>
          <h1 className="font-heading text-xl text-[#3E2723] font-bold leading-tight">
            {event.title_hindi ?? event.title}
          </h1>
          {event.title_hindi && (
            <p className="font-body text-sm text-[#8D6E63]">{event.title}</p>
          )}
          <p className="font-body text-sm text-[#8D6E63] mt-1">
            📅 {formatDate(event.start_datetime)}
            {event.location && ` · 📍 ${event.location}`}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Name field */}
        <div>
          <label className="block mb-1">
            <span className="font-body font-semibold text-[#3E2723] text-base">आपका नाम</span>
            <span className="ml-2 text-sm text-[#8D6E63] font-body">Your Name</span>
          </label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder={'जैसे: दादी, राहुल भैया…'}
            maxLength={50}
            className="w-full min-h-[52px] border-2 border-gray-300 focus:border-[#C8A84B] rounded-xl px-4 text-base font-body text-[#3E2723] bg-white outline-none"
            disabled={uploading}
          />
        </div>

        {/* Drop zone */}
        <div>
          <label className="block mb-2">
            <span className="font-body font-semibold text-[#3E2723] text-base">फ़ोटो / वीडियो चुनें</span>
            <span className="ml-2 text-sm text-[#8D6E63] font-body">Select Photos / Videos</span>
          </label>
          <div
            ref={dropZoneRef}
            onClick={() => !uploading && inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-[#C8A84B] rounded-2xl p-8 text-center cursor-pointer bg-white hover:bg-[#FDFAF0] transition-colors"
          >
            <p className="text-4xl mb-3">📸</p>
            <p className="font-body font-semibold text-[#5C4033] text-base">
              यहाँ फ़ाइलें खींचें या टैप करें
            </p>
            <p className="font-body text-sm text-[#8D6E63] mt-1">
              Drag files here or tap to select
            </p>
            <p className="font-body text-sm text-gray-400 mt-2">
              JPEG, PNG, HEIC, MP4, MOV · Max {MAX_FILE_SIZE_MB}MB each · Up to {MAX_FILES} files
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
              disabled={uploading}
            />
          </div>
        </div>

        {/* File previews */}
        {files.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {files.map((uf) => (
              <div key={uf.id} className="relative rounded-xl overflow-hidden aspect-square bg-gray-100">
                {uf.isVideo ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800">
                    <span className="text-3xl">🎬</span>
                    <span className="text-white text-sm mt-1 px-1 text-center truncate w-full px-2">
                      {uf.file.name}
                    </span>
                  </div>
                ) : (
                  <img src={uf.preview} alt={uf.file.name} className="w-full h-full object-cover" />
                )}

                {/* Status overlay */}
                {uf.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                    <div
                      className="w-10 h-10 rounded-full border-4 border-white border-t-[#C8A84B] animate-spin"
                    />
                    <span className="text-white text-sm mt-1">{uf.progress}%</span>
                  </div>
                )}
                {uf.status === 'done' && (
                  <div className="absolute inset-0 bg-green-500/60 flex items-center justify-center">
                    <span className="text-3xl">✅</span>
                  </div>
                )}
                {uf.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center p-1">
                    <span className="text-white text-sm text-center">अपलोड नहीं हुआ</span>
                  </div>
                )}

                {/* Remove button — uses inset hit area for tap target */}
                {uf.status === 'pending' && !uploading && (
                  <button
                    onClick={() => removeFile(uf.id)}
                    className="absolute -top-1 -right-1 w-9 h-9 bg-black/70 hover:bg-black rounded-full text-white text-base flex items-center justify-center shadow"
                    aria-label={'हटाएं — Remove file'}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error message */}
        {uploadError && (
          <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3">
            <p className="font-body text-base text-red-700">{uploadError}</p>
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0 || !guestName.trim()}
          className="w-full min-h-[52px] bg-[#C8A84B] hover:bg-[#b8983b] disabled:opacity-50 disabled:cursor-not-allowed text-white font-body font-bold rounded-xl text-base flex items-center justify-center gap-2 transition-colors"
        >
          {uploading ? (
            <>
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              अपलोड हो रहा है… / Uploading…
            </>
          ) : (
            <>
              📤 अपलोड करें — Upload {files.length > 0 ? `(${files.length})` : ''}
            </>
          )}
        </button>

        {/* Footer note */}
        <p className="font-body text-sm text-gray-400 text-center pb-8">
          अपलोड की गई सामग्री होस्ट की समीक्षा के बाद दिखाई देगी।
          <br />
          Uploads are visible after host review.
        </p>
      </div>
    </div>
  );
}
