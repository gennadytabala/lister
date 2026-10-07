import assert from 'node:assert';
import { AppState } from '../src/state.js';
import { calculateItemTotals, calculateListTotals } from '../src/calculations.js';
import { sanitizeImportedList } from '../src/storage.js';

console.log('Testing Custom Fields & Completion Status (Requirement 14)...');

// Mock localStorage for state testing in Node environment
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; }
};

// 1. Initial State has fields: ['price', 'time']
const state = new AppState();
const list = state.getActiveList();
assert.ok(Array.isArray(list.fields), 'List should have fields array');
assert.deepStrictEqual(list.fields, ['price', 'time']);
console.log('✓ Initial list has default fields: price, time');

// 2. Toggle fields: add completed
state.toggleListField(list.id, 'completed');
assert.deepStrictEqual(list.fields, ['price', 'time', 'completed']);
console.log('✓ Added completed field');

// 3. Toggle fields: remove price
state.toggleListField(list.id, 'price');
assert.deepStrictEqual(list.fields, ['time', 'completed']);
console.log('✓ Removed price field');

// 4. Toggle fields: re-add price
state.toggleListField(list.id, 'price');
assert.ok(list.fields.includes('price'));
assert.ok(list.fields.includes('time'));
assert.ok(list.fields.includes('completed'));
console.log('✓ Re-added price field');

// 5. Leaf item completion
const item1 = list.items[0];
state.updateItem(item1.id, { content: 'Task 1', price: 100, time: 2, completed: false });
let itemTotals1 = calculateItemTotals(item1);
assert.strictEqual(itemTotals1.completed, false);
assert.strictEqual(itemTotals1.isIndeterminate, false);
assert.strictEqual(itemTotals1.completedCount, 0);

state.updateItem(item1.id, { completed: true });
itemTotals1 = calculateItemTotals(item1);
assert.strictEqual(itemTotals1.completed, true);
assert.strictEqual(itemTotals1.isIndeterminate, false);
assert.strictEqual(itemTotals1.completedCount, 1);
console.log('✓ Leaf item completion status verified');

// 6. Parent item with nested list: all false
const item2 = state.addItem(list.id);
state.updateItem(item2.id, { content: 'Parent Task' });
const nestedList = state.addNestedList(item2.id);
const nested1 = nestedList.items[0];
state.updateItem(nested1.id, { content: 'Subtask 1', completed: false });
const nested2 = state.addItem(nestedList.id);
state.updateItem(nested2.id, { content: 'Subtask 2', completed: false });

let parentTotals = calculateItemTotals(item2);
assert.strictEqual(parentTotals.completed, false, 'Parent should be false when all children false');
assert.strictEqual(parentTotals.isIndeterminate, false, 'Parent should not be indeterminate');
console.log('✓ Parent status when none completed: false');

// 7. Parent item with nested list: partial completion (indeterminate)
state.updateItem(nested1.id, { completed: true });
parentTotals = calculateItemTotals(item2);
assert.strictEqual(parentTotals.completed, false, 'Parent is not fully completed');
assert.strictEqual(parentTotals.isIndeterminate, true, 'Parent is indeterminate (partially completed)');
assert.strictEqual(parentTotals.completedCount, 1);
assert.strictEqual(parentTotals.totalItemsCount, 2);
console.log('✓ Parent status when partially completed: indeterminate (gray mark)');

// 8. Parent item with nested list: all completed
state.updateItem(nested2.id, { completed: true });
parentTotals = calculateItemTotals(item2);
assert.strictEqual(parentTotals.completed, true, 'Parent is true when all children completed');
assert.strictEqual(parentTotals.isIndeterminate, false, 'Parent is not indeterminate');
assert.strictEqual(parentTotals.completedCount, 2);
assert.strictEqual(parentTotals.totalItemsCount, 2);
console.log('✓ Parent status when all completed: true');

// 9. Toggling parent checkbox updates all descendants
state.toggleItemCompleted(item2.id); // was all true -> should turn all false
parentTotals = calculateItemTotals(item2);
assert.strictEqual(parentTotals.completed, false);
assert.strictEqual(nested1.completed, false);
assert.strictEqual(nested2.completed, false);

state.toggleItemCompleted(item2.id); // was all false -> should turn all true
parentTotals = calculateItemTotals(item2);
assert.strictEqual(parentTotals.completed, true);
assert.strictEqual(nested1.completed, true);
assert.strictEqual(nested2.completed, true);
console.log('✓ Toggling parent checkbox updates all descendants recursively');

// 10. List totals with completed counts
const overallTotals = calculateListTotals(list);
// item1: 1 completed, item2: 2 items, 2 completed -> totalItems = 3, completed = 3
assert.strictEqual(overallTotals.totalItemsCount, 3);
assert.strictEqual(overallTotals.completedCount, 3);
assert.strictEqual(overallTotals.isAllCompleted, true);
console.log('✓ Overall list totals with completion counts passed');

// 11. Import / export preserves fields & completed
const exported = JSON.parse(JSON.stringify(list));
assert.ok(Array.isArray(exported.fields));
assert.strictEqual(exported.items[0].completed, true);

const imported = sanitizeImportedList(exported);
assert.deepStrictEqual(imported.fields, exported.fields);
assert.strictEqual(imported.items[0].completed, true);
console.log('✓ Import / export preserves fields and completion');

console.log('All custom fields unit and flow tests passed successfully! 🎉');
