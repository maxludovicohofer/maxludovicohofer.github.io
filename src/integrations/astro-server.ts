import type { AstroGlobal } from "astro";
import { getCollection } from "astro:content";
import { getPathSections, makePath } from "./text";
import { getRelativeLocaleUrl } from "astro:i18n";

export const getRole = async (astro: AstroGlobal) => {
  const roles = await getCollection("roles");
  // Look for role in path sections
  const pathSections = getPathSections(astro.url.pathname, 0, 2).filter(
    (section) => !!section
  );

  let role = roles[0]!;

  for (const section of pathSections) {
    const sectionRole = roles.find(({ id }) => makePath(id) === section);

    if (sectionRole) {
      role = sectionRole;
      break;
    }
  }

  return { role, isDefault: role === roles[0] };
};

export const addBaseToHref = async (astro: AstroGlobal, link?: string) => {
  const { role, isDefault } = await getRole(astro);

  const linkWithRole = isDefault ? link : `${makePath(role.id)}/${link}`;

  const locale = astro.currentLocale ?? astro.preferredLocale;

  return locale
    ? getRelativeLocaleUrl(locale, linkWithRole)
    : `/${linkWithRole}`;
};
