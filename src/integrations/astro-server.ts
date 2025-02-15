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
  getGroup,
  getPublishingDate,
  type PostCollectionKey,
} from "@layouts/post/Post.astro";
import { getCombinations, groupBy, swap } from "./array";

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

type RolesCollectionKey = Extract<CollectionKey, PostCollectionKey | "tech">;

export const matchRoles = async <
  E extends Flatten<DataEntryMap[C]>,
  C extends RolesCollectionKey
>(
  astro: AstroGlobal,
  entries: E[]
) => {
  const words = (await getRole(astro)).role.id.split(" ");
  const wordsNum = words.length;

  const matchers = getCombinations(words).flatMap(
    (combination) => new RegExp(`\\b${combination.join(" ")}\\b`, "i")
  );
  const matchersNum = matchers.length;

  if (wordsNum > 1) {
    //? If has specialization, prioritize specialization over profession (ex: game designer, game over designer)
    const firstWordIndex = matchersNum - wordsNum;
    swap(matchers, firstWordIndex, firstWordIndex + 1);
  }

  const match = (searchIn: string | string[]) =>
    matchers.findIndex(
      Array.isArray(searchIn)
        ? (matcher) =>
            searchIn.some((searchItem) => searchItem.search(matcher) !== -1)
        : (matcher) => searchIn.search(matcher) !== -1
    );

  // Group by match score
  return groupBy(entries, (entry) => {
    // Default value, meaning undefined match.
    // Differs from no match, which is 0
    let matchScore = 1;

    const category = getCategory(entry);
    if (category) {
      const categoryScore = match(category);
      if (categoryScore !== -1) {
        matchScore += categoryScore + Math.round(0.2 * matchersNum);
      }
    }

    const group = getGroup(entry);
    if (group) {
      const groupScore = match(group);
      if (groupScore !== -1) {
        matchScore += groupScore + Math.round(0.2 * matchersNum);
      }
    }

    const roles = entry.data.roles.map(({ id }) => id);
    if (roles) {
      const rolesScore = match(roles);
      matchScore += rolesScore !== -1 ? matchersNum - rolesScore : rolesScore;
    }

    return `${matchScore}`;
  });
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
        entries!.toSorted((a, b) =>
          b.publishingDate.isAfter(a.publishingDate) ? 1 : -1
        )
      )
      // Apply priorities
      .reverse()
      .flat()
  );
};
