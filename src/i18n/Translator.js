import en from './locales/en.js';
import uk from './locales/uk.js';

const STORAGE_KEY = 'lister-locale';

class Translator {
  constructor() {
    this.locale = 'en';
    this.translations = { en, uk };
    this.listeners = new Set();
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'uk') {
      this.locale = saved;
    } else {
      const sysLang = navigator.language || 'en';
      this.locale = sysLang.startsWith('uk') ? 'uk' : 'en';
    }
    this.applyLangAttribute();
    this.initialized = true;
  }

  setLocale(locale) {
    if (locale !== 'en' && locale !== 'uk') return;
    this.locale = locale;
    localStorage.setItem(STORAGE_KEY, locale);
    this.applyLangAttribute();
    this.notifyListeners();
  }

  getLocale() {
    return this.locale;
  }

  t(key, params = {}) {
    const translation = this.translations[this.locale]?.[key]
      || this.translations['en']?.[key]
      || key;
    return this.interpolate(translation, params);
  }

  interpolate(str, params) {
    return str.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  onLocaleChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    for (const cb of this.listeners) {
      cb(this.locale);
    }
  }

  applyLangAttribute() {
    document.documentElement.lang = this.locale === 'uk' ? 'uk' : 'en';
  }
}

const translator = new Translator();
export default translator;