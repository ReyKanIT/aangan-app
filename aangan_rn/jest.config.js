/**
 * Jest config for aangan_rn — T1 tier of the regression suite.
 * See REGRESSION_SUITE.md at repo root for the full strategy.
 *
 * Uses jest-expo preset (handles RN + Expo module mocks out of the box).
 * Skips e2e/maestro flows (those run via Maestro CLI, not Jest).
 */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.test.{ts,tsx}',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|@react-navigation|expo(nent)?|@expo(nent)?/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@sentry/.*|react-native-reanimated|react-native-gesture-handler)',
  ],
  moduleNameMapper: {
    // Treat static asset imports as stubs in tests.
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  // Snapshot directory next to the test file by default.
  // Coverage off by default; opt-in via `npm run test:coverage`.
};
