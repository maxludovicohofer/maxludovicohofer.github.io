import { getRelativeLocaleUrl } from "astro:i18n";
import { defaultLocale, locales } from "./astro-config.mts";
import { getPathSection, standardizePath } from "./text";
import type { AstroGlobal } from "astro";

export type LocaleInfo = {
  languageName: string;
  delimiters: string;
  getYearMonth: (date: string) => string;
  getYear: (date: string) => string;
};

export const localeInfo: Record<(typeof locales)[number], LocaleInfo> = {
  en: {
    languageName: "English",
    delimiters: ".?!",
    getYear: (date) => date.replaceAll(/\D+/g, "").slice(-4),
    getYearMonth: (date) => date.replace(/\d+,/, ""),
  },
  ja: {
    languageName: "日本語",
    delimiters: "。？！",
    getYear: (date) => date.replaceAll(/\b\d{1,2}[日月]/g, ""),
    getYearMonth: (date) => date.replaceAll(/\b\d{1,2}日/g, ""),
  },
};

export type PossibleTranslations = Exclude<
  (typeof locales)[number],
  typeof defaultLocale
>;

export const getLocaleFromPath = (path: string) => {
  const possibleLocale = getPathSection(path, 0) as PossibleTranslations;

  if (locales.includes(possibleLocale)) return possibleLocale;

  return defaultLocale;
};

export const getPreferredLocale = () => {
  const savedLocale = localStorage.getItem("language");

  if (savedLocale) return savedLocale;

  for (const language of navigator.languages) {
    const matchingLocale = locales.find((locale) =>
      language.startsWith(locale)
    );

    if (matchingLocale) return matchingLocale;
  }

  return defaultLocale;
};

export const getPathWithoutLocale = (path: string) => {
  const standardPath = standardizePath(path);
  const [maybeLocale, ...sections] = standardPath.split("/");

  return locales.includes(maybeLocale as (typeof locales)[number])
    ? sections.join("/")
    : standardPath;
};

export const addLocaleToLink = (link: string, locale?: string) =>
  locale && locale !== defaultLocale
    ? standardizePath(getRelativeLocaleUrl(locale, link))
    : link;

export const getCurrentLocale = (astro: AstroGlobal) =>
  (astro.currentLocale ?? defaultLocale) as (typeof locales)[number];
