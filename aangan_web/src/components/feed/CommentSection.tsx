'use client';
import { useEffect, useState } from 'react';
import { useCommentStore } from '@/stores/commentStore';
import { useAuthStore } from '@/stores/authStore';
import { VALIDATION } from '@/lib/constants';
import { timeAgo } from '@/lib/utils/formatters';
import AvatarCircle from '@/components/ui/AvatarCircle';
import GoldButton from '@/components/ui/GoldButton';

export default function CommentSection({ postId }: { postId: string }) {
  const user = useAuthStore((s) => s.user);
  const { commentsByPost, loadingPosts, error, fetchComments, addComment, deleteComment } =
    useCommentStore();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const comments = commentsByPost[postId] ?? [];
  const isLoading = loadingPosts.has(postId);

  useEffect(() => {
    fetchComments(postId);
  }, [postId, fetchComments]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    const ok = await addComment(postId, trimmed);
    if (ok) setText('');
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="pt-3 border-t border-cream-dark">
      {/* Error */}
      {error && (
        <p className="font-body text-base text-error mb-2">{error}</p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <svg className="animate-spin h-6 w-6 text-haldi-gold" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Comments list */}
      {!isLoading && comments.length === 0 && (
        <p className="font-body text-base text-brown-light text-center py-3">
          कोई टिप्पणी नहीं — Be the first to comment
        </p>
      )}

      {comments.length > 0 && (
        <div className="space-y-3 mb-3 max-h-80 overflow-y-auto">
          {comments.map((c) => {
            const authorName = c.author?.display_name_hindi ?? c.author?.display_name ?? 'सदस्य';
            const isOwn = user?.id === c.author_id;

            return (
              <div key={c.id} className="flex gap-2.5">
                <AvatarCircle
                  src={c.author?.avatar_url}
                  name={authorName}
                  size={32}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-body font-semibold text-base text-brown leading-tight truncate">
                      {authorName}
                    </span>
                    <span className="font-body text-xs text-brown-light flex-shrink-0">
                      {timeAgo(c.created_at)}
                    </span>
                  </div>
                  <p className="font-body text-base text-brown leading-relaxed whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                </div>
                {isOwn && (
                  <button
                    onClick={() => deleteComment(c.id, postId)}
                    className="text-gray-400 hover:text-error transition-colors p-2 flex-shrink-0 self-start min-w-dadi min-h-dadi flex items-center justify-center"
                    aria-label="टिप्पणी हटाएं (Delete comment)"
                    title="हटाएं / Delete"
                  >
                    🗑️
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= VALIDATION.maxCommentLength) {
              setText(e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="टिप्पणी लिखें..."
          rows={1}
          className="flex-1 min-h-dadi font-body text-base text-brown bg-cream rounded-lg px-3 py-3 border border-cream-dark focus:border-haldi-gold focus:outline-none focus:ring-1 focus:ring-haldi-gold resize-none placeholder:text-brown-light"
        />
        <GoldButton
          onClick={handleSubmit}
          loading={submitting}
          disabled={!text.trim()}
          size="sm"
        >
          भेजें
        </GoldButton>
      </div>
      {text.length > 0 && (
        <p className="font-body text-xs text-brown-light text-right mt-1">
          {text.length}/{VALIDATION.maxCommentLength}
        </p>
      )}
    </div>
  );
}
