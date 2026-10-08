import { useState, useEffect, useCallback } from "react";
import ru from "@/locales/ru.json";
import kz from "@/locales/kz.json";
import en from "@/locales/en.json";

export type Language = "ru" | "kz" | "en";

const dictionaries: Record<Language, Record<string, string>> = {
  ru: ru as Record<string, string>,
  kz: kz as Record<string, string>,
  en: en as Record<string, string>,
};

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "ru", label: "RU" },
  { code: "kz", label: "KZ" },
  { code: "en", label: "EN" },
];

const STORAGE_KEY = "phishguard_lang";

function getInitialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in dictionaries) return stored as Language;
  return "ru";
}

export function useI18n() {
  const [lang, setLang] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const t = useCallback(
    (key: string): string => {
      return dictionaries[lang][key] ?? dictionaries.ru[key] ?? key;
    },
    [lang]
  );

  return { lang, setLang, t };
}
