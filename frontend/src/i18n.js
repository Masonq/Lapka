import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./locales/ru.json";
import sr from "./locales/sr.json";

const savedLang = localStorage.getItem("lang");
const defaultLang = savedLang || "ru";

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    sr: { translation: sr },
  },
  lng: defaultLang,
  fallbackLng: "ru",
  interpolation: { escapeValue: false },
});

export function setLanguage(lang) {
  localStorage.setItem("lang", lang);
  i18n.changeLanguage(lang);
}

export default i18n;
