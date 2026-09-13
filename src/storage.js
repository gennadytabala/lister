/**
 * Storage and import/export utilities
 */
import { generateId } from './utils.js';

export const STORAGE_KEY = 'lister_data_v1';

/**
 * Loads persisted data from browser localStorage
 * @returns {object|null}
 */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.lists) && data.lists.length > 0) {
      return data;
    }
    return null;
  } catch (error) {
    console.error('Failed to load data from localStorage:', error);
    return null;
  }
}

/**
 * Saves current application data to browser localStorage
 * @param {object} data
 * @returns {boolean}
 */
export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save data to localStorage:', error);
    return false;
  }
}

/**
 * Exports a list object as a downloadable .json file
 * @param {object} list
 */
export function exportListAsJson(list) {
  try {
    const cleanTitle = (list.title || 'list').trim().replace(/[/\\?%*:|"<>]/g, '-');
    const filename = `${cleanTitle || 'list'}.json`;
    const jsonStr = JSON.stringify(list, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export list to JSON:', error);
    alert('Не вдалося експортувати список: ' + error.message);
  }
}

/**
 * Recursively re-assigns fresh IDs to an imported list and all its nested elements
 * to avoid any ID collisions with existing state.
 *
 * @param {object} list
 * @returns {object}
 */
export function sanitizeImportedList(list) {
  const sanitizeItem = (item) => ({
    id: generateId(),
    content: typeof item.content === 'string' ? item.content : '',
    price: Number(item.price) || 0,
    time: Number(item.time) || 0,
    nestedLists: Array.isArray(item.nestedLists)
      ? item.nestedLists.map((nl) => sanitizeNestedList(nl))
      : []
  });

  const sanitizeNestedList = (nl) => ({
    id: generateId(),
    title: typeof nl.title === 'string' ? nl.title : '',
    items: Array.isArray(nl.items) ? nl.items.map(sanitizeItem) : []
  });

  return {
    id: generateId(),
    title: typeof list.title === 'string' && list.title.trim() ? list.title : 'Імпортований список',
    items: Array.isArray(list.items) ? list.items.map(sanitizeItem) : []
  };
}

/**
 * Reads and parses a JSON file selected by the user
 * @param {File} file
 * @returns {Promise<object>}
 */
export async function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Файл не вибрано'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || (typeof parsed !== 'object')) {
          throw new Error('Недійсний формат файлу JSON');
        }

        // Handle if file contains a single list or an array of lists or whole state
        if (Array.isArray(parsed.items)) {
          resolve(sanitizeImportedList(parsed));
        } else if (Array.isArray(parsed.lists) && parsed.lists.length > 0) {
          // If a whole backup was uploaded, take first or wrap
          resolve(sanitizeImportedList(parsed.lists[0]));
        } else {
          throw new Error('Файл не містить валідної структури списку (items)');
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Помилка читання файлу'));
    reader.readAsText(file, 'utf-8');
  });
}
