// Tiny i18n runtime: locale detection (saved → browser → default), a pure
// translate() with {placeholder} substitution + English fallback, and a React
// provider/hook. No dependency — the catalog lives in locales.js.
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DEFAULT_LOCALE, LOCALES, messages } from "./locales";

const STORAGE_KEY = "casino_locale";

// Pure — safe to unit-test. Falls back to the English string, then the raw key.
export function translate(locale, key, vars) {
  const dict = messages[locale] || messages[DEFAULT_LOCALE];
  let s = dict[key];
  if (s === undefined) s = messages[DEFAULT_LOCALE][key];
  if (s === undefined) return key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

export function detectLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES[saved]) return saved;
  } catch {
    /* storage blocked — fall through to browser detection */
  }
  const prefs = (typeof navigator !== "undefined" && (navigator.languages || [navigator.language])) || [];
  for (const p of prefs) {
    if (!p) continue;
    const base = p.toLowerCase().split("-")[0];
    if (LOCALES[base]) return base;
  }
  return DEFAULT_LOCALE;
}

const I18nContext = createContext({ locale: DEFAULT_LOCALE, setLocale: () => {}, t: (k) => k });

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(detectLocale);
  const setLocale = useCallback((next) => {
    if (!LOCALES[next]) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* non-persistent is fine */
    }
    setLocaleState(next);
    if (typeof document !== "undefined") document.documentElement.lang = next;
  }, []);
  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;
