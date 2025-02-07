import type { AstroGlobal } from "astro";
import { getRelativeLocaleUrl } from "astro:i18n";

export const saveScrollPosition = () => {
  const state: {
    index: number;
    scrollX: number;
    scrollY: number;
  } | null = history.state;

  if (!state) return;

  sessionStorage.setItem(
    location.pathname,
    JSON.stringify({
      left: state.scrollX,
      top: state.scrollY,
    } satisfies ScrollToOptions)
  );
};

export const localizeHref = (astro: AstroGlobal, link?: string) => {
  const locale = astro.currentLocale ?? astro.preferredLocale;

  return locale ? getRelativeLocaleUrl(locale, link) : `/${link}`;
};
