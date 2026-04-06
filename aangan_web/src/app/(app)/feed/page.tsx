'use client';
import { useEffect, useState, useCallback } from 'react';
import { usePostStore } from '@/stores/postStore';
import PostCard from '@/components/feed/PostCard';
import PostComposer from '@/components/feed/PostComposer';
import GoldButton from '@/components/ui/GoldButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import PanchangWidget from '@/components/feed/PanchangWidget';

export default function FeedPage() {
  const { posts, fetchPosts, isLoading, isFetching, hasMore } = usePostStore();
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => { fetchPosts(true); }, [fetchPosts]);

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
          <p className="font-body text-sm text-brown-light">Family Feed</p>
        </div>
        <GoldButton size="sm" onClick={() => setComposerOpen(true)}>
          + पोस्ट करें
        </GoldButton>
      </div>

      {/* Panchang Widget */}
      <PanchangWidget />

      {isLoading && posts.length === 0 ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : posts.length === 0 ? (
        <EmptyState
          emoji="📝"
          title="अभी कोई पोस्ट नहीं"
          subtitle="No posts yet — be the first!"
          action={
            <GoldButton size="sm" onClick={() => setComposerOpen(true)}>
              पहली पोस्ट करें
            </GoldButton>
          }
        />
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {isFetching && <div className="flex justify-center py-4"><LoadingSpinner className="h-6 w-6" /></div>}
          {!hasMore && posts.length > 0 && (
            <p className="text-center font-body text-sm text-brown-light py-6">सभी पोस्ट देख लिए — All posts loaded</p>
          )}
        </>
      )}

      {/* FAB for mobile */}
      <button
        onClick={() => setComposerOpen(true)}
        className="fixed bottom-24 right-6 lg:hidden w-14 h-14 bg-haldi-gold rounded-full shadow-lg flex items-center justify-center text-white text-2xl z-40"
      >
        ✏️
      </button>

      {composerOpen && <PostComposer onClose={() => setComposerOpen(false)} />}
    </div>
  );
}
