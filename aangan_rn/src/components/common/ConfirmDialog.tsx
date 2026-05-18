/**
 * ConfirmDialog — Hindi-first replacement for Alert.alert() in Aangan RN.
 *
 * Background:
 *   Native Alert.alert on iOS / Android renders system-font, English-leaning
 *   buttons stacked vertically with no Hindi context. This is the worst
 *   "Dadi Test" surface in the app — Jyotsna's 12-Apr "Popup msgs not clear"
 *   support ticket (web side) is the canonical motivation; Kumar's Design
 *   Lead audit on 2026-05-17 flagged the same issue for the RN sign-out
 *   flow and added it to CRITICAL_FEATURES.md as
 *   "Jyotsna ticket — never regress to native confirm".
 *
 *   This file ports the web ConfirmDialog (aangan_web/src/components/ui/
 *   ConfirmDialog.tsx) to React Native primitives: an RN <Modal> overlay
 *   with a cream-coloured, gold-bordered card, Dadi-test-sized buttons,
 *   and Hindi-first text wrapped in JS expressions per CLAUDE.md.
 *
 * Visual contract:
 *   • Centered card, cream background, 2px haldi-gold border.
 *   • Title in Typography.h3 (Tiro Devanagari Hindi).
 *   • Body in Typography.body (16px Poppins) — Dadi readable.
 *   • Two side-by-side buttons, each min-height 52px (DADI_MIN_BUTTON_HEIGHT):
 *       - LEFT: cancel (neutral ghost, gray500 border)
 *       - RIGHT: confirm (haldi-gold or error red if destructive)
 *   • Tap on backdrop = cancel (matches native iOS dialog behavior).
 *   • Hardware back button on Android = cancel (via Modal onRequestClose).
 *
 * Smoke-safe:
 *   Rendered with NO `options` prop, the component returns null — no Modal,
 *   no crash. Callers normally drive it through useConfirm() which manages
 *   the lifecycle. The exported component is left as a low-level escape
 *   hatch and to support the smoke test in useConfirm.test.tsx.
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';

export interface ConfirmOptions {
  /** Big title at the top of the dialog (Hindi-first). */
  title?: string;
  /** Body / question — usually 1–2 lines. */
  body?: string;
  /** Confirm button label. Defaults to bilingual fallback. */
  confirmText?: string;
  /** Cancel button label. Defaults to bilingual fallback. */
  cancelText?: string;
  /** True when the action is destructive — paints the confirm button red. */
  destructive?: boolean;
}

interface ConfirmDialogProps {
  /** Whether the dialog is currently visible. */
  visible: boolean;
  /** Active option payload — only read while visible. */
  options: ConfirmOptions | null;
  /** Fired with `true` for confirm, `false` for cancel / backdrop / back. */
  onResolve: (result: boolean) => void;
}

/**
 * Low-level dialog. Most callers should NOT use this directly — go through
 * useConfirm() so the promise plumbing is handled for you.
 *
 * If `options` is null OR `visible` is false, this renders nothing — that's
 * the smoke-test safe path that lets `<ConfirmDialog visible={false}
 * options={null} onResolve={noop} />` mount inside a render tree without
 * popping a real Modal.
 */
export function ConfirmDialog({
  visible,
  options,
  onResolve,
}: ConfirmDialogProps) {
  if (!visible || !options) return null;

  const {
    title,
    body,
    confirmText,
    cancelText,
    destructive = false,
  } = options;

  // Bilingual defaults so callers can omit and still get something readable.
  const finalConfirmText = confirmText ?? 'हाँ — Yes';
  const finalCancelText = cancelText ?? 'नहीं — No';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={() => onResolve(false)}
      // testID lets the smoke test find the Modal without touching internals.
      testID="confirm-dialog-modal"
    >
      {/* Backdrop — tap outside the card = cancel. */}
      <TouchableWithoutFeedback onPress={() => onResolve(false)}>
        <View style={styles.backdrop}>
          {/* stopPropagation: tapping the card itself should NOT cancel. */}
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[styles.card, Shadow.lg]}
              accessibilityRole="alert"
              accessibilityViewIsModal
            >
              {title ? (
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
              ) : null}
              {body ? <Text style={styles.body}>{body}</Text> : null}

              <View style={styles.buttonRow}>
                {/* Cancel — on the LEFT, ghost style. Mirrors web ordering
                    so a swipe-to-confirm gesture doesn't accidentally
                    cancel. */}
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  activeOpacity={0.7}
                  onPress={() => onResolve(false)}
                  accessibilityRole="button"
                  accessibilityLabel={finalCancelText}
                  testID="confirm-dialog-cancel"
                >
                  <Text style={styles.cancelText}>{finalCancelText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    destructive
                      ? styles.destructiveButton
                      : styles.confirmButton,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => onResolve(true)}
                  accessibilityRole="button"
                  accessibilityLabel={finalConfirmText}
                  testID="confirm-dialog-confirm"
                >
                  <Text style={styles.confirmText}>{finalConfirmText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.cream,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.haldiGold,
    padding: Spacing.xl,
  },
  title: {
    ...Typography.h3,
    color: Colors.brown,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  body: {
    ...Typography.body,
    color: Colors.brown,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  cancelButton: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray500,
  },
  cancelText: {
    ...Typography.button,
    color: Colors.brown,
  },
  confirmButton: {
    backgroundColor: Colors.haldiGold,
  },
  destructiveButton: {
    backgroundColor: Colors.error,
  },
  confirmText: {
    ...Typography.button,
    color: Colors.white,
  },
});

export default ConfirmDialog;
