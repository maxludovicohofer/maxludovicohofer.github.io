import { defaultLocale, type locales } from "@integrations/astro-config.mjs";
import type { AstroGlobal } from "astro";
import { DEEPL_API_KEY } from "astro:env/server";
import * as deepl from "deepl-node";

const translator = new deepl.Translator(DEEPL_API_KEY);

type PossibleTranslations = Exclude<
  (typeof locales)[number],
  typeof defaultLocale
>;

type I18nOptions = deepl.TranslatorOptions &
  Partial<Record<PossibleTranslations, string>> & { force?: boolean };

const cachedTranslations = new Map<
  string,
  Partial<Record<PossibleTranslations, string>>
>();

export const i18n = (astro: AstroGlobal, globalOptions?: I18nOptions) => {
  return async (text: string, options?: I18nOptions) => {
    if (astro.currentLocale && astro.currentLocale !== defaultLocale) {
      const currentLocale = astro.currentLocale as Exclude<
        (typeof locales)[number],
        typeof defaultLocale
      >;

      if (options?.[currentLocale]) {
        return options[currentLocale];
      } else if (text && (import.meta.env.PROD || options?.force)) {
        const cachedLocales = cachedTranslations.get(text);

        if (!cachedLocales?.[currentLocale]) {
          cachedTranslations.set(text, {
            ...cachedLocales,
            [currentLocale]: (
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
          });
        }

        return cachedTranslations.get(text)![currentLocale];
      } else if (!text.trimStart().startsWith("<")) {
        return `${text} (t)`;
      }
    }

    return text;
  };
};
