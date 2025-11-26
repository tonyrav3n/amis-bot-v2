import { env } from '../config/env.js';

/**
 * Logger with debug mode toggle. Debug logs only show when DEBUG_MODE=true.
 */
class Logger {
  constructor() {
    this.debugMode = env.DEBUG_MODE || false;
  }

  debug(...args) {
    if (this.debugMode) {
      console.log('🔍 [DEBUG]', ...args);
    }
  }

  info(...args) {
    console.log('ℹ️  [INFO]', ...args);
  }

  success(...args) {
    console.log('✅ [SUCCESS]', ...args);
  }

  warn(...args) {
    console.warn('⚠️  [WARN]', ...args);
  }

  error(...args) {
    console.error('❌ [ERROR]', ...args);
  }

  interaction(type, customId, details = {}) {
    if (this.debugMode) {
      console.log('🔍 [INTERACTION]', { type, customId, ...details });
    }
  }

  button(customId, userId, details = {}) {
    if (this.debugMode) {
      console.log('🔘 [BUTTON]', { customId, userId, ...details });
    }
  }

  select(customId, userId, values, details = {}) {
    if (this.debugMode) {
      console.log('📋 [SELECT]', { customId, userId, values, ...details });
    }
  }

  modal(customId, userId, fields = {}) {
    if (this.debugMode) {
      console.log('📝 [MODAL]', { customId, userId, fields });
    }
  }

  command(commandName, userId, options = {}) {
    if (this.debugMode) {
      console.log('⚡ [COMMAND]', { commandName, userId, options });
    }
  }

  isDebugMode() {
    return this.debugMode;
  }
}

/** Singleton logger instance. */
export const logger = new Logger();
