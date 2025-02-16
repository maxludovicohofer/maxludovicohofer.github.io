import { defaultLocale, type locales } from "@integrations/astro-config.mjs";
import type { AstroGlobal } from "astro";
import { DEEPL_API_KEY } from "astro:env/server";
import * as deepl from "deepl-node";

export const i18n = (astro: AstroGlobal) => {
  const translator = new deepl.Translator(DEEPL_API_KEY);
  return async (text: string) =>
    text &&
    astro.currentLocale &&
    astro.currentLocale !== defaultLocale &&
    import.meta.env.PROD
      ? (
          await translator.translateText(
            text,
            defaultLocale,
            astro.currentLocale as Exclude<
              (typeof locales)[number],
              typeof defaultLocale
            >,
            { tagHandling: "html" }
          )
        ).text
      : text;
};
