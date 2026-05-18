/**
 * Store test for useEventStore — Tier T1 of the regression suite.
 *
 * Covers public actions on `src/stores/eventStore.ts`:
 *   - fetchEvents (happy + error + auth gate)
 *   - createEvent (insert + RSVP fan-out + notifications)
 *   - updateEvent (RLS scoping)
 *   - deleteEvent (local state mutation)
 *   - fetchEventById
 *
 * Note: the production store has NO `rsvpToEvent` action — RSVP is handled
 * in a different surface (event detail screen direct insert). Those test
 * cases are skipped below with reasons.
 */
import { supabase } from '../../config/supabase';
import { useEventStore } from '../../stores/eventStore';
import type { AanganEvent } from '../../types/database';

// Same chainable helper used in postStore.test.ts — duplicated locally so
// each test file is self-contained.
function makeChain(terminalResult: { data: any; error: any }) {
  const builder: any = {};
  const methods = ['select', 'eq', 'order', 'limit', 'lt', 'gt', 'single', 'update', 'delete', 'insert', 'upsert'];
  for (const m of methods) {
    builder[m] = jest.fn().mockReturnValue(builder);
  }
  builder.then = (resolve: any) => Promise.resolve(terminalResult).then(resolve);
  return builder;
}

function stubFrom(tableHandlers: Record<string, any>) {
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (tableHandlers[table]) return tableHandlers[table];
    return makeChain({ data: null, error: null });
  });
}

function resetStore() {
  useEventStore.setState({
    events: [],
    currentEvent: null,
    isLoading: false,
    error: null,
  });
}

function authAs(userId: string = 'kumar') {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: { user: { id: userId } } },
    error: null,
  });
}

// Realistic event shape — matches the AanganEvent interface.
const makeEvent = (overrides: Partial<AanganEvent> = {}): AanganEvent => ({
  id: 'e1',
  creator_id: 'kumar',
  title: 'Diwali Puja',
  title_hindi: 'दिवाली पूजा',
  event_type: 'puja',
  event_date: '2026-11-12T18:00:00Z',
  end_date: null,
  location: 'Aangan Farmhouse',
  location_hindi: null,
  address: null,
  latitude: null,
  longitude: null,
  audience_type: 'all',
  audience_level: null,
  audience_level_max: null,
  audience_group_id: null,
  rsvp_deadline: null,
  max_attendees: null,
  ceremonies: [],
  description: null,
  description_hindi: null,
  banner_url: null,
  bundle_id: null,
  created_at: '2026-05-17T10:00:00Z',
  updated_at: '2026-05-17T10:00:00Z',
  ...overrides,
});

// Minimal valid CreateEventInput for createEvent calls.
const baseCreateInput = {
  title: 'Diwali Puja',
  titleHindi: 'दिवाली पूजा',
  eventType: 'puja' as const,
  eventDate: '2026-11-12T18:00:00Z',
  endDate: null,
  location: 'Aangan Farmhouse',
  locationHindi: null,
  address: null,
  latitude: null,
  longitude: null,
  audienceType: 'all' as const,
  audienceLevel: null,
  audienceLevelMax: null,
  audienceGroupId: null,
  rsvpDeadline: null,
  maxAttendees: null,
  ceremonies: [],
  description: null,
  descriptionHindi: null,
  bannerUrl: null,
  audienceUserIds: [],
};

describe('useEventStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  // ────────────────────────────────────────────────────────────
  // fetchEvents
  // ────────────────────────────────────────────────────────────
  describe('fetchEvents', () => {
    it('happy path — populates events with a realistic AanganEvent shape', async () => {
      authAs();
      const ev = makeEvent();
      stubFrom({
        events: makeChain({ data: [ev], error: null }),
      });

      await useEventStore.getState().fetchEvents();

      expect(useEventStore.getState().events).toEqual([ev]);
      expect(useEventStore.getState().isLoading).toBe(false);
      expect(useEventStore.getState().error).toBeNull();
    });

    it('sets error state and clears isLoading on supabase error', async () => {
      authAs();
      stubFrom({
        events: makeChain({ data: null, error: { message: 'db down' } }),
      });

      await useEventStore.getState().fetchEvents();

      expect(useEventStore.getState().error).toBeTruthy();
      expect(useEventStore.getState().isLoading).toBe(false);
      expect(useEventStore.getState().events).toEqual([]);
    });

    it('bails when there is no session (auth gate)', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });
      stubFrom({});

      await useEventStore.getState().fetchEvents();

      expect(useEventStore.getState().error).toBe('Not authenticated');
      expect(useEventStore.getState().isLoading).toBe(false);
    });

    it('treats null data as empty array', async () => {
      authAs();
      stubFrom({
        events: makeChain({ data: null, error: null }),
      });

      await useEventStore.getState().fetchEvents();

      expect(useEventStore.getState().events).toEqual([]);
    });
  });

  // ────────────────────────────────────────────────────────────
  // createEvent
  // ────────────────────────────────────────────────────────────
  describe('createEvent', () => {
    it('inserts a row with the required fields', async () => {
      authAs();
      const eventsChain = makeChain({
        data: { id: 'new-event', creator_id: 'kumar' },
        error: null,
      });
      stubFrom({ events: eventsChain });

      const ok = await useEventStore.getState().createEvent(baseCreateInput);

      expect(ok).toBe(true);
      expect(eventsChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          creator_id: 'kumar',
          title: 'Diwali Puja',
          title_hindi: 'दिवाली पूजा',
          event_type: 'puja',
          event_date: '2026-11-12T18:00:00Z',
          location: 'Aangan Farmhouse',
          audience_type: 'all',
        }),
      );
    });

    it('rejects when no session', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });
      stubFrom({});

      const ok = await useEventStore.getState().createEvent(baseCreateInput);

      expect(ok).toBe(false);
      expect(useEventStore.getState().error).toBe('Not authenticated');
    });

    it('returns false and sets error if the insert fails', async () => {
      authAs();
      const eventsChain = makeChain({
        data: null,
        error: { message: 'insert failed' },
      });
      stubFrom({ events: eventsChain });

      const ok = await useEventStore.getState().createEvent(baseCreateInput);

      expect(ok).toBe(false);
      expect(useEventStore.getState().error).toBeTruthy();
    });

    it('inserts RSVP rows for each audience user on success', async () => {
      authAs();
      const eventsChain = makeChain({
        data: { id: 'new-event', creator_id: 'kumar' },
        error: null,
      });
      const rsvpChain = makeChain({ data: null, error: null });
      const notifChain = makeChain({ data: null, error: null });
      stubFrom({
        events: eventsChain,
        event_rsvps: rsvpChain,
        notifications: notifChain,
      });

      const ok = await useEventStore.getState().createEvent({
        ...baseCreateInput,
        audienceUserIds: ['uncle', 'aunt', 'cousin'],
      });

      expect(ok).toBe(true);
      expect(rsvpChain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: 'uncle', event_id: 'new-event', status: 'pending' }),
          expect.objectContaining({ user_id: 'aunt', event_id: 'new-event', status: 'pending' }),
          expect.objectContaining({ user_id: 'cousin', event_id: 'new-event', status: 'pending' }),
        ]),
      );
      expect(notifChain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: 'uncle', type: 'event_invite' }),
        ]),
      );
    });

    // The store currently lets the DB reject empty titles (NOT NULL). There
    // is no client-side guard. Skipping until that guard is added.
    it.skip('rejects empty title (no client-side validation in store yet)', async () => {
      authAs();
      const ok = await useEventStore.getState().createEvent({ ...baseCreateInput, title: '' });
      expect(ok).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────
  // updateEvent
  // ────────────────────────────────────────────────────────────
  describe('updateEvent', () => {
    it('scopes the update by creator_id (RLS belt-and-suspenders)', async () => {
      authAs('kumar');
      const eventsChain = makeChain({ data: null, error: null });
      stubFrom({ events: eventsChain });

      await useEventStore.getState().updateEvent('e1', { title: 'New Title' });

      const eqCalls = (eventsChain.eq as jest.Mock).mock.calls;
      expect(eqCalls).toEqual(
        expect.arrayContaining([
          ['id', 'e1'],
          ['creator_id', 'kumar'],
        ]),
      );
    });

    it('merges the updates into local state on success', async () => {
      authAs();
      useEventStore.setState({
        events: [makeEvent({ id: 'e1', title: 'Old' })],
      });
      stubFrom({ events: makeChain({ data: null, error: null }) });

      const ok = await useEventStore.getState().updateEvent('e1', { title: 'New' });

      expect(ok).toBe(true);
      expect(useEventStore.getState().events[0].title).toBe('New');
    });

    it('returns false and does not mutate state on error', async () => {
      authAs();
      useEventStore.setState({
        events: [makeEvent({ id: 'e1', title: 'Old' })],
      });
      stubFrom({
        events: makeChain({ data: null, error: { message: 'forbidden' } }),
      });

      const ok = await useEventStore.getState().updateEvent('e1', { title: 'New' });

      expect(ok).toBe(false);
      expect(useEventStore.getState().events[0].title).toBe('Old');
      expect(useEventStore.getState().error).toBeTruthy();
    });
  });

  // ────────────────────────────────────────────────────────────
  // deleteEvent
  // ────────────────────────────────────────────────────────────
  describe('deleteEvent', () => {
    it('removes the event from local state on success', async () => {
      authAs();
      useEventStore.setState({
        events: [
          makeEvent({ id: 'e1' }),
          makeEvent({ id: 'e2' }),
        ],
      });
      stubFrom({ events: makeChain({ data: null, error: null }) });

      const ok = await useEventStore.getState().deleteEvent('e1');

      expect(ok).toBe(true);
      expect(useEventStore.getState().events.map((e) => e.id)).toEqual(['e2']);
    });

    it('scopes the delete by creator_id', async () => {
      authAs('kumar');
      const eventsChain = makeChain({ data: null, error: null });
      stubFrom({ events: eventsChain });

      await useEventStore.getState().deleteEvent('e1');

      const eqCalls = (eventsChain.eq as jest.Mock).mock.calls;
      expect(eqCalls).toEqual(
        expect.arrayContaining([
          ['id', 'e1'],
          ['creator_id', 'kumar'],
        ]),
      );
    });

    it('clears currentEvent if it was the deleted one', async () => {
      authAs();
      const ev = makeEvent({ id: 'e1' });
      useEventStore.setState({
        events: [ev],
        currentEvent: ev,
      });
      stubFrom({ events: makeChain({ data: null, error: null }) });

      await useEventStore.getState().deleteEvent('e1');

      expect(useEventStore.getState().currentEvent).toBeNull();
    });

    it('returns false and keeps state on error', async () => {
      authAs();
      useEventStore.setState({
        events: [makeEvent({ id: 'e1' })],
      });
      stubFrom({
        events: makeChain({ data: null, error: { message: 'forbidden' } }),
      });

      const ok = await useEventStore.getState().deleteEvent('e1');

      expect(ok).toBe(false);
      expect(useEventStore.getState().events.length).toBe(1);
    });
  });

  // ────────────────────────────────────────────────────────────
  // fetchEventById
  // ────────────────────────────────────────────────────────────
  describe('fetchEventById', () => {
    it('sets currentEvent on success', async () => {
      const ev = makeEvent({ id: 'e1' });
      stubFrom({ events: makeChain({ data: ev, error: null }) });

      await useEventStore.getState().fetchEventById('e1');

      expect(useEventStore.getState().currentEvent).toEqual(ev);
      expect(useEventStore.getState().isLoading).toBe(false);
    });

    it('sets error state on failure', async () => {
      stubFrom({
        events: makeChain({ data: null, error: { message: 'not found' } }),
      });

      await useEventStore.getState().fetchEventById('e1');

      expect(useEventStore.getState().error).toBeTruthy();
      expect(useEventStore.getState().isLoading).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────
  // rsvpToEvent (NOT in this store — see note at top of file)
  // ────────────────────────────────────────────────────────────
  describe('rsvpToEvent', () => {
    it.skip('upserts user RSVP row — not implemented in eventStore (lives on event detail screen)', () => {
      // Skipped: useEventStore exposes no rsvpToEvent action. RSVP from
      // attendee side is done inline in EventDetailScreen via a direct
      // supabase.from('event_rsvps').upsert call. Add a store action and
      // un-skip this test.
    });
    it.skip('reverts optimistic update on RSVP error — see above', () => {
      // Skipped for the same reason.
    });
  });
});
