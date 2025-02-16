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
import {
  getCombinations,
  groupBy,
  indexOfMax,
  renameObjectKeys,
  swap,
} from "./array";
import { remap } from "./math";

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
  const role = (await getRole(astro)).role;
  const matchedRoles = [role, ...(role.data.matches ?? [])].map(({ id }) => {
    const words = id.split(" ");
    const wordsNum = words.length;

    const matchers = getCombinations(words).flatMap((combination) => ({
      matcher: new RegExp(`\\b${combination.join(" ")}\\b`, "i"),
      //? More specific match (more words) is better
      weight: Math.sqrt(combination.length),
    }));

    if (wordsNum > 1) {
      //? If has specialization, prioritize specialization over profession (ex: game designer, game over designer)
      const firstWordIndex = matchers.length - wordsNum;
      swap(matchers, firstWordIndex, firstWordIndex + 1);
    }

    return matchers;
  });

  const match = (test: string | string[]) => {
    const findBestMatch: Parameters<
      (typeof matchedRoles)[number]["findIndex"]
    >[0] = Array.isArray(test)
      ? ({ matcher }) =>
          test.some((testItem) => testItem.search(matcher) !== -1)
      : ({ matcher }) => test.search(matcher) !== -1;

    // Match each role, then take best match
    const scores = matchedRoles.map((matchers) => {
      const bestMatchIndex = matchers.findIndex(findBestMatch);

      return bestMatchIndex === -1
        ? 0
        : matchers[bestMatchIndex]!.weight *
            (1 - bestMatchIndex / matchers.length);
    });
    const bestScoreIndex = indexOfMax(scores)!;

    return Math.ceil(scores[bestScoreIndex]!);
  };

  // Group by match score
  const scoredEntities = groupBy(entries, (entry) => {
    let matchScore = 0;

    const topic = getCategory(entry) ?? getGroup(entry);
    if (topic) {
      const score = match(topic);
      matchScore += score;
    }

    const roles = entry.data.roles.map(({ id }) => id);
    if (roles) {
      const score = match(roles);
      matchScore += score;
    } else {
      // If roles are undefined, distinguish from no match
      matchScore += 1;
    }

    return matchScore;
  });

  // Standardize keys from 0-10
  const maxScore = Number(Object.keys(scoredEntities).at(-1));
  renameObjectKeys(scoredEntities, (oldKey) =>
    Math.round(remap(Number(oldKey), maxScore, 10))
  );

  return scoredEntities;
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
