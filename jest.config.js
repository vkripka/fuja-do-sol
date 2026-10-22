/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js',
  },
  collectCoverageFrom: ['src/engine/**/*.ts', 'src/services/{geocodingService,routingService,storageService,mapTiles}.ts', 'src/data/**/*.ts'],
  coverageThreshold: {
    './src/engine/': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },
  coverageReporters: ['text-summary', 'text', 'lcov'],
};
