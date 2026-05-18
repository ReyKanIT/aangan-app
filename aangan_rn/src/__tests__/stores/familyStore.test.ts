/**
 * Store test for useFamilyStore — Tier T1 of the regression suite.
 *
 * Covers:
 *   • fetchMembers — happy path with Kumar's brother/sister/wife/daughter rows,
 *     error path, and unauthenticated path.
 *   • fetchOfflineMembers — RPC happy path + graceful degradation when the
 *     RPC returns an error or throws (this is the v0.15.8 "ancestors gone on
 *     iPhone" regression — must never throw).
 *   • addMember — calls the SECURITY DEFINER RPC `add_family_member_bidirectional`
 *     with the correct reverse-relationship mapping (the 2026-04-30 bug fix).
 *   • addOfflineMember — inserts into offline_family_members, scoped by
 *     auth.uid().
 *   • searchMembers — AAN-ID short-circuit RPC + name search RPC + empty
 *     result handling.
 */
import { supabase } from '../../config/supabase';
import { useFamilyStore } from '../../stores/familyStore';

// pushNotifications imports expo-device / expo-notifications which require
// native init in tests — stub the whole module.
jest.mock('../../services/pushNotifications', () => ({
  sendPushToUser: jest.fn(() => Promise.resolve()),
}));

// Helper: snapshot a fresh copy of the store's INITIAL state so each test
// starts clean. Zustand stores are singletons across tests.
const INITIAL_STATE = useFamilyStore.getState();

function resetStore() {
  useFamilyStore.setState({
    ...INITIAL_STATE,
    members: [],
    offlineMembers: [],
    isLoading: false,
    error: null,
  });
}

function mockSession(userId: string | null = 'kumar') {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: userId ? { user: { id: userId } } : null },
    error: null,
  });
}

// Build a chainable from() mock whose terminal value is the supplied
// {data, error}. Methods that PostgREST chains return the same builder; only
// `.limit()`/`.single()`/`.update()` etc. (the leaves) resolve as promises.
function makeFromMock(terminal: { data: any; error: any }) {
  const builder: any = {};
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.or = jest.fn(() => builder);
  builder.order = jest.fn(() => builder);
  builder.limit = jest.fn(() => Promise.resolve(terminal));
  builder.insert = jest.fn(() => Promise.resolve(terminal));
  builder.update = jest.fn(() => builder);
  builder.single = jest.fn(() => Promise.resolve(terminal));
  // The store does `.from('onboarding_progress').update().eq().then(...)` as
  // a fire-and-forget. Make .then resolve so it doesn't throw.
  builder.then = (resolve: any) => resolve(terminal);
  return builder;
}

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockSession('kumar');
});

// ─── fetchMembers ─────────────────────────────────────────────────────────

describe('fetchMembers', () => {
  it('loads Kumar\'s brother / sister / wife / daughter', async () => {
    const kumarFamily = [
      { id: '1', user_id: 'kumar', family_member_id: 'bro', relationship_type: 'brother', relationship_label_hindi: 'भाई', connection_level: 1, is_verified: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: '2', user_id: 'kumar', family_member_id: 'sis', relationship_type: 'sister', relationship_label_hindi: 'बहन', connection_level: 1, is_verified: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: '3', user_id: 'kumar', family_member_id: 'wife', relationship_type: 'wife', relationship_label_hindi: 'पत्नी', connection_level: 1, is_verified: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: '4', user_id: 'kumar', family_member_id: 'daughter', relationship_type: 'daughter', relationship_label_hindi: 'बेटी', connection_level: 1, is_verified: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
    ];
    (supabase.from as jest.Mock).mockReturnValue(makeFromMock({ data: kumarFamily, error: null }));

    await useFamilyStore.getState().fetchMembers();

    const state = useFamilyStore.getState();
    expect(state.members).toHaveLength(4);
    expect(state.members[0].relationship_type).toBe('brother');
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('family_members');
  });

  it('sets error state when supabase returns an error', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeFromMock({ data: null, error: { message: 'permission denied', code: '42501' } }),
    );

    await useFamilyStore.getState().fetchMembers();

    const state = useFamilyStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.isLoading).toBe(false);
    expect(state.members).toEqual([]);
  });

  it('bails out cleanly when there is no session (RLS guard)', async () => {
    mockSession(null);
    (supabase.from as jest.Mock).mockReturnValue(makeFromMock({ data: [], error: null }));

    await useFamilyStore.getState().fetchMembers();

    const state = useFamilyStore.getState();
    expect(state.error).toBe('Not authenticated');
    expect(state.isLoading).toBe(false);
  });

  it('filters by user_id = session.user.id (RLS-friendly scoping)', async () => {
    const fromMock = makeFromMock({ data: [], error: null });
    (supabase.from as jest.Mock).mockReturnValue(fromMock);

    await useFamilyStore.getState().fetchMembers();

    expect(fromMock.eq).toHaveBeenCalledWith('user_id', 'kumar');
  });
});

// ─── fetchOfflineMembers ──────────────────────────────────────────────────

describe('fetchOfflineMembers', () => {
  it('stores RPC result on success', async () => {
    const ancestors = [
      { id: 'p1', added_by: 'kumar', display_name: 'दादा जी', display_name_hindi: 'दादा जी', relationship_type: 'grandfather', relationship_label_hindi: 'दादा', connection_level: 2, is_deceased: true, village_city: null, avatar_url: null, birth_year: 1920, death_year: 1995 },
    ];
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: ancestors, error: null });

    await useFamilyStore.getState().fetchOfflineMembers();

    expect(supabase.rpc).toHaveBeenCalledWith('get_visible_offline_family_members');
    expect(useFamilyStore.getState().offlineMembers).toHaveLength(1);
    expect(useFamilyStore.getState().offlineMembers[0].display_name).toBe('दादा जी');
  });

  it('does NOT throw when the RPC returns an error (graceful degrade)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'function does not exist', code: '42883' },
    });

    await expect(useFamilyStore.getState().fetchOfflineMembers()).resolves.toBeUndefined();
    expect(useFamilyStore.getState().offlineMembers).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does NOT throw when the RPC itself throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (supabase.rpc as jest.Mock).mockRejectedValue(new Error('network down'));

    await expect(useFamilyStore.getState().fetchOfflineMembers()).resolves.toBeUndefined();
    expect(useFamilyStore.getState().offlineMembers).toEqual([]);
    warn.mockRestore();
  });
});

// ─── addMember ────────────────────────────────────────────────────────────

describe('addMember', () => {
  it('calls add_family_member_bidirectional RPC with reverse mapping', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });
    // fetchMembers + users.single() after the RPC
    (supabase.from as jest.Mock).mockReturnValue(
      makeFromMock({ data: { display_name: 'Kumar', display_name_hindi: 'कुमार' }, error: null }),
    );

    const ok = await useFamilyStore.getState().addMember('dad', 'father', 'पिता', 1);

    expect(ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith(
      'add_family_member_bidirectional',
      expect.objectContaining({
        p_member_id: 'dad',
        p_rel_type: 'father',
        p_level: 1,
        // Reverse of "father" is "son" per RELATIONSHIP_MAP — the v0.10 bug
        // was that this fell through to the same key, corrupting every pair.
        p_reverse_type: 'son',
      }),
    );
  });

  it('returns false and sets error on RPC failure', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'duplicate edge', code: '23505' },
    });

    const ok = await useFamilyStore.getState().addMember('bro', 'brother', 'भाई', 1);

    expect(ok).toBe(false);
    expect(useFamilyStore.getState().error).toBeTruthy();
  });

  it('returns false when unauthenticated', async () => {
    mockSession(null);
    const ok = await useFamilyStore.getState().addMember('bro', 'brother', 'भाई', 1);

    expect(ok).toBe(false);
    expect(useFamilyStore.getState().error).toBe('Not authenticated');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

// ─── addOfflineMember ─────────────────────────────────────────────────────

describe('addOfflineMember', () => {
  it('inserts into offline_family_members with displayName / relationship / level / isDeceased', async () => {
    const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const fromMock: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: insertMock,
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(fromMock);
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null });

    const ok = await useFamilyStore.getState().addOfflineMember({
      displayName: 'दादा जी',
      displayNameHindi: 'दादा जी',
      relationshipType: 'grandfather',
      relationshipLabelHindi: 'दादा',
      connectionLevel: 2,
      isDeceased: true,
    });

    expect(ok).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('offline_family_members');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        added_by: 'kumar',
        display_name: 'दादा जी',
        relationship_type: 'grandfather',
        connection_level: 2,
        is_deceased: true,
      }),
    );
  });

  it('returns false on insert error', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockResolvedValue({ data: null, error: { message: 'rls violation', code: '42501' } }),
    });

    const ok = await useFamilyStore.getState().addOfflineMember({
      displayName: 'X',
      relationshipType: 'other',
      connectionLevel: 1,
    });

    expect(ok).toBe(false);
    expect(useFamilyStore.getState().error).toBeTruthy();
  });

  it('returns false when unauthenticated (no insert call)', async () => {
    mockSession(null);
    const insertMock = jest.fn();
    (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

    const ok = await useFamilyStore.getState().addOfflineMember({
      displayName: 'X',
      relationshipType: 'other',
      connectionLevel: 1,
    });

    expect(ok).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  // The store does NOT currently reject empty displayName client-side — it
  // calls .trim() then forwards to insert, relying on DB NOT NULL/CHECK
  // constraints to reject. Documenting as a behavior gap, not a bug we want
  // to fix in this test file.
  it.skip('rejects empty displayName client-side', async () => {
    // Skipped: store has no client-side validation; trims and forwards to DB.
    // If validation is added later, remove .skip and assert ok === false +
    // error is set without supabase being touched.
  });
});

// ─── searchMembers ────────────────────────────────────────────────────────

describe('searchMembers', () => {
  it('short-circuits to lookup_user_by_aangan_id for AAN-XXXXXXXX inputs', async () => {
    const hit = [{ id: 'u1', display_name: 'Aarti', aangan_id: 'AAN-X7K2P9X3' }];
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: hit, error: null });

    const out = await useFamilyStore.getState().searchMembers('AAN-X7K2P9X3');

    expect(supabase.rpc).toHaveBeenCalledWith(
      'lookup_user_by_aangan_id',
      { p_aangan_id: 'AAN-X7K2P9X3' },
    );
    expect(out).toEqual(hit);
  });

  it('falls through to search_users_safe when the AAN-ID lookup misses', async () => {
    (supabase.rpc as jest.Mock)
      // First call — AAN-ID lookup misses
      .mockResolvedValueOnce({ data: [], error: null })
      // Second call — name search RPC
      .mockResolvedValueOnce({ data: [{ id: 'u2', display_name: 'Aanchal' }], error: null });

    const out = await useFamilyStore.getState().searchMembers('AAN-NONEXIST');

    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'search_users_safe', { p_query: 'AAN-NONEXIST' });
    expect(out).toHaveLength(1);
  });

  it('queries search_users_safe for plain name queries', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ id: 'u3', display_name: 'Sita', phone_number: '+919999999999' }],
      error: null,
    });

    const out = await useFamilyStore.getState().searchMembers('Sita');

    expect(supabase.rpc).toHaveBeenCalledWith('search_users_safe', { p_query: 'Sita' });
    expect(out).toHaveLength(1);
  });

  it('returns [] when the RPC has no matches', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null });

    const out = await useFamilyStore.getState().searchMembers('nobody-by-that-name');

    expect(out).toEqual([]);
  });

  it('returns [] and sets error on RPC failure', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'rate limit', code: '429' },
    });

    const out = await useFamilyStore.getState().searchMembers('Sita');

    expect(out).toEqual([]);
    expect(useFamilyStore.getState().error).toBeTruthy();
  });

  it('sanitizes PostgREST metacharacters out of the query', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null });

    await useFamilyStore.getState().searchMembers('Sita%_,()');

    // sanitizer strips %_.,()\\ — should land as 'Sita'
    expect(supabase.rpc).toHaveBeenCalledWith('search_users_safe', { p_query: 'Sita' });
  });
});
