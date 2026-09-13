/**
 * Calculation logic for items and lists (totals, aggregation)
 */
import { parseNumber } from './utils.js';

/**
 * Checks if an item has nested lists
 * @param {object} item
 * @returns {boolean}
 */
export function hasNestedLists(item) {
  return Array.isArray(item.nestedLists) && item.nestedLists.length > 0;
}

/**
 * Calculates effective price and time for a single item.
 * If the item has nested lists, its values are the sum of those nested lists.
 * Otherwise, its own entered values are used.
 *
 * @param {object} item
 * @returns {{ price: number, time: number, isComputed: boolean }}
 */
export function calculateItemTotals(item) {
  if (!item) {
    return { price: 0, time: 0, isComputed: false };
  }

  if (hasNestedLists(item)) {
    let sumPrice = 0;
    let sumTime = 0;

    for (const nestedList of item.nestedLists) {
      const nestedTotals = calculateListTotals(nestedList);
      sumPrice += nestedTotals.totalPrice;
      sumTime += nestedTotals.totalTime;
    }

    return {
      price: sumPrice,
      time: sumTime,
      isComputed: true
    };
  }

  return {
    price: parseNumber(item.price),
    time: parseNumber(item.time),
    isComputed: false
  };
}

/**
 * Recursively calculates total price and total time for a list and all its items/sublists.
 *
 * @param {object} list
 * @returns {{ totalPrice: number, totalTime: number }}
 */
export function calculateListTotals(list) {
  if (!list || !Array.isArray(list.items)) {
    return { totalPrice: 0, totalTime: 0 };
  }

  let totalPrice = 0;
  let totalTime = 0;

  for (const item of list.items) {
    const itemTotals = calculateItemTotals(item);
    totalPrice += itemTotals.price;
    totalTime += itemTotals.time;
  }

  return {
    totalPrice,
    totalTime
  };
}
