import assert from 'node:assert';
import { AppState } from '../src/state.js';
import { calculateItemTotals, calculateListTotals } from '../src/calculations.js';
import { sanitizeImportedList } from '../src/storage.js';

console.log('Testing AppState and List Flows...');

// Mock localStorage for state testing in Node environment
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; }
};

// 1. Initialize State
const state = new AppState();
const initialList = state.getActiveList();
assert.ok(initialList, 'Initial list should exist');
assert.strictEqual(initialList.title, 'Новий список');
assert.strictEqual(initialList.items.length, 1, 'Should have 1 item initially');
assert.strictEqual(initialList.items[0].content, '');
assert.strictEqual(initialList.items[0].price, 0);
assert.strictEqual(initialList.items[0].time, 0);
console.log('✓ Initial state setup correctly: 1 list, 1 empty item');

// 2. Edit first item
const firstItem = initialList.items[0];
state.updateItem(firstItem.id, { content: 'Купити продукти', price: 150, time: 1 });
assert.strictEqual(firstItem.content, 'Купити продукти');
assert.strictEqual(firstItem.price, 150);
assert.strictEqual(firstItem.time, 1);

let totals = calculateListTotals(initialList);
assert.strictEqual(totals.totalPrice, 150);
assert.strictEqual(totals.totalTime, 1);
console.log('✓ First item edited and list totals computed: 150 грн, 1 год');

// 3. Add second item after first
const secondItem = state.addItem(initialList.id, firstItem.id);
assert.strictEqual(initialList.items.length, 2);
assert.strictEqual(initialList.items[1].id, secondItem.id);
state.updateItem(secondItem.id, { content: 'Ремонт', price: 500, time: 3 });

totals = calculateListTotals(initialList);
assert.strictEqual(totals.totalPrice, 650);
assert.strictEqual(totals.totalTime, 4);
console.log('✓ Second item added and totals updated: 650 грн, 4 год');

// 4. Add nested list to second item ('Ремонт')
// Expected: parent's own price and time are reset to 0, nested list created
const nestedList = state.addNestedList(secondItem.id);
assert.ok(nestedList, 'Nested list should be created');
assert.strictEqual(secondItem.nestedLists.length, 1);
assert.strictEqual(secondItem.price, 0, 'Parent price should be reset to 0');
assert.strictEqual(secondItem.time, 0, 'Parent time should be reset to 0');
assert.strictEqual(nestedList.items.length, 1, 'Nested list should have 1 empty item');

// Edit nested item
const nestedItem = nestedList.items[0];
state.updateItem(nestedItem.id, { content: 'Фарба', price: 200, time: 1.5 });

// Check parent item computed values
const parentTotals = calculateItemTotals(secondItem);
assert.strictEqual(parentTotals.isComputed, true);
assert.strictEqual(parentTotals.price, 200);
assert.strictEqual(parentTotals.time, 1.5);

// Check overall list totals
totals = calculateListTotals(initialList);
// Total = item1 (150) + parentItem(computed 200) = 350
// Time = item1 (1) + parentItem(computed 1.5) = 2.5
assert.strictEqual(totals.totalPrice, 350);
assert.strictEqual(totals.totalTime, 2.5);
console.log('✓ Nested list created, parent price/time reset to 0, computed rollup totals: 350 грн, 2.5 год');

// 5. Add second nested item to the same nested list
const nestedItem2 = state.addItem(nestedList.id);
state.updateItem(nestedItem2.id, { content: 'Пензлі', price: 50, time: 0.5 });
totals = calculateListTotals(initialList);
assert.strictEqual(totals.totalPrice, 400); // 150 + (200 + 50)
assert.strictEqual(totals.totalTime, 3.0); // 1 + (1.5 + 0.5)
console.log('✓ Second nested item added: 400 грн, 3.0 год');

// 6. Test multiple lists and switching
const list2 = state.createList('Робота');
assert.strictEqual(state.data.lists.length, 2);
assert.strictEqual(state.getActiveList().id, list2.id);
assert.strictEqual(list2.title, 'Робота');

state.setActiveList(initialList.id);
assert.strictEqual(state.getActiveList().id, initialList.id);
console.log('✓ Multiple lists and switching verified');

// 7. Test rename list
state.updateListTitle(initialList.id, 'Дім та покупки');
assert.strictEqual(initialList.title, 'Дім та покупки');
console.log('✓ Rename list verified');

// 8. Test persistence and reloading
const reloadedState = new AppState();
const reloadedActive = reloadedState.getActiveList();
assert.strictEqual(reloadedActive.title, 'Дім та покупки');
assert.strictEqual(reloadedActive.items.length, 2);
assert.strictEqual(reloadedActive.items[1].nestedLists.length, 1);
assert.strictEqual(reloadedActive.items[1].nestedLists[0].items.length, 2);
console.log('✓ Persistence and reload verified');

// 9. Test delete item
state.deleteItem(firstItem.id);
assert.strictEqual(initialList.items.length, 1);
totals = calculateListTotals(initialList);
assert.strictEqual(totals.totalPrice, 250); // only second item's nested left
console.log('✓ Delete item verified');

console.log('All end-to-end integration flow tests passed successfully! 🎉');
