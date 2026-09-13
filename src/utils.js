/**
 * Utility functions for Lister application
 */

/**
 * Generates a unique string identifier
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Safely parses a number, defaulting to 0
 * @param {any} val
 * @returns {number}
 */
export function parseNumber(val) {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

/**
 * Formats a number for display (trims trailing zeroes if integer)
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  // Round to 2 decimal places max, omitting unnecessary decimals
  return (Math.round((num + Number.EPSILON) * 100) / 100).toString();
}

/**
 * Debounce function execution
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timeoutId = null;
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Deep clones an object
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepClone(obj) {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}
