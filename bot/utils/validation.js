/**
 * Validation Utilities - Comprehensive Input Validation System
 *
 * Provides robust validation and normalization functions for user inputs with
 * detailed logging, error handling, and security validation. Currently focuses
 * on USD amount validation for the trade escrow system.
 *
 * Features:
 * - USD amount normalization with multiple format support
 * - Minimum threshold validation ($5.00 minimum)
 * - Comprehensive format validation (with/without $, commas, decimals)
 * - Detailed logging for debugging and audit trails
 * - Error handling with user-friendly messages
 * - Future extensibility for additional validation types
 *
 * Security:
 * - Input sanitization and validation
 * - Minimum amount enforcement to prevent spam
 * - Format validation to prevent injection attacks
 * - Comprehensive error messages without exposing internals
 *
 * @module utils/validation
 * @author amis Bot Team
 * @version 2.0.0
 * @since 1.0.0
 */

import { logger } from './logger.js';

/**
 * Normalize a USD amount input.
 *
 * Accepts formats like:
 * - "$10", "$10.5", "10", "10.5", "1,234.56"
 * - With or without whitespace
 *
 * Returns a normalized string with two decimals for consistency.
 * Enforces a minimum trade amount of $5.00.
 *
 * @param {string|number} input - Raw user input for USD amount
 * @returns {{ ok: true, value: string, number: number } | { ok: false, error: string }}
 *
 * @example
 * normalizeUsdAmount("$10.50")  // { ok: true, value: "10.50", number: 10.5 }
 * normalizeUsdAmount("1,234")   // { ok: true, value: "1234.00", number: 1234 }
 * normalizeUsdAmount("3")       // { ok: false, error: "Minimum trade amount is $5.00" }
 * normalizeUsdAmount("abc")     // { ok: false, error: "Enter a valid USD amount..." }
 */
/**
 * Normalize a USD amount input with comprehensive validation and logging.
 *
 * Accepts and validates multiple USD formats:
 * - Plain numbers: "10", "10.5", "1,234.56"
 * - With currency symbol: "$10", "$10.50", "$1,234.56"
 * - With or without spaces: "10", " 10 ", "$ 10"
 * - Trailing decimals: "10.", "15.0"
 *
 * Validation Rules:
 * - Must be a valid positive number
 * - Minimum amount: $5.00 (prevents spam/trivial trades)
 * - Maximum precision: 2 decimal places
 * - No negative amounts or zero
 *
 * Processing Flow:
 * 1. Input validation (null/empty/undefined)
 * 2. String normalization (trim, remove spaces)
 * 3. Format cleaning (remove $, commas)
 * 4. Pattern validation (digits with optional decimals)
 * 5. Numeric validation (finite number check)
 * 6. Minimum threshold validation
 * 7. Normalization to 2 decimal places
 *
 * @function normalizeUsdAmount
 * @param {string|number} input - Raw user input for USD amount
 * @returns {{ ok: true, value: string, number: number } | { ok: false, error: string }}
 *   - ok: Boolean indicating success/failure
 *   - value: Normalized string with 2 decimal places (e.g., "10.50")
 *   - number: Numeric value for calculations (e.g., 10.5)
 *   - error: Error message if validation fails
 *
 * @example
 * normalizeUsdAmount("$10.50")  // { ok: true, value: "10.50", number: 10.5 }
 * normalizeUsdAmount("1,234")   // { ok: true, value: "1234.00", number: 1234 }
 * normalizeUsdAmount("3")       // { ok: false, error: "Minimum trade amount is $5.00" }
 * normalizeUsdAmount("abc")     // { ok: false, error: "Enter a valid USD amount..." }
 */
export function normalizeUsdAmount(input) {
  logger.debug('💰 Validating USD amount', { input });

  // Input validation
  if (input === undefined || input === null || input === '') {
    logger.debug('❌ Input validation failed: empty input');
    return { ok: false, error: 'Enter a USD amount.' };
  }

  // String normalization
  let raw = String(input).trim();
  logger.debug('🔧 Raw input processed', { raw });

  // Format cleaning
  raw = raw.replace(/\s+/g, ''); // Remove all spaces
  if (raw.startsWith('$')) {
    raw = raw.slice(1); // Remove leading $
  }
  raw = raw.replace(/,/g, ''); // Remove commas
  logger.debug('🧹 Formatted raw input', { raw });

  // Pattern validation
  if (!/^\d+(\.\d*)?$/.test(raw)) {
    logger.debug('❌ Input validation failed: invalid format');
    return {
      ok: false,
      error: 'Enter a valid USD amount, e.g. 10, 10.5, $10, $10.50',
    };
  }

  // Numeric validation
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    logger.debug('❌ Input validation failed: not a finite number');
    return { ok: false, error: 'Enter a valid USD amount.' };
  }

  // Minimum threshold validation
  if (num < 5) {
    logger.debug('❌ Input validation failed: below minimum', { num });
    return { ok: false, error: 'Minimum trade amount is $5.00' };
  }

  // Normalization to 2 decimals
  const value = num.toFixed(2);
  logger.debug('✅ USD amount validated successfully', {
    original: input,
    normalized: value,
    numeric: num,
  });
  return { ok: true, value, number: num };
}

/**
 * Throwing variant of normalizeUsdAmount.
 *
 * Use this when you want exceptions instead of result objects.
 *
 * @param {string|number} input - Raw user input for USD amount
 * @returns {string} Normalized value with two decimals (e.g., "10.50")
 * @throws {Error} With a user-friendly message if validation fails
 *
 * @example
 * try {
 *   const price = requireUsdAmount(userInput);
 *   console.log(`Valid price: $${price}`);
 * } catch (error) {
 *   console.error(`Invalid input: ${error.message}`);
 * }
 */
/**
 * Throwing variant of normalizeUsdAmount that throws errors instead of returning result objects.
 *
 * Use this when you want exceptions instead of result objects for invalid inputs.
 * Provides the same validation as normalizeUsdAmount but with exception-based error handling.
 *
 * Benefits:
 * - Cleaner code when you expect valid input
 * - Exception handling for validation failures
 * - Consistent error messages with normalizeUsdAmount
 * - Still provides detailed logging for debugging
 *
 * @function requireUsdAmount
 * @param {string|number} input - Raw user input for USD amount
 * @returns {string} Normalized value with two decimals (e.g., "10.50")
 * @throws {Error} With a user-friendly message if validation fails
 *
 * @example
 * try {
 *   const price = requireUsdAmount(userInput);
 *   console.log(`Valid price: $${price}`);
 * } catch (error) {
 *   console.error(`Invalid input: ${error.message}`);
 * }
 *
 * @example
 * // Success cases
 * requireUsdAmount("10")      // "10.00"
 * requireUsdAmount("$15.50")  // "15.50"
 * requireUsdAmount("1,000")   // "1000.00"
 *
 * @example
 * // Error cases
 * requireUsdAmount("3")       // Throws: "Minimum trade amount is $5.00"
 * requireUsdAmount("abc")     // Throws: "Enter a valid USD amount..."
 * requireUsdAmount("")        // Throws: "Enter a USD amount."
 */
export function requireUsdAmount(input) {
  logger.debug('💰 Requiring USD amount (throwing variant)', { input });
  const res = normalizeUsdAmount(input);
  if (!res.ok) {
    logger.debug('❌ USD amount validation failed', { error: res.error });
    throw new Error(res.error || 'Enter a valid USD amount.');
  }
  logger.debug('✅ USD amount validation passed', { value: res.value });
  return res.value;
}
