'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePostStore } from '@/stores/postStore';
import { useFamilyStore } from '@/stores/familyStore';
import PostCard from '@/components/feed/PostCard';
import GoldButton from '@/components/ui/GoldButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';

// Panchang widget carries ~10KB of Vedic-calendar math (panchangService).
// Split it off so the initial /feed paint on 3G doesn't block on it.
const PanchangWidget = dynamic(() => import('@/components/feed/PanchangWidget'), { ssr: false });
const PostComposer = dynamic(() => import('@/components/feed/PostComposer'), { ssr: false });

export default function FeedPage() {
  const { posts, fetchPosts, isLoading, isFetching, hasMore, error } = usePostStore();
  const { members, fetchMembers } = useFamilyStore();
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    fetchPosts(true);
    fetchMembers();
  }, [fetchPosts, fetchMembers]);

  const handleScroll = useCallback(() => {
    const near = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 400;
    if (near && hasMore && !isFetching) fetchPosts();
  }, [fetchPosts, hasMore, isFetching]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl text-brown">परिवार का आँगन</h2>
          <p className="font-body text-base text-brown-light">Family Feed</p>
        </div>
        <GoldButton size="sm" onClick={() => setComposerOpen(true)}>
          + पोस्ट करें
        </GoldButton>
      </div>

      {/* Panchang Widget */}
      <PanchangWidget />

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 font-body text-base">
          <p className="font-semibold">कुछ गड़बड़ हुई — Something went wrong</p>
          <p className="text-base mt-1">{error}</p>
        </div>
      )}

      {isLoading && posts.length === 0 ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : posts.length === 0 ? (
        members.length === 0 ? (
          // Brand-new user — no family yet. Guide them there first.
          <EmptyState
            emoji="👨‍👩‍👧‍👦"
            title="पहले परिवार जोड़ें"
            subtitle="Add your family first so they can see your posts"
            action={
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <Link href="/family">
                  <GoldButton size="sm">परिवार जोड़ें — Add Family</GoldButton>
                </Link>
                <button
                  onClick={() => setComposerOpen(true)}
                  className="font-body text-base text-brown-light underline min-h-dadi px-3"
                >
                  या अभी पोस्ट करें — Or post now
                </button>
              </div>
            }
          />
        ) : (
          <EmptyState
            emoji="📝"
            title="अभी कोई पोस्ट नहीं"
            subtitle="No posts yet — be the first!"
            action={
              <GoldButton size="sm" onClick={() => setComposerOpen(true)}>
                पहली पोस्ट करें — Make First Post
              </GoldButton>
            }
          />
        )
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {isFetching && <div className="flex justify-center py-4"><LoadingSpinner className="h-6 w-6" /></div>}
          {!hasMore && posts.length > 0 && (
            <p className="text-center font-body text-base text-brown-light py-6">सभी पोस्ट देख लिए — All posts loaded</p>
          )}
        </>
      )}

      {/* FAB for mobile */}
      <button
        onClick={() => setComposerOpen(true)}
        className="fixed bottom-24 right-6 lg:hidden w-14 h-14 bg-haldi-gold rounded-full shadow-lg flex items-center justify-center text-white text-2xl z-40"
        aria-label="नई पोस्ट लिखें — New Post"
      >
        ✏️
      </button>

      {composerOpen && <PostComposer onClose={() => setComposerOpen(false)} />}
    </div>
  );
}
