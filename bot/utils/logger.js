import { env } from '../config/env.js';

/**
 * Logger utility with debug mode toggle.
 * Debug logs only appear when DEBUG_MODE=true.
 */
class Logger {
  /** Initialize logger with debug mode from environment. */
  constructor() {
    this.debugMode = env.DEBUG_MODE || false;
  }

  /** Log debug messages (only shown when DEBUG_MODE=true). */
  debug(...args) {
    if (this.debugMode) {
      console.log('🔍 [DEBUG]', ...args);
    }
  }

  /** Log informational messages (always shown). */
  info(...args) {
    console.log('ℹ️  [INFO]', ...args);
  }

  /** Log success messages (always shown). */
  success(...args) {
    console.log('✅ [SUCCESS]', ...args);
  }

  /** Log warning messages (always shown). */
  warn(...args) {
    console.warn('⚠️  [WARN]', ...args);
  }

  /** Log error messages (always shown). */
  error(...args) {
    console.error('❌ [ERROR]', ...args);
  }

  /**
   * Log Discord interaction details (debug only).
   * @param {string} type - Type of interaction
   * @param {string} customId - The custom ID
   * @param {Object} [details={}] - Additional details
   */
  interaction(type, customId, details = {}) {
    if (this.debugMode) {
      console.log('🔍 [INTERACTION]', {
        type,
        customId,
        ...details,
      });
    }
  }

  /**
   * Log button interaction (debug only).
   * @param {string} customId - The custom ID of the button
   * @param {string} userId - The Discord user ID
   * @param {Object} [details={}] - Additional context
   */
  button(customId, userId, details = {}) {
    if (this.debugMode) {
      console.log('🔘 [BUTTON]', {
        customId,
        userId,
        ...details,
      });
    }
  }

  /**
   * Log select menu interaction (debug only).
   * @param {string} customId - The custom ID of the select menu
   * @param {string} userId - The Discord user ID
   * @param {string[]} values - Array of selected values
   * @param {Object} [details={}] - Additional context
   */
  select(customId, userId, values, details = {}) {
    if (this.debugMode) {
      console.log('📋 [SELECT]', {
        customId,
        userId,
        values,
        ...details,
      });
    }
  }

  /**
   * Log modal submission (debug only).
   * @param {string} customId - The custom ID of the modal
   * @param {string} userId - The Discord user ID
   * @param {Object} [fields={}] - The field values
   */
  modal(customId, userId, fields = {}) {
    if (this.debugMode) {
      console.log('📝 [MODAL]', {
        customId,
        userId,
        fields,
      });
    }
  }

  /**
   * Log slash command execution (debug only).
   * @param {string} commandName - The name of the command
   * @param {string} userId - The Discord user ID
   * @param {Object} [options={}] - Command options
   */
  command(commandName, userId, options = {}) {
    if (this.debugMode) {
      console.log('⚡ [COMMAND]', {
        commandName,
        userId,
        options,
      });
    }
  }

  /**
   * Check if debug mode is currently enabled.
   * @returns {boolean} True if DEBUG_MODE=true
   */
  isDebugMode() {
    return this.debugMode;
  }
}

/** Singleton logger instance. */
export const logger = new Logger();
