/**
 * Jest setup — runs before each test file.
 *
 * Mocks the parts of the RN runtime that test code can't fully stub on its
 * own. Keep this LIGHT — every mock here is a contract that real code must
 * obey, so additions need justification.
 */

// Hand-rolled mock for react-native-reanimated v4 — the official
// `react-native-reanimated/mock` indirectly imports worklets which needs
// native init that doesn't exist in a pure-node Jest env. We stub only the
// surface our components actually use.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const RN = require('react-native');
  const ViewAny: any = RN.View;
  return {
    __esModule: true,
    default: { View: ViewAny, ScrollView: RN.ScrollView, Text: RN.Text, createAnimatedComponent: (c: any) => c },
    useSharedValue: (initial: any) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    withSpring: (v: any) => v,
    withTiming: (v: any) => v,
    runOnJS: (fn: any) => fn,
    Easing: { inOut: () => ({}), out: () => ({}), linear: () => ({}) },
    View: ViewAny,
    ScrollView: RN.ScrollView,
    Text: RN.Text,
  };
});

// Stub Gesture Handler with chainable builders. Components call
// Gesture.Pinch().onStart(fn).onUpdate(fn).onEnd(fn) and friends — the real
// API is a fluent builder, so each method must return the same builder.
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  function makeBuilder(): any {
    const noop = () => builder;
    const builder: any = {
      onStart: noop,
      onUpdate: noop,
      onEnd: noop,
      onChange: noop,
      onFinalize: noop,
      onTouchesDown: noop,
      onTouchesUp: noop,
      onTouchesMove: noop,
      numberOfTaps: noop,
      minDistance: noop,
      maxDuration: noop,
      enabled: noop,
      shouldCancelWhenOutside: noop,
      simultaneousWithExternalGesture: noop,
    };
    return builder;
  }
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: {
      Pan: makeBuilder,
      Pinch: makeBuilder,
      Tap: makeBuilder,
      LongPress: makeBuilder,
      Race: (...args: any[]) => makeBuilder(),
      Simultaneous: (...args: any[]) => makeBuilder(),
      Exclusive: (...args: any[]) => makeBuilder(),
    },
    GestureHandlerRootView: View,
    Pressable: View,
  };
});

// expo-image-picker not needed in component tests
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

// Sentry: don't try to reach the network from tests
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
}));

// Supabase client — tests opt-in to specific mocked responses via jest.mock in the test file.
// Default no-op so import doesn't crash.
jest.mock('./src/config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: '' } })),
      })),
    },
  },
}));
