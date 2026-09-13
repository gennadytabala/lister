/**
 * UI Renderer for Lister
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
   * Renders the top navigation tabs
   */
  renderTabs() {
    const tabsContainer = this.root.querySelector('.js-tabs-container');
    if (!tabsContainer) return;

    const { lists, activeListId } = this.state.data;

    let html = '<div class="tabs-list" role="tablist" aria-label="Списки">';
    for (const list of lists) {
      const isActive = list.id === activeListId;
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
   * Renders the active list view (header, totals, items, nested lists)
   */
  renderActiveListView(list) {
    const listView = this.root.querySelector('.js-active-list-view');
    if (!listView) return;

    const totals = calculateListTotals(list);

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
                placeholder="Назва списку..."
                aria-label="Назва списку"
                data-list-id="${list.id}"
              />
            </div>
            <div class="list-header__actions">
              <button type="button" class="btn btn--danger btn--icon-text js-btn-delete-list" data-list-id="${list.id}" title="Видалити цей список">
                × видалити список
              </button>
            </div>
          </div>

          <!-- Totals Bar -->
          <div class="totals-bar js-list-totals">
            <div class="totals-bar__item">
              <span class="totals-bar__label">Разом ціна:</span>
              <span class="totals-bar__value js-total-price">${formatNumber(totals.totalPrice)}</span>
            </div>
            <div class="totals-bar__item">
              <span class="totals-bar__label">Разом час:</span>
              <span class="totals-bar__value js-total-time">${formatNumber(totals.totalTime)}</span>
            </div>
          </div>
        </header>

        <!-- Items Section -->
        <div class="items-list js-items-container" data-parent-list-id="${list.id}">
          ${this.renderItemsListHtml(list.items, list.id)}
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
  renderItemsListHtml(items, parentListId) {
    if (!Array.isArray(items) || items.length === 0) {
      return '';
    }

    return items.map((item, index) => this.renderItemHtml(item, parentListId, index + 1)).join('');
  }

  /**
   * Renders a single list item and its potential nested lists
   */
  renderItemHtml(item, parentListId, indexNumber) {
    const itemTotals = calculateItemTotals(item);
    const isComputed = itemTotals.isComputed;

    const priceValue = isComputed ? formatNumber(itemTotals.price) : (item.price ?? 0);
    const timeValue = isComputed ? formatNumber(itemTotals.time) : (item.time ?? 0);

    const priceClass = isComputed ? 'input-underlined input-underlined--number input-underlined--computed' : 'input-underlined input-underlined--number';
    const timeClass = isComputed ? 'input-underlined input-underlined--number input-underlined--computed' : 'input-underlined input-underlined--number';

    const priceTooltip = isComputed ? 'Розраховано автоматично з вкладених елементів' : 'Ціна';
    const timeTooltip = isComputed ? 'Розраховано автоматично з вкладених елементів' : 'Час';

    let nestedHtml = '';
    if (hasNestedLists(item)) {
      nestedHtml = `
        <div class="nested-container">
          ${item.nestedLists.map(nl => this.renderNestedListHtml(nl, item.id)).join('')}
        </div>
      `;
    }

    return `
      <article class="list-item" data-item-id="${item.id}" data-parent-list-id="${parentListId}">
        <div class="list-item__row">
          <span class="list-item__marker" aria-hidden="true">${indexNumber}.</span>

          <!-- Content field -->
          <div class="list-item__content-field">
            <input
              type="text"
              class="input-underlined js-item-content"
              value="${this.escape(item.content || '')}"
              placeholder="Зміст елемента..."
              aria-label="Зміст елемента"
              data-item-id="${item.id}"
            />
          </div>

          <!-- Price field -->
          <div class="list-item__price-field">
            <label class="list-item__field-label" for="price-${item.id}">ціна:</label>
            <input
              id="price-${item.id}"
              type="number"
              step="any"
              class="${priceClass} js-item-price"
              value="${priceValue}"
              ${isComputed ? 'readonly' : ''}
              title="${priceTooltip}"
              aria-label="Ціна"
              data-item-id="${item.id}"
            />
          </div>

          <!-- Time field -->
          <div class="list-item__time-field">
            <label class="list-item__field-label" for="time-${item.id}">час:</label>
            <input
              id="time-${item.id}"
              type="number"
              step="any"
              class="${timeClass} js-item-time"
              value="${timeValue}"
              ${isComputed ? 'readonly' : ''}
              title="${timeTooltip}"
              aria-label="Час"
              data-item-id="${item.id}"
            />
          </div>

          <!-- Item Actions -->
          <div class="list-item__actions">
            <button
              type="button"
              class="btn btn--icon-text js-btn-add-item-after"
              data-item-id="${item.id}"
              data-parent-list-id="${parentListId}"
              title="Додати елемент після цього (Enter)"
            >
              + рядок
            </button>
            <button
              type="button"
              class="btn btn--icon-text js-btn-add-nested"
              data-item-id="${item.id}"
              title="Додати вкладений список (Ctrl+Enter)"
            >
              + підсписок
            </button>
            <button
              type="button"
              class="btn btn--icon-text btn--danger js-btn-delete-item"
              data-item-id="${item.id}"
              title="Видалити цей елемент"
            >
              ×
            </button>
          </div>
        </div>

        ${nestedHtml}
      </article>
    `;
  }

  /**
   * Renders a nested list container with its header and items
   */
  renderNestedListHtml(nestedList, parentItemId) {
    const totals = calculateListTotals(nestedList);

    return `
      <section class="nested-list-box" data-nested-list-id="${nestedList.id}" data-parent-item-id="${parentItemId}">
        <header class="nested-list-header">
          <span class="nested-list-header__title">
            ${this.escape(nestedList.title || 'Вкладений список')}
          </span>

          <div class="totals-bar">
            <div class="totals-bar__item">
              <span class="totals-bar__label">Ціна:</span>
              <span class="totals-bar__value js-nested-price">${formatNumber(totals.totalPrice)}</span>
            </div>
            <div class="totals-bar__item">
              <span class="totals-bar__label">Час:</span>
              <span class="totals-bar__value js-nested-time">${formatNumber(totals.totalTime)}</span>
            </div>
          </div>

          <div class="nested-list-header__actions">
            <button
              type="button"
              class="btn btn--icon-text js-btn-add-item-end"
              data-parent-list-id="${nestedList.id}"
              title="Додати елемент у цей підсписок"
            >
              + додати в підсписок
            </button>
            <button
              type="button"
              class="btn btn--icon-text btn--danger js-btn-delete-nested-list"
              data-nested-list-id="${nestedList.id}"
              title="Видалити весь підсписок"
            >
              × видалити підсписок
            </button>
          </div>
        </header>

        <div class="items-list" data-parent-list-id="${nestedList.id}">
          ${this.renderItemsListHtml(nestedList.items, nestedList.id)}
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
    if (mainPriceEl) mainPriceEl.textContent = formatNumber(mainTotals.totalPrice);
    if (mainTimeEl) mainTimeEl.textContent = formatNumber(mainTotals.totalTime);

    // 2. Update all nested list header totals
    const nestedBoxes = this.root.querySelectorAll('.nested-list-box');
    for (const box of nestedBoxes) {
      const nestedListId = box.dataset.nestedListId;
      const nestedList = this.state.findListById(nestedListId);
      if (nestedList) {
        const nTotals = calculateListTotals(nestedList);
        const pEl = box.querySelector('.js-nested-price');
        const tEl = box.querySelector('.js-nested-time');
        if (pEl) pEl.textContent = formatNumber(nTotals.totalPrice);
        if (tEl) tEl.textContent = formatNumber(nTotals.totalTime);
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
