'use client';
// Temporary smoke-test for wisdom-note PostCard rendering. Mounts a
// regular PostCard and a wisdom-flagged PostCard side by side so the
// gold border + ज्ञान badge can be visually verified without an
// auth/family setup. Underscore-deferred path; will be removed in a
// follow-up commit after the v0.14.0 prod verification.
import PostCard from '@/components/feed/PostCard';
import type { Post } from '@/types/database';

const baseAuthor = {
  id: 'mock-1',
  display_name: 'Dadi Ji',
  display_name_hindi: 'दादी जी',
  avatar_url: null,
  profile_photo_url: null,
  family_level: 1,
} as unknown as Post['author'];

const regular: Post = {
  id: 'mock-regular',
  author_id: 'mock-1',
  content: 'आज मंदिर गई, बहुत अच्छा लगा। शाम को सब घर आ रहे हैं।',
  content_hindi: null,
  post_type: 'text',
  audience_type: 'all',
  audience_level: null,
  media_urls: [],
  like_count: 3,
  comment_count: 1,
  is_pinned: false,
  created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  updated_at: new Date().toISOString(),
  author: baseAuthor,
  is_liked: false,
};

const wisdom: Post = {
  ...regular,
  id: 'mock-wisdom',
  post_type: 'wisdom',
  is_pinned: true,
  content: 'जीवन में संतुष्टि सबसे बड़ा धन है। जो मिले उसी में खुश रहो।',
};

export default function WisdomTestPage() {
  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-md mx-auto">
        <h1 className="font-heading text-2xl text-haldi-gold mb-4">Wisdom Card Smoke Test</h1>
        <PostCard post={wisdom} />
        <PostCard post={regular} />
      </div>
    </div>
  );
}
