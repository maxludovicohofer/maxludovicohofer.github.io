import {
  getCategory,
  getGroup,
  getPublishingDate,
  type PostCollectionKey,
} from "@integrations/content";
import {
  getEntryId,
  type DocumentCollectionKey,
} from "@layouts/document/Document.astro";
import type { AstroGlobal } from "astro";
import {
  getCollection,
  getEntries,
  render,
  type CollectionEntry,
  type CollectionKey,
  type DataEntryMap,
  type ReferenceDataEntry,
} from "astro:content";
import addArticle from "indefinite";
import {
  getCombinations,
  groupBy,
  indexOfMax,
  renameObjectKeys,
  swap,
} from "./array";
import { defaultLocale, locales } from "./astro-config";
import {
  addLocaleToLink,
  getPathWithoutLocale,
  type PossibleTranslations,
} from "./i18n";
import { getCurrentLocale } from "./i18n-special";
import { remap } from "./math";
import {
  capitalize,
  getHumanPathSection,
  getPathSection,
  getPathSections,
  isGeoLink,
  isMailLink,
  isRemoteLink,
  isTelLink,
  makePath,
  standardizePath,
} from "./text";

type ExceptFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never;

export const getRole = async (astro: AstroGlobal) => {
  const roles = await getCollection("roles");
  // Look for role in path sections
  const pathSections = getPathSections(astro.originPathname, 0, 2).filter(
    (section) => !!section,
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

export const addBaseToLink = async (
  astro: AstroGlobal,
  link = "",
  noLocale?: boolean,
) => {
  const { role, isDefault } = await getRole(astro);

  const linkWithRole = isDefault ? link : `${makePath(role.id)}/${link}`;

  return standardizePath(
    addLocaleToLink(
      linkWithRole,
      noLocale ? undefined : getCurrentLocale(astro),
    ),
  );
};

export const getSiteLink = async (
  ...params: Parameters<typeof addBaseToLink>
) => {
  const portfolioVersion = await addBaseToLink(...params);
  return `${import.meta.env.SITE}${
    portfolioVersion === "/" ? "" : portfolioVersion
  }`;
};

export const getPathWithoutBase = async (astro: AstroGlobal, path: string) => {
  const pathWithoutLocale = getPathWithoutLocale(path);

  const { role, isDefault } = await getRole(astro);

  if (!isDefault) {
    const rolePath = makePath(role.id);

    if (pathWithoutLocale.startsWith(rolePath))
      return pathWithoutLocale.slice(rolePath.length);
  }

  return pathWithoutLocale;
};

export const getEntriesSafe = async <
  C extends CollectionKey,
  E extends keyof DataEntryMap[C] = string,
>(
  entries: ReferenceDataEntry<C, E>[],
) => {
  const unsafeEntries = await getEntries(entries);

  const errors = entries.filter((_, index) => !unsafeEntries[index]);

  if (errors.length) {
    throw new Error(
      `Missing ${errors[0]!.collection}: ${errors
        .map(({ id }) => `"${id.toString()}"`)
        .join(", ")}.`,
    );
  }

  return unsafeEntries;
};

export const matchRoles = async <D>(
  astro: AstroGlobal,
  entries: { data?: D; roles?: ReferenceDataEntry<"roles", string>[] }[],
) => {
  const role = (await getRole(astro)).role;

  const makeMatcher = (text: string) => new RegExp(`\\b${text}\\b`, "i");

  const matchedRoles = [role, ...(role.data.matches ?? [])].map(
    ({ id }, index) => {
      const words = id.split(" ");
      const wordsNum = words.length;

      const matchers = getCombinations(words).flatMap((combination) => ({
        matcher: makeMatcher(combination.join(" ")),
        //? More specific match (more words) is better
        weight: Math.sqrt(combination.length),
      }));

      // Perfect match trumps all
      if (!index) matchers[0]!.weight = words.length;

      if (wordsNum > 1) {
        //? If has specialization, prioritize specialization over profession (ex: game designer, game over designer)
        const firstWordIndex = matchers.length - wordsNum;
        swap(matchers, firstWordIndex, firstWordIndex + 1);
      }

      return matchers;
    },
  );

  const notMatchers = role.data.notMatches?.map(({ id }) => makeMatcher(id));

  function isEntry(entry: any): entry is { data: object } {
    return !!entry && typeof entry.data === "object";
  }

  const match = (test: string | string[]) => {
    let testValue = test;

    const testMatch = (singleTest: string, matcher: RegExp) =>
      matcher.test(singleTest);

    if (notMatchers) {
      const isNotMatching = (singleTest: string) =>
        notMatchers.some((notMatcher) => testMatch(singleTest, notMatcher));

      if (Array.isArray(testValue)) {
        // Exclude values that cannot match
        testValue = testValue.filter(
          (singleTest) => !isNotMatching(singleTest),
        );
      } else if (isNotMatching(testValue)) {
        // Cannot match
        return 0;
      }
    }

    // TODO PHASE 2 TRY FUZZY MATCHING IF NO EXACT MATCH, BUT ONLY IF SIMILAR (FOR EXAMPLE MATCH "PROGRAMMER" AND "PROGRAMMING")
    const findBestMatch: Parameters<
      (typeof matchedRoles)[number]["findIndex"]
    >[0] = Array.isArray(testValue)
      ? ({ matcher }) =>
          testValue.some((singleTest) => testMatch(singleTest, matcher))
      : ({ matcher }) => testMatch(testValue, matcher);

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
  const scoredEntities = groupBy(entries, ({ data, roles }) => {
    let matchScore = 0;

    const topic = isEntry(data)
      ? (getCategory(data) ?? getGroup(data))
      : undefined;
    if (topic) {
      const score = match(topic);
      matchScore += score;
    }

    const roleNames = roles?.map(({ id }) => id);
    if (roleNames) {
      const score = match(roleNames);
      matchScore += score;
    } else {
      // If roles are undefined, distinguish from no match
      matchScore += 1;
    }

    return matchScore;
  });

  // Standardize keys from 0-10
  const maxScore = Number(Object.keys(scoredEntities).at(-1));
  if (maxScore) {
    renameObjectKeys(scoredEntities, (oldKey) =>
      Math.round(remap(Number(oldKey), maxScore, 10)),
    );
  }

  return Object.fromEntries(
    Object.entries(scoredEntities).map(([priority, entries]) => [
      priority,
      entries!.map(({ data }) => data!),
    ]),
  );
};

export const applyMatch = <T extends Partial<Record<any, any[]>>>(
  matchResult: T,
  // Number from 0-10 that filters out weak matches
  threshold = 0,
) =>
  Object.values(
    (threshold
      ? Object.fromEntries(
          Object.entries(matchResult).filter(
            ([matchScore]) => Number(matchScore) > threshold,
          ),
        )
      : matchResult) as unknown as Record<any, NonNullable<T[keyof T]>>,
  )
    .reverse()
    .flat();

export const getSortedPosts = async <C extends PostCollectionKey>(
  astro: AstroGlobal,
  collection: C,
  ...params: ExceptFirst<ExceptFirst<Parameters<typeof getMatchedPosts>>>
) => applyMatch(await getMatchedPosts(astro, collection, ...params));

export const getMatchedPosts = async <C extends PostCollectionKey>(
  astro: AstroGlobal,
  collection: C,
  ...params: ExceptFirst<ExceptFirst<Parameters<typeof getSortedDocuments>>>
) => {
  const groupedEntries = await matchRoles(
    astro,
    (await getSortedDocuments(astro, collection, ...params)).map(
      (document) => ({
        data: document,
        roles:
          document.collection === "projects"
            ? document.data.roles.map(({ role }) => role)
            : (document.data.forRoles ?? []),
      }),
    ),
  );

  // Sort individual categories by latest first
  Object.values(groupedEntries).forEach((entries) => {
    entries.sort((a, b) =>
      b.publishingDate.isAfter(a.publishingDate) ? 1 : -1,
    );
  });

  return groupedEntries;
};

export const getSortedDocuments = async <C extends DocumentCollectionKey>(
  astro: AstroGlobal,
  collection: C,
  ...params: ExceptFirst<Parameters<typeof getAllDocuments>>
) => {
  const allDocuments = await getAllDocuments(collection, ...params);

  const locale = getCurrentLocale(astro);
  const translateLocale =
    locale && locale !== defaultLocale ? locale : undefined;

  const uniqueEntries = getUniqueEntries(allDocuments);
  const entries = translateLocale
    ? uniqueEntries.map((entry) =>
        getLocalizedEntry(entry, allDocuments, translateLocale),
      )
    : uniqueEntries;

  // Sort by latest first
  return (
    await Promise.all(
      entries.map(async (entry) => ({
        ...entry,
        publishingDate: getPublishingDate(
          entry,
          (await render(entry)).remarkPluginFrontmatter,
        )!,
      })),
    )
  ).sort((a, b) => (b.publishingDate.isAfter(a.publishingDate) ? 1 : -1));
};

export const getAllDocuments = async <
  C extends DocumentCollectionKey,
  E extends keyof DataEntryMap[DocumentCollectionKey] = string,
>(
  collection: C,
  options?: GetCollectionOptions<C, E> & { noDrafts?: boolean },
) =>
  await getCollectionAdvanced(collection, {
    filter: ({ data: { draft } }) =>
      !draft || (import.meta.env.DEV && !options?.noDrafts),
    ...options,
  });

export interface GetCollectionOptions<
  C extends CollectionKey,
  E extends keyof DataEntryMap[CollectionKey] = string,
> {
  excluded?: string[];
  entries?: ReferenceDataEntry<CollectionKey, E>[];
  filter?: (entry: CollectionEntry<C>) => boolean | undefined;
}

export const getCollectionAdvanced = async <
  C extends CollectionKey,
  E extends keyof DataEntryMap[CollectionKey] = string,
>(
  collection: C,
  options?: GetCollectionOptions<C, E>,
) => {
  const excluded = options?.excluded?.map((entry) => getEntryId(entry)) ?? [];
  const filter = options?.filter;
  const queryFilter: NonNullable<NonNullable<typeof options>["filter"]> = (
    entry,
  ) => {
    if (filter && !filter(entry)) return;

    const entryId = getEntryId(entry);

    return excluded.every((excludedId) => entryId !== excludedId);
  };

  return options?.entries
    ? (
        await getEntriesSafe(options.entries as ReferenceDataEntry<C, E>[])
      ).filter(queryFilter)
    : await getCollection(collection, queryFilter);
};

export const getUniqueEntries = <C extends CollectionKey>(
  entries: CollectionEntry<C>[],
) => entries.filter((entry) => !isLocalizedEntry(entry));

export const isLocalizedEntry = <C extends CollectionKey>(
  entry: CollectionEntry<C> | undefined,
) => !!entry && locales.includes(getEntryLocale(entry));

export const getEntryLocale = <C extends CollectionKey>(
  entry: CollectionEntry<C>,
) => getPathSection(entry.id, -2) as PossibleTranslations;

export const getLocalizedEntry = <C extends CollectionKey>(
  entry: CollectionEntry<C>,
  allEntries: CollectionEntry<C>[],
  locale?: (typeof locales)[number],
) => {
  const localizedId =
    locale && locale !== defaultLocale && `${locale}/${getEntryId(entry)}`;

  return localizedId
    ? (allEntries.find(({ id }) => id.endsWith(localizedId)) ?? entry)
    : entry;
};

export const getLinkName = async (
  astro: AstroGlobal,
  link: string,
  forDisplay?: boolean,
) => {
  let linkName: string;

  if (isRemoteLink(link)) {
    linkName = await getRemoteLinkName(astro, link, forDisplay);
  } else if (isMailLink(link)) {
    linkName = link.slice(7);
  } else if (isTelLink(link)) {
    linkName = getTelLinkName(link, forDisplay);
  } else if (isGeoLink(link)) {
    linkName = link.slice(4);
  } else {
    linkName = await getLocalLinkName(astro, link);
  }

  return capitalize(linkName);
};

export const getLocalLinkName = async (astro: AstroGlobal, link: string) =>
  getHumanPathSection(await getPathWithoutBase(astro, link)) || "Homepage";

export const getRemoteLinkName = async (
  astro: AstroGlobal,
  link: string,
  forDisplay?: boolean,
) => {
  const url = new URL(link);

  if (forDisplay) {
    return url.hostname === "maps.google.com"
      ? url.searchParams.get("q")!
      : link;
  }

  return url.hostname === astro.site?.hostname
    ? await getLocalLinkName(astro, url.pathname)
    : url.host.split(".").at(-2)!;
};

export const getTelLinkName = (link: string, forDisplay?: boolean) => {
  const linkWithoutPrefix = link.slice(4);

  if (forDisplay) {
    const sections = /.{1,3}/g.exec(linkWithoutPrefix)!;

    if (sections.at(-1)!.length < 3)
      sections[sections.length - 2] = `${sections.at(-2)}${sections.pop()}`;

    return sections.join(" ");
  }

  return linkWithoutPrefix;
};
