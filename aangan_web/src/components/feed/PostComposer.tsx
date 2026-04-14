'use client';
import { useState, useRef } from 'react';
import { usePostStore } from '@/stores/postStore';
import { useAuthStore } from '@/stores/authStore';
import GoldButton from '@/components/ui/GoldButton';
import AvatarCircle from '@/components/ui/AvatarCircle';
import VoiceButton from '@/components/ui/VoiceButton';
import { AUDIENCE_OPTIONS, VALIDATION } from '@/lib/constants';

interface PostComposerProps {
  onClose: () => void;
}

export default function PostComposer({ onClose }: PostComposerProps) {
  const user = useAuthStore((s) => s.user);
  const { createPost } = usePostStore();
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('all');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).slice(0, VALIDATION.maxPhotosPerUpload);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  };

  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handlePost = async () => {
    if (!content.trim() && files.length === 0) return;
    setIsPosting(true);
    const audienceLevel = audience.startsWith('level_') ? parseInt(audience.split('_')[1]) : undefined;
    const audienceType = audience === 'all' ? 'all' : 'level';
    const ok = await createPost(content, files, audienceType, audienceLevel);
    setIsPosting(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl p-6 mx-4 max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <AvatarCircle src={user?.avatar_url} name={user?.display_name_hindi ?? user?.display_name} size={44} />
          <div>
            <p className="font-body font-semibold text-brown">{user?.display_name_hindi ?? user?.display_name}</p>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="font-body text-base text-brown-light bg-cream-dark rounded-full px-2 py-0.5 border-0 focus:outline-none mt-0.5"
            >
              {AUDIENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label} — {opt.sublabel}</option>
              ))}
            </select>
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, VALIDATION.maxPostLength))}
          placeholder="परिवार के साथ कुछ साझा करें... Share something with family..."
          rows={4}
          className="w-full font-body text-base text-brown placeholder-gray-400 border-0 focus:outline-none resize-none mb-3"
          autoFocus
        />

        {previews.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {previews.map((p, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-cream-dark">
          <div className="flex items-center gap-1">
            <button onClick={() => fileRef.current?.click()} className="text-2xl min-w-[52px] min-h-[52px] flex items-center justify-center rounded-full text-brown-light hover:text-haldi-gold hover:bg-cream-dark transition-colors">
              📷 <span className="sr-only">फ़ोटो जोड़ें</span>
            </button>
            <VoiceButton
              onResult={(text) => setContent((prev) => (prev + ' ' + text).trim())}
              className="w-[52px] h-[52px] min-w-[52px] min-h-[52px]"
            />
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
          <div className="flex gap-2">
            <GoldButton variant="ghost" size="sm" onClick={onClose}>रद्द करें</GoldButton>
            <GoldButton size="sm" loading={isPosting} disabled={!content.trim() && files.length === 0} onClick={handlePost}>
              पोस्ट करें
            </GoldButton>
          </div>
        </div>
      </div>
    </div>
  );
}
