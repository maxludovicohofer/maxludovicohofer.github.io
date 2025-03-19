import type { AstroGlobal } from "astro";
import { defaultLocale, type locales } from "./astro-config";

export type LocaleInfo = {
  languageName: string;
  delimiters: string;
  surnameFirst?: boolean;
  nameSeparator?: string;
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
    surnameFirst: true,
    nameSeparator: "・",
    getYear: (date) => date.replaceAll(/\b\d{1,2}[日月]/g, ""),
    getYearMonth: (date) => date.replaceAll(/\b\d{1,2}日/g, ""),
  },
};

export const getCurrentLocale = (astro: AstroGlobal) =>
  (astro.currentLocale ?? defaultLocale) as (typeof locales)[number];

export const getLocaleInfo = (astro: AstroGlobal) =>
  localeInfo[getCurrentLocale(astro)];
