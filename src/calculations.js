/**
 * Calculation logic for items and lists (totals, aggregation, completion status)
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
 * Calculates effective price, time, and completion state for a single item.
 * If the item has nested lists, its values are aggregated from those nested lists.
 * Otherwise, its own values are used.
 *
 * @param {object} item
 * @returns {{
 *   price: number,
 *   time: number,
 *   completed: boolean,
 *   isIndeterminate: boolean,
 *   completedCount: number,
 *   totalItemsCount: number,
 *   isComputed: boolean
 * }}
 */
export function calculateItemTotals(item) {
  if (!item) {
    return {
      price: 0,
      time: 0,
      completed: false,
      isIndeterminate: false,
      completedCount: 0,
      totalItemsCount: 0,
      isComputed: false
    };
  }

  if (hasNestedLists(item)) {
    let sumPrice = 0;
    let sumTime = 0;
    let sumCompletedCount = 0;
    let sumTotalItemsCount = 0;

    for (const nestedList of item.nestedLists) {
      const nestedTotals = calculateListTotals(nestedList);
      sumPrice += nestedTotals.totalPrice;
      sumTime += nestedTotals.totalTime;
      sumCompletedCount += nestedTotals.completedCount;
      sumTotalItemsCount += nestedTotals.totalItemsCount;
    }

    const isAllCompleted = sumTotalItemsCount > 0 && sumCompletedCount === sumTotalItemsCount;
    const isIndeterminate = sumTotalItemsCount > 0 && sumCompletedCount > 0 && sumCompletedCount < sumTotalItemsCount;

    return {
      price: sumPrice,
      time: sumTime,
      completed: isAllCompleted,
      isIndeterminate: isIndeterminate,
      completedCount: sumCompletedCount,
      totalItemsCount: sumTotalItemsCount,
      isComputed: true
    };
  }

  const isDone = Boolean(item.completed);
  return {
    price: parseNumber(item.price),
    time: parseNumber(item.time),
    completed: isDone,
    isIndeterminate: false,
    completedCount: isDone ? 1 : 0,
    totalItemsCount: 1,
    isComputed: false
  };
}

/**
 * Recursively calculates totals for a list and all its items/sublists.
 *
 * @param {object} list
 * @returns {{
 *   totalPrice: number,
 *   totalTime: number,
 *   completedCount: number,
 *   totalItemsCount: number,
 *   isAllCompleted: boolean,
 *   isIndeterminate: boolean
 * }}
 */
export function calculateListTotals(list) {
  if (!list || !Array.isArray(list.items)) {
    return {
      totalPrice: 0,
      totalTime: 0,
      completedCount: 0,
      totalItemsCount: 0,
      isAllCompleted: false,
      isIndeterminate: false
    };
  }

  let totalPrice = 0;
  let totalTime = 0;
  let completedCount = 0;
  let totalItemsCount = 0;

  for (const item of list.items) {
    const itemTotals = calculateItemTotals(item);
    totalPrice += itemTotals.price;
    totalTime += itemTotals.time;
    completedCount += itemTotals.completedCount;
    totalItemsCount += itemTotals.totalItemsCount;
  }

  const isAllCompleted = totalItemsCount > 0 && completedCount === totalItemsCount;
  const isIndeterminate = totalItemsCount > 0 && completedCount > 0 && completedCount < totalItemsCount;

  return {
    totalPrice,
    totalTime,
    completedCount,
    totalItemsCount,
    isAllCompleted,
    isIndeterminate
  };
}
