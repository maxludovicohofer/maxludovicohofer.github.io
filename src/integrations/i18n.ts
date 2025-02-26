import { defaultLocale, type locales } from "@integrations/astro-config.mjs";
import type { AstroGlobal } from "astro";
import { getEntry, type CollectionEntry } from "astro:content";
import { DEEPL_API_KEY } from "astro:env/server";
import * as deepl from "deepl-node";
import { translationsPath } from "src/content.config";
import { diff, highlightCharacter } from "./text";
import { groupBy, indexOfMin } from "./array";

const deeplTrans = new deepl.Translator(DEEPL_API_KEY);

type PossibleTranslations = Exclude<
  (typeof locales)[number],
  typeof defaultLocale
>;

export type TranslateOptions = {
  force?: boolean;
  debug?: boolean;
  allowedTranslations?: number;
};

export type I18nOptions = deepl.TranslatorOptions &
  Partial<Record<PossibleTranslations, string>> &
  TranslateOptions;

export const i18n = (astro: AstroGlobal, globalOptions?: I18nOptions) => {
  return async (text: string, options?: I18nOptions) => {
    const toLocale =
      (astro.currentLocale as (typeof locales)[number] | undefined) ??
      defaultLocale;

    if (toLocale === defaultLocale) return text;

    return await queueTranslation(text, toLocale, {
      ...globalOptions,
      ...options,
    });
  };
};

let translationCount = 0;

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

  if (!text) return text;

  let translations = (await getEntry("translations", toLocale))?.data;

  // Cache hit
  if (translations?.[text]) return translations[text].translation;

  // Translation cache only works consistently in production env, because astro adds html attributes in dev
  if (import.meta.env.DEV && !options?.force) return `${text} (t)`;

  // Cache miss
  debugCacheMiss(text, Object.keys(translations!));

  translateBuffer.push({ text, toLocale, options });
  return (await translate(options))[toLocale]![text]!.translation;
};

const translate = async (translateOptions?: TranslateOptions) => {
  if (
    translateOptions?.allowedTranslations !== undefined &&
    translationCount >= translateOptions.allowedTranslations
  ) {
    console.warn("i18n: translation limit reached");
    process.exit(1);
  }

  // Order translate buffer
  const translateGroups = Object.fromEntries(
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

  const cachedTranslations: Partial<
    Record<PossibleTranslations, CollectionEntry<"translations">["data"]>
  > = {};

  for (const locale in translateGroups) {
    const toLocale = locale as PossibleTranslations;

    let localeTranslations: CollectionEntry<"translations">["data"] = {};

    for (const [options, text] of translateGroups[locale]!) {
      localeTranslations = {
        ...localeTranslations,
        ...Object.fromEntries(
          (
            await deeplTrans.translateText(text, defaultLocale, toLocale, {
              tagHandling: "html",
              ...options,
            })
          ).map(({ text: translation }, index) => [
            text[index]!,
            { translation, api: "deepl" },
          ]) satisfies [
            string,
            CollectionEntry<"translations">["data"][keyof CollectionEntry<"translations">["data"]]
          ][]
        ),
      };

      // Translated
      translationCount += text.length;
      if (translateOptions?.debug)
        console.info(`i18n: translated ${text.length} texts`);
    }

    const { readFileSync, writeFileSync } = await import("node:fs");

    const filePath = `${translationsPath}/${toLocale}.json`;

    let file = "";
    try {
      file = readFileSync(filePath, "utf-8");
    } catch {
      // File non existing, will be created
    }

    localeTranslations = {
      ...((file && JSON.parse(file)) as typeof localeTranslations),
      ...localeTranslations,
    };

    // Add to cache
    writeFileSync(filePath, JSON.stringify(localeTranslations, null, 2));

    translateBuffer = [];
    cachedTranslations[toLocale] = localeTranslations;
  }

  return cachedTranslations;
};

const debugCacheMiss = (text: string, cacheKeys: string[]) => {
  const diffs = cacheKeys.map((key) => diff(key, text));

  // Most similar key is the one with the least differences
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
