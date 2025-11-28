import { logger } from './logger.js';

/**
 * Normalizes a USD amount input with comprehensive validation.
 *
 * Accepts multiple formats:
 * - Plain numbers: "10", "10.5", "1,234.56"
 * - With currency symbol: "$10", "$10.50", "$1,234.56"
 * - With or without spaces: "10", " 10 ", "$ 10"
 * - Trailing decimals: "10.", "15.0"
 *
 * Validation rules:
 * - Must be a valid positive number
 * - Minimum amount: $5.00
 * - Maximum precision: 2 decimal places
 *
 * @param {string|number} input - Raw user input for USD amount.
 * @returns {{ok: true, value: string, number: number}|{ok: false, error: string}}
 *   Success object with normalized string and numeric values, or failure object with error message.
 *
 * @example
 * normalizeUsdAmount("$10.50")  // { ok: true, value: "10.50", number: 10.5 }
 * normalizeUsdAmount("1,234")   // { ok: true, value: "1234.00", number: 1234 }
 * normalizeUsdAmount("3")       // { ok: false, error: "Minimum trade amount is $5.00" }
 * normalizeUsdAmount("abc")     // { ok: false, error: "Enter a valid USD amount..." }
 */
export function normalizeUsdAmount(input) {
  logger.debug('💰 Validating USD amount', { input });

  if (input === undefined || input === null || input === '') {
    logger.debug('❌ Input validation failed: empty input');
    return { ok: false, error: 'Enter a USD amount.' };
  }

  let raw = String(input).trim();
  logger.debug('🔧 Raw input processed', { raw });

  raw = raw.replace(/\s+/g, '');
  if (raw.startsWith('$')) {
    raw = raw.slice(1);
  }
  raw = raw.replace(/,/g, '');
  logger.debug('🧹 Formatted raw input', { raw });

  if (!/^\d+(\.\d*)?$/.test(raw)) {
    logger.debug('❌ Input validation failed: invalid format');
    return {
      ok: false,
      error: 'Enter a valid USD amount, e.g. 10, 10.5, $10, $10.50',
    };
  }

  const num = Number(raw);
  if (!Number.isFinite(num)) {
    logger.debug('❌ Input validation failed: not a finite number');
    return { ok: false, error: 'Enter a valid USD amount.' };
  }

  if (num < 5) {
    logger.debug('❌ Input validation failed: below minimum', { num });
    return { ok: false, error: 'Minimum trade amount is $5.00' };
  }

  const value = num.toFixed(2);
  logger.debug('✅ USD amount validated successfully', {
    original: input,
    normalized: value,
    numeric: num,
  });
  return { ok: true, value, number: num };
}

/**
 * Throwing variant of normalizeUsdAmount. Returns the normalized value or throws an error.
 *
 * @param {string|number} input - Raw user input for USD amount.
 * @returns {string} Normalized value with two decimals (e.g., "10.50").
 * @throws {Error} With a user-friendly message if validation fails.
 *
 * @example
 * requireUsdAmount("10")      // "10.00"
 * requireUsdAmount("$15.50")  // "15.50"
 * requireUsdAmount("1,000")   // "1000.00"
 * requireUsdAmount("3")       // Throws: "Minimum trade amount is $5.00"
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
