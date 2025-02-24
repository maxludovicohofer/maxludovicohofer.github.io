import { defaultLocale, type locales } from "@integrations/astro-config.mjs";
import type { AstroGlobal } from "astro";
import { getEntry } from "astro:content";
import { DEEPL_API_KEY } from "astro:env/server";
import * as deepl from "deepl-node";
import { translationsPath } from "src/content.config";
import { findCharacterDifferences } from "@integrations/text";

const translator = new deepl.Translator(DEEPL_API_KEY);

type PossibleTranslations = Exclude<
  (typeof locales)[number],
  typeof defaultLocale
>;

type I18nOptions = deepl.TranslatorOptions &
  Partial<Record<PossibleTranslations, string>> & { force?: boolean };

export const i18n = (astro: AstroGlobal, globalOptions?: I18nOptions) => {
  return async (text: string, options?: I18nOptions) => {
    if (astro.currentLocale && astro.currentLocale !== defaultLocale) {
      const currentLocale = astro.currentLocale as Exclude<
        (typeof locales)[number],
        typeof defaultLocale
      >;

      if (options?.[currentLocale]) {
        return options[currentLocale];
      } else if (text) {
        let translations = (await getEntry("translations", currentLocale))
          ?.data;

        if (!translations?.[text]) {
          if (import.meta.env.PROD || options?.force) {
            const { readFile, writeFile } = await import("node:fs/promises");

            const filePath = `${translationsPath}/${currentLocale}.json`;

            let file = "";
            try {
              file = await readFile(filePath, "utf-8");
            } catch {}

            translations = {
              ...((file && JSON.parse(file)) as typeof translations),
              [text]: (
                await translator.translateText(
                  text,
                  defaultLocale,
                  currentLocale,
                  {
                    tagHandling: "html",
                    ...globalOptions,
                    ...options,
                  }
                )
              ).text,
            };

            // Add to translations
            await writeFile(filePath, JSON.stringify(translations, null, 2));
          } else {
            translations = {
              [text]: !text.trimStart().startsWith("<") ? `${text} (t)` : text,
            };
          }
        }

        return translations[text];
      }
    }

    return text;
  };
};
