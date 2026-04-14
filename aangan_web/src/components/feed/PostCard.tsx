'use client';
import Image from 'next/image';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { useAuthStore } from '@/stores/authStore';
import { usePostStore } from '@/stores/postStore';
import type { Post } from '@/types/database';
import { timeAgo } from '@/lib/utils/formatters';
import { useState } from 'react';
import ShareButton from '@/components/ui/ShareButton';
import CommentSection from '@/components/feed/CommentSection';

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'सभी',
  level: 'Level',
};

export default function PostCard({ post }: { post: Post }) {
  const user = useAuthStore((s) => s.user);
  const { likePost, deletePost } = usePostStore();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const isOwn = user?.id === post.author_id;
  const content = post.content ?? '';
  const shouldTruncate = content.length > 300 && !expanded;

  const handleDelete = async () => {
    if (!confirm('यह पोस्ट हटाएं? Delete this post?')) return;
    setDeleting(true);
    try {
      const ok = await deletePost(post.id);
      // On success the card unmounts; on failure we must re-enable the button
      // so the user can retry instead of being stuck with a disabled trash icon.
      if (!ok) setDeleting(false);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <article className="bg-white rounded-2xl shadow-sm p-4 mb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <AvatarCircle src={post.author?.avatar_url} name={post.author?.display_name_hindi ?? post.author?.display_name} size={44} />
          <div>
            <p className="font-body font-semibold text-brown text-base leading-tight">
              {post.author?.display_name_hindi ?? post.author?.display_name}
            </p>
            <p className="font-body text-sm text-brown-light">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-cream-dark text-brown-light font-body text-sm px-2 py-1 rounded-full">
            {post.audience_type === 'all' ? 'सभी' : `L${post.audience_level}`}
          </span>
          {isOwn && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-gray-400 hover:text-error transition-colors min-w-dadi min-h-dadi flex items-center justify-center"
              aria-label="पोस्ट हटाएं — Delete post"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="font-body text-dadi text-brown leading-relaxed whitespace-pre-wrap">
          {shouldTruncate ? `${content.slice(0, 300)}...` : content}
        </p>
        {content.length > 300 && (
          <button
            className="font-body text-base text-haldi-gold mt-1 py-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'कम दिखाएं' : 'और पढ़ें'}
          </button>
        )}
      </div>

      {/* Images */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className={`grid gap-1 mb-3 rounded-xl overflow-hidden ${post.media_urls.length === 1 ? '' : post.media_urls.length === 2 ? 'grid-cols-2' : post.media_urls.length === 3 ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {post.media_urls.slice(0, 4).map((url, i) => (
            <div
              key={i}
              className={`relative bg-cream-dark ${post.media_urls.length === 1 ? 'h-64' : 'h-40'} ${post.media_urls.length === 3 && i === 0 ? 'row-span-2 h-auto' : ''}`}
            >
              <Image src={url} alt={`Post image ${i + 1}`} fill className="object-cover" />
              {i === 3 && post.media_urls.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">+{post.media_urls.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 pt-2 border-t border-cream-dark">
        <button
          onClick={() => likePost(post.id)}
          className={`flex items-center gap-1.5 min-h-dadi px-3 font-body text-base rounded-lg ${post.is_liked ? 'text-red-500' : 'text-brown-light'} hover:text-red-500 hover:bg-red-50 transition-colors`}
        >
          <span>{post.is_liked ? '❤️' : '🤍'}</span>
          <span>{post.like_count}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 min-h-dadi px-3 font-body text-base text-brown-light hover:text-haldi-gold hover:bg-cream-dark rounded-lg transition-colors"
        >
          <span>💬</span>
          <span>{post.comment_count}</span>
        </button>
        <ShareButton
          title="Aangan आँगन"
          text={content.length > 100 ? `${content.slice(0, 100)}...` : content}
          className="min-h-dadi px-3 text-base"
        />
      </div>

      {/* Comments */}
      {showComments && <CommentSection postId={post.id} />}
    </article>
  );
}
