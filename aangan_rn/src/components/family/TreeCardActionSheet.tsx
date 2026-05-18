/**
 * TreeCardActionSheet — bottom-sheet action menu for kulvriksh tree cards.
 *
 * Direct tree editing (v0.16.3 Phase 1, Kumar directive 2026-05-18 8:48 IST):
 * long-press any card → this sheet opens with contextual actions:
 *   • बच्चा जोड़ें / Add child
 *   • साथी जोड़ें / Add spouse
 *   • माता-पिता जोड़ें / Add parent
 *   • रिश्ता बदलें / Edit relationship
 *   • नाम बदलें / Edit name
 *   • मिटाएँ / Remove from tree
 *
 * The "You" card variant shows only the three "Add" actions (you cannot
 * edit or remove yourself from your own tree).
 *
 * Hindi-first JSX wrap-in-{'...'} rule applies; min row height 52px per Dadi
 * Test. Visual language mirrors ConfirmDialog (cream card, haldi-gold border).
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
import type { FamilyMember } from '../../types/database';

export type TreeCardAction =
  | 'add_child'
  | 'add_spouse'
  | 'add_parent'
  | 'edit_relationship'
  | 'edit_name'
  | 'remove';

interface TreeCardActionSheetProps {
  /**
   * The member the long-press targeted. `null` means the sheet is closed.
   * Pass the FamilyMember directly for tree cards; pass the special
   * sentinel 'you' when the user long-presses their own "You" card so we
   * can render the You-card variant (Add-only actions).
   */
  member: FamilyMember | 'you' | null;
  onClose: () => void;
  onAction: (action: TreeCardAction, member: FamilyMember | 'you') => void;
  isHindi: boolean;
}

interface ActionRow {
  key: TreeCardAction;
  hindi: string;
  english: string;
  destructive?: boolean;
}

const REGULAR_ACTIONS: ActionRow[] = [
  { key: 'add_child',         hindi: 'बच्चा जोड़ें',       english: 'Add child' },
  { key: 'add_spouse',        hindi: 'साथी जोड़ें',         english: 'Add spouse' },
  { key: 'add_parent',        hindi: 'माता-पिता जोड़ें',    english: 'Add parent' },
  { key: 'edit_relationship', hindi: 'रिश्ता बदलें',        english: 'Edit relationship' },
  { key: 'edit_name',         hindi: 'नाम बदलें',           english: 'Edit name' },
  { key: 'remove',            hindi: 'मिटाएँ',             english: 'Remove from tree', destructive: true },
];

// You-card variant: only "Add" actions. You can't delete or rename
// yourself from your own tree (that's an account-settings action).
const YOU_ACTIONS: ActionRow[] = [
  { key: 'add_child',  hindi: 'बच्चा जोड़ें',        english: 'Add child' },
  { key: 'add_spouse', hindi: 'साथी जोड़ें',          english: 'Add spouse' },
  { key: 'add_parent', hindi: 'माता-पिता जोड़ें',     english: 'Add parent' },
];

export function TreeCardActionSheet({
  member,
  onClose,
  onAction,
  isHindi,
}: TreeCardActionSheetProps) {
  const visible = member !== null;
  const isYou = member === 'you';
  const actions = isYou ? YOU_ACTIONS : REGULAR_ACTIONS;

  // Title — Hindi-first.
  let title = '';
  if (isYou) {
    title = isHindi ? 'आप — विकल्प' : 'You — actions';
  } else if (member) {
    // After the isYou check, TS narrows `member` to FamilyMember here.
    const m = (member as Exclude<typeof member, 'you' | null>).member;
    title = m?.display_name_hindi || m?.display_name || (isHindi ? 'सदस्य' : 'Member');
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
      testID="tree-card-action-sheet"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          {/* Tapping the sheet itself should NOT close — stopPropagation */}
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.sheet, Shadow.lg]}>
              {/* Drag handle (visual only) */}
              <View style={styles.handle} pointerEvents="none" />

              {title ? (
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
              ) : null}

              {actions.map((row) => (
                <TouchableOpacity
                  key={row.key}
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (member) onAction(row.key, member);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.hindi} ${row.english}`}
                  testID={`tree-action-${row.key}`}
                >
                  <View style={styles.rowText}>
                    <Text
                      style={[
                        styles.rowHindi,
                        row.destructive && styles.rowHindiDestructive,
                      ]}
                    >
                      {row.hindi}
                    </Text>
                    <Text
                      style={[
                        styles.rowEnglish,
                        row.destructive && styles.rowEnglishDestructive,
                      ]}
                    >
                      {row.english}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Cancel button — closes the sheet without picking an action. */}
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.7}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={isHindi ? 'रद्द करें Cancel' : 'Cancel रद्द करें'}
                testID="tree-action-cancel"
              >
                <Text style={styles.cancelText}>
                  {isHindi ? 'रद्द करें / Cancel' : 'Cancel / रद्द करें'}
                </Text>
              </TouchableOpacity>
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
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.cream,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.haldiGold,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.brown,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  row: {
    // 52px+ tap target — Dadi Test
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    justifyContent: 'center',
  },
  rowText: {
    flexDirection: 'column',
  },
  rowHindi: {
    ...Typography.body,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.brown,
  },
  rowHindiDestructive: {
    color: Colors.error,
  },
  rowEnglish: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.brownLight,
    marginTop: 2,
  },
  rowEnglishDestructive: {
    color: Colors.error,
    opacity: 0.8,
  },
  cancelButton: {
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    ...Typography.button,
    color: Colors.brown,
  },
});

export default TreeCardActionSheet;
