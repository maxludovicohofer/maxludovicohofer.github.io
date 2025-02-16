import { getDocumentId } from "@layouts/document/Document.astro";
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
  post: CollectionEntry<PostCollectionKey> | undefined
) => {
  if (!post) return;

  if (post.data.title) return post.data.title;

  const rawTitle = getHumanPathSection(getDocumentId(post)!);
  return post.collection === "projects"
    ? toTitleCase(rawTitle)
    : capitalize(rawTitle);
};

export const getPublishingDate = (
  post: CollectionEntry<PostCollectionKey> | undefined,
  frontmatter?: Record<string, any>
) => {
  if (post?.data.publishingDate) return dayjs(post.data.publishingDate);

  if (!frontmatter) return;

  dayjs.extend(utc);

  return dayjs.utc(frontmatter.created || undefined);
};

export const getPostCover = (
  post: CollectionEntry<PostCollectionKey> | undefined
) => {
  if (!post) return;

  if (post.data.youTubeID) {
    return {
      id: post.data.youTubeID,
      aspect: post.data.youTubeAspectRatio,
    } satisfies ComponentProps<typeof Video>["youTubeInfo"] as ComponentProps<
      typeof Video
    >["youTubeInfo"];
  }

  const imageFolder = `/src/data/${post.collection}/`;
  const images = import.meta.glob<{ default: ImageMetadata }>(
    "/src/data/**/*.{png,jpg,jpeg,gif,webp,svg}"
  );
  const imagePath = `${imageFolder}${post.id}`;
  const image =
    images[
      `${imagePath}.${VALID_INPUT_FORMATS.find(
        (extension) => images[`${imagePath}.${extension}`]
      )}`
    ];

  if (post.collection === "projects" && !post.data.draft && !image) {
    // Projects require image
    throw new Error(
      `An image for "${imagePath}" does not exist in pattern: "${imageFolder}*.{${VALID_INPUT_FORMATS.join(
        ","
      )}}". Import an image, or preferably a video.`
    );
  }

  return image;
};

export const getDownloadLinks = (entry?: { data: object }) => {
  function isDownloadableEntry(entry?: {
    data: object;
  }): entry is { data: { downloadLinks: string[] } } {
    return !!(entry && Object.hasOwn(entry.data, "downloadLinks"));
  }

  if (!isDownloadableEntry(entry) || !entry.data.downloadLinks.length) return;

  return entry.data.downloadLinks;
};

export const getDevelopmentTime = (entry?: { data: object }) => {
  function isDevelopmentTimeEntry(entry?: {
    data: object;
  }): entry is { data: { developmentTime: string } } {
    return !!(entry && Object.hasOwn(entry.data, "developmentTime"));
  }

  if (!isDevelopmentTimeEntry(entry)) return;

  dayjs.extend(duration);

  return dayjs.duration(entry.data.developmentTime);
};

type Category = NonNullable<CollectionEntry<"projects">["data"]["category"]>;

export function getCategory<F extends boolean>(
  entry?: { data: object },
  noFormat?: F
):
  | (F extends true ? Category : `Published ${Lowercase<Category>}` | Category)
  | undefined {
  function isCategoryEntry(entry?: { data: object }): entry is {
    data: { category: Category };
  } {
    return !!(entry && Object.hasOwn(entry.data, "category"));
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
      ? `Published ${category.toLowerCase()}`
      : category
  ) as any;
}

export function getGroup(entry?: { data: object }) {
  function isGroupEntry(entry?: { data: object }): entry is {
    data: { group: string };
  } {
    return !!(entry && Object.hasOwn(entry.data, "group"));
  }

  return isGroupEntry(entry) ? entry.data.group : undefined;
}
