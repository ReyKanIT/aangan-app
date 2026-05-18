/**
 * Tests for PanchangWidget's "What's special today" ribbon logic.
 * Tier T1 — Phase 2 of REGRESSION_SUITE.
 *
 * The ribbon logic lives in the pure helper `computeSpecialToday` in
 * services/panchangService.ts (extracted from HomeFeedScreen on
 * 2026-05-17 to make it unit-testable). The helper takes a Date, a
 * computed PanchangData, and a festival catalogue and returns the
 * SpecialToday ribbon payload — or null when nothing notable applies.
 *
 * Priority order asserted here:
 *   1. festival catalogue match for today  (festival > tithi)
 *   2. special tithi heuristic (पूर्णिमा / अमावस्या / एकादशी)
 *   3. null
 *
 * Why test the helper instead of rendering the widget:
 *   - rendering PanchangWidget pulls in expo-location, Animated, and
 *     real-time getDeviceLocation() which would force an async tick
 *     per test for zero added coverage. The helper is the actual unit
 *     of behaviour worth locking down.
 *
 * Component-render coverage (animation, expand/collapse, header) lives
 * in T4 manual smoke + the family-tree-renders Maestro flow class.
 */
import {
  computeSpecialToday,
  type PanchangData,
  type SpecialFestivalInput,
} from '../../services/panchangService';
import { FESTIVALS_2026 } from '../../assets/data/festivals';

// Build a minimal PanchangData with the tithi we want under test.
// Other fields are placeholders — computeSpecialToday only reads `tithi`.
function panchangWithTithi(tithi: string): PanchangData {
  return {
    vikramSamvat: 2083,
    maas: 'वैशाख',
    paksha: 'शुक्ल पक्ष',
    tithi,
    tithiNumber: 1,
    nakshatra: 'अश्विनी',
    yoga: 'शुभ',
    vara: 'रविवार',
    sunrise: '05:30',
    sunset: '19:00',
    moonPhasePercent: 30,
  };
}

// Match theme/colors.ts haldiGold — pinned here so a colour rename in
// the theme without an update in the helper fails the test.
const HALDI_GOLD = '#C8A84B';

describe('computeSpecialToday — PanchangWidget ribbon logic', () => {
  // 17 May 2026 — today per CLAUDE.md "currentDate". The 2026 festival
  // catalogue has no entry for this date, and Pratipada is not special.
  const PRATIPADA_TODAY = new Date('2026-05-17T10:00:00.000Z');

  describe('Pratipada-only day (no festival, no special tithi)', () => {
    it('returns null when tithi is Pratipada and no festival is today', () => {
      const panchang = panchangWithTithi('प्रतिपदा');
      const result = computeSpecialToday(
        PRATIPADA_TODAY,
        panchang,
        FESTIVALS_2026,
      );
      expect(result).toBeNull();
    });

    it('returns null for ordinary tithis (तृतीया, सप्तमी, etc.)', () => {
      for (const tithi of ['तृतीया', 'सप्तमी', 'दशमी', 'त्रयोदशी']) {
        const result = computeSpecialToday(
          PRATIPADA_TODAY,
          panchangWithTithi(tithi),
          FESTIVALS_2026,
        );
        expect(result).toBeNull();
      }
    });
  });

  describe('Purnima day (special tithi)', () => {
    // Pick a date NOT in the festival catalogue so the tithi branch wins.
    // 2026-05-17 has no festival, so we reuse it.
    const PURNIMA_DATE = PRATIPADA_TODAY;

    it('returns a पूर्णिमा ribbon with haldiGold accent', () => {
      const result = computeSpecialToday(
        PURNIMA_DATE,
        panchangWithTithi('पूर्णिमा'),
        FESTIVALS_2026,
      );
      expect(result).not.toBeNull();
      expect(result!.line).toContain('पूर्णिमा');
      expect(result!.accent).toBe(HALDI_GOLD);
      expect(result!.icon).toBe('✨');
    });

    it('returns the correct line for अमावस्या', () => {
      const result = computeSpecialToday(
        PURNIMA_DATE,
        panchangWithTithi('अमावस्या'),
        FESTIVALS_2026,
      );
      expect(result).not.toBeNull();
      expect(result!.line).toContain('अमावस्या');
      expect(result!.line).toContain('पूर्वजों');
      expect(result!.accent).toBe(HALDI_GOLD);
    });

    it('returns the correct line for एकादशी', () => {
      const result = computeSpecialToday(
        PURNIMA_DATE,
        panchangWithTithi('एकादशी'),
        FESTIVALS_2026,
      );
      expect(result).not.toBeNull();
      expect(result!.line).toContain('एकादशी');
      expect(result!.line).toContain('व्रत');
      expect(result!.accent).toBe(HALDI_GOLD);
    });
  });

  describe('Festival day (from catalogue)', () => {
    // Buddha Purnima 2026 is in the catalogue at 2026-05-12 with
    // nameHindi 'बुद्ध पूर्णिमा' and color '#2196F3'.
    const buddhaPurnima = FESTIVALS_2026.find(
      (f) => f.id === 'buddha-purnima-2026',
    )!;
    const BUDDHA_PURNIMA_DATE = new Date(buddhaPurnima.date + 'T10:00:00.000Z');

    it('uses festival nameHindi + शुभकामनाएँ line on a catalogue festival day', () => {
      const result = computeSpecialToday(
        BUDDHA_PURNIMA_DATE,
        panchangWithTithi('प्रतिपदा'), // intentionally non-special so festival branch is the one we test
        FESTIVALS_2026,
      );
      expect(result).not.toBeNull();
      expect(result!.line).toContain(buddhaPurnima.nameHindi);
      expect(result!.line).toContain('शुभकामनाएँ');
      expect(result!.icon).toBe(buddhaPurnima.icon);
      expect(result!.accent).toBe(buddhaPurnima.color);
    });

    it('works for at least one other catalogue festival (Diwali)', () => {
      const diwali = FESTIVALS_2026.find((f) => f.id === 'diwali-2026')!;
      const diwaliDate = new Date(diwali.date + 'T10:00:00.000Z');
      const result = computeSpecialToday(
        diwaliDate,
        panchangWithTithi('चतुर्दशी'),
        FESTIVALS_2026,
      );
      expect(result).not.toBeNull();
      expect(result!.line).toContain('दिवाली');
      expect(result!.accent).toBe('#FFC107');
    });
  });

  describe('Festival takes priority over special tithi', () => {
    // Buddha Purnima 2026 falls on 12 May 2026 — and the day is, by name,
    // a पूर्णिमा. If we feed the helper Buddha Purnima's date AND a
    // पूर्णिमा tithi, the festival branch must win (festival > tithi).
    const buddhaPurnima = FESTIVALS_2026.find(
      (f) => f.id === 'buddha-purnima-2026',
    )!;
    const BUDDHA_PURNIMA_DATE = new Date(buddhaPurnima.date + 'T10:00:00.000Z');

    it('shows the festival, not the generic पूर्णिमा blurb', () => {
      const result = computeSpecialToday(
        BUDDHA_PURNIMA_DATE,
        panchangWithTithi('पूर्णिमा'),
        FESTIVALS_2026,
      );
      expect(result).not.toBeNull();
      // Festival branch line ends with "शुभकामनाएँ!" — the tithi branch
      // line starts with "आज पूर्णिमा —". Asserting on the suffix is the
      // most precise way to distinguish them.
      expect(result!.line).toContain('शुभकामनाएँ');
      expect(result!.line).not.toContain('चंद्र दर्शन');
      expect(result!.accent).toBe(buddhaPurnima.color);
      expect(result!.accent).not.toBe(HALDI_GOLD);
    });
  });

  describe('Empty / minimal festival catalogue', () => {
    it('still works (falls back to tithi or null) when given []', () => {
      const empty: SpecialFestivalInput[] = [];
      expect(
        computeSpecialToday(PRATIPADA_TODAY, panchangWithTithi('प्रतिपदा'), empty),
      ).toBeNull();
      const purnima = computeSpecialToday(
        PRATIPADA_TODAY,
        panchangWithTithi('पूर्णिमा'),
        empty,
      );
      expect(purnima).not.toBeNull();
      expect(purnima!.accent).toBe(HALDI_GOLD);
    });
  });
});
