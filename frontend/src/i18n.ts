import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

export const i18n = i18next.use(initReactI18next).createInstance();

void i18n.init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});
