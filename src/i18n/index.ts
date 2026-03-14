import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from './translations';

const savedLang = localStorage.getItem('mediai_language') || 'en';

i18n.use(initReactI18next).init({
  resources: translations,
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
