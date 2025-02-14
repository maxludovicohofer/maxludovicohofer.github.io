import type { AstroGlobal } from "astro";
import {
  getCollection,
  getEntries,
  render,
  type CollectionKey,
  type DataEntryMap,
  type Flatten,
  type ReferenceDataEntry,
} from "astro:content";
import { getPathSections, makePath, standardizePath } from "./text";
import { getRelativeLocaleUrl } from "astro:i18n";
import addArticle from "indefinite";
import {
  getCategory,
  getPublishingDate,
  type PostCollectionKey,
} from "@layouts/post/Post.astro";
import { groupBy } from "./array";

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

  return {
    role: { ...role, data: { ...role.data, withArticle: addArticle(role.id) } },
    isDefault: role === roles[0],
  };
};

export const addBaseToLink = async (astro: AstroGlobal, link: string = "") => {
  const { role, isDefault } = await getRole(astro);

  const linkWithRole = isDefault ? link : `${makePath(role.id)}/${link}`;

  const locale = astro.currentLocale ?? astro.preferredLocale;

  return `/${
    locale
      ? standardizePath(getRelativeLocaleUrl(locale, linkWithRole))
      : linkWithRole
  }`;
};

export const getEntriesSafe = async <
  C extends CollectionKey,
  E extends keyof DataEntryMap[C] = string
>(
  entries: ReferenceDataEntry<C, E>[]
) => {
  const unsafeEntries = await getEntries(entries);

  const errors = entries.filter((_, index) => !unsafeEntries[index]);

  if (errors.length) {
    throw new Error(
      `Missing ${errors[0]!.collection}: ${errors
        .map(({ id }) => `"${id.toString()}"`)
        .join(", ")}.`
    );
  }

  return unsafeEntries;
};

export const matchRoles = async <
  E extends Flatten<DataEntryMap[C]>,
  C extends CollectionKey
>(
  astro: AstroGlobal,
  entries: E[]
) => {
  // TODO
  // ADD CATEGORY TO ROLES IF PROJECTS
  // CASE INSENSITIVE MATCH:
  // SCORE FROM FACTORIAL(NUMWORDS)-0: INCLUDES ALL WORDS (Character AI programmer), INCLUDES N - 1 WORDS PRIORITIZING RIGHT(Character AI or AI programmer), ..., INCLUDES 1 WORD PRIORITIZING SECOND LAST FROM RIGHT (AI designer includes AI), NO MATCH (Level designer)
  // GROUP BY HIGHEST MATCH VALUE
  // SORT GROUPS BY CREATED DATE

  const isProjects = entries[0]?.collection === "projects";
  const { role } = await getRole(astro);
  const isProgrammer = role.id.toLowerCase().includes("programmer");

  return groupBy(
    entries,
    // Group by category priority
    (entry) => {
      if (isProjects) {
        switch (getCategory(entry as Parameters<typeof getCategory>[0], true)) {
          case "Game":
            return "1";

          case "Tool":
            if (isProgrammer) return "2";
            break;
        }
      }

      return "0";
    }
  );
};

export const getSortedPosts = async <C extends PostCollectionKey>(
  astro: AstroGlobal,
  collection: C,
  excluded: string[] = []
) => {
  const entries = await getCollection(
    collection,
    ({ data: { draft }, id }) =>
      (import.meta.env.DEV || !draft) && excluded.every((entry) => id !== entry)
  );

  const datedEntries = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      publishingDate: getPublishingDate(
        entry,
        (
          await render(entry)
        ).remarkPluginFrontmatter
      )!,
    }))
  );

  const groupedEntries = await matchRoles(astro, datedEntries);

  // Sort individual categories by latest first
  return (
    Object.values(groupedEntries)
      .map((entries) =>
        entries.toSorted((a, b) =>
          b.publishingDate.isAfter(a.publishingDate) ? 1 : -1
        )
      )
      // Apply priorities
      .reverse()
      .flat()
  );
};
