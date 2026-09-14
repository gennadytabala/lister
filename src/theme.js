/**
 * Theme management: light / dark / system
 * Persists preference in localStorage under 'lister_theme'
 */

const STORAGE_KEY = 'lister_theme';

// Ordered cycle: system → light → dark → system → ...
const THEMES = ['system', 'light', 'dark'];

const LABELS = {
  system: '◑ system',
  light:  '☀ light',
  dark:   '☾ dark',
};

/**
 * Returns the currently saved theme preference
 * @returns {'system'|'light'|'dark'}
 */
export function getSavedTheme() {
  const val = localStorage.getItem(STORAGE_KEY);
  return THEMES.includes(val) ? val : 'system';
}

/**
 * Applies the given theme to <html> element and saves to localStorage
 * @param {'system'|'light'|'dark'} theme
 */
export function applyTheme(theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Returns the next theme in the cycle
 * @param {'system'|'light'|'dark'} current
 * @returns {'system'|'light'|'dark'}
 */
export function nextTheme(current) {
  const idx = THEMES.indexOf(current);
  return THEMES[(idx + 1) % THEMES.length];
}

/**
 * Initialises the theme toggle button.
 * @param {string} buttonId - ID of the toggle button element
 */
export function initThemeToggle(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  let current = getSavedTheme();

  // Sync button label to current state (applied by the head script already)
  btn.textContent = LABELS[current];

  btn.addEventListener('click', () => {
    current = nextTheme(current);
    applyTheme(current);
    btn.textContent = LABELS[current];
  });

  // When OS preference changes and we're in 'system' mode, nothing extra needed —
  // CSS @media handles it automatically. But we update color-scheme hint:
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    // Force CSS reflow hint if in system mode
    if (current === 'system') {
      document.documentElement.removeAttribute('data-theme');
    }
  });
}
