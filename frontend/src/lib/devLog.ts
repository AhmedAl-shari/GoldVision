/**
 * Development logging utilities
 * These functions only log in development mode, keeping production code clean
 */

export const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

export const devWarn = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args);
  }
};

export const devError = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(...args);
  }
  // In production, you might want to send to error tracking service
  // e.g., Sentry.captureException(...)
};

