"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_LANG, type Lang } from "./content";

const STORAGE_KEY = "universe-lang";

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
}

const LangContext = createContext<LangState>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  toggle: () => {},
});

export function useLang(): LangState {
  return useContext(LangContext);
}

function detectLang(): Lang {
  if (typeof navigator === "undefined") return DEFAULT_LANG;
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

/**
 * Langue de l'expérience : choix persisté, sinon langue du navigateur.
 * `document.documentElement.lang` est tenu à jour pour les lecteurs d'écran.
 */
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // stockage indisponible (mode privé) → détection navigateur
    }
    setLangState(stored === "fr" || stored === "en" ? stored : detectLang());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore : le choix reste valable pour la session
    }
  }, []);

  const value = useMemo<LangState>(
    () => ({ lang, setLang, toggle: () => setLang(lang === "fr" ? "en" : "fr") }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
