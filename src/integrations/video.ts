import dayjs from "dayjs";
import duration, { type Duration } from "dayjs/plugin/duration";
import { applyMatch, getSortedPosts, matchRoles } from "./astro-server";
import type { AstroGlobal } from "astro";
import { getEntryId } from "@layouts/document/Document.astro";
import { capitalize, endDot } from "./text";
import { i18n } from "./i18n-server";
import { callApi } from "./google/google";
import { getCurrentLocale } from "./i18n-special";
import { defaultLocale } from "./astro-config";
import getReadingTime from "reading-time";
import { roundTo } from "./math";

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
    await getSortedPosts(astro, "projects", {
      entries: showreelProjects.map((project) => ({
        id: `${project}/${project}`,
        collection: "projects",
      })),
    })
  ).sort(
    (a, b) =>
      showreelProjects.indexOf(getEntryId(a)) -
      showreelProjects.indexOf(getEntryId(b))
  );

  const captionsByProject = await Promise.all(
    projects.map(async ({ id, data: { awards, roles } }) => {
      const matchedRoleData = await matchRoles(
        astro,
        roles.map((roleInfo) => ({
          data: roleInfo,
          roles: [roleInfo.role],
        }))
      );

      const getAchievements = (threshold?: number) =>
        applyMatch(matchedRoleData, threshold).flatMap(
          ({ achievements }) => achievements
        );

      const matchedAchievements = getAchievements(1);

      return fitAndQuantizeSubtitles(
        showreelData,
        getEntryId(id) as keyof typeof showreelData,
        matchedAchievements.length ? matchedAchievements : getAchievements(),
        awards?.map((award) => `Awarded ${award}`).slice(0, 1)
      );
    })
  );

  const captions = captionsByProject.flatMap((captions, index) => {
    const projectStart = captionsByProject
      .slice(0, index)
      .map((subtitles) => subtitles.at(-1)!)
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
            "HH:mm:ss,SSS"
          )}\n${await t(endDot(capitalize(text)))}`
      )
    )
  ).join("\n\n");
};

const getCaptionDuration = (text: string) =>
  getReadingTime(text, { wordsPerMinute: 120 }).time;

const fitAndQuantizeSubtitles = <V extends VideoData>(
  videoData: V,
  videoEntry: keyof V,
  fromStart: string[],
  fromEnd?: string[],
  addedDuration = 0
) => {
  const { duration: entryDuration, cuts } = videoData[videoEntry]!;

  dayjs.extend(duration);

  const getDuration = (...params: Parameters<typeof getCaptionDuration>) =>
    Math.max(
      Math.round((getCaptionDuration(...params) + addedDuration) / 1000),
      5
    ) * 1000;

  let captions: { start: Duration; end: Duration; text: string }[] = [];

  // Add from end to start of project
  let availableTimeFromStart = entryDuration;
  let captionsFromEndCount = 0;
  if (fromEnd?.length) {
    const text = fromEnd[0]!;

    const readingTime = getDuration(text);
    const end = dayjs.duration({ seconds: entryDuration });
    const start = end.subtract(readingTime);

    captions.push({
      end,
      start,
      text,
    });

    availableTimeFromStart = start.asSeconds();
    captionsFromEndCount++;
  }

  let currentCutIndex = 0;

  if (fromStart.length) {
    // Add from start to end
    let availableTimeFromEnd = 0;
    for (let fromStartIndex = 0; ; fromStartIndex++) {
      const text = fromStart[fromStartIndex];
      if (!text) {
        const durationIncrease = roundTo(
          (availableTimeFromStart - captions.at(-1)!.end.asSeconds()) /
            (fromStart.length + (fromEnd?.length ?? 0)),
          0.5,
          Math.ceil
        );

        console.warn(
          `Too few captions for "${videoEntry.toString()}". Artificially increasing duration by ${durationIncrease} seconds.`
        );

        return fitAndQuantizeSubtitles(
          videoData,
          videoEntry,
          fromStart,
          fromEnd,
          addedDuration + 1000 * durationIncrease
        );
      }

      const readingTime = getDuration(text);
      let start = dayjs.duration({ seconds: availableTimeFromEnd });
      let end = start.add(readingTime);

      // Handle cuts (quantize)
      const currentCut = cuts[currentCutIndex];
      if (currentCut !== undefined && end.asSeconds() > currentCut) {
        if (fromStartIndex) {
          // Move to next cut
          start = dayjs.duration({ seconds: currentCut });
          end = start.add(readingTime);
          captions.at(-1)!.end = start;
        }

        // Could span whole cuts
        while (
          cuts[currentCutIndex] &&
          end.asSeconds() > cuts[currentCutIndex]!
        ) {
          currentCutIndex++;
        }
      }

      // Handle ending
      if (end.asSeconds() >= availableTimeFromStart) {
        if (captionsFromEndCount) {
          // Match end and start
          const captionsFromEnd = captions.splice(0, captionsFromEndCount);
          if (
            currentCut !== undefined &&
            captionsFromEnd[0]!.start.asSeconds() > currentCut
          ) {
            // Match to cut
            captionsFromEnd[0]!.start = dayjs.duration({
              seconds: currentCut,
            });
          }

          captions.at(-1)!.end = captionsFromEnd[0]!.start;
          captions.push(...captionsFromEnd);
        } else {
          // If only one caption, this is triggered
          if (!captions.at(-1)) {
            captions.push({
              start,
              end,
              text,
            });
          }

          captions.at(-1)!.end = dayjs.duration({
            seconds: availableTimeFromStart,
          });
        }

        break;
      }

      captions.push({
        start,
        end,
        text,
      });

      availableTimeFromEnd = end.asSeconds();
    }
  }

  return captions;
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
    "https://www.googleapis.com/auth/youtube.readonly"
  );

  if (playlists === null) return;

  const uploadPlaylist = playlists?.items?.map(
    ({ contentDetails }) => contentDetails?.relatedPlaylists?.uploads
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
      "https://www.googleapis.com/auth/youtube.readonly"
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
      "https://www.googleapis.com/auth/youtube.readonly"
    )
  )?.items?.[0]?.snippet?.categoryId;
};

export const setYouTubeVideo = async (
  astro: AstroGlobal,
  videoPath: string,
  title: string,
  categoryId: string,
  description: string,
  videoId?: string
) => {
  // TODO PHASE 2 UPDATE (DELETE AND RECREATE) IF VIDEOID PRESENT
  if (videoId) return;

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
              title,
              categoryId,
              description,
              defaultLanguage: defaultLocale,
            },
            status: {
              privacyStatus: "unlisted",
            },
          },
        }),
      astro,
      "https://www.googleapis.com/auth/youtube.upload"
    )
  )?.id;
};

export const setYouTubeCaptions = async (
  astro: AstroGlobal,
  newCaptions: string,
  videoId: string,
  captionId?: string
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
      "https://www.googleapis.com/auth/youtube.force-ssl"
    )
  )?.id;

export const updateYouTubeVideoLocalization = async (
  astro: AstroGlobal,
  videoId: string,
  title: string,
  description: string
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
      "https://www.googleapis.com/auth/youtube.readonly"
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
      "https://www.googleapis.com/auth/youtube.upload"
    )
  )?.id;
};
