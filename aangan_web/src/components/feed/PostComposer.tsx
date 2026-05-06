'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { usePostStore } from '@/stores/postStore';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
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
  const { members, fetchMembers } = useFamilyStore();
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('all');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isWisdom, setIsWisdom] = useState(false);
  // v0.15.4 — custom audience picker state. Set of family_member_id values
  // that the post will be shared with when audience='custom'. Searchable
  // by Hindi/English name to handle large families.
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [pickerSearch, setPickerSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Lazy-fetch family members the first time the user picks 'custom' so
  // we don't pay the query cost on every composer open.
  useEffect(() => {
    if (audience === 'custom' && members.length === 0) {
      fetchMembers();
    }
  }, [audience, members.length, fetchMembers]);

  const filteredMembers = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      (m.member?.display_name ?? '').toLowerCase().includes(q) ||
      (m.member?.display_name_hindi ?? '').toLowerCase().includes(q)
    );
  }, [members, pickerSearch]);

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Track latest previews in a ref so the unmount cleanup sees the current list.
  const previewsRef = useRef<string[]>([]);
  useEffect(() => { previewsRef.current = previews; }, [previews]);

  // Revoke any leftover blob URLs when the composer unmounts to prevent memory leaks.
  useEffect(() => {
    return () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Revoke previously-selected previews before replacing them.
    previews.forEach((url) => URL.revokeObjectURL(url));
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
    if (audience === 'custom' && selectedUserIds.size === 0) {
      // Soft-block: don't 0-audience the post by accident.
      alert('कम से कम एक सदस्य चुनें — Pick at least one person');
      return;
    }
    setIsPosting(true);
    const audienceLevel = audience.startsWith('level_') ? parseInt(audience.split('_')[1]) : undefined;
    const audienceType = audience === 'all' ? 'all' : (audience === 'custom' ? 'custom' : 'level');
    const ok = await createPost(
      content,
      files,
      audienceType,
      audienceLevel,
      isWisdom ? 'wisdom' : 'text',
      audience === 'custom' ? Array.from(selectedUserIds) : [],
    );
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
          placeholder={isWisdom
            ? "एक छोटा ज्ञान या उपदेश साझा करें… A short wisdom or saying…"
            : "परिवार के साथ कुछ साझा करें... Share something with family..."}
          rows={4}
          className={`w-full font-body text-base text-brown placeholder-gray-400 border-0 focus:outline-none resize-none mb-3 ${isWisdom ? 'border-l-4 border-haldi-gold pl-3 italic' : ''}`}
          autoFocus
        />

        {/* v0.15.4 — Custom audience picker. Renders inline below the
            audience pill when 'custom' is chosen. Search + multi-select.
            Works on both blood family (online users) and wider family
            tree (cousin-marriage cases handled by secondary relationships
            still appear here as their primary connection). */}
        {audience === 'custom' && (
          <div className="mb-3 border-2 border-haldi-gold/30 bg-cream/30 rounded-xl p-3">
            <p className="font-body text-sm text-brown-light mb-2">
              {'जिन सदस्यों के साथ साझा करना है उन्हें चुनें — Pick who can see this post'}
            </p>
            <input
              type="search"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder={'नाम से खोजें — Search by name'}
              className="w-full min-h-dadi px-3 py-2 mb-2 rounded-lg bg-white border-2 border-cream-dark focus:border-haldi-gold focus:outline-none font-body text-base"
              aria-label={'सदस्य खोजें — Search family members'}
            />
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {filteredMembers.length === 0 ? (
                <p className="font-body text-sm text-brown-light text-center py-4">
                  {pickerSearch ? 'कोई सदस्य नहीं मिला — No matches' : 'परिवार में कोई सदस्य नहीं — Add family members first'}
                </p>
              ) : (
                filteredMembers.map((m) => {
                  const id = m.family_member_id;
                  const checked = selectedUserIds.has(id);
                  const name = m.member?.display_name_hindi ?? m.member?.display_name ?? 'Unknown';
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleUser(id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg border-2 transition-colors text-left ${
                        checked
                          ? 'border-haldi-gold bg-haldi-gold/10'
                          : 'border-transparent hover:bg-cream-dark/50'
                      }`}
                      aria-pressed={checked}
                    >
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-sm ${checked ? 'bg-haldi-gold text-white' : 'bg-white border-2 border-gray-300'}`}>
                        {checked ? '✓' : ''}
                      </span>
                      <AvatarCircle src={m.member?.avatar_url} name={name} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-semibold text-brown text-sm truncate">{name}</p>
                        <p className="font-body text-xs text-brown-light truncate">
                          {m.relationship_label_hindi || m.relationship_type} · L{m.connection_level}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            {selectedUserIds.size > 0 && (
              <p className="font-body text-sm text-mehndi-green font-semibold mt-2">
                ✓ {selectedUserIds.size} {'चुने गए — selected'}
              </p>
            )}
          </div>
        )}

        {/* Wisdom note toggle — pin to top of family feed + special card style */}
        <button
          type="button"
          onClick={() => setIsWisdom((p) => !p)}
          className={`flex items-center gap-2 mb-3 px-3 py-2 min-h-dadi rounded-lg border-2 transition-colors text-base font-body ${
            isWisdom
              ? 'border-haldi-gold bg-unread-bg text-haldi-gold-dark'
              : 'border-gray-200 text-brown-light hover:border-haldi-gold-light'
          }`}
          aria-pressed={isWisdom}
        >
          <span className="text-xl">📿</span>
          <span>{isWisdom ? '✓ ' : ''}{'ज्ञान — Wisdom note'}</span>
        </button>

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
