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

export const generateShowreelCaptions = async (astro: AstroGlobal) => {
  dayjs.extend(duration);

  const projects = [
    "steelsilk-championship",
    "lolita",
    "inversion",
    "duchessas-world",
  ];

  // TODO PHASE 2 USE GET READING TIME TO CORRECTLY FIT CAPTIONS IN SHOWREEL

  const captionsPerProject = 5;
  const totalCaptions = projects.length * captionsPerProject;
  const showreelDuration = dayjs.duration({ minutes: 2 });
  const captionDuration = dayjs.duration(
    showreelDuration.asMilliseconds() / totalCaptions
  );

  const posts = (
    await getSortedPosts(astro, "projects", {
      entries: projects.map((project) => ({
        id: `${project}/${project}`,
        collection: "projects",
      })),
    })
  ).sort(
    (a, b) => projects.indexOf(getEntryId(a)) - projects.indexOf(getEntryId(b))
  );

  const subtitles = (
    await Promise.all(
      posts.map(async (entry) => {
        const { awards, roles } = entry.data;

        const matchedRoles = applyMatch(
          await matchRoles(
            astro,
            roles.map((roleInfo) => ({
              data: roleInfo,
              roles: [roleInfo.role],
            }))
          )
        );

        return [
          ...matchedRoles
            .flatMap(({ achievements }) => achievements)
            .slice(0, captionsPerProject - (awards ? 1 : 0)),
          ...(awards ? [`Won ${awards[0]}`] : []),
        ];
      })
    )
  ).flat();

  const t = i18n(astro);

  const captions: { start: Duration; end: Duration; text: string }[] = [];

  for (let index = 0; index < totalCaptions; index++) {
    const start = dayjs.duration(index * captionDuration.asMilliseconds());
    captions.push({
      start,
      end: start.add(captionDuration),
      text: await t(endDot(capitalize(subtitles[index]!))),
    });
  }

  return captions
    .map(
      ({ start, end, text }, index) =>
        `${index}\n${start.format("HH:mm:ss,SSS")} --> ${end.format(
          "HH:mm:ss,SSS"
        )}\n${text}`
    )
    .join("\n\n");
};

export const getShowreel = async (astro: AstroGlobal) => {
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
            "items(contentDetails/videoId,snippet/title)",
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
  title: string
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

  const t = i18n(astro);
  const localizedTitle = await t(title, { force: true });

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
              [getCurrentLocale(astro)]: { title: localizedTitle },
            },
          },
        }),
      astro,
      "https://www.googleapis.com/auth/youtube.upload"
    )
  )?.id;
};
