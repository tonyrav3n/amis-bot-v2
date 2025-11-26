/**
 * Validate and normalize USD amounts.
 * Accepts: "$10", "10.5", "1,234.56", etc.
 * Returns normalized value with 2 decimals (minimum $5.00).
 * @param {string|number} input - User input
 * @returns {{ ok: true, value: string, number: number } | { ok: false, error: string }}
 */
export function normalizeUsdAmount(input) {
  if (input === undefined || input === null || input === '') {
    return { ok: false, error: 'Enter a USD amount.' };
  }

  let raw = String(input).trim();
  raw = raw.replace(/\s+/g, '');
  if (raw.startsWith('$')) {
    raw = raw.slice(1);
  }
  raw = raw.replace(/,/g, '');

  if (!/^\d+(\.\d*)?$/.test(raw)) {
    return {
      ok: false,
      error: 'Enter a valid USD amount, e.g. 10, 10.5, $10, $10.50',
    };
  }

  const num = Number(raw);
  if (!Number.isFinite(num)) {
    return { ok: false, error: 'Enter a valid USD amount.' };
  }

  if (num < 5) {
    return { ok: false, error: 'Minimum trade amount is $5.00' };
  }

  const value = num.toFixed(2);
  return { ok: true, value, number: num };
}

/**
 * Throwing variant of normalizeUsdAmount.
 * Use this when you expect valid input and want exceptions for failures.
 * @param {string|number} input - User input
 * @returns {string} Normalized value with two decimals
 * @throws {Error} User-friendly validation error
 */
export function requireUsdAmount(input) {
  const res = normalizeUsdAmount(input);
  if (!res.ok) {
    throw new Error(res.error || 'Enter a valid USD amount.');
  }
  return res.value;
}
