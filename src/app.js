/**
 * Main application entry point and event handlers
 */
import { AppState } from './state.js';
import { UIRenderer } from './render.js';
import { exportListAsJson, readJsonFile } from './storage.js';
import { parseNumber } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  if (!root) return;

  const state = new AppState();
  const renderer = new UIRenderer(state, root);

  // Subscribe renderer to state notifications
  state.subscribe((data, options = {}) => {
    if (options.skipFullRender) {
      // Small visual updates handled separately
      return;
    }
    if (options.type === 'UPDATE_ITEM') {
      renderer.refreshAllTotals();
    } else {
      renderer.renderFull(options);
    }
  });

  // Initial Full Render
  renderer.renderFull();

  // Ensure initial cursor focus is in content field of the first item
  const activeList = state.getActiveList();
  if (activeList && activeList.items.length > 0) {
    renderer.focusItemField(activeList.items[0].id);
  }

  // --- GLOBAL HEADER ACTIONS ---

  // Create new list
  const btnCreateList = document.getElementById('btn-create-list');
  if (btnCreateList) {
    btnCreateList.addEventListener('click', () => {
      state.createList('Новий список');
    });
  }

  // Export active list to JSON
  const btnExport = document.getElementById('btn-export-json');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const active = state.getActiveList();
      if (active) {
        exportListAsJson(active);
      }
    });
  }

  // Import JSON file
  const btnImport = document.getElementById('btn-import-json');
  const fileInput = document.getElementById('file-import-input');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => {
      fileInput.value = '';
      fileInput.click();
    });

    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const importedList = await readJsonFile(file);
        state.importList(importedList);
      } catch (err) {
        alert('Помилка імпорту JSON: ' + err.message);
      }
    });
  }

  // --- EVENT DELEGATION ON ROOT ---

  // 1. Click delegation
  root.addEventListener('click', (event) => {
    const target = event.target;

    // Switch tab
    const tabItem = target.closest('.tab-item');
    if (tabItem && tabItem.dataset.listId) {
      state.setActiveList(tabItem.dataset.listId);
      return;
    }

    // Delete list
    const btnDeleteList = target.closest('.js-btn-delete-list');
    if (btnDeleteList && btnDeleteList.dataset.listId) {
      const confirmed = window.confirm('Ви впевнені, що хочете видалити цей список?');
      if (confirmed) {
        state.deleteList(btnDeleteList.dataset.listId);
      }
      return;
    }

    // Add item at end of list or nested list
    const btnAddEnd = target.closest('.js-btn-add-item-end');
    if (btnAddEnd && btnAddEnd.dataset.parentListId) {
      state.addItem(btnAddEnd.dataset.parentListId);
      return;
    }

    // Add item after specific item
    const btnAddAfter = target.closest('.js-btn-add-item-after');
    if (btnAddAfter && btnAddAfter.dataset.itemId) {
      state.addItem(btnAddAfter.dataset.parentListId, btnAddAfter.dataset.itemId);
      return;
    }

    // Add nested list
    const btnAddNested = target.closest('.js-btn-add-nested');
    if (btnAddNested && btnAddNested.dataset.itemId) {
      state.addNestedList(btnAddNested.dataset.itemId);
      return;
    }

    // Delete item
    const btnDeleteItem = target.closest('.js-btn-delete-item');
    if (btnDeleteItem && btnDeleteItem.dataset.itemId) {
      state.deleteItem(btnDeleteItem.dataset.itemId);
      return;
    }

    // Delete nested list
    const btnDeleteNestedList = target.closest('.js-btn-delete-nested-list');
    if (btnDeleteNestedList && btnDeleteNestedList.dataset.nestedListId) {
      const confirmed = window.confirm('Ви впевнені, що хочете видалити весь цей вкладений список?');
      if (confirmed) {
        state.deleteNestedList(btnDeleteNestedList.dataset.nestedListId);
      }
      return;
    }
  });

  // 2. Input delegation (live editing of titles, content, price, time)
  root.addEventListener('input', (event) => {
    const target = event.target;

    // List title edit
    if (target.classList.contains('js-list-title')) {
      const listId = target.dataset.listId;
      state.updateListTitle(listId, target.value);
      renderer.updateTabsTitlesOnly();
      return;
    }

    // Item content edit
    if (target.classList.contains('js-item-content')) {
      const itemId = target.dataset.itemId;
      state.updateItem(itemId, { content: target.value });
      return;
    }

    // Item price edit
    if (target.classList.contains('js-item-price') && !target.readOnly) {
      const itemId = target.dataset.itemId;
      state.updateItem(itemId, { price: parseNumber(target.value) });
      return;
    }

    // Item time edit
    if (target.classList.contains('js-item-time') && !target.readOnly) {
      const itemId = target.dataset.itemId;
      state.updateItem(itemId, { time: parseNumber(target.value) });
      return;
    }
  });

  // 3. Keyboard navigation delegation (Enter, Ctrl+Enter, Cmd+Enter)
  root.addEventListener('keydown', (event) => {
    const target = event.target;

    // Handle keys only inside list-item content inputs
    if (target.classList.contains('js-item-content')) {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      if (event.key === 'Enter') {
        event.preventDefault();

        const itemEl = target.closest('.list-item');
        if (!itemEl) return;

        const itemId = itemEl.dataset.itemId;
        const parentListId = itemEl.dataset.parentListId;

        if (isCtrlOrCmd) {
          // Ctrl+Enter / Cmd+Enter: Create a new nested element inside this item
          state.addNestedList(itemId);
        } else {
          // Enter: Create a new item right below the current one in the same list
          state.addItem(parentListId, itemId);
        }
      }
    }
  });
});
