import {
  getEntryId,
  type DocumentCollectionKey,
} from "@layouts/document/Document.astro";
import { capitalize, getHumanPathSection, toTitleCase } from "./text";
import type { CollectionEntry, CollectionKey } from "astro:content";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import utc from "dayjs/plugin/utc";
import type Video from "@components/ui/Video.astro";
import type { ComponentProps } from "astro/types";
import { VALID_INPUT_FORMATS } from "node_modules/astro/dist/assets/consts";

export type PostCollectionKey = Extract<CollectionKey, "projects" | "thoughts">;

export const getTitle = (
  entry: CollectionEntry<DocumentCollectionKey> | undefined
) => {
  if (!entry) return;

  if (entry.data.title) return entry.data.title;

  const rawTitle = getHumanPathSection(getEntryId(entry)!);
  return entry.collection === "projects"
    ? toTitleCase(rawTitle)
    : capitalize(rawTitle);
};

export const getPublishingDate = (
  entry: CollectionEntry<DocumentCollectionKey> | undefined,
  frontmatter?: Record<string, any>
) => {
  if (entry?.data.publishingDate) return dayjs(entry.data.publishingDate);

  if (!frontmatter) return;

  dayjs.extend(utc);

  return dayjs.utc(frontmatter.created || undefined);
};

export const getCover = (
  entry: CollectionEntry<PostCollectionKey> | undefined
) => {
  if (!entry) return;

  if (entry.data.youTubeID) {
    return {
      id: entry.data.youTubeID,
      aspect: entry.data.youTubeAspectRatio,
    } satisfies ComponentProps<typeof Video>["youTubeInfo"] as ComponentProps<
      typeof Video
    >["youTubeInfo"];
  }

  const imageFolder = `/src/data/${entry.collection}/`;
  const images = import.meta.glob<{ default: ImageMetadata }>(
    "/src/data/**/*.{png,jpg,jpeg,gif,webp,svg}"
  );
  const imagePath = `${imageFolder}${entry.id}`;
  const image =
    images[
      `${imagePath}.${VALID_INPUT_FORMATS.find(
        (extension) => images[`${imagePath}.${extension}`]
      )}`
    ];

  if (entry.collection === "projects" && !entry.data.draft && !image) {
    // Projects require image
    throw new Error(
      `An image for "${imagePath}" does not exist in pattern: "${imageFolder}*.{${VALID_INPUT_FORMATS.join(
        ","
      )}}". Import an image, or preferably a video.`
    );
  }

  return image;
};

export const getDownloadLinks = (entry: { data: object } | undefined) => {
  function isDownloadableEntry(
    test: typeof entry
  ): test is { data: { downloadLinks: string[] } } {
    return !!(test && Object.hasOwn(test.data, "downloadLinks"));
  }

  if (!isDownloadableEntry(entry) || !entry.data.downloadLinks.length) return;

  return entry.data.downloadLinks;
};

export const getDevelopmentTime = (entry: { data: object } | undefined) => {
  function isDevelopmentTimeEntry(
    test: typeof entry
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
  noFormat?: F
):
  | (F extends true ? Category : `Published ${Lowercase<Category>}` | Category)
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
      developmentTime.months() ? "Game" : "Prototype"
    ) satisfies Category;
  }

  return (
    !noFormat && getDownloadLinks(entry)
      ? `Published ${category.toLocaleLowerCase()}`
      : category
  ) as any;
}

export function getGroup(entry: { data: object } | undefined) {
  function isGroupEntry(test: typeof entry): test is {
    data: { group: string };
  } {
    return !!(test && Object.hasOwn(test.data, "group"));
  }

  return isGroupEntry(entry) ? entry.data.group : undefined;
}
