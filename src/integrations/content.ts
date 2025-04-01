import type Video from "@components/ui/Video.astro";
import {
  getEntryId,
  type DocumentCollectionKey,
} from "@layouts/document/Document.astro";
import type { AstroGlobal } from "astro";
import type { ComponentProps } from "astro/types";
import {
  getCollection,
  type CollectionEntry,
  type CollectionKey,
} from "astro:content";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import { VALID_INPUT_FORMATS } from "node_modules/astro/dist/assets/consts";
import { groupBy } from "./array";
import {
  applyMatch,
  getCollectionAdvanced,
  getCompany,
  matchRoles,
  type GetCollectionOptions,
} from "./astro-server";
import { i18n, setDayjsLocale } from "./i18n-server";
import { getCurrentLocale } from "./i18n-special";
import { capitalize, getHumanPathSection, toTitleCase } from "./text";

export type PostCollectionKey = Extract<CollectionKey, "projects" | "thoughts">;

export const getTitle = (
  entry: CollectionEntry<DocumentCollectionKey> | undefined,
) => {
  if (!entry) return;

  if (entry.data.title) return entry.data.title;

  const rawTitle = getHumanPathSection(getEntryId(entry));
  return entry.collection === "projects"
    ? toTitleCase(rawTitle)
    : capitalize(rawTitle);
};

export const getPublishingDate = (
  entry: CollectionEntry<DocumentCollectionKey> | undefined,
  frontmatter?: Record<string, any>,
) => {
  if (entry?.data.publishingDate) return dayjs(entry.data.publishingDate);

  if (!frontmatter) return;

  dayjs.extend(utc);

  return dayjs.utc(frontmatter.created || undefined);
};

export const getCover = (
  entry: CollectionEntry<PostCollectionKey> | undefined,
) => {
  if (!entry) return;

  if (entry.data.youTubeID) {
    return {
      id: entry.data.youTubeID,
      aspect: entry.data.youTubeAspectRatio,
    } satisfies ComponentProps<typeof Video>["youTubeInfo"];
  }

  const imageFolder = `/src/data/${entry.collection}/`;
  const images = import.meta.glob<{ default: ImageMetadata }>(
    "/src/data/**/*.{png,jpg,jpeg,gif,webp,svg}",
  );
  const imagePath = `${imageFolder}${entry.id}`;
  const image =
    images[
      `${imagePath}.${VALID_INPUT_FORMATS.find(
        (extension) => images[`${imagePath}.${extension}`],
      )}`
    ]?.();

  if (entry.collection === "projects" && !entry.data.draft && !image) {
    // Projects require image
    throw new Error(
      `An image for "${imagePath}" does not exist in pattern: "${imageFolder}*.{${VALID_INPUT_FORMATS.join(
        ",",
      )}}". Import an image, or preferably a video.`,
    );
  }

  return image;
};

export const getDownloadLinks = (entry: { data: object } | undefined) => {
  function isDownloadableEntry(
    test: typeof entry,
  ): test is { data: { downloadLinks: string[] } } {
    return !!(test && Object.hasOwn(test.data, "downloadLinks"));
  }

  if (!isDownloadableEntry(entry) || !entry.data.downloadLinks.length) return;

  return entry.data.downloadLinks;
};

export const getDevelopmentTime = (entry: { data: object } | undefined) => {
  function isDevelopmentTimeEntry(
    test: typeof entry,
  ): test is { data: { developmentTime: string } } {
    return !!(test && Object.hasOwn(test.data, "developmentTime"));
  }

  if (!isDevelopmentTimeEntry(entry)) return;

  dayjs.extend(duration);

  return dayjs.duration(entry.data.developmentTime);
};

type Category = NonNullable<CollectionEntry<"projects">["data"]["category"]>;

export function getCategory<F extends boolean>(
  entry: { data: object } | undefined,
  noFormat?: F,
):
  | (F extends true ? Category : `published ${Category}` | Category)
  | undefined {
  function isCategoryEntry(test: typeof entry): test is {
    data: { category: Category };
  } {
    return !!(test && Object.hasOwn(test.data, "category"));
  }

  let category = isCategoryEntry(entry) ? entry.data.category : undefined;

  if (!category) {
    const developmentTime = getDevelopmentTime(entry);

    if (!developmentTime) return;

    //? Games are assumed to be at least 1 month of development
    category = (
      developmentTime.months() ? "game" : "prototype"
    ) satisfies Category;
  }

  return (
    !noFormat && getDownloadLinks(entry) ? `published ${category}` : category
  ) as any;
}

export const getGroup = (entry: { data: object } | undefined) => {
  function isGroupEntry(test: typeof entry): test is {
    data: { group: string };
  } {
    return !!(test && Object.hasOwn(test.data, "group"));
  }

  if (!isGroupEntry(entry)) return;

  return entry.data.group;
};

export const getTeam = (entry: { data: object } | undefined) => {
  function isTeamEntry(test: typeof entry): test is {
    data: { team: NonNullable<CollectionEntry<"projects">["data"]["team"]> };
  } {
    return !!(test && Object.hasOwn(test.data, "team"));
  }

  if (!isTeamEntry(entry)) return;

  if (typeof entry.data.team !== "number") return entry.data.team;

  return { internal: entry.data.team, external: 0 } satisfies Exclude<
    NonNullable<CollectionEntry<"projects">["data"]["team"]>,
    number
  >;
};

export const getKnowHow = async (
  astro: AstroGlobal,
  options?: {
    allProjects?: boolean | undefined;
  },
) => {
  const knowHow = await Promise.all(
    (await getCollection("know-how")).map(
      async ({ data: { start, end, team, skills, ...data } }) => ({
        start: dayjs(start),
        end: end && dayjs(end),
        team: getTeam({ data: { team } }),
        skills: applyMatch(
          await matchRoles(
            astro,
            skills.map((skill) => ({ data: skill, roles: [skill.job] })),
          ),
        ),
        ...data,
      }),
    ),
  );

  const displayedKnowHow = knowHow.map(({ skills, ...data }) => ({
    skill: skills[0]!,
    countAsExperience: !data.school,
    ...data,
  }));

  knowHow.forEach(({ skills, ...data }, index) => {
    if (!data.school) return;

    // Handle school experience
    const workSkills = skills.filter(
      ({ countAsWork }) =>
        countAsWork || (options?.allProjects && data.projects?.length),
    );
    if (!workSkills.length) return;

    // Move skill to experience
    displayedKnowHow[index]!.skill = skills.filter(
      (skill) => !workSkills.includes(skill),
    )[0]!;
    displayedKnowHow.push({
      ...data,
      countAsExperience: true,
      skill: workSkills[0]!,
    });
  });

  // Sort by end date
  displayedKnowHow.sort((a, b) =>
    !b.end || (a.end && b.end.isAfter(a.end)) ? 1 : -1,
  );

  const { experience, education } = groupBy(
    displayedKnowHow,
    ({ countAsExperience }) => (countAsExperience ? "experience" : "education"),
  );

  return {
    ...(experience ? { experience } : {}),
    ...(education ? { education } : {}),
  };
};

export const getCertifications = async () => {
  const certifications = (await getCollection("certifications")).map(
    ({ data: { date, ...data } }) => ({ date: dayjs(date), ...data }),
  );

  // Sort by date
  certifications.sort((a, b) => (b.date.isAfter(a.date) ? 1 : -1));

  return certifications;
};

export const getLanguages = async (astro: AstroGlobal) => {
  const languages = (await getCollection("languages")).map(({ data }) => data);

  const locale = getCurrentLocale(astro);

  // Sort by currentLocale
  languages.sort((a) =>
    a.code.startsWith(locale) || locale.startsWith(a.code) ? -1 : 1,
  );

  return languages;
};

export const getTech = async (
  astro: AstroGlobal,
  threshold = 7,
  options?: GetCollectionOptions<"tech">,
) =>
  await Promise.all(
    applyMatch(
      await matchRoles(
        astro,
        (await getCollectionAdvanced("tech", options)).map((tech) => ({
          data: tech,
          roles: tech.data.roles,
        })),
      ),
      threshold,
    ).map(async (tech) => {
      const roleFunctionalities = tech.data.functionalities?.filter(
        (functionality) => typeof functionality !== "string",
      );

      if (roleFunctionalities?.length) {
        const matchedFunctionalities = applyMatch(
          await matchRoles(
            astro,
            roleFunctionalities.map((functionality) => ({
              data: functionality,
              roles: functionality.roles,
            })),
          ),
          threshold,
        );

        // Filter and map functionalities
        tech.data.functionalities = tech.data.functionalities!.flatMap(
          (functionality) => {
            if (typeof functionality === "string") return [functionality];

            return matchedFunctionalities.includes(functionality)
              ? [functionality.id]
              : [];
          },
        );
      }

      return tech;
    }),
  );

export const getTechList = async (...params: Parameters<typeof getTech>) => {
  const tech = await getTech(...params);
  const renderedGroups: string[] = [];

  const formatExperience = async (experience: string) => {
    await setDayjsLocale(params[0]);
    dayjs.extend(duration);
    dayjs.extend(relativeTime);

    return capitalize(
      dayjs.duration(experience).humanize().replace("a ", "1 "),
    );
  };

  const t = i18n(params[0]);

  return (
    await Promise.all(
      (await getTech(...params)).map(
        async ({
          data: { id, experience, group, functionalities, translateId },
        }) => {
          if (group) {
            if (renderedGroups.includes(group)) return;
            else renderedGroups.push(group);
          }

          const content = group
            ? tech.filter(
                ({ data: { group: groupToCheck } }) => groupToCheck === group,
              )
            : (functionalities?.map((functionality) => ({
                id:
                  typeof functionality === "string"
                    ? functionality
                    : functionality.id,
                data: {
                  experience: undefined,
                  translateId:
                    typeof functionality === "string" ||
                    !functionality.dontTranslateId,
                },
              })) ?? []);

          const title = capitalize(group ?? id);

          return {
            title: translateId || group ? await t(title) : title,
            experience: group ? undefined : await formatExperience(experience),
            items: await Promise.all(
              content.map(async ({ id, data }) => ({
                title: data.translateId
                  ? await t(capitalize(id))
                  : capitalize(id),
                experience:
                  data.experience && (await formatExperience(data.experience)),
              })),
            ),
            isGroup: !!group,
          };
        },
      ),
    )
  ).filter((tech) => !!tech);
};

export const compactTechList = (
  techListResult: Awaited<ReturnType<typeof getTechList>>,
) =>
  techListResult.flatMap((tech) =>
    tech.isGroup
      ? (tech.items as ((typeof tech.items)[number] &
          Partial<Omit<typeof tech, keyof (typeof tech.items)[number]>>)[])
      : tech,
  );

export const getCompanyName = async (
  astro: AstroGlobal,
  company?: CollectionEntry<"companies">,
) => {
  const currentCompany = company ?? (await getCompany(astro));

  return currentCompany
    ? (currentCompany.data.localizedIds?.[getCurrentLocale(astro)] ??
        currentCompany.id)
    : undefined;
};

export const getResumeProps = async (astro: AstroGlobal) => {
  const company = await getCompany(astro);
  if (!company) return {} as ReturnType<typeof getCompanyResumeProps>;

  return getCompanyResumeProps(
    company,
    getCurrentLocale(astro) === "ja" ? "resumeJa" : "resume",
  );
};

type ResumeKey = Extract<
  keyof CollectionEntry<"companies">["data"],
  `${string}resume${string}`
>;

export const getCompanyResumeProps = (
  company: CollectionEntry<"companies">,
  resume: ResumeKey,
) => {
  const resumeData = company.data[resume];

  if (
    !resumeData ||
    Array.isArray(resumeData) ||
    typeof resumeData === "boolean"
  ) {
    type ResumeProps = Partial<
      Exclude<
        CollectionEntry<"companies">["data"][ResumeKey],
        typeof resumeData
      >
    >;

    if (Array.isArray(resumeData)) return { build: resumeData } as ResumeProps;

    return {} as ResumeProps;
  }

  return resumeData;
};

export const getBuiltCompanies = async (
  resume: Extract<
    keyof CollectionEntry<"companies">["data"],
    `${string}resume${string}`
  >,
) =>
  (await getCollection("companies")).filter(({ data }) => {
    if (import.meta.env.DEV) return true;

    const resumeProps = data[resume];

    return Array.isArray(resumeProps) || typeof resumeProps === "boolean"
      ? resumeProps
      : resumeProps?.build;
  });
