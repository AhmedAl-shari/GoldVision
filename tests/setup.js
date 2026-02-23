/**
 * Jest Setup File
 * Global test configuration and mocks
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PROPHET_URL = 'http://localhost:8001';
process.env.DATABASE_URL = 'file:./test.db';

