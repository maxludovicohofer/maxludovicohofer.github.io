import { defaultLocale, locales } from "@integrations/astro-config.mjs";
import type { AstroGlobal } from "astro";
import { getEntry, type CollectionEntry } from "astro:content";
import { DEEPL_API_KEY } from "astro:env/server";
import * as deepl from "deepl-node";
import { translationsPath } from "src/content.config";
import { diff, fixNewLines, highlightCharacter } from "./text";
import { groupBy, indexOfMin } from "./array";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import type { PossibleTranslations } from "./i18n";
import { parse } from "node-html-parser";

const deeplTrans = DEEPL_API_KEY
  ? new deepl.Translator(DEEPL_API_KEY)
  : undefined;

export type TranslateOptions = {
  force?: boolean;
  debug?: boolean;
  allowedTranslations?: number;
  noCache?: boolean;
};

export type I18nOptions = deepl.TranslatorOptions &
  Partial<Record<PossibleTranslations, string>> &
  TranslateOptions;

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

export const i18n = (astro: AstroGlobal, globalOptions?: I18nOptions) => {
  return async (text: string, options?: I18nOptions) => {
    const toLocale = getCurrentLocale(astro);

    if (toLocale === defaultLocale) return text;

    return await queueTranslation(text, toLocale, {
      ...globalOptions,
      ...options,
    });
  };
};

let translationCount = 0;

// The buffer where text to translate is stored
let translateBuffer: {
  text: string;
  toLocale: PossibleTranslations;
  options?: I18nOptions | undefined;
}[] = [];

const queueTranslation = async (
  text: string,
  toLocale: PossibleTranslations,
  options?: I18nOptions
) => {
  // Custom translation
  if (options?.[toLocale]) return options[toLocale];

  const cleanText = fixNewLines(text.trim());

  if (!cleanText) return cleanText;

  // If is HTML, if all immediate children are non-translatable, don't translate
  // This is just a shallow check, could still translate non-translatable html
  if (cleanText.startsWith("<")) {
    const parsedHTML = parse(cleanText);

    if (
      parsedHTML.children
        .filter(({ tagName }) => tagName !== "SCRIPT")
        .every((element) => element.getAttribute("translate") === "no")
    ) {
      return cleanText;
    }
  }

  const entryTranslations = (await getEntry("translations", toLocale))?.data;

  // Check if in astro entry
  if (entryTranslations?.[cleanText]) {
    return entryTranslations[cleanText].translation;
  } else {
    // Check if in file but not in astro entry
    //? This can happen if translated in current session
    const fileTranslation = (await getTranslationsFile(toLocale))?.[cleanText]
      ?.translation;

    if (fileTranslation) return fileTranslation;
  }

  // Translation only works consistently in production env, because astro adds html attributes in dev
  if (import.meta.env.DEV && !options?.force) return `${cleanText} (t)`;

  // Cache miss
  if (!options?.noCache)
    debugCacheMiss(cleanText, Object.keys(entryTranslations!));

  translateBuffer.push({ text: cleanText, toLocale, options });
  return (await translate(options))[toLocale]![cleanText]!.translation;
};

const translate = async (translateOptions?: TranslateOptions) => {
  if (
    translateOptions?.allowedTranslations !== undefined &&
    translationCount >= translateOptions.allowedTranslations
  ) {
    console.warn("i18n: translation limit reached");
    process.exit(1);
  }

  if (!deeplTrans) throw new Error("Deepl API key not found");

  // Order translate buffer
  const translateInfoGroups = Object.fromEntries(
    Object.entries(groupBy(translateBuffer, ({ toLocale }) => toLocale)).map(
      ([locale, translateInfo]) => [
        locale as PossibleTranslations,
        new Map(
          Object.entries(
            groupBy(translateInfo, ({ options }) =>
              options ? JSON.stringify(options) : ""
            )
          ).map(([, translateInfo]) => [
            translateInfo![0]!.options,
            [...new Set(translateInfo!.map(({ text }) => text))],
          ])
        ),
      ]
    )
  );

  const translations: Partial<
    Record<PossibleTranslations, CollectionEntry<"translations">["data"]>
  > = {};

  for (const locale in translateInfoGroups) {
    const toLocale = locale as PossibleTranslations;

    let localeTranslations: CollectionEntry<"translations">["data"] = {};

    const uncachedTexts: string[] = [];

    for (const [options, texts] of translateInfoGroups[locale]!) {
      localeTranslations = {
        ...localeTranslations,
        ...Object.fromEntries(
          (
            await deeplTrans.translateText(texts, defaultLocale, toLocale, {
              tagHandling: "html",
              formality: "prefer_more",
              modelType: "prefer_quality_optimized",
              ...options,
            })
          ).map(({ text: translation }, index) => [
            texts[index]!,
            { translation, api: "deepl" },
          ]) satisfies [
            string,
            CollectionEntry<"translations">["data"][keyof CollectionEntry<"translations">["data"]]
          ][]
        ),
      };

      // Translated
      translationCount += texts.length;
      if (translateOptions?.debug) {
        console.info(`i18n: translated ${texts.length} texts`);
      }

      if (options?.noCache) uncachedTexts.push(...texts);
    }

    localeTranslations = {
      ...(await getTranslationsFile(toLocale)),
      ...localeTranslations,
    };

    const { writeFileSync } = await import("node:fs");

    // Add to cache/file
    writeFileSync(
      `${translationsPath}/${toLocale}.json`,
      JSON.stringify(
        Object.fromEntries(
          Object.entries(localeTranslations).filter(
            // Remove texts that are not to be cached
            ([text]) => !uncachedTexts.includes(text)
          )
        ),
        null,
        2
      )
    );

    translateBuffer = [];
    translations[toLocale] = localeTranslations;
  }

  return translations;
};

const getTranslationsFile = async (locale: PossibleTranslations) => {
  const { readFileSync } = await import("node:fs");

  const filePath = `${translationsPath}/${locale}.json`;

  let file = "";

  try {
    file = readFileSync(filePath, "utf-8");
  } catch {
    return undefined;
  }

  return JSON.parse(file) as CollectionEntry<"translations">["data"];
};

const debugCacheMiss = (text: string, cacheKeys: string[]) => {
  const diffs = cacheKeys.map((key) => diff(key, text));

  // Closest key is the one with the least differences
  const closestKeyIndex = indexOfMin(diffs.map(({ length }) => length))!;
  const { index: firstDifferenceIndex } = diffs[closestKeyIndex]![0]!;

  const textName = "Text";
  const closestCachedName = `Closest cached (${closestKeyIndex})`;

  console.warn(
    `i18n debug: cache miss.
      ${textName}: ${" ".repeat(
      closestCachedName.length - textName.length
    )}${JSON.stringify(highlightCharacter(text, firstDifferenceIndex))}
      ${"-".repeat(100)}
      ${closestCachedName}: ${JSON.stringify(
      highlightCharacter(cacheKeys[closestKeyIndex]!, firstDifferenceIndex)
    )}`
  );
};

export const setLocale = async (astro: AstroGlobal) => {
  dayjs.extend(localizedFormat);

  const translateLocale = getCurrentLocale(astro);

  switch (translateLocale) {
    case "ja":
      await import("dayjs/locale/ja");
      break;
  }

  dayjs.locale(translateLocale);
};

export const getCurrentLocale = (astro: AstroGlobal) =>
  (astro.currentLocale ?? defaultLocale) as (typeof locales)[number];
