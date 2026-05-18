/**
 * T1 component test for InviteThreeFamilyScreen — the forced "Invite 3 family
 * members" gate that fires after first-time ProfileSetup (v0.16.1).
 *
 * This is the highest-leverage growth surface in the app — per the CEO and
 * CMO scorecards it's projected to lift k-factor from 0.25 → 0.55+. The
 * regression cost of silently breaking it is enormous (entire onboarding
 * funnel goes dark for a viral bet). These tests are the lockdown.
 *
 * Cases:
 *   1. All 3 pre-filled relationship slots render with the correct Hindi
 *      labels (पिताजी / माँ / भाई-बहन).
 *   2. Tapping a slot's WhatsApp button calls Linking.openURL with a
 *      whatsapp:// deep link.
 *   3. Skip ("बाद में") fires the `forced_invite_skipped` funnel event AND
 *      navigates via `replace('Main')`.
 *   4. Continue fires `forced_invite_continued` and navigates via
 *      `replace('Main')` regardless of whether any invite was sent (per
 *      pilot data: hard-disabling Continue dropped completion 11%).
 *   5. Phone-fill records `forced_invite_phone_filled` on the first digit.
 */
import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock the async-storage import the screen makes (the screen writes a
// `forced_invite_skipped_at` retargeting flag — the test doesn't care about
// the actual storage, only that the navigation + event fire).
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// Mock the auth store hook — minimal user shape for the inviter-name lookup.
jest.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({
      user: {
        id: 'test-user-id',
        display_name: 'Kumar',
        display_name_hindi: 'कुमार',
      },
    }),
}));

// Mock funnelEvents so we can assert on the call sequence.
jest.mock('../../utils/funnelEvents', () => ({
  trackFunnelEvent: jest.fn(),
}));

import InviteThreeFamilyScreen from '../../screens/auth/InviteThreeFamilyScreen';
import { trackFunnelEvent } from '../../utils/funnelEvents';

const mockedTrack = trackFunnelEvent as jest.MockedFunction<typeof trackFunnelEvent>;

function makeNavigation() {
  return {
    replace: jest.fn(),
    navigate: jest.fn(),
    goBack: jest.fn(),
  } as any;
}

describe('<InviteThreeFamilyScreen>', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any);
    mockedTrack.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders all 3 relationship slots with correct Hindi labels', () => {
    const navigation = makeNavigation();
    const { getByText } = render(
      <InviteThreeFamilyScreen navigation={navigation} route={{ key: 'k', name: 'InviteThreeFamily' } as any} />,
    );

    // Pre-filled slot labels per CMO Loop 2 spec.
    expect(getByText('पिताजी')).toBeTruthy();
    expect(getByText('माँ')).toBeTruthy();
    expect(getByText('भाई-बहन')).toBeTruthy();

    // English subtitles (Hindi-first, English-second).
    expect(getByText('Father')).toBeTruthy();
    expect(getByText('Mother')).toBeTruthy();
    expect(getByText('Brother / Sister')).toBeTruthy();
  });

  it('fires forced_invite_shown on mount', () => {
    const navigation = makeNavigation();
    render(
      <InviteThreeFamilyScreen navigation={navigation} route={{ key: 'k', name: 'InviteThreeFamily' } as any} />,
    );
    expect(mockedTrack).toHaveBeenCalledWith('forced_invite_shown');
  });

  it('tapping the WhatsApp send button calls Linking.openURL with a whatsapp:// URL', async () => {
    const navigation = makeNavigation();
    const { getByLabelText } = render(
      <InviteThreeFamilyScreen navigation={navigation} route={{ key: 'k', name: 'InviteThreeFamily' } as any} />,
    );

    fireEvent.press(getByLabelText('Send WhatsApp invite to Father'));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledTimes(1);
    });
    const url = (Linking.openURL as jest.Mock).mock.calls[0][0];
    expect(url).toMatch(/^whatsapp:\/\/send\?/);
    expect(url).toContain('text=');
  });

  it('records forced_invite_phone_filled on the first digit per slot', () => {
    const navigation = makeNavigation();
    const { getByLabelText } = render(
      <InviteThreeFamilyScreen navigation={navigation} route={{ key: 'k', name: 'InviteThreeFamily' } as any} />,
    );

    fireEvent.changeText(getByLabelText('Mother phone number'), '9');
    expect(mockedTrack).toHaveBeenCalledWith(
      'forced_invite_phone_filled',
      expect.objectContaining({ slot: 'mother' }),
    );
  });

  it('marks the slot as sent and emits forced_invite_whatsapp_sent', async () => {
    const navigation = makeNavigation();
    const { getByLabelText, queryByText } = render(
      <InviteThreeFamilyScreen navigation={navigation} route={{ key: 'k', name: 'InviteThreeFamily' } as any} />,
    );

    fireEvent.changeText(getByLabelText('Mother phone number'), '9876543210');
    fireEvent.press(getByLabelText('Send WhatsApp invite to Mother'));

    await waitFor(() => {
      expect(mockedTrack).toHaveBeenCalledWith(
        'forced_invite_whatsapp_sent',
        expect.objectContaining({ slot: 'mother', had_phone: true }),
      );
    });

    // "✓ भेजा" badge appears after a successful send.
    await waitFor(() => {
      expect(queryByText('✓ भेजा')).toBeTruthy();
    });
  });

  it('Skip tap fires forced_invite_skipped AND navigates to Main via replace', async () => {
    const navigation = makeNavigation();
    const { getByLabelText } = render(
      <InviteThreeFamilyScreen navigation={navigation} route={{ key: 'k', name: 'InviteThreeFamily' } as any} />,
    );

    fireEvent.press(getByLabelText('Skip and invite later'));

    await waitFor(() => {
      expect(mockedTrack).toHaveBeenCalledWith(
        'forced_invite_skipped',
        expect.objectContaining({ sent_count: 0 }),
      );
    });
    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith('Main');
    });
  });

  it('Continue tap fires forced_invite_continued AND navigates to Main even with no sends', () => {
    const navigation = makeNavigation();
    const { getByLabelText } = render(
      <InviteThreeFamilyScreen navigation={navigation} route={{ key: 'k', name: 'InviteThreeFamily' } as any} />,
    );

    fireEvent.press(getByLabelText('Continue to home'));

    expect(mockedTrack).toHaveBeenCalledWith(
      'forced_invite_continued',
      expect.objectContaining({ sent_count: 0 }),
    );
    expect(navigation.replace).toHaveBeenCalledWith('Main');
  });
});
