import { getEntryId } from "@layouts/document/Document.astro";
import type { AstroGlobal } from "astro";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import getReadingTime from "reading-time";
import { defaultLocale } from "./astro-config";
import { applyMatch, getSortedPosts, matchRoles } from "./astro-server";
import { callApi, isUploadsExceeded } from "./google/google";
import { i18n } from "./i18n-server";
import { getCurrentLocale } from "./i18n-special";
import { roundTo } from "./math";
import { capitalize, endDelimiter } from "./text";

interface VideoData {
  [entry: string]: {
    duration: number;
    cuts: number[];
  };
}

export const showreelData: VideoData = {
  "steelsilk-championship": {
    duration: 30,
    cuts: [6, 12, 18, 24],
  },
  lolita: {
    duration: 30,
    cuts: [12],
  },
  inversion: {
    duration: 30,
    cuts: [6, 12, 24],
  },
  "duchessas-world": {
    duration: 30,
    cuts: [],
  },
};

export const generateShowreelCaptions = async (astro: AstroGlobal) => {
  const showreelProjects = Object.keys(showreelData);

  const projects = (
    await getSortedPosts(astro, "projects", undefined, {
      entries: showreelProjects.map((project) => ({
        id: `${project}/${project}`,
        collection: "projects",
      })),
    })
  ).sort(
    (a, b) =>
      showreelProjects.indexOf(getEntryId(a)) -
      showreelProjects.indexOf(getEntryId(b)),
  );

  const captionsByProject = await Promise.all(
    projects.map(async ({ id, data: { awards, roles } }) => {
      const matchedRoleData = await matchRoles(
        astro,
        roles.map((roleInfo) => ({
          data: roleInfo,
          roles: [roleInfo.role],
        })),
      );

      const getAchievements = (threshold?: number) =>
        applyMatch(matchedRoleData, threshold).flatMap(
          ({ achievements }) => achievements,
        );

      const matchedAchievements = getAchievements(1);

      return fitCaptions(
        showreelData,
        getEntryId(id) as keyof typeof showreelData,
        [
          ...(matchedAchievements.length
            ? matchedAchievements
            : getAchievements()),
          ...(awards
            ?.slice(0, 1)
            .map((award) => ({ required: true, text: `awarded ${award}` })) ??
            []),
        ],
      );
    }),
  );

  const captions = captionsByProject.flatMap((captions, index) => {
    const projectStart = captionsByProject
      .slice(0, index)
      .map((projectCaptions) => projectCaptions[projectCaptions.length - 1]!)
      .reduce((a, { end }) => a + end.asMilliseconds(), 0);

    return captions.map(({ start, end, ...caption }) => ({
      start: start.add(projectStart),
      end: end.add(projectStart),
      ...caption,
    }));
  });

  const t = i18n(astro);

  return (
    await Promise.all(
      captions.map(
        async ({ start, end, text }, index) =>
          `${index}\n${start.format("HH:mm:ss,SSS")} --> ${end.format(
            "HH:mm:ss,SSS",
          )}\n${await t(endDelimiter(capitalize(text)))}`,
      ),
    )
  ).join("\n\n");
};

type CaptionData = string | { required: boolean; text: string };

type Caption = Exclude<CaptionData, string> & {
  start: number;
  end: number;
};

const fitCaptions = <V extends VideoData>(
  videoData: V,
  videoEntry: keyof V,
  captions: CaptionData[],
  addedDuration = 0,
  debug?: boolean | ((entry: keyof V) => boolean),
) => {
  const isDebug =
    import.meta.env.DEV &&
    (typeof debug === "boolean" ? debug : debug?.(videoEntry));

  const { duration: entrySeconds, cuts } = videoData[videoEntry]!;
  const entryDuration = entrySeconds * 1000;

  const addedCaptions: Caption[] = [];

  let currentCutIndex = 0;
  for (let index = 0; index < captions.length; index++) {
    const {
      caption,
      currentCutIndex: newCutIndex,
      tolerance,
    } = timeCaption(
      captions[index]!,
      addedCaptions,
      cuts,
      entryDuration,
      currentCutIndex,
      addedDuration,
      0.2,
    );
    currentCutIndex = newCutIndex;

    if (caption.end <= entryDuration) {
      addedCaptions.push(caption);

      // Evaluate perfect end
      if (caption.end >= entryDuration - tolerance) {
        if (someFollowingCaptionIsRequired(captions, index)) {
          // Missing required captions, retry
          return fitCaptions(
            videoData,
            videoEntry,
            removeLastAddedNonRequiredCaption(captions, addedCaptions),
            addedDuration,
            isDebug,
          );
        }

        // Perfect end (adjust end caption)
        addedCaptions[addedCaptions.length - 1]!.end = entryDuration;
        break;
      }

      // Added caption, continue
      continue;
    }

    // If first iteration, try to fix imperfect end
    if (!addedDuration) {
      if (caption.required) {
        // Cannot miss required caption, retry
        return fitCaptions(
          videoData,
          videoEntry,
          removeLastAddedNonRequiredCaption(captions, addedCaptions),
          addedDuration,
          isDebug,
        );
      }

      // Try ending with next caption
      continue;
    }

    // Evaluate imperfect end
    if (caption.required || someFollowingCaptionIsRequired(captions, index)) {
      // Missing required captions, retry
      return fitCaptions(
        videoData,
        videoEntry,
        removeLastAddedNonRequiredCaption(captions, addedCaptions),
        addedDuration,
        isDebug,
      );
    }

    // Imperfect end (shortened end caption)
    addedCaptions[addedCaptions.length - 1]!.end = entryDuration;
  }

  const captionsDuration = addedCaptions[addedCaptions.length - 1]?.end;

  if (isDebug) {
    console.debug(
      `end: ${(captionsDuration ?? 0) / 1000} (+${addedDuration / 1000})`,
      addedCaptions.map(
        ({ start, end, text }) => `${start / 1000} - ${end / 1000}: ${text}`,
      ),
    );
  }

  if (captionsDuration !== undefined && captionsDuration < entryDuration) {
    // Captions insufficient: make added captions longer and retry
    return fitCaptions(
      videoData,
      videoEntry,
      addedCaptions,
      addedDuration +
        evaluateDurationIncrease(
          entryDuration,
          captionsDuration,
          addedCaptions.length,
        ),
      isDebug,
    );
  }

  dayjs.extend(duration);

  return addedCaptions.map(({ start, end, ...caption }) => ({
    ...caption,
    start: dayjs.duration(start),
    end: dayjs.duration(end),
  }));
};

const getCaptionDuration = (text: string) =>
  Math.max(getReadingTime(text, { wordsPerMinute: 120 }).time, 3000);

const timeCaption = (
  captionData: CaptionData,
  addedCaptions: Caption[],
  cuts: number[],
  entryDuration: number,
  currentCutIndex: number,
  addedDuration: number,
  percentageTolerance: number,
) => {
  const parsedCaption: Omit<Caption, "start" | "end"> =
    typeof captionData === "string"
      ? { text: captionData, required: false }
      : captionData;

  const readingDuration =
    getCaptionDuration(parsedCaption.text) + addedDuration;
  const start = addedCaptions[addedCaptions.length - 1]?.end ?? 0;
  const caption: Caption = {
    ...parsedCaption,
    start,
    end: start + readingDuration,
  };
  const tolerance = readingDuration * percentageTolerance;

  // Align to cuts (quantize)
  let cutTime = (cuts[currentCutIndex] ?? 0) * 1000;
  if (cutTime) {
    if (caption.end > cutTime + tolerance) {
      if (addedCaptions.length) {
        // Move to next cut
        caption.start = cutTime;
        caption.end = caption.start + readingDuration;
        addedCaptions[addedCaptions.length - 1]!.end = caption.start;
      }

      // Could span whole cuts
      while (cutTime && caption.end > cutTime)
        cutTime = (cuts[++currentCutIndex] ?? 0) * 1000;

      // Align to cut or end
      if (caption.end <= (cutTime ?? entryDuration) + tolerance) {
        caption.end = cutTime;
      }
    }
  }

  return { caption, currentCutIndex, tolerance };
};

const someFollowingCaptionIsRequired = (
  captions: CaptionData[],
  index: number,
) =>
  captions
    .slice(index + 1)
    .some(
      (captionData) => typeof captionData !== "string" && captionData.required,
    );

const removeLastAddedNonRequiredCaption = (
  captions: CaptionData[],
  addedCaptions: Caption[],
) => {
  const lastAddedNonRequired = addedCaptions.findLast(
    ({ required }) => !required,
  )?.text;

  if (!lastAddedNonRequired) throw new Error("Cannot fit required captions.");

  return captions.filter((caption) =>
    typeof caption === "string"
      ? caption !== lastAddedNonRequired
      : caption.text !== lastAddedNonRequired,
  );
};

const evaluateDurationIncrease = (
  entryDuration: number,
  captionsDuration: number,
  captionsCount: number,
) => {
  // This value represents caution. Lower values are more imprecise but converge faster
  const possibilityOfCutShift = 0.7;
  const minDurationIncrease = 100;

  return Math.max(
    roundTo(
      ((entryDuration - captionsDuration) * (1 - possibilityOfCutShift)) /
        captionsCount,
      minDurationIncrease,
      Math.ceil,
    ),
    minDurationIncrease,
  );
};

export const getARandomShowreel = async (astro: AstroGlobal) => {
  const playlists = await callApi(
    ({ channels }, { fields, ...params }) =>
      channels.list({
        ...params,
        mine: true,
        part: ["contentDetails"],
        fields: [
          fields,
          "items(contentDetails/relatedPlaylists/uploads)",
        ].join(),
      }),
    astro,
    "https://www.googleapis.com/auth/youtube.readonly",
  );

  if (playlists === null) return;

  const uploadPlaylist = playlists?.items?.map(
    ({ contentDetails }) => contentDetails?.relatedPlaylists?.uploads,
  )[0];

  if (!uploadPlaylist) throw new Error("Google: no uploads playlist found.");

  const showreelId = (
    await callApi(
      ({ playlistItems }, { fields, ...params }) =>
        playlistItems.list({
          ...params,
          playlistId: uploadPlaylist,
          part: ["contentDetails", "snippet"],
          fields: [
            fields,
            "items(contentDetails/videoId,snippet/title,snippet/description)",
          ].join(),
        }),
      astro,
      "https://www.googleapis.com/auth/youtube.readonly",
    )
  )?.items?.find(({ snippet }) => snippet?.title?.startsWith("Showreel"))
    ?.contentDetails?.videoId;

  if (!showreelId) return;

  return (
    await callApi(
      ({ videos }, { fields, ...params }) =>
        videos.list({
          ...params,
          id: [showreelId],
          part: ["snippet"],
          fields: [fields, "items(snippet/categoryId)"].join(),
        }),
      astro,
      "https://www.googleapis.com/auth/youtube.readonly",
    )
  )?.items?.[0]?.snippet?.categoryId;
};

export const setYouTubeVideo = async (
  astro: AstroGlobal,
  videoPath: string,
  categoryId: string,
  title: string,
  description: string,
  videoId?: string,
) => {
  // TODO PHASE 2 UPDATE (DELETE AND RECREATE) IF VIDEOID PRESENT
  if (videoId) return;

  if (isUploadsExceeded()) {
    console.error("Google: uploads or quota exceeded");
    return;
  }

  const { createReadStream } = await import("fs");

  return (
    await callApi(
      ({ videos }, { fields, ...params }) =>
        videos.insert({
          ...params,
          media: { body: createReadStream(videoPath) },
          part: ["snippet", "status"],
          requestBody: {
            snippet: {
              categoryId,
              title,
              description,
              defaultLanguage: defaultLocale,
            },
            status: {
              privacyStatus: "unlisted",
            },
          },
        }),
      astro,
      "https://www.googleapis.com/auth/youtube.force-ssl",
    )
  )?.id;
};

export const setYouTubeCaptions = async (
  astro: AstroGlobal,
  newCaptions: string,
  videoId: string,
  captionId?: string,
) =>
  (
    await callApi(
      ({ captions }, { fields, ...params }) =>
        captionId
          ? captions.update({
              ...params,
              media: { body: newCaptions },
              part: ["id"],
              requestBody: { id: captionId },
            })
          : captions.insert({
              ...params,
              media: { body: newCaptions },
              part: ["snippet"],
              requestBody: {
                snippet: {
                  videoId,
                  language: getCurrentLocale(astro),
                  name: "",
                },
              },
            }),
      astro,
      "https://www.googleapis.com/auth/youtube.force-ssl",
    )
  )?.id;

export const updateYouTubeVideoLocalization = async (
  astro: AstroGlobal,
  videoId: string,
  title: string,
  description: string,
) => {
  const localizations = (
    await callApi(
      ({ videos }, { fields, ...params }) =>
        videos.list({
          ...params,
          id: [videoId],
          part: ["localizations"],
          fields: [fields, "items(localizations)"].join(),
        }),
      astro,
      "https://www.googleapis.com/auth/youtube.readonly",
    )
  )?.items?.[0];

  if (localizations === null) return;

  const t = i18n(astro, { force: true });
  const localizedTitle = await t(title);
  const localizedDescription = await t(description);

  return (
    await callApi(
      ({ videos }, { fields, ...params }) =>
        videos.update({
          ...params,
          part: ["localizations"],
          requestBody: {
            id: videoId,
            localizations: {
              ...localizations?.localizations,
              [getCurrentLocale(astro)]: {
                title: localizedTitle,
                description: localizedDescription,
              },
            },
          },
        }),
      astro,
      "https://www.googleapis.com/auth/youtube.force-ssl",
    )
  )?.id;
};
