/**
 * Store test for useMessageStore — Tier T1 of the regression suite.
 *
 * Covers:
 *   • fetchConversations — happy path (groups by partner, computes unread,
 *     sorts by last-message-at DESC) + error path + unauthenticated bail.
 *   • fetchMessages — loads messages for a specific thread ordered by
 *     created_at ASC.
 *   • sendMessage — optimistic-add to local thread, replace with confirmed
 *     row on success, rollback on insert error.
 *   • markRead — flips is_read flag locally and clears the conversation's
 *     unreadCount.
 */
import { supabase } from '../../config/supabase';
import { useMessageStore } from '../../stores/messageStore';

// pushNotifications is invoked from sendMessage — stub it to avoid expo init.
jest.mock('../../services/pushNotifications', () => ({
  sendPushToUser: jest.fn(() => Promise.resolve()),
}));

const INITIAL_STATE = useMessageStore.getState();

function resetStore() {
  useMessageStore.setState({
    ...INITIAL_STATE,
    messages: {},
    conversations: [],
    totalUnread: 0,
    loadingConversations: false,
    error: null,
  });
}

function mockSession(userId: string | null = 'kumar') {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: userId ? { user: { id: userId } } : null },
    error: null,
  });
}

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockSession('kumar');
});

// ─── fetchConversations ───────────────────────────────────────────────────

describe('fetchConversations', () => {
  it('groups messages by partner, computes unread, sorts DESC', async () => {
    // Two partners (bro, sis), both with one inbound unread + one outbound.
    // Ordered DESC by created_at as the DB query does.
    const rows = [
      // Most recent: sister sent to kumar — UNREAD
      {
        id: 'm4', sender_id: 'sis', receiver_id: 'kumar', content: 'नमस्ते',
        message_type: 'text', audio_url: null, audio_duration_seconds: null,
        is_read: false, created_at: '2026-05-17T10:04:00Z',
        sender: { id: 'sis', display_name: 'Sister', display_name_hindi: 'बहन', profile_photo_url: null },
        receiver: { id: 'kumar', display_name: 'Kumar', display_name_hindi: 'कुमार', profile_photo_url: null },
      },
      // kumar replied to brother earlier
      {
        id: 'm3', sender_id: 'kumar', receiver_id: 'bro', content: 'ठीक है',
        message_type: 'text', audio_url: null, audio_duration_seconds: null,
        is_read: true, created_at: '2026-05-17T10:03:00Z',
        sender: { id: 'kumar', display_name: 'Kumar', display_name_hindi: 'कुमार', profile_photo_url: null },
        receiver: { id: 'bro', display_name: 'Brother', display_name_hindi: 'भाई', profile_photo_url: null },
      },
      // Brother sent to kumar — UNREAD
      {
        id: 'm2', sender_id: 'bro', receiver_id: 'kumar', content: 'खाना खाया?',
        message_type: 'text', audio_url: null, audio_duration_seconds: null,
        is_read: false, created_at: '2026-05-17T10:02:00Z',
        sender: { id: 'bro', display_name: 'Brother', display_name_hindi: 'भाई', profile_photo_url: null },
        receiver: { id: 'kumar', display_name: 'Kumar', display_name_hindi: 'कुमार', profile_photo_url: null },
      },
      // kumar's earlier outbound — READ
      {
        id: 'm1', sender_id: 'kumar', receiver_id: 'bro', content: 'हाँ',
        message_type: 'text', audio_url: null, audio_duration_seconds: null,
        is_read: true, created_at: '2026-05-17T10:00:00Z',
        sender: { id: 'kumar', display_name: 'Kumar', display_name_hindi: 'कुमार', profile_photo_url: null },
        receiver: { id: 'bro', display_name: 'Brother', display_name_hindi: 'भाई', profile_photo_url: null },
      },
    ];

    const fromMock: any = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: rows, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(fromMock);

    await useMessageStore.getState().fetchConversations();

    const state = useMessageStore.getState();
    expect(state.conversations).toHaveLength(2);
    // Sister's last message is most recent → first.
    expect(state.conversations[0].userId).toBe('sis');
    expect(state.conversations[0].lastMessage).toBe('नमस्ते');
    expect(state.conversations[0].unreadCount).toBe(1);
    // Brother thread: kumar's reply is most recent (not the bro→kumar msg).
    expect(state.conversations[1].userId).toBe('bro');
    expect(state.conversations[1].unreadCount).toBe(1);
    // Total unread is sum.
    expect(state.totalUnread).toBe(2);
    expect(state.loadingConversations).toBe(false);
    expect(state.error).toBeNull();
  });

  it('handles supabase error', async () => {
    const fromMock: any = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'rls denied', code: '42501' } }),
    };
    (supabase.from as jest.Mock).mockReturnValue(fromMock);

    await useMessageStore.getState().fetchConversations();

    const state = useMessageStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.loadingConversations).toBe(false);
    expect(state.conversations).toEqual([]);
  });

  it('bails out cleanly with no session', async () => {
    mockSession(null);
    const fromMock: any = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(fromMock);

    await useMessageStore.getState().fetchConversations();

    expect(useMessageStore.getState().loadingConversations).toBe(false);
    expect(useMessageStore.getState().conversations).toEqual([]);
  });

  it('returns empty conversations when DB returns []', async () => {
    const fromMock: any = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(fromMock);

    await useMessageStore.getState().fetchConversations();

    expect(useMessageStore.getState().conversations).toEqual([]);
    expect(useMessageStore.getState().totalUnread).toBe(0);
  });
});

// ─── fetchMessages ────────────────────────────────────────────────────────

describe('fetchMessages', () => {
  it('loads thread messages and stores them under partner id', async () => {
    const thread = [
      { id: 'm1', sender_id: 'kumar', receiver_id: 'bro', content: 'hi', is_read: true, read_at: null, created_at: '2026-05-17T10:00:00Z' },
      { id: 'm2', sender_id: 'bro', receiver_id: 'kumar', content: 'hi back', is_read: false, read_at: null, created_at: '2026-05-17T10:01:00Z' },
    ];
    const fromMock: any = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: thread, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(fromMock);

    await useMessageStore.getState().fetchMessages('bro');

    const state = useMessageStore.getState();
    expect(state.messages.bro).toHaveLength(2);
    expect(state.messages.bro[0].id).toBe('m1');
    // Verify the .order() was called with created_at ascending.
    expect(fromMock.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('sets error when supabase fails', async () => {
    const fromMock: any = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'oops', code: '500' } }),
    };
    (supabase.from as jest.Mock).mockReturnValue(fromMock);

    await useMessageStore.getState().fetchMessages('bro');

    expect(useMessageStore.getState().error).toBeTruthy();
    expect(useMessageStore.getState().messages.bro).toBeUndefined();
  });

  it('no-ops cleanly when session is missing', async () => {
    mockSession(null);
    const fromMock: any = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn(),
    };
    (supabase.from as jest.Mock).mockReturnValue(fromMock);

    await useMessageStore.getState().fetchMessages('bro');

    expect(fromMock.limit).not.toHaveBeenCalled();
  });
});

// ─── sendMessage ──────────────────────────────────────────────────────────

describe('sendMessage', () => {
  function makeInsertChain(terminal: { data: any; error: any }) {
    const chain: any = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(terminal),
    };
    return chain;
  }

  it('optimistically adds, then replaces with confirmed row on success', async () => {
    const confirmed = {
      id: 'real-1',
      sender_id: 'kumar',
      receiver_id: 'bro',
      content: 'hello',
      is_read: false,
      read_at: null,
      created_at: '2026-05-17T10:05:00Z',
      sender: { id: 'kumar', display_name: 'Kumar', display_name_hindi: 'कुमार', profile_photo_url: null },
    };
    (supabase.from as jest.Mock).mockReturnValue(
      makeInsertChain({ data: confirmed, error: null }),
    );

    const ok = await useMessageStore.getState().sendMessage('bro', 'hello');

    expect(ok).toBe(true);
    const msgs = useMessageStore.getState().messages.bro;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].id).toBe('real-1');
    // Optimistic id (with "optimistic-" prefix) should be gone.
    expect(msgs.some((m) => String(m.id).startsWith('optimistic-'))).toBe(false);
  });

  it('rolls back optimistic message on insert error', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeInsertChain({ data: null, error: { message: 'rls block', code: '42501' } }),
    );

    const ok = await useMessageStore.getState().sendMessage('bro', 'fail-me');

    expect(ok).toBe(false);
    // No messages left for the thread (optimistic rolled back).
    expect(useMessageStore.getState().messages.bro ?? []).toHaveLength(0);
    expect(useMessageStore.getState().error).toBeTruthy();
  });

  it('returns false with no session', async () => {
    mockSession(null);
    const insertMock = jest.fn();
    (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

    const ok = await useMessageStore.getState().sendMessage('bro', 'hi');

    expect(ok).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('trims whitespace from the outgoing content', async () => {
    const insertSpy = jest.fn().mockReturnThis();
    const chain: any = {
      insert: insertSpy,
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'r', sender_id: 'kumar', receiver_id: 'bro', content: 'hi',
          is_read: false, read_at: null, created_at: '2026-05-17T10:05:00Z',
        },
        error: null,
      }),
    };
    (supabase.from as jest.Mock).mockReturnValue(chain);

    await useMessageStore.getState().sendMessage('bro', '  hi  ');

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'hi', sender_id: 'kumar', receiver_id: 'bro' }),
    );
  });
});

// ─── markRead ─────────────────────────────────────────────────────────────

describe('markRead', () => {
  it('flips is_read locally and clears unreadCount for the partner', async () => {
    // Pre-seed state: one unread inbound from "bro" + a conversation entry.
    useMessageStore.setState({
      messages: {
        bro: [
          { id: 'm1', sender_id: 'bro', receiver_id: 'kumar', content: 'hi', is_read: false, read_at: null, created_at: '2026-05-17T10:00:00Z' },
        ],
      },
      conversations: [
        { userId: 'bro', displayName: 'Brother', displayNameHindi: 'भाई', profilePhotoUrl: null, lastMessage: 'hi', lastMessageAt: '2026-05-17T10:00:00Z', unreadCount: 1 },
      ],
      totalUnread: 1,
    });

    // Chain for the UPDATE: .from().update().eq().eq().eq() — store awaits
    // the whole chain. Build a thenable that resolves at any depth.
    const chain: any = {};
    chain.update = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.then = (resolve: any) => resolve({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue(chain);

    await useMessageStore.getState().markRead('bro');

    const state = useMessageStore.getState();
    expect(state.messages.bro[0].is_read).toBe(true);
    expect(state.messages.bro[0].read_at).not.toBeNull();
    expect(state.conversations[0].unreadCount).toBe(0);
    expect(state.totalUnread).toBe(0);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_read: true }),
    );
  });

  it('silently no-ops on supabase failure (markRead is non-critical)', async () => {
    useMessageStore.setState({
      messages: { bro: [] },
      conversations: [],
      totalUnread: 0,
    });

    const chain: any = {};
    chain.update = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.then = (_resolve: any, reject: any) => reject(new Error('boom'));
    (supabase.from as jest.Mock).mockReturnValue(chain);

    // Must not throw out of markRead.
    await expect(useMessageStore.getState().markRead('bro')).resolves.toBeUndefined();
  });

  it('does nothing when no session', async () => {
    mockSession(null);
    const updateMock = jest.fn();
    (supabase.from as jest.Mock).mockReturnValue({ update: updateMock });

    await useMessageStore.getState().markRead('bro');

    expect(updateMock).not.toHaveBeenCalled();
  });
});
