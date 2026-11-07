module.exports = {
  preset: 'jest-expo',
  watchman: false,
  // Native builds can run alongside UI checks; never crawl generated projects/artifacts.
  modulePathIgnorePatterns: [
    '<rootDir>/android/',
    '<rootDir>/ios/',
    '<rootDir>/artifacts/',
    '<rootDir>/modules/.*/(?:build|\\.build)/',
  ],
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
    'src/features/app-updates/{UpdateCoordinator,contracts,PlayUpdateAdapter}.ts',
  ],
  coverageThreshold: {
    global: { statements: 90, branches: 85, functions: 90, lines: 90 },
  },
  coverageDirectory: 'coverage',
  clearMocks: true,
};
