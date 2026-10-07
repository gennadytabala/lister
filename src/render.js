/**
 * UI Renderer for Lister — Text-like Interface (Page of text with customizable fields)
 */
import { formatNumber } from './utils.js';
import { calculateItemTotals, calculateListTotals, hasNestedLists } from './calculations.js';

export class UIRenderer {
  constructor(state, rootElement) {
    this.state = state;
    this.root = rootElement;
  }

  /**
   * Complete render of tabs and active list
   */
  renderFull(options = {}) {
    const activeList = this.state.getActiveList();
    if (!activeList) return;

    this.renderTabs();
    this.renderActiveListView(activeList);
    this.syncCheckboxesState();

    // Manage focus target if requested
    const focusItemId = options.focusItemId || this.state.focusTargetId;
    if (focusItemId) {
      this.focusItemField(focusItemId);
      this.state.focusTargetId = null;
    }
  }

  /**
   * Focuses the content input of a specific item
   */
  focusItemField(itemId) {
    requestAnimationFrame(() => {
      const itemEl = this.root.querySelector(`[data-item-id="${itemId}"]`);
      if (itemEl) {
        const input = itemEl.querySelector('.js-item-content');
        if (input) {
          input.focus();
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }
      }
    });
  }

  /**
   * Synchronizes checked and indeterminate properties on all checkboxes
   */
  syncCheckboxesState() {
    const checkboxes = this.root.querySelectorAll('.js-item-completed');
    for (const cb of checkboxes) {
      const itemId = cb.dataset.itemId;
      const ctx = this.state.findItemContext(itemId);
      if (ctx) {
        const t = calculateItemTotals(ctx.item);
        cb.checked = t.completed;
        cb.indeterminate = t.isIndeterminate;

        // Visual class on row for completed styling
        const row = cb.closest('.list-item');
        if (row) {
          if (t.completed) {
            row.classList.add('list-item--completed');
          } else {
            row.classList.remove('list-item--completed');
          }
        }
      }
    }
  }

  /**
   * Renders the top navigation tabs as a textual index
   */
  renderTabs() {
    const tabsContainer = this.root.querySelector('.js-tabs-container');
    if (!tabsContainer) return;

    const { lists, activeListId } = this.state.data;

    let html = '<div class="tabs-list" role="tablist" aria-label="Списки">';
    html += '<span class="tabs-label">Списки:</span>';
    for (let i = 0; i < lists.length; i++) {
      const list = lists[i];
      const isActive = list.id === activeListId;
      if (i > 0) {
        html += '<span class="sep" aria-hidden="true">·</span>';
      }
      html += `
        <button
          type="button"
          role="tab"
          class="tab-item ${isActive ? 'tab-item--active' : ''}"
          data-list-id="${list.id}"
          aria-selected="${isActive}"
          title="${list.title || 'Список'}"
        >
          <span class="tab-item__name">${this.escape(list.title || 'Новий список')}</span>
        </button>
      `;
    }
    html += '</div>';

    tabsContainer.innerHTML = html;
  }

  /**
   * Updates only tabs titles (e.g. during inline list rename) without losing focus
   */
  updateTabsTitlesOnly() {
    const tabs = this.root.querySelectorAll('.tab-item');
    for (const tab of tabs) {
      const listId = tab.dataset.listId;
      const list = this.state.data.lists.find(l => l.id === listId);
      if (list) {
        const nameSpan = tab.querySelector('.tab-item__name');
        if (nameSpan) {
          nameSpan.textContent = list.title || 'Новий список';
        }
      }
    }
  }

  /**
   * Renders the active list view (header, field toggles, totals summary, items, nested lists)
   */
  renderActiveListView(list) {
    const listView = this.root.querySelector('.js-active-list-view');
    if (!listView) return;

    const fields = Array.isArray(list.fields) ? list.fields : ['price', 'time'];
    const hasPrice = fields.includes('price');
    const hasTime = fields.includes('time');
    const hasCompleted = fields.includes('completed');

    const totals = calculateListTotals(list);

    // Build prose summary string for header totals
    const parts = [];
    if (hasCompleted) {
      parts.push(`виконано <span class="totals-bar__value js-total-completed">${totals.completedCount}/${totals.totalItemsCount}</span>`);
    }
    if (hasPrice) {
      parts.push(`ціна <span class="totals-bar__value js-total-price">${formatNumber(totals.totalPrice)}</span> грн`);
    }
    if (hasTime) {
      parts.push(`час <span class="totals-bar__value js-total-time">${formatNumber(totals.totalTime)}</span> год`);
    }

    const totalsSentence = parts.length > 0
      ? `Разом у списку: ${parts.join(', ')}`
      : `У списку: ${totals.totalItemsCount} елементів`;

    listView.innerHTML = `
      <section class="list-view" aria-label="Поточний список">
        <!-- List Header -->
        <header class="list-header">
          <div class="list-header__main-row">
            <div class="list-header__title-wrapper">
              <input
                type="text"
                class="list-header__title-input js-list-title"
                value="${this.escape(list.title || '')}"
                placeholder="Без назви..."
                aria-label="Назва списку"
                data-list-id="${list.id}"
              />
            </div>
            <div class="list-header__actions">
              <button type="button" class="btn btn--danger btn--icon-text js-btn-delete-list" data-list-id="${list.id}" title="Видалити цей список">
                [× видалити список]
              </button>
            </div>
          </div>

          <!-- Fields Configuration Row (Requirement 14) -->
          <div class="fields-config">
            <span class="fields-config__label">Поля:</span>
            <span class="fields-config__always">[зміст]</span>
            <button
              type="button"
              class="btn btn--field-toggle ${hasPrice ? 'btn--field-active' : ''} js-btn-toggle-field"
              data-list-id="${list.id}"
              data-field="price"
              title="${hasPrice ? 'Прибрати поле вартості' : 'Додати поле вартості'}"
            >
              ${hasPrice ? '[вартість ✓]' : '[+ вартість]'}
            </button>
            <button
              type="button"
              class="btn btn--field-toggle ${hasTime ? 'btn--field-active' : ''} js-btn-toggle-field"
              data-list-id="${list.id}"
              data-field="time"
              title="${hasTime ? 'Прибрати поле часу' : 'Додати поле часу'}"
            >
              ${hasTime ? '[час ✓]' : '[+ час]'}
            </button>
            <button
              type="button"
              class="btn btn--field-toggle ${hasCompleted ? 'btn--field-active' : ''} js-btn-toggle-field"
              data-list-id="${list.id}"
              data-field="completed"
              title="${hasCompleted ? 'Прибрати поле виконано' : 'Додати поле виконано'}"
            >
              ${hasCompleted ? '[виконано ✓]' : '[+ виконано]'}
            </button>
          </div>

          <!-- Totals Prose Sentence -->
          <div class="totals-bar js-list-totals">
            <span class="totals-bar__text">${totalsSentence}</span>
          </div>
        </header>

        <!-- Items Section -->
        <div class="items-list js-items-container" data-parent-list-id="${list.id}">
          ${this.renderItemsListHtml(list.items, list.id, fields)}
        </div>

        <!-- Add Item Button at list end -->
        <div class="list-add-row">
          <button type="button" class="btn btn--accent js-btn-add-item-end" data-parent-list-id="${list.id}">
            + додати елемент
          </button>
        </div>
      </section>
    `;
  }

  /**
   * Recursively renders items list HTML
   */
  renderItemsListHtml(items, parentListId, activeFields) {
    if (!Array.isArray(items) || items.length === 0) {
      return '';
    }

    return items.map((item, index) => this.renderItemHtml(item, parentListId, index + 1, activeFields)).join('');
  }

  /**
   * Renders a single list item as a text line with only enabled fields
   */
  renderItemHtml(item, parentListId, indexNumber, activeFields) {
    const itemTotals = calculateItemTotals(item);
    const isComputed = itemTotals.isComputed;

    const hasPrice = activeFields.includes('price');
    const hasTime = activeFields.includes('time');
    const hasCompleted = activeFields.includes('completed');

    // For non-computed fields: show empty string when value is 0 so placeholder appears dimly
    const priceValue = isComputed ? formatNumber(itemTotals.price) : (item.price || '');
    const timeValue = isComputed ? formatNumber(itemTotals.time) : (item.time || '');

    const priceClass = isComputed ? 'input-underlined input-underlined--number input-underlined--computed' : 'input-underlined input-underlined--number';
    const timeClass = isComputed ? 'input-underlined input-underlined--number input-underlined--computed' : 'input-underlined input-underlined--number';

    const priceTooltip = isComputed ? 'Розраховано автоматично з вкладених елементів' : 'Ціна';
    const timeTooltip = isComputed ? 'Розраховано автоматично з вкладених елементів' : 'Час';

    // 1. Checkbox field (if enabled)
    let completedHtml = '';
    if (hasCompleted) {
      completedHtml = `
        <label class="list-item__completed-field" title="${isComputed ? 'Статус виконання вкладених підсписків' : 'Позначити як виконано'}">
          <input
            type="checkbox"
            class="checkbox-text js-item-completed"
            data-item-id="${item.id}"
            ${itemTotals.completed ? 'checked' : ''}
            aria-label="Виконано"
          />
        </label>
      `;
    }

    // 2. Price field (if enabled)
    let priceHtml = '';
    if (hasPrice) {
      priceHtml = `
        <div class="list-item__price-field">
          <label class="list-item__field-label" for="price-${item.id}">ціна:</label>
          <input
            id="price-${item.id}"
            type="number"
            step="any"
            class="${priceClass} js-item-price"
            value="${priceValue}"
            placeholder="0"
            ${isComputed ? 'readonly' : ''}
            title="${priceTooltip}"
            aria-label="Ціна"
            data-item-id="${item.id}"
          />
          <span class="list-item__unit">грн</span>
        </div>
      `;
    }

    // 3. Time field (if enabled)
    let timeHtml = '';
    if (hasTime) {
      timeHtml = `
        <div class="list-item__time-field">
          <label class="list-item__field-label" for="time-${item.id}">час:</label>
          <input
            id="time-${item.id}"
            type="number"
            step="any"
            class="${timeClass} js-item-time"
            value="${timeValue}"
            placeholder="0"
            ${isComputed ? 'readonly' : ''}
            title="${timeTooltip}"
            aria-label="Час"
            data-item-id="${item.id}"
          />
          <span class="list-item__unit">год</span>
        </div>
      `;
    }

    // 4. Separator if numbers follow
    const separatorHtml = (hasPrice || hasTime)
      ? '<span class="list-item__sep" aria-hidden="true">—</span>'
      : '';

    // 5. Nested lists
    let nestedHtml = '';
    if (hasNestedLists(item)) {
      nestedHtml = `
        <div class="nested-container">
          ${item.nestedLists.map(nl => this.renderNestedListHtml(nl, item.id, activeFields)).join('')}
        </div>
      `;
    }

    return `
      <article class="list-item ${itemTotals.completed ? 'list-item--completed' : ''}" data-item-id="${item.id}" data-parent-list-id="${parentListId}">
        <div class="list-item__row">
          ${completedHtml}
          <span class="list-item__marker" aria-hidden="true">${indexNumber}.</span>

          <!-- Content field (Always present) -->
          <div class="list-item__content-field">
            <input
              type="text"
              class="input-underlined js-item-content"
              value="${this.escape(item.content || '')}"
              placeholder="введіть зміст..."
              aria-label="Зміст елемента"
              data-item-id="${item.id}"
            />
          </div>

          ${separatorHtml}
          ${priceHtml}
          ${timeHtml}

          <!-- Item Actions as textual links -->
          <div class="list-item__actions">
            <button
              type="button"
              class="btn btn--icon-text js-btn-add-item-after"
              data-item-id="${item.id}"
              data-parent-list-id="${parentListId}"
              title="Додати елемент після цього (Enter)"
            >
              [+ рядок]
            </button>
            <button
              type="button"
              class="btn btn--icon-text js-btn-add-nested"
              data-item-id="${item.id}"
              title="Додати вкладений список (Ctrl+Enter)"
            >
              [+ підсписок]
            </button>
            <button
              type="button"
              class="btn btn--icon-text btn--danger js-btn-delete-item"
              data-item-id="${item.id}"
              title="Видалити цей елемент"
            >
              [×]
            </button>
          </div>
        </div>

        ${nestedHtml}
      </article>
    `;
  }

  /**
   * Renders a nested list container with textual outline header and items
   */
  renderNestedListHtml(nestedList, parentItemId, activeFields) {
    const totals = calculateListTotals(nestedList);

    const hasPrice = activeFields.includes('price');
    const hasTime = activeFields.includes('time');
    const hasCompleted = activeFields.includes('completed');

    const parts = [];
    if (hasCompleted) {
      parts.push(`виконано <span class="totals-bar__value js-nested-completed">${totals.completedCount}/${totals.totalItemsCount}</span>`);
    }
    if (hasPrice) {
      parts.push(`ціна <span class="totals-bar__value js-nested-price">${formatNumber(totals.totalPrice)}</span> грн`);
    }
    if (hasTime) {
      parts.push(`час <span class="totals-bar__value js-nested-time">${formatNumber(totals.totalTime)}</span> год`);
    }

    const totalsSnippet = parts.length > 0
      ? `— разом: ${parts.join(', ')}`
      : '';

    return `
      <section class="nested-list-box" data-nested-list-id="${nestedList.id}" data-parent-item-id="${parentItemId}">
        <header class="nested-list-header">
          <div class="nested-list-header__info">
            <span class="nested-list-header__marker" aria-hidden="true">↳</span>
            <span class="nested-list-header__title">
              ${this.escape(nestedList.title || 'Вкладений список')}
            </span>
            <span class="nested-list-header__totals">
              ${totalsSnippet}
            </span>
          </div>

          <div class="nested-list-header__actions">
            <button
              type="button"
              class="btn btn--icon-text js-btn-add-item-end"
              data-parent-list-id="${nestedList.id}"
              title="Додати елемент у цей підсписок"
            >
              [+ додати в підсписок]
            </button>
            <button
              type="button"
              class="btn btn--icon-text btn--danger js-btn-delete-nested-list"
              data-nested-list-id="${nestedList.id}"
              title="Видалити весь підсписок"
            >
              [× видалити підсписок]
            </button>
          </div>
        </header>

        <div class="items-list" data-parent-list-id="${nestedList.id}">
          ${this.renderItemsListHtml(nestedList.items, nestedList.id, activeFields)}
        </div>
      </section>
    `;
  }

  /**
   * Fast refresh of calculated totals throughout the DOM without resetting input focus
   */
  refreshAllTotals() {
    const activeList = this.state.getActiveList();
    if (!activeList) return;

    // 1. Update main list totals
    const mainTotals = calculateListTotals(activeList);
    const mainPriceEl = this.root.querySelector('.list-header .js-total-price');
    const mainTimeEl = this.root.querySelector('.list-header .js-total-time');
    const mainCompletedEl = this.root.querySelector('.list-header .js-total-completed');

    if (mainPriceEl) mainPriceEl.textContent = formatNumber(mainTotals.totalPrice);
    if (mainTimeEl) mainTimeEl.textContent = formatNumber(mainTotals.totalTime);
    if (mainCompletedEl) mainCompletedEl.textContent = `${mainTotals.completedCount}/${mainTotals.totalItemsCount}`;

    // 2. Update all nested list header totals
    const nestedBoxes = this.root.querySelectorAll('.nested-list-box');
    for (const box of nestedBoxes) {
      const nestedListId = box.dataset.nestedListId;
      const nestedList = this.state.findListById(nestedListId);
      if (nestedList) {
        const nTotals = calculateListTotals(nestedList);
        const pEl = box.querySelector('.js-nested-price');
        const tEl = box.querySelector('.js-nested-time');
        const cEl = box.querySelector('.js-nested-completed');
        if (pEl) pEl.textContent = formatNumber(nTotals.totalPrice);
        if (tEl) tEl.textContent = formatNumber(nTotals.totalTime);
        if (cEl) cEl.textContent = `${nTotals.completedCount}/${nTotals.totalItemsCount}`;
      }
    }

    // 3. Update computed inputs of parent items
    const computedPriceInputs = this.root.querySelectorAll('.input-underlined--computed.js-item-price');
    for (const input of computedPriceInputs) {
      const itemId = input.dataset.itemId;
      const ctx = this.state.findItemContext(itemId);
      if (ctx) {
        const itemTotals = calculateItemTotals(ctx.item);
        input.value = formatNumber(itemTotals.price);
      }
    }

    const computedTimeInputs = this.root.querySelectorAll('.input-underlined--computed.js-item-time');
    for (const input of computedTimeInputs) {
      const itemId = input.dataset.itemId;
      const ctx = this.state.findItemContext(itemId);
      if (ctx) {
        const itemTotals = calculateItemTotals(ctx.item);
        input.value = formatNumber(itemTotals.time);
      }
    }

    // 4. Update nested titles that reflect item content
    for (const box of nestedBoxes) {
      const parentItemId = box.dataset.parentItemId;
      const ctx = this.state.findItemContext(parentItemId);
      if (ctx) {
        const titleEl = box.querySelector('.nested-list-header__title');
        if (titleEl) {
          titleEl.textContent = ctx.item.content || 'Вкладений список';
        }
      }
    }

    // 5. Update checkboxes state (checked + indeterminate)
    this.syncCheckboxesState();
  }

  /**
   * Escape HTML special characters
   */
  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
