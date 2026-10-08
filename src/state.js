/**
 * Application State and State Mutations
 */
import { generateId } from './utils.js';
import { loadData, saveData } from './storage.js';
import { hasNestedLists, calculateItemTotals } from './calculations.js';
import { translator } from './i18n/index.js';

export const ALLOWED_FIELDS = ['price', 'time', 'completed'];

export class AppState {
  constructor() {
    this.listeners = new Set();
    this.focusTargetId = null; // Used to direct focus after state change
    this.init();
  }

  init() {
    const saved = loadData();
    if (saved && Array.isArray(saved.lists) && saved.lists.length > 0) {
      this.data = saved;
      // Ensure all lists have a valid fields array
      for (const list of this.data.lists) {
        if (!Array.isArray(list.fields)) {
          list.fields = ['price', 'time'];
        }
      }
      if (!this.data.activeListId || !this.data.lists.some(l => l.id === this.data.activeListId)) {
        this.data.activeListId = this.data.lists[0].id;
      }
    } else {
      // Default initial state: 1 list, 1 empty item
      const initialListId = generateId();
      const initialItemId = generateId();
      this.data = {
        lists: [
          {
            id: initialListId,
            title: '',
            fields: ['price', 'time'],
            items: [
              {
                id: initialItemId,
                content: '',
                price: 0,
                time: 0,
                completed: false,
                nestedLists: []
              }
            ]
          }
        ],
        activeListId: initialListId
      };
      this.focusTargetId = initialItemId;
      this.persist();
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(options = {}) {
    for (const listener of this.listeners) {
      listener(this.data, options);
    }
  }

  persist() {
    saveData(this.data);
  }

  getActiveList() {
    return this.data.lists.find(l => l.id === this.data.activeListId) || this.data.lists[0];
  }

  setActiveList(listId) {
    if (this.data.lists.some(l => l.id === listId)) {
      this.data.activeListId = listId;
      this.persist();
      this.notify({ type: 'SWITCH_LIST' });
    }
  }

  createList(title = '') {
    const newListId = generateId();
    const firstItemId = generateId();
    const newList = {
      id: newListId,
      title: title.trim(),
      fields: ['price', 'time'],
      items: [
        {
          id: firstItemId,
          content: '',
          price: 0,
          time: 0,
          completed: false,
          nestedLists: []
        }
      ]
    };
    this.data.lists.push(newList);
    this.data.activeListId = newListId;
    this.focusTargetId = firstItemId;
    this.persist();
    this.notify({ type: 'CREATE_LIST', focusItemId: firstItemId });
    return newList;
  }

  updateListTitle(listId, title) {
    const list = this.data.lists.find(l => l.id === listId);
    if (list) {
      list.title = title;
      this.persist();
      this.notify({ type: 'UPDATE_LIST_TITLE', skipFullRender: true });
    }
  }

  /**
   * Toggles an optional field for the active list (price, time, completed).
   * Note: 'content' is always present and cannot be toggled.
   */
  toggleListField(listId, fieldName) {
    if (!ALLOWED_FIELDS.includes(fieldName)) return;
    const list = this.data.lists.find(l => l.id === listId);
    if (!list) return;

    if (!Array.isArray(list.fields)) {
      list.fields = ['price', 'time'];
    }

    const idx = list.fields.indexOf(fieldName);
    if (idx !== -1) {
      list.fields.splice(idx, 1);
    } else {
      list.fields.push(fieldName);
    }

    this.persist();
    this.notify({ type: 'TOGGLE_LIST_FIELD', listId, fieldName });
  }

  deleteList(listId) {
    if (this.data.lists.length <= 1) {
      // If deleting the only list, reset to a fresh empty list
      const freshListId = generateId();
      const freshItemId = generateId();
      this.data.lists = [
        {
          id: freshListId,
          title: '',
          fields: ['price', 'time'],
          items: [
            {
              id: freshItemId,
              content: '',
              price: 0,
              time: 0,
              completed: false,
              nestedLists: []
            }
          ]
        }
      ];
      this.data.activeListId = freshListId;
      this.focusTargetId = freshItemId;
    } else {
      this.data.lists = this.data.lists.filter(l => l.id !== listId);
      if (this.data.activeListId === listId) {
        this.data.activeListId = this.data.lists[0].id;
      }
    }
    this.persist();
    this.notify({ type: 'DELETE_LIST' });
  }

  importList(importedList) {
    if (!Array.isArray(importedList.fields)) {
      importedList.fields = ['price', 'time'];
    }
    this.data.lists.push(importedList);
    this.data.activeListId = importedList.id;
    this.persist();
    this.notify({ type: 'IMPORT_LIST' });
  }

  /**
   * Helper to find an item and its parent container (list or nested list)
   * in the entire list tree.
   */
  findItemContext(itemId) {
    const activeList = this.getActiveList();
    if (!activeList) return null;

    function searchInList(list) {
      for (let i = 0; i < list.items.length; i++) {
        const item = list.items[i];
        if (item.id === itemId) {
          return { item, parentContainer: list, index: i };
        }
        if (Array.isArray(item.nestedLists)) {
          for (const nestedList of item.nestedLists) {
            const res = searchInList(nestedList);
            if (res) return res;
          }
        }
      }
      return null;
    }

    return searchInList(activeList);
  }

  /**
   * Helper to find a list (root list or nested list) by id
   */
  findListById(listId) {
    const activeList = this.getActiveList();
    if (!activeList) return null;
    if (activeList.id === listId) return activeList;

    function searchInItems(items) {
      for (const item of items) {
        if (Array.isArray(item.nestedLists)) {
          for (const nl of item.nestedLists) {
            if (nl.id === listId) return nl;
            const res = searchInItems(nl.items);
            if (res) return res;
          }
        }
      }
      return null;
    }

    return searchInItems(activeList.items);
  }

  /**
   * Adds an item to a list or nested list.
   * If afterItemId is given, inserts right after that item.
   */
  addItem(listId, afterItemId = null) {
    let targetList = this.findListById(listId);
    if (!targetList) {
      targetList = this.getActiveList();
    }
    if (!targetList) return null;

    const newItem = {
      id: generateId(),
      content: '',
      price: 0,
      time: 0,
      completed: false,
      nestedLists: []
    };

    if (afterItemId) {
      const idx = targetList.items.findIndex(it => it.id === afterItemId);
      if (idx !== -1) {
        targetList.items.splice(idx + 1, 0, newItem);
      } else {
        targetList.items.push(newItem);
      }
    } else {
      targetList.items.push(newItem);
    }

    this.focusTargetId = newItem.id;
    this.persist();
    this.notify({ type: 'ADD_ITEM', focusItemId: newItem.id });
    return newItem;
  }

  deleteItem(itemId) {
    const ctx = this.findItemContext(itemId);
    if (!ctx) return;

    ctx.parentContainer.items.splice(ctx.index, 1);

    // If active list becomes completely empty, add 1 empty item
    const activeList = this.getActiveList();
    if (activeList.items.length === 0) {
      const freshItem = {
        id: generateId(),
        content: '',
        price: 0,
        time: 0,
        completed: false,
        nestedLists: []
      };
      activeList.items.push(freshItem);
      this.focusTargetId = freshItem.id;
    }

    this.persist();
    this.notify({ type: 'DELETE_ITEM' });
  }

  /**
   * Updates an item's fields (content, price, time, completed).
   * If item has nested lists:
   * - price & time cannot be manually set (they are aggregated from children).
   * - completed toggles all descendant items recursively.
   */
  updateItem(itemId, fields = {}) {
    const ctx = this.findItemContext(itemId);
    if (!ctx) return;

    if (typeof fields.content !== 'undefined') {
      ctx.item.content = fields.content;
      // Also sync nested list titles with parent item content
      if (Array.isArray(ctx.item.nestedLists)) {
        for (const nl of ctx.item.nestedLists) {
          nl.title = fields.content;
        }
      }
    }

    const hasNested = hasNestedLists(ctx.item);

    // Direct price/time updates only allowed if item has no nested lists
    if (!hasNested) {
      if (typeof fields.price !== 'undefined') {
        ctx.item.price = fields.price;
      }
      if (typeof fields.time !== 'undefined') {
        ctx.item.time = fields.time;
      }
    }

    // Completed state update
    if (typeof fields.completed !== 'undefined') {
      const targetVal = Boolean(fields.completed);
      if (hasNested) {
        // Toggle all descendant items recursively
        this.setCompletedRecursive(ctx.item, targetVal);
      } else {
        ctx.item.completed = targetVal;
      }
    }

    this.persist();
    this.notify({ type: 'UPDATE_ITEM', itemId });
  }

  /**
   * Toggles completed state for an item.
   * If parent has nested lists, toggles between all-true and all-false.
   */
  toggleItemCompleted(itemId) {
    const ctx = this.findItemContext(itemId);
    if (!ctx) return;

    if (hasNestedLists(ctx.item)) {
      const totals = calculateItemTotals(ctx.item);
      // If currently all completed, uncheck all. Otherwise, check all.
      const nextVal = !totals.completed;
      this.setCompletedRecursive(ctx.item, nextVal);
    } else {
      ctx.item.completed = !ctx.item.completed;
    }

    this.persist();
    this.notify({ type: 'UPDATE_ITEM', itemId });
  }

  setCompletedRecursive(item, val) {
    item.completed = val;
    if (Array.isArray(item.nestedLists)) {
      for (const nl of item.nestedLists) {
        if (Array.isArray(nl.items)) {
          for (const child of nl.items) {
            this.setCompletedRecursive(child, val);
          }
        }
      }
    }
  }

  /**
   * Adds a nested list to the specified parent item.
   * Resets parent's own price & time to 0.
   */
  addNestedList(parentItemId) {
    const ctx = this.findItemContext(parentItemId);
    if (!ctx) return null;

    if (!Array.isArray(ctx.item.nestedLists)) {
      ctx.item.nestedLists = [];
    }

    // Reset parent's own price and time to 0
    ctx.item.price = 0;
    ctx.item.time = 0;

    const firstNestedItemId = generateId();
    const nestedList = {
      id: generateId(),
      title: ctx.item.content || translator.t('nested.title'),
      items: [
        {
          id: firstNestedItemId,
          content: '',
          price: 0,
          time: 0,
          completed: false,
          nestedLists: []
        }
      ]
    };

    ctx.item.nestedLists.push(nestedList);
    this.focusTargetId = firstNestedItemId;
    this.persist();
    this.notify({ type: 'ADD_NESTED_LIST', focusItemId: firstNestedItemId });
    return nestedList;
  }

  deleteNestedList(nestedListId) {
    const activeList = this.getActiveList();
    if (!activeList) return;

    function removeRecursive(items) {
      for (const item of items) {
        if (Array.isArray(item.nestedLists)) {
          const idx = item.nestedLists.findIndex(nl => nl.id === nestedListId);
          if (idx !== -1) {
            item.nestedLists.splice(idx, 1);
            return true;
          }
          if (removeRecursive(item.nestedLists.flatMap(nl => nl.items))) {
            return true;
          }
        }
      }
      return false;
    }

    removeRecursive(activeList.items);
    this.persist();
    this.notify({ type: 'DELETE_NESTED_LIST' });
  }
}