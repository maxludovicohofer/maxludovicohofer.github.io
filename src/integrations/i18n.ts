import { defaultLocale, type locales } from "@integrations/astro-config.mjs";
import type { AstroGlobal } from "astro";
import { DEEPL_API_KEY } from "astro:env/server";
import * as deepl from "deepl-node";

export const i18n = (
  astro: AstroGlobal,
  globalOptions?: deepl.TranslatorOptions
) => {
  const translator = new deepl.Translator(DEEPL_API_KEY);
  return async (
    text: string,
    options?: deepl.TranslatorOptions &
      Record<Exclude<(typeof locales)[number], typeof defaultLocale>, string>
  ) => {
    if (astro.currentLocale && astro.currentLocale !== defaultLocale) {
      const currentLocale = astro.currentLocale as Exclude<
        (typeof locales)[number],
        typeof defaultLocale
      >;

      if (options?.[currentLocale]) {
        return options[currentLocale];
      } else if (text && import.meta.env.PROD) {
        return (
          await translator.translateText(text, defaultLocale, currentLocale, {
            tagHandling: "html",
            ...globalOptions,
            ...options,
          })
        ).text;
      } else if (!text.startsWith("<")) {
        return `${text} (t)`;
      }
    }

    return text;
  };
};
