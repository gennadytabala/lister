import assert from 'node:assert';
import { calculateItemTotals, calculateListTotals, hasNestedLists } from '../src/calculations.js';
import { sanitizeImportedList } from '../src/storage.js';

console.log('Running Lister Core Tests...');

// 1. Basic item totals test
const item1 = { id: '1', content: 'Item 1', price: 100, time: 2, nestedLists: [] };
const totals1 = calculateItemTotals(item1);
assert.strictEqual(totals1.price, 100);
assert.strictEqual(totals1.time, 2);
assert.strictEqual(totals1.isComputed, false);
assert.strictEqual(hasNestedLists(item1), false);
console.log('✓ Basic item totals passed');

// 2. Nested list totals & parent rollup
const nestedItem1 = { id: 'n1', content: 'Sub 1', price: 30, time: 1, nestedLists: [] };
const nestedItem2 = { id: 'n2', content: 'Sub 2', price: 45, time: 0.5, nestedLists: [] };

const itemWithNested = {
  id: '2',
  content: 'Parent item',
  price: 0,
  time: 0,
  nestedLists: [
    {
      id: 'nl1',
      title: 'Parent item',
      items: [nestedItem1, nestedItem2]
    }
  ]
};

assert.strictEqual(hasNestedLists(itemWithNested), true);
const parentTotals = calculateItemTotals(itemWithNested);
assert.strictEqual(parentTotals.price, 75);
assert.strictEqual(parentTotals.time, 1.5);
assert.strictEqual(parentTotals.isComputed, true);
console.log('✓ Nested list item rollup passed');

// 3. Multi-level List totals
const list = {
  id: 'l1',
  title: 'Test List',
  items: [item1, itemWithNested]
};
const listTotals = calculateListTotals(list);
// Total price = 100 + 75 = 175
// Total time = 2 + 1.5 = 3.5
assert.strictEqual(listTotals.totalPrice, 175);
assert.strictEqual(listTotals.totalTime, 3.5);
console.log('✓ Multi-level list totals passed');

// 4. Sanitize imported list
const rawImport = {
  title: 'Imported Trip',
  items: [
    { content: 'Flights', price: '500', time: '3', nestedLists: [] },
    { content: 'Hotel', price: '300', time: '1' }
  ]
};
const sanitized = sanitizeImportedList(rawImport);
assert.strictEqual(sanitized.title, 'Imported Trip');
assert.strictEqual(sanitized.items.length, 2);
assert.strictEqual(sanitized.items[0].price, 500);
assert.strictEqual(sanitized.items[0].time, 3);
assert.ok(sanitized.id);
assert.ok(sanitized.items[0].id);
console.log('✓ Import sanitization passed');

console.log('All core unit tests passed successfully!');
