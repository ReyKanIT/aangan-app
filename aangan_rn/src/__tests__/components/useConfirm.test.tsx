/**
 * Tests for useConfirm — Tier T1 of the regression suite.
 *
 * useConfirm() is the Hindi-first replacement for Alert.alert added on
 * 2026-05-17 to address the Design Lead quick-win #2 ("Jyotsna ticket —
 * never regress to native confirm"). The hook owns:
 *
 *   1. Mount-without-crash (smoke). A component that calls useConfirm()
 *      but never opens a dialog must render cleanly.
 *   2. Visibility. Calling `confirm({...})` shows the dialog.
 *   3. Resolve semantics:
 *        - confirm button  → resolves Promise to `true`
 *        - cancel button   → resolves to `false`
 *        - backdrop tap    → resolves to `false`
 *
 * The hook is screen-local (no Provider), so each test mounts a tiny
 * harness component that exposes a button + the rendered `dialog`. We
 * drive that harness with @testing-library/react-native.
 */
import React, { useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { useConfirm } from '../../components/common/useConfirm';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

/**
 * Tiny test harness so we can drive useConfirm from JSX without dragging
 * a whole screen in. The "Open" button invokes confirm() with the given
 * options; the last resolved value is stored on a ref so tests can read
 * it back.
 */
function Harness({
  options,
  resultRef,
}: {
  options: Parameters<ReturnType<typeof useConfirm>['confirm']>[0];
  resultRef: { current: boolean | null };
}) {
  const { confirm, dialog } = useConfirm();
  return (
    <View>
      <TouchableOpacity
        testID="open-confirm"
        onPress={async () => {
          const r = await confirm(options);
          resultRef.current = r;
        }}
      >
        <Text>{'open'}</Text>
      </TouchableOpacity>
      {dialog}
    </View>
  );
}

describe('useConfirm()', () => {
  describe('smoke — does not crash when idle', () => {
    it('renders a host component without throwing', () => {
      const resultRef = { current: null as boolean | null };
      expect(() =>
        render(
          <Harness
            options={{ title: 'X', body: 'Y' }}
            resultRef={resultRef}
          />,
        ),
      ).not.toThrow();
    });

    it('ConfirmDialog with no options renders null (safety path)', () => {
      // Direct unit on the underlying component. Mounting with no
      // payload should be a no-op — guards against accidental crashes
      // if a future refactor forgets to gate the Modal.
      expect(() =>
        render(
          <ConfirmDialog
            visible={false}
            options={null}
            onResolve={() => {}}
          />,
        ),
      ).not.toThrow();
    });
  });

  describe('open + resolve', () => {
    it('shows the dialog when confirm() is called', () => {
      const resultRef = { current: null as boolean | null };
      const { getByTestId, queryByText } = render(
        <Harness
          options={{
            title: 'लॉगआउट करें?',
            body: 'You can sign in again anytime.',
            confirmText: 'हाँ, लॉगआउट',
            cancelText: 'रद्द करें',
            destructive: true,
          }}
          resultRef={resultRef}
        />,
      );

      // Dialog content should not be in the tree yet.
      expect(queryByText('लॉगआउट करें?')).toBeNull();

      act(() => {
        fireEvent.press(getByTestId('open-confirm'));
      });

      // Title + body + both buttons are now mounted.
      expect(queryByText('लॉगआउट करें?')).not.toBeNull();
      expect(queryByText('You can sign in again anytime.')).not.toBeNull();
      expect(queryByText('हाँ, लॉगआउट')).not.toBeNull();
      expect(queryByText('रद्द करें')).not.toBeNull();
    });

    it('resolves to true when the confirm button is tapped', async () => {
      const resultRef = { current: null as boolean | null };
      const { getByTestId } = render(
        <Harness
          options={{
            title: 'लॉगआउट करें?',
            body: 'You can sign in again anytime.',
            confirmText: 'हाँ',
            cancelText: 'नहीं',
            destructive: true,
          }}
          resultRef={resultRef}
        />,
      );

      await act(async () => {
        fireEvent.press(getByTestId('open-confirm'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('confirm-dialog-confirm'));
      });

      expect(resultRef.current).toBe(true);
    });

    it('resolves to false when the cancel button is tapped', async () => {
      const resultRef = { current: null as boolean | null };
      const { getByTestId } = render(
        <Harness
          options={{
            title: 'लॉगआउट करें?',
            body: 'You can sign in again anytime.',
            confirmText: 'हाँ',
            cancelText: 'नहीं',
            destructive: true,
          }}
          resultRef={resultRef}
        />,
      );

      await act(async () => {
        fireEvent.press(getByTestId('open-confirm'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('confirm-dialog-cancel'));
      });

      expect(resultRef.current).toBe(false);
    });

    it('resolves to false on hardware back / Modal dismiss (onRequestClose)', async () => {
      // The Modal fires onRequestClose for Android hardware-back. We
      // verify the same handler is wired by triggering the Modal's
      // onRequestClose directly via the testID.
      const resultRef = { current: null as boolean | null };
      const { getByTestId } = render(
        <Harness
          options={{
            title: 'लॉगआउट करें?',
            body: 'You can sign in again anytime.',
            confirmText: 'हाँ',
            cancelText: 'नहीं',
            destructive: true,
          }}
          resultRef={resultRef}
        />,
      );

      await act(async () => {
        fireEvent.press(getByTestId('open-confirm'));
      });
      // Simulate Android hardware-back / iOS swipe-down by firing
      // onRequestClose on the Modal element directly.
      await act(async () => {
        fireEvent(getByTestId('confirm-dialog-modal'), 'requestClose');
      });

      expect(resultRef.current).toBe(false);
    });
  });
});
