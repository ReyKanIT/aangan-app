/**
 * Store test for usePostStore — Tier T1 of the regression suite.
 *
 * Covers the public actions exposed by `src/stores/postStore.ts`:
 *   - fetchPosts (paging, error, auth gate)
 *   - createPost (text-only, with media, upload failure, notifications)
 *   - likePost (optimistic + revert)
 *   - deletePost (RLS scoping)
 *   - refreshPosts (state reset + refetch)
 *
 * We override the default supabase mock per-test to drive specific call
 * shapes. The default mock in jest.setup.ts is intentionally inert so each
 * test must opt into a realistic response.
 */
import { supabase } from '../../config/supabase';

// Mock uploadFileToStorage so createPost media path doesn't try real IO.
jest.mock('../../utils/uploadFile', () => ({
  uploadFileToStorage: jest.fn(),
  contentTypeFromFilename: () => 'image/jpeg',
}));

// Mock push notification dispatcher — fire-and-forget side effect.
jest.mock('../../services/pushNotifications', () => ({
  sendPushToUser: jest.fn(),
}));

import { usePostStore } from '../../stores/postStore';
import { uploadFileToStorage } from '../../utils/uploadFile';
import { sendPushToUser } from '../../services/pushNotifications';

// Helper: stamp `from()` with a custom chainable. Returns the mock so the
// test can assert on .insert / .delete / .eq calls.
function stubFrom(tableHandlers: Record<string, any>) {
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (tableHandlers[table]) return tableHandlers[table];
    // Default permissive chainable so unrelated side-effect calls
    // (notifications, onboarding_progress, users self-lookup) don't blow up.
    return makeChain({ data: null, error: null });
  });
}

// Helper: build a chainable that resolves with a given payload at the
// terminus. Every method returns the same builder, and the builder itself
// is thenable so `await query` works.
function makeChain(terminalResult: { data: any; error: any }) {
  const builder: any = {};
  const methods = ['select', 'eq', 'order', 'limit', 'lt', 'gt', 'single', 'update', 'delete', 'insert', 'upsert'];
  for (const m of methods) {
    builder[m] = jest.fn().mockReturnValue(builder);
  }
  builder.then = (resolve: any) => Promise.resolve(terminalResult).then(resolve);
  return builder;
}

// Helper: reset the store to its initial shape between tests.
function resetStore() {
  usePostStore.setState({
    posts: [],
    isLoading: false,
    error: null,
    hasMore: true,
    cursor: null,
  });
}

// Authed session shorthand.
function authAs(userId: string = 'kumar') {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: { user: { id: userId } } },
    error: null,
  });
}

describe('usePostStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  // ────────────────────────────────────────────────────────────
  // fetchPosts
  // ────────────────────────────────────────────────────────────
  describe('fetchPosts', () => {
    it('returns empty array and toggles isLoading correctly', async () => {
      authAs();
      stubFrom({
        posts: makeChain({ data: [], error: null }),
      });

      const promise = usePostStore.getState().fetchPosts();
      // mid-flight: isLoading should be true
      expect(usePostStore.getState().isLoading).toBe(true);
      await promise;

      expect(usePostStore.getState().posts).toEqual([]);
      expect(usePostStore.getState().isLoading).toBe(false);
      expect(usePostStore.getState().error).toBeNull();
      expect(usePostStore.getState().hasMore).toBe(false); // 0 < PAGE_SIZE
    });

    it('sets error state and clears isLoading on supabase error', async () => {
      authAs();
      stubFrom({
        posts: makeChain({ data: null, error: { message: 'db down' } }),
      });

      await usePostStore.getState().fetchPosts();

      expect(usePostStore.getState().isLoading).toBe(false);
      expect(usePostStore.getState().error).toBeTruthy();
      expect(usePostStore.getState().posts).toEqual([]);
    });

    it('paginates via cursor — second call appends to existing posts', async () => {
      authAs();

      // First page: 20 rows so hasMore stays true.
      const firstPage = Array.from({ length: 20 }, (_, i) => ({
        id: `p${i}`,
        author_id: 'kumar',
        created_at: `2026-05-17T10:${String(i).padStart(2, '0')}:00Z`,
        like_count: 0,
        comment_count: 0,
        is_liked: false,
      }));
      stubFrom({ posts: makeChain({ data: firstPage, error: null }) });
      await usePostStore.getState().fetchPosts();
      expect(usePostStore.getState().posts.length).toBe(20);
      expect(usePostStore.getState().hasMore).toBe(true);
      expect(usePostStore.getState().cursor).toBe(firstPage[19].created_at);

      // Second page: 3 rows — should append, not replace.
      const secondPage = Array.from({ length: 3 }, (_, i) => ({
        id: `p2-${i}`,
        author_id: 'kumar',
        created_at: `2026-05-17T09:0${i}:00Z`,
        like_count: 0,
        comment_count: 0,
        is_liked: false,
      }));
      stubFrom({ posts: makeChain({ data: secondPage, error: null }) });
      await usePostStore.getState().fetchPosts();

      expect(usePostStore.getState().posts.length).toBe(23);
      expect(usePostStore.getState().hasMore).toBe(false);
    });

    it('bails when there is no session (auth gate)', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });
      stubFrom({});

      await usePostStore.getState().fetchPosts();

      expect(usePostStore.getState().error).toBe('Not authenticated');
      expect(usePostStore.getState().isLoading).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────
  // createPost
  // ────────────────────────────────────────────────────────────
  describe('createPost', () => {
    const baseInput = {
      content: 'Hello family',
      postType: 'text' as const,
      audienceType: 'all' as const,
      audienceLevel: null,
      audienceLevelMax: null,
      audienceGroupId: null,
    };

    it('rejects when no session', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });
      stubFrom({});

      const ok = await usePostStore.getState().createPost(baseInput);
      expect(ok).toBe(false);
      expect(usePostStore.getState().error).toBe('Not authenticated');
    });

    it('text-only post — inserts row with media_urls=[]', async () => {
      authAs();
      const postsChain = makeChain({
        data: { id: 'new-post', author_id: 'kumar', created_at: 'now' },
        error: null,
      });
      stubFrom({
        posts: postsChain,
        users: makeChain({ data: null, error: null }),
        family_members: makeChain({ data: [], error: null }),
      });

      const ok = await usePostStore.getState().createPost(baseInput);

      expect(ok).toBe(true);
      // First .insert call was on 'posts' table — inspect its payload.
      expect(postsChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          author_id: 'kumar',
          content: 'Hello family',
          media_urls: [],
          post_type: 'text',
        }),
      );
      // Upload was NOT called (no media).
      expect(uploadFileToStorage).not.toHaveBeenCalled();
    });

    it('text + photo — uploads file and sets media_urls to publicUrl', async () => {
      authAs();
      (uploadFileToStorage as jest.Mock).mockResolvedValue({
        ok: true,
        publicUrl: 'https://test.supabase.co/storage/v1/object/public/posts/kumar/abc.jpg',
        error: null,
      });

      const postsChain = makeChain({
        data: { id: 'new-post', author_id: 'kumar', created_at: 'now' },
        error: null,
      });
      stubFrom({
        posts: postsChain,
        users: makeChain({ data: null, error: null }),
        family_members: makeChain({ data: [], error: null }),
      });

      const ok = await usePostStore.getState().createPost({
        ...baseInput,
        postType: 'photo',
        mediaFiles: [{ uri: 'file:///tmp/photo.jpg', type: 'image/jpeg', name: 'photo.jpg' }],
      });

      expect(ok).toBe(true);
      expect(uploadFileToStorage).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: 'posts', contentType: 'image/jpeg' }),
      );
      expect(postsChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          media_urls: ['https://test.supabase.co/storage/v1/object/public/posts/kumar/abc.jpg'],
        }),
      );
    });

    it('bails out (returns false) when upload fails', async () => {
      authAs();
      (uploadFileToStorage as jest.Mock).mockResolvedValue({
        ok: false,
        publicUrl: null,
        error: 'network',
      });

      const postsChain = makeChain({ data: null, error: null });
      stubFrom({ posts: postsChain });

      const ok = await usePostStore.getState().createPost({
        ...baseInput,
        mediaFiles: [{ uri: 'file:///bad.jpg', type: 'image/jpeg', name: 'bad.jpg' }],
      });

      expect(ok).toBe(false);
      expect(usePostStore.getState().error).toMatch(/Upload failed/);
      // We bailed before reaching .insert.
      expect(postsChain.insert).not.toHaveBeenCalled();
    });

    it('sends notifications to L1 members on success', async () => {
      authAs();
      const postsChain = makeChain({
        data: { id: 'new-post', author_id: 'kumar', created_at: 'now' },
        error: null,
      });
      const usersChain = makeChain({
        data: { display_name: 'Kumar', display_name_hindi: 'कुमार' },
        error: null,
      });
      const familyChain = makeChain({
        data: [
          { family_member_id: 'mom' },
          { family_member_id: 'bro' },
        ],
        error: null,
      });
      const notifChain = makeChain({ data: null, error: null });

      stubFrom({
        posts: postsChain,
        users: usersChain,
        family_members: familyChain,
        notifications: notifChain,
      });

      const ok = await usePostStore.getState().createPost(baseInput);

      expect(ok).toBe(true);
      // Two L1 members → two push calls.
      expect(sendPushToUser).toHaveBeenCalledTimes(2);
      expect(sendPushToUser).toHaveBeenCalledWith(
        'mom',
        expect.any(String),
        expect.stringContaining('कुमार'),
        expect.objectContaining({ type: 'new_post' }),
      );
      // In-app notif row inserted as a batch.
      expect(notifChain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: 'mom', type: 'new_post' }),
          expect.objectContaining({ user_id: 'bro', type: 'new_post' }),
        ]),
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  // likePost
  // ────────────────────────────────────────────────────────────
  describe('likePost', () => {
    it('optimistically updates like_count and calls the RPC', async () => {
      authAs();
      usePostStore.setState({
        posts: [
          { id: 'p1', like_count: 5, is_liked: false } as any,
        ],
      });
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

      const ok = await usePostStore.getState().likePost('p1');

      expect(ok).toBe(true);
      expect(supabase.rpc).toHaveBeenCalled();
      const post = usePostStore.getState().posts.find((p) => p.id === 'p1')!;
      expect(post.like_count).toBe(6);
      expect(post.is_liked).toBe(true);
    });

    it('reverts the optimistic update on RPC error', async () => {
      authAs();
      usePostStore.setState({
        posts: [
          { id: 'p1', like_count: 5, is_liked: false } as any,
        ],
      });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'rpc failed' },
      });

      const ok = await usePostStore.getState().likePost('p1');

      expect(ok).toBe(false);
      const post = usePostStore.getState().posts.find((p) => p.id === 'p1')!;
      // Reverted back to 5 / unliked.
      expect(post.like_count).toBe(5);
      expect(post.is_liked).toBe(false);
      expect(usePostStore.getState().error).toBeTruthy();
    });
  });

  // ────────────────────────────────────────────────────────────
  // deletePost
  // ────────────────────────────────────────────────────────────
  describe('deletePost', () => {
    it('removes the post from local state on success', async () => {
      authAs();
      usePostStore.setState({
        posts: [
          { id: 'p1' } as any,
          { id: 'p2' } as any,
        ],
      });

      const postsChain = makeChain({ data: null, error: null });
      stubFrom({ posts: postsChain });

      const ok = await usePostStore.getState().deletePost('p1');

      expect(ok).toBe(true);
      expect(usePostStore.getState().posts.map((p) => p.id)).toEqual(['p2']);
    });

    it('scopes the delete by author_id (RLS belt-and-suspenders)', async () => {
      authAs('kumar');
      const postsChain = makeChain({ data: null, error: null });
      stubFrom({ posts: postsChain });

      await usePostStore.getState().deletePost('p1');

      // Two .eq() calls: id, author_id.
      const eqCalls = (postsChain.eq as jest.Mock).mock.calls;
      expect(eqCalls).toEqual(
        expect.arrayContaining([
          ['id', 'p1'],
          ['author_id', 'kumar'],
        ]),
      );
    });

    it('returns false and sets error on supabase failure', async () => {
      authAs();
      usePostStore.setState({ posts: [{ id: 'p1' } as any] });
      stubFrom({
        posts: makeChain({ data: null, error: { message: 'forbidden' } }),
      });

      const ok = await usePostStore.getState().deletePost('p1');
      expect(ok).toBe(false);
      // Post not removed from local state on error.
      expect(usePostStore.getState().posts.length).toBe(1);
    });
  });

  // ────────────────────────────────────────────────────────────
  // refreshPosts
  // ────────────────────────────────────────────────────────────
  describe('refreshPosts', () => {
    it('resets state and re-fetches', async () => {
      authAs();
      // Seed stale state.
      usePostStore.setState({
        posts: [{ id: 'old' } as any],
        cursor: 'some-cursor',
        hasMore: false,
      });
      stubFrom({
        posts: makeChain({
          data: [{ id: 'fresh', author_id: 'kumar', created_at: 'now', like_count: 0 }],
          error: null,
        }),
      });

      await usePostStore.getState().refreshPosts();

      const ids = usePostStore.getState().posts.map((p: any) => p.id);
      expect(ids).toEqual(['fresh']);
      // Cursor is the new (and only) post's created_at.
      expect(usePostStore.getState().cursor).toBe('now');
    });
  });
});
