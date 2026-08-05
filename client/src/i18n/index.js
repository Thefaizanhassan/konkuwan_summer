import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import or from './locales/or.json';
import hi from './locales/hi.json';
 
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
];
 
const STORAGE_KEY = 'kk_language';
 
// Read the last-used language so the UI is already correct on first paint;
// the user's saved profile language overrides this once the session loads.
export function storedLanguage() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.some(l => l.code === v) ? v : 'en';
  } catch {
    return 'en';
  }
}
 
export function persistLanguage(lng) {
  try { localStorage.setItem(STORAGE_KEY, lng); } catch { /* ignore */ }
}
 
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      or: { translation: or },
      hi: { translation: hi },
    },
    lng: storedLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false }, // React already escapes
    returnEmptyString: false,
  });
 
// Keep <html lang> in sync and remember the choice
i18n.on('languageChanged', (lng) => {
  persistLanguage(lng);
  if (typeof document !== 'undefined') document.documentElement.lang = lng;
});
 
export default i18n;