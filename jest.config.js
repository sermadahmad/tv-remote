module.exports = {
  preset: 'jest-expo',
  watchman: false,
  // Allow the async React Native renderer to settle on hosts also compiling native code.
  testTimeout: 15000,
  moduleNameMapper: {
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/core/tv/{validation,errors,TVRepository,ConnectionCoordinator}.ts',
    'src/features/discovery/DiscoveryService.ts',
  ],
  coverageThreshold: {
    global: { statements: 90, branches: 85, functions: 90, lines: 90 },
  },
  coverageDirectory: 'coverage',
  clearMocks: true,
};
