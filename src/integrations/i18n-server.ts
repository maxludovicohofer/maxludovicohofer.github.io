import { defaultLocale } from "@integrations/astro-config";
import type { AstroGlobal } from "astro";
import { getEntry, type CollectionEntry } from "astro:content";
import { DEEPL_API_KEY } from "astro:env/server";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import * as deepl from "deepl-node";
import { parse } from "node-html-parser";
import { translationsPath } from "src/content.config";
import { groupBy, indexOfMin } from "./array";
import { type PossibleTranslations } from "./i18n";
import { getCurrentLocale, localeInfo } from "./i18n-special";
import { diff, fixNewLines, highlightCharacter } from "./text";

const deeplTrans = DEEPL_API_KEY
  ? new deepl.Translator(DEEPL_API_KEY)
  : undefined;

export type TranslateOptions = {
  force?: boolean;
  debug?: boolean;
  allowedTranslations?: number;
  noCache?: boolean;
};

export type I18nOptions = deepl.TranslateTextOptions &
  Partial<Record<PossibleTranslations, string>> &
  TranslateOptions & { interpolate?: string | string[] };

export const i18n = (
  astro: AstroGlobal | PossibleTranslations,
  globalOptions?: I18nOptions,
) => {
  return async (text: string, options?: I18nOptions) => {
    const toLocale =
      typeof astro === "string" ? astro : getCurrentLocale(astro);

    const translation =
      toLocale !== defaultLocale
        ? await queueTranslation(text, toLocale, {
            ...globalOptions,
            ...options,
          })
        : text;

    if (options?.interpolate) {
      const replacerText =
        typeof options.interpolate === "string"
          ? [options.interpolate]
          : options.interpolate;

      const interpolation = "{}";

      return replacerText.reduce((interpolating, replacer) => {
        if (!interpolating.includes(interpolation)) {
          throw new Error(
            `i18n: could not interpolate ${replacer} in ${interpolating}.`,
          );
        }

        return interpolating.replace(interpolation, replacer);
      }, translation);
    }

    return translation;
  };
};

let translationCount = 0;

// The buffer where text to translate is stored
let translateBuffer: {
  text: string;
  toLocale: PossibleTranslations;
  options?: I18nOptions | undefined;
}[] = [];

// TODO PHASE 2 CLEAN TRANSLATION FILE. FOR EXAMPLE AFTER BUILD, DELETE KEYS THAT DID NOT UNDERGO TRANSLATE PROCESS.

const localCache: Partial<
  Record<PossibleTranslations, CollectionEntry<"translations">["data"]>
> = {};

const queueTranslation = async (
  text: string,
  toLocale: PossibleTranslations,
  options?: I18nOptions,
): Promise<string> => {
  // Custom translation
  if (options?.[toLocale]) return options[toLocale];

  // Special case for whitespace
  const cleanText = text === " " ? text : fixNewLines(text.trim());
  if (!cleanText) return cleanText;

  // Check if HTML
  if (cleanText.startsWith("<")) {
    if (!shouldTranslateHTML(cleanText)) return cleanText;

    // HTML translation only works in prod, because astro adds custom attributes in dev
    if (import.meta.env.DEV && !options?.force) return `${cleanText} (t)`;
  }

  const endDelimiter = new RegExp(
    `[^.][${localeInfo[defaultLocale].delimiters}]$`,
  ).test(cleanText)
    ? cleanText.at(-1)
    : undefined;
  const textToTranslate = endDelimiter ? cleanText.slice(0, -1) : cleanText;

  const formatTranslation = async (translation: string) =>
    endDelimiter
      ? await endDelimiterLocalized(translation, toLocale, endDelimiter)
      : translation;

  const translated = await getTranslated(toLocale);
  const cached = translated[textToTranslate]?.translation;
  if (cached !== undefined) return await formatTranslation(cached);

  // Do not translate in dev to save money
  if (import.meta.env.DEV && !options?.force) return `${cleanText} (t)`;

  // Cache miss
  if (!options?.noCache)
    debugCacheMiss(textToTranslate, Object.keys(translated));

  translateBuffer.push({ text: textToTranslate, toLocale, options });

  return await formatTranslation(
    (await translate(options))[toLocale]![textToTranslate]!.translation,
  );
};

const shouldTranslateHTML = (html: string) => {
  const parsedHTML = parse(html);

  // If is HTML, if all immediate children are non-translatable, don't translate
  // This is just a shallow check, could still translate non-translatable html
  return parsedHTML.children
    .filter(({ tagName }) => tagName !== "SCRIPT" && tagName !== "STYLE")
    .some((element) => element.getAttribute("translate") !== "no");
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
              options ? JSON.stringify(options) : "",
            ),
          ).map(([, translateInfo]) => [
            translateInfo![0]!.options,
            [...new Set(translateInfo!.map(({ text }) => text))],
          ]),
        ),
      ],
    ),
  );

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
            {
              translation: translation.replaceAll("｛｝", "{}"),
              api: "deepl",
            } as const,
          ]) satisfies [
            string,
            CollectionEntry<"translations">["data"][keyof CollectionEntry<"translations">["data"]],
          ][],
        ),
      };

      // Translated
      translationCount += texts.length;
      if (translateOptions?.debug)
        console.debug(`i18n: translated ${texts.length} texts`);

      if (options?.noCache) uncachedTexts.push(...texts);
    }

    localCache[toLocale] = { ...localCache[toLocale], ...localeTranslations };

    const { writeFile } = await import("fs/promises");

    // Add to cache/file
    await writeFile(
      `${translationsPath}/${toLocale}.json`,
      JSON.stringify(
        Object.fromEntries(
          Object.entries(await getTranslated(toLocale)).filter(
            // Remove texts that are not to be cached
            ([text]) => !uncachedTexts.includes(text),
          ),
        ),
        null,
        2,
      ),
    );
  }

  translateBuffer = [];

  return localCache;
};

const getTranslated = async (locale: PossibleTranslations) => ({
  ...(await getEntry("translations", locale))?.data,
  ...localCache[locale],
});

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
        closestCachedName.length - textName.length,
      )}${JSON.stringify(highlightCharacter(text, firstDifferenceIndex))}
      ${"-".repeat(100)}
      ${closestCachedName}: ${JSON.stringify(
        highlightCharacter(cacheKeys[closestKeyIndex]!, firstDifferenceIndex),
      )}`,
  );
};

export const setDayjsLocale = async (astro: AstroGlobal) => {
  dayjs.extend(localizedFormat);

  const translateLocale = getCurrentLocale(astro);

  switch (translateLocale) {
    case "ja":
      await import("dayjs/locale/ja");
      break;
  }

  dayjs.locale(translateLocale);
};

export const endDelimiterLocalized = async (
  text: string,
  astro: AstroGlobal | PossibleTranslations,
  delimiter = ".",
) => {
  const locale = typeof astro === "string" ? astro : getCurrentLocale(astro);

  return new RegExp(`[${localeInfo[locale].delimiters}]$`).test(text)
    ? text
    : `${text}${await i18n(astro)(delimiter)}`;
};
