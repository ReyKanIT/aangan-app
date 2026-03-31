import { TextStyle, Platform } from 'react-native';
import { Colors } from './colors';

// Tiro Devanagari Hindi for headings, Poppins for body
// These fonts need to be loaded via expo-font
export const FontFamily = {
  headingHindi: 'TiroDevanagariHindi-Regular',
  headingHindiBold: 'TiroDevanagariHindi-Regular', // Tiro only has regular weight
  body: 'Poppins-Regular',
  bodyMedium: 'Poppins-Medium',
  bodySemiBold: 'Poppins-SemiBold',
  bodyBold: 'Poppins-Bold',
} as const;

export const Typography = {
  // Headings (Hindi)
  h1: {
    fontFamily: FontFamily.headingHindi,
    fontSize: 32,
    lineHeight: 44,
    color: Colors.brown,
  } as TextStyle,
  h2: {
    fontFamily: FontFamily.headingHindi,
    fontSize: 24,
    lineHeight: 34,
    color: Colors.brown,
  } as TextStyle,
  h3: {
    fontFamily: FontFamily.headingHindi,
    fontSize: 20,
    lineHeight: 28,
    color: Colors.brown,
  } as TextStyle,

  // Body (Poppins)
  bodyLarge: {
    fontFamily: FontFamily.body,
    fontSize: 18,
    lineHeight: 26,
    color: Colors.brown,
  } as TextStyle,
  body: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.brown,
  } as TextStyle,
  bodySmall: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.brownLight,
  } as TextStyle,

  // Labels
  label: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.brown,
  } as TextStyle,
  labelSmall: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.brownLight,
  } as TextStyle,

  // Button text
  button: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.white,
  } as TextStyle,
  buttonSmall: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.white,
  } as TextStyle,

  // Caption
  caption: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.gray600,
  } as TextStyle,

  // App title
  appTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 48,
    lineHeight: 60,
    color: Colors.haldiGold,
    fontWeight: '700' as const,
  } as TextStyle,
  appSubtitle: {
    fontFamily: FontFamily.headingHindi,
    fontSize: 24,
    lineHeight: 34,
    color: Colors.brown,
  } as TextStyle,
} as const;

// Dadi Test compliance: minimum sizes
export const DADI_MIN_BUTTON_HEIGHT = 52;
export const DADI_MIN_BODY_TEXT = 16;
export const DADI_MIN_TAP_TARGET = 44;
export const DADI_MAX_TAPS_TO_ACTION = 3;
