/**
 * Jest Configuration
 * Unit testing configuration for GoldVision
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/unit/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'services/**/*.js',
    'backend/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/*.config.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};

