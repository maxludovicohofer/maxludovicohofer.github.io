import { getRelativeLocaleUrl } from "astro:i18n";
import { defaultLocale, locales } from "./astro-config.mts";
import { getPathSection, standardizePath } from "./text";

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
  const standardPath = standardizePath(path).slice(1);
  const [maybeLocale, ...sections] = standardPath.split("/");

  return locales.includes(maybeLocale as (typeof locales)[number])
    ? sections.join("/")
    : standardPath;
};

export const addLocaleToLink = (link: string, locale?: string) =>
  locale && locale !== defaultLocale
    ? getRelativeLocaleUrl(locale, link)
    : link;
