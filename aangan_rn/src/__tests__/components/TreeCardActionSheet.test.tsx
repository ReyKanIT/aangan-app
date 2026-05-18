/**
 * Component test for TreeCardActionSheet — v0.16.3 direct tree editing.
 *
 * Cases:
 *   • Renders 6 action rows for a regular member (3 add + edit rel/name + remove).
 *   • Renders ONLY 3 add rows for the 'you' variant — no edit/remove.
 *   • Each row has a 52px+ tap target (Dadi Test).
 *   • Hindi labels are present (anti-v0.13.16: must be wrapped in {'...'}).
 *   • onAction receives the correct action key.
 *   • onClose fires on backdrop tap and on Cancel button tap.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TreeCardActionSheet, { TreeCardAction } from '../../components/family/TreeCardActionSheet';
import type { FamilyMember } from '../../types/database';
import { DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';

const sampleMember: FamilyMember = {
  id: 'rel-test',
  user_id: 'kumar',
  family_member_id: 'user-test',
  relationship_type: 'brother',
  relationship_label_hindi: 'भाई',
  connection_level: 1,
  is_verified: false,
  created_at: '2026-04-15T00:00:00Z',
  updated_at: '2026-04-15T00:00:00Z',
  member: {
    id: 'user-test',
    phone_number: '',
    display_name: 'Krishna Kumar',
    display_name_hindi: 'कृष्ण कुमार',
    profile_photo_url: null,
    village: null,
    state: null,
    family_level: 1,
    last_seen_at: null,
  } as any,
};

describe('<TreeCardActionSheet>', () => {
  it('renders nothing when member is null (sheet closed)', () => {
    const { queryByTestId } = render(
      <TreeCardActionSheet
        member={null}
        onClose={() => {}}
        onAction={() => {}}
        isHindi={true}
      />,
    );
    // The Modal mounts but is not visible — when member is null, no rows.
    expect(queryByTestId('tree-action-add_child')).toBeNull();
  });

  it('renders all 6 action rows for a regular member', () => {
    const { getByTestId } = render(
      <TreeCardActionSheet
        member={sampleMember}
        onClose={() => {}}
        onAction={() => {}}
        isHindi={true}
      />,
    );
    expect(getByTestId('tree-action-add_child')).toBeTruthy();
    expect(getByTestId('tree-action-add_spouse')).toBeTruthy();
    expect(getByTestId('tree-action-add_parent')).toBeTruthy();
    expect(getByTestId('tree-action-edit_relationship')).toBeTruthy();
    expect(getByTestId('tree-action-edit_name')).toBeTruthy();
    expect(getByTestId('tree-action-remove')).toBeTruthy();
  });

  it("renders ONLY the 3 'Add' rows for the You variant", () => {
    const { getByTestId, queryByTestId } = render(
      <TreeCardActionSheet
        member="you"
        onClose={() => {}}
        onAction={() => {}}
        isHindi={true}
      />,
    );
    expect(getByTestId('tree-action-add_child')).toBeTruthy();
    expect(getByTestId('tree-action-add_spouse')).toBeTruthy();
    expect(getByTestId('tree-action-add_parent')).toBeTruthy();
    // No edit or remove for the You card — you can't delete yourself.
    expect(queryByTestId('tree-action-edit_relationship')).toBeNull();
    expect(queryByTestId('tree-action-edit_name')).toBeNull();
    expect(queryByTestId('tree-action-remove')).toBeNull();
  });

  it('each row has a 52px+ tap target (Dadi Test)', () => {
    const { getByTestId } = render(
      <TreeCardActionSheet
        member={sampleMember}
        onClose={() => {}}
        onAction={() => {}}
        isHindi={true}
      />,
    );
    const actions: TreeCardAction[] = [
      'add_child',
      'add_spouse',
      'add_parent',
      'edit_relationship',
      'edit_name',
      'remove',
    ];
    for (const key of actions) {
      const row = getByTestId(`tree-action-${key}`);
      // RN flattens style arrays — assert minHeight >= 52 either as a
      // direct style or via the prop.
      const styleProp = row.props.style;
      const flat = Array.isArray(styleProp) ? Object.assign({}, ...styleProp) : styleProp;
      expect(flat.minHeight).toBeGreaterThanOrEqual(DADI_MIN_BUTTON_HEIGHT);
    }
  });

  it('renders Hindi labels for every action (anti-v0.13.16 verification)', () => {
    const { getByText } = render(
      <TreeCardActionSheet
        member={sampleMember}
        onClose={() => {}}
        onAction={() => {}}
        isHindi={true}
      />,
    );
    // If any of these strings render as literal `\u…` escapes (the v0.13.16
    // bug), getByText would fail to find them. Their presence is the proof
    // that they are wrapped in `{'...'}` JS expressions.
    expect(getByText('बच्चा जोड़ें')).toBeTruthy();
    expect(getByText('साथी जोड़ें')).toBeTruthy();
    expect(getByText('माता-पिता जोड़ें')).toBeTruthy();
    expect(getByText('रिश्ता बदलें')).toBeTruthy();
    expect(getByText('नाम बदलें')).toBeTruthy();
    expect(getByText('मिटाएँ')).toBeTruthy();
  });

  it('calls onAction with the right key and the same member instance', () => {
    const onAction = jest.fn();
    const { getByTestId } = render(
      <TreeCardActionSheet
        member={sampleMember}
        onClose={() => {}}
        onAction={onAction}
        isHindi={true}
      />,
    );
    fireEvent.press(getByTestId('tree-action-add_child'));
    expect(onAction).toHaveBeenCalledWith('add_child', sampleMember);

    fireEvent.press(getByTestId('tree-action-remove'));
    expect(onAction).toHaveBeenCalledWith('remove', sampleMember);
  });

  it("onAction for the You variant passes the 'you' sentinel", () => {
    const onAction = jest.fn();
    const { getByTestId } = render(
      <TreeCardActionSheet
        member="you"
        onClose={() => {}}
        onAction={onAction}
        isHindi={true}
      />,
    );
    fireEvent.press(getByTestId('tree-action-add_child'));
    expect(onAction).toHaveBeenCalledWith('add_child', 'you');
  });

  it('onClose fires when the Cancel button is tapped', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <TreeCardActionSheet
        member={sampleMember}
        onClose={onClose}
        onAction={() => {}}
        isHindi={true}
      />,
    );
    fireEvent.press(getByTestId('tree-action-cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
