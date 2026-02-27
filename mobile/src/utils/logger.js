/**
 * Logging utility with proper levels
 * In production, logs can be sent to analytics/monitoring service
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

const CURRENT_LEVEL = __DEV__ ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;

class Logger {
  constructor(context) {
    this.context = context;
  }

  debug(...args) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(`[DEBUG][${this.context}]`, ...args);
    }
  }

  info(...args) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.log(`[INFO][${this.context}]`, ...args);
    }
  }

  warn(...args) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(`[WARN][${this.context}]`, ...args);
    }
  }

  error(...args) {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(`[ERROR][${this.context}]`, ...args);
    }
  }

  // Production-only: Send critical errors to monitoring service
  critical(error, metadata = {}) {
    console.error(`[CRITICAL][${this.context}]`, error, metadata);
    // TODO: Send to Sentry, Crashlytics, or your monitoring service
    // if (!__DEV__) {
    //   Analytics.logError(error, { context: this.context, ...metadata });
    // }
  }
}

export const createLogger = (context) => new Logger(context);
export default Logger;
