/**
 * Component test for KulvrikshTreeView — Tier T1 of the regression suite.
 *
 * Reproduces the 2026-05-17 v0.16.1 regression: the gen-tree refactor caused
 * an ErrorBoundary fallback to show on Kumar's TestFlight when his real family
 * data hit the new partition logic. Manual sim test caught it; this test will
 * catch it on every commit going forward.
 *
 * Cases:
 *   1. Renders without throwing for EMPTY data (shows the "🪔 Build your
 *      Kulvriksh" empty state).
 *   2. Renders without throwing for ONE member (minimal non-empty path).
 *   3. Renders without throwing for Kumar's real family graph (8 members
 *      across 3 generations + 2 unknown relationships). THIS is the case
 *      that crashed v0.16.1.
 *   4. getGenerationOffset places each member in the genealogically correct
 *      row (brother/sister/wife = gen 0, daughter = gen +1, father/mother =
 *      gen -1, unknown = gen 0 fallback).
 *
 * Note: this test asserts NO exception is thrown during render. We do not
 * pixel-compare; that's T4. We do not check exact x/y positions either; the
 * contract is "renders cleanly for representative data", which is enough to
 * have prevented the v0.16.1 incident.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import KulvrikshTreeView, {
  getGenerationOffset,
  detectCouples,
} from '../../components/family/KulvrikshTreeView';
import type { FamilyMember } from '../../types/database';
import { KUMAR_FAMILY, KUMAR_SELF, SINGLE_MEMBER } from '../fixtures/kumar-family';

describe('<KulvrikshTreeView>', () => {
  describe('render (no exception)', () => {
    it('renders the empty state when given no members', () => {
      expect(() =>
        render(
          <KulvrikshTreeView
            members={[]}
            isHindi={true}
            selfDisplayName={KUMAR_SELF.displayName}
            selfDisplayNameHindi={KUMAR_SELF.displayNameHindi}
            selfAvatarUrl={KUMAR_SELF.avatarUrl}
          />,
        ),
      ).not.toThrow();
    });

    it('renders for a single member (spouse-only tree)', () => {
      expect(() =>
        render(
          <KulvrikshTreeView
            members={SINGLE_MEMBER}
            isHindi={true}
            selfDisplayName={KUMAR_SELF.displayName}
            selfDisplayNameHindi={KUMAR_SELF.displayNameHindi}
            selfAvatarUrl={KUMAR_SELF.avatarUrl}
          />,
        ),
      ).not.toThrow();
    });

    // ⬇ THIS is the v0.16.1 regression. Must stay green forever.
    it("renders for Kumar's real family graph (3 generations, 8 members, mixed relationships)", () => {
      expect(() =>
        render(
          <KulvrikshTreeView
            members={KUMAR_FAMILY}
            isHindi={true}
            selfDisplayName={KUMAR_SELF.displayName}
            selfDisplayNameHindi={KUMAR_SELF.displayNameHindi}
            selfAvatarUrl={KUMAR_SELF.avatarUrl}
          />,
        ),
      ).not.toThrow();
    });

    it("renders for Kumar's family in English locale too", () => {
      expect(() =>
        render(
          <KulvrikshTreeView
            members={KUMAR_FAMILY}
            isHindi={false}
            selfDisplayName={KUMAR_SELF.displayName}
            selfDisplayNameHindi={KUMAR_SELF.displayNameHindi}
            selfAvatarUrl={KUMAR_SELF.avatarUrl}
          />,
        ),
      ).not.toThrow();
    });

    // v0.16.1 regression (2026-05-17): the empty-state early return sat
    // BEFORE useMemo(rowXs), so empty → populated re-render bumped hook
    // count by 1 → Hermes threw "Rendered more hooks than during the
    // previous render" → ErrorBoundary caught it as "कुछ गलत हो गया".
    // This test re-renders the same component with empty THEN populated
    // members and asserts no exception. It is the canonical reproducer
    // for the bug class "hook called after a conditional return".
    it('survives empty → populated member-list transition (hook-count stable)', () => {
      const { rerender } = render(
        <KulvrikshTreeView
          members={[]}
          isHindi={true}
          selfDisplayName={KUMAR_SELF.displayName}
          selfDisplayNameHindi={KUMAR_SELF.displayNameHindi}
          selfAvatarUrl={KUMAR_SELF.avatarUrl}
        />,
      );
      // Now re-render with populated list. If any hook is called *after*
      // a conditional return above this point, React throws "Rendered
      // more hooks than during the previous render".
      expect(() =>
        rerender(
          <KulvrikshTreeView
            members={KUMAR_FAMILY}
            isHindi={true}
            selfDisplayName={KUMAR_SELF.displayName}
            selfDisplayNameHindi={KUMAR_SELF.displayNameHindi}
            selfAvatarUrl={KUMAR_SELF.avatarUrl}
          />,
        ),
      ).not.toThrow();
    });

    // v0.16.2 couple-pair feature (2026-05-18): make sure the empty →
    // populated transition is still safe when the populated payload
    // includes a couple. The new layout adds couple-detection memos and
    // a couple-render block — if any new hook accidentally lands AFTER
    // the empty-state early return, this test catches it.
    it('survives empty → populated transition when populated has a You+spouse couple', () => {
      const { rerender } = render(
        <KulvrikshTreeView
          members={[]}
          isHindi={true}
          selfDisplayName={KUMAR_SELF.displayName}
          selfDisplayNameHindi={KUMAR_SELF.displayNameHindi}
          selfAvatarUrl={KUMAR_SELF.avatarUrl}
        />,
      );
      expect(() =>
        rerender(
          <KulvrikshTreeView
            members={KUMAR_FAMILY}
            isHindi={true}
            selfDisplayName={KUMAR_SELF.displayName}
            selfDisplayNameHindi={KUMAR_SELF.displayNameHindi}
            selfAvatarUrl={KUMAR_SELF.avatarUrl}
          />,
        ),
      ).not.toThrow();
    });

    // Single-parent family — mother only, no father. Children must connect
    // to the gen-0 anchor; no couple unit at gen -1.
    it('renders cleanly for a single-parent (mother-only) family', () => {
      const motherOnly: FamilyMember[] = [
        {
          id: 'rel-mother-only',
          user_id: 'kumar',
          family_member_id: 'user-mother-only',
          relationship_type: 'mother',
          relationship_label_hindi: 'माता',
          connection_level: 1,
          is_verified: false,
          created_at: '2026-04-15T00:00:00Z',
          updated_at: '2026-04-15T00:00:00Z',
          member: {
            id: 'user-mother-only',
            phone_number: '',
            display_name: 'Parvati',
            display_name_hindi: 'पार्वती',
            profile_photo_url: null,
            village: null,
            state: null,
            family_level: 1,
            last_seen_at: null,
          } as any,
        } as FamilyMember,
        {
          id: 'rel-daughter-only',
          user_id: 'kumar',
          family_member_id: 'user-daughter-only',
          relationship_type: 'daughter',
          relationship_label_hindi: 'बेटी',
          connection_level: 1,
          is_verified: false,
          created_at: '2026-04-15T00:00:00Z',
          updated_at: '2026-04-15T00:00:00Z',
          member: {
            id: 'user-daughter-only',
            phone_number: '',
            display_name: 'Kanak',
            display_name_hindi: 'कनक',
            profile_photo_url: null,
            village: null,
            state: null,
            family_level: 1,
            last_seen_at: null,
          } as any,
        } as FamilyMember,
      ];
      expect(() =>
        render(
          <KulvrikshTreeView
            members={motherOnly}
            isHindi={true}
            selfDisplayName={KUMAR_SELF.displayName}
            selfDisplayNameHindi={KUMAR_SELF.displayNameHindi}
            selfAvatarUrl={KUMAR_SELF.avatarUrl}
          />,
        ),
      ).not.toThrow();
      // No couple should be detected (mother present, father absent).
      expect(detectCouples(motherOnly)).toEqual([]);
    });

    // And the reverse — populated → empty (less common in real life, but
    // covers the symmetric case where someone clears their family).
    it('survives populated → empty member-list transition', () => {
      const { rerender } = render(
        <KulvrikshTreeView
          members={KUMAR_FAMILY}
          isHindi={true}
          selfDisplayName={KUMAR_SELF.displayName}
          selfDisplayNameHindi={KUMAR_SELF.displayNameHindi}
          selfAvatarUrl={KUMAR_SELF.avatarUrl}
        />,
      );
      expect(() =>
        rerender(
          <KulvrikshTreeView
            members={[]}
            isHindi={true}
            selfDisplayName={KUMAR_SELF.displayName}
            selfDisplayNameHindi={KUMAR_SELF.displayNameHindi}
            selfAvatarUrl={KUMAR_SELF.avatarUrl}
          />,
        ),
      ).not.toThrow();
    });
  });
});

describe('getGenerationOffset', () => {
  // Helper: build a minimal FamilyMember just for offset lookups.
  const m = (relationship_type: string, relationship_label_hindi: string | null = null): any => ({
    id: 'test',
    relationship_type,
    relationship_label_hindi,
  });

  describe('siblings & spouse → gen 0', () => {
    it.each([
      ['brother', 'भाई'],
      ['sister', 'बहन'],
      ['wife', 'पत्नी'],
      ['husband', 'पति'],
      ['spouse', null],
    ])('%s / %s → 0', (en, hi) => {
      expect(getGenerationOffset(m(en, hi))).toBe(0);
    });
  });

  describe('children → gen +1', () => {
    it.each([
      ['son', 'बेटा'],
      ['daughter', 'बेटी'],
      ['nephew', 'भतीजा'],
      ['niece', 'भांजी'],
    ])('%s / %s → 1', (en, hi) => {
      expect(getGenerationOffset(m(en, hi))).toBe(1);
    });
  });

  describe('parents & their generation → gen -1', () => {
    it.each([
      ['father', 'पिता'],
      ['mother', 'माता'],
      ['uncle', 'चाचा'],
      ['aunt', 'बुआ'],
    ])('%s / %s → -1', (en, hi) => {
      expect(getGenerationOffset(m(en, hi))).toBe(-1);
    });
  });

  describe('grandparents → gen -2', () => {
    it.each([
      ['grandfather', 'दादा'],
      ['grandmother', 'दादी'],
      [null, 'नाना'],
      [null, 'नानी'],
    ])('%s / %s → -2', (en, hi) => {
      expect(getGenerationOffset(m(en as any, hi))).toBe(-2);
    });
  });

  describe('grandchildren → gen +2', () => {
    it.each([
      ['grandson', 'पोता'],
      ['granddaughter', 'पोती'],
      [null, 'नाती'],
      [null, 'नातिन'],
    ])('%s / %s → 2', (en, hi) => {
      expect(getGenerationOffset(m(en as any, hi))).toBe(2);
    });
  });

  describe('fallback', () => {
    it('returns 0 for unknown English relationship', () => {
      expect(getGenerationOffset(m('xyz', null))).toBe(0);
    });
    it('returns 0 for unknown Hindi relationship', () => {
      expect(getGenerationOffset(m('', 'अज्ञात'))).toBe(0);
    });
    it('returns 0 for "अन्य" (the literal "other" label in Aangan)', () => {
      expect(getGenerationOffset(m('other', 'अन्य'))).toBe(0);
    });
    it('returns 0 for null relationship_type AND null relationship_label_hindi', () => {
      expect(getGenerationOffset(m('', null))).toBe(0);
    });
  });

  describe('case insensitivity (relationship_type only)', () => {
    it('accepts uppercase relationship_type', () => {
      expect(getGenerationOffset(m('BROTHER', null))).toBe(0);
      expect(getGenerationOffset(m('Daughter', null))).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// detectCouples — v0.16.2 husband-wife pair detection (Kumar directive
// 2026-05-18 01:32 IST).
// ---------------------------------------------------------------------------
describe('detectCouples', () => {
  const member = (
    id: string,
    relationship_type: string,
    relationship_label_hindi: string | null = null,
  ): FamilyMember =>
    ({
      id,
      user_id: 'kumar',
      family_member_id: `u-${id}`,
      relationship_type,
      relationship_label_hindi,
      connection_level: 1,
      is_verified: false,
      created_at: '2026-04-15T00:00:00Z',
      updated_at: '2026-04-15T00:00:00Z',
    } as FamilyMember);

  it('returns [] for empty input', () => {
    expect(detectCouples([])).toEqual([]);
  });

  it('returns [] for null/undefined input', () => {
    expect(detectCouples(undefined as unknown as FamilyMember[])).toEqual([]);
  });

  it('detects You + wife as a gen-0 couple', () => {
    const wife = member('w', 'wife', 'पत्नी');
    const out = detectCouples([wife]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('you+spouse');
    expect(out[0].gen).toBe(0);
    expect(out[0].primary).toBe('you');
    expect(out[0].spouse).toBe(wife);
  });

  it('detects You + husband as a gen-0 couple', () => {
    const husband = member('h', 'husband', 'पति');
    const out = detectCouples([husband]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('you+spouse');
  });

  it('detects You + Hindi-only पत्नी as a gen-0 couple', () => {
    const wife = member('w', '', 'पत्नी');
    const out = detectCouples([wife]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('you+spouse');
  });

  it('with multiple spouses logs a warning and returns the first only', () => {
    const w1 = member('w1', 'wife');
    const w2 = member('w2', 'wife');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const out = detectCouples([w1, w2]);
      expect(out).toHaveLength(1);
      expect(out[0].spouse).toBe(w1);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('detects father + mother as a gen -1 couple', () => {
    const father = member('f', 'father', 'पिता');
    const mother = member('mo', 'mother', 'माता');
    const out = detectCouples([father, mother]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('father+mother');
    expect(out[0].gen).toBe(-1);
    expect(out[0].primary).toBe(father);
    expect(out[0].spouse).toBe(mother);
  });

  it('does NOT detect a couple when only father is present (no mother)', () => {
    const father = member('f', 'father');
    expect(detectCouples([father])).toEqual([]);
  });

  it('does NOT detect a couple when only mother is present (no father)', () => {
    const mother = member('m', 'mother');
    expect(detectCouples([mother])).toEqual([]);
  });

  it('detects paternal grandparents (दादा + दादी) as a gen -2 couple', () => {
    const dada = member('gp', '', 'दादा');
    const dadi = member('gm', '', 'दादी');
    const out = detectCouples([dada, dadi]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('paternal-grandparents');
    expect(out[0].gen).toBe(-2);
  });

  it('detects maternal grandparents (नाना + नानी) as a gen -2 couple', () => {
    const nana = member('na', '', 'नाना');
    const nani = member('ni', '', 'नानी');
    const out = detectCouples([nana, nani]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('maternal-grandparents');
  });

  it('detects three couples when both parents AND both grandparent pairs present', () => {
    const family = [
      member('f', 'father'),
      member('mo', 'mother'),
      member('da', '', 'दादा'),
      member('di', '', 'दादी'),
      member('na', '', 'नाना'),
      member('ni', '', 'नानी'),
    ];
    const out = detectCouples(family);
    expect(out.map((c) => c.id).sort()).toEqual([
      'father+mother',
      'maternal-grandparents',
      'paternal-grandparents',
    ]);
  });

  it('falls back to English grandfather + grandmother as paternal pair', () => {
    const gf = member('gf', 'grandfather');
    const gm = member('gm', 'grandmother');
    const out = detectCouples([gf, gm]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('paternal-grandparents');
  });

  it('detects father-in-law + mother-in-law as a separate couple', () => {
    const fil = member('fl', 'father_in_law', 'ससुर');
    const mil = member('ml', 'mother_in_law', 'सास');
    const out = detectCouples([fil, mil]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('father_in_law+mother_in_law');
  });

  it('includeYou=false skips the You+spouse couple detection', () => {
    const wife = member('w', 'wife');
    expect(detectCouples([wife], false)).toEqual([]);
  });

  it("Kumar's real family fixture detects (You+wife) AND (father+mother)", () => {
    const out = detectCouples(KUMAR_FAMILY);
    const ids = out.map((c) => c.id).sort();
    expect(ids).toContain('you+spouse');
    expect(ids).toContain('father+mother');
    expect(out).toHaveLength(2);
  });
});
