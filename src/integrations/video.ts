import dayjs from "dayjs";
import duration, { type Duration } from "dayjs/plugin/duration";
import { applyMatch, getSortedPosts, matchRoles } from "./astro-server";
import type { AstroGlobal } from "astro";
import { getEntryId } from "@layouts/document/Document.astro";
import { capitalize, endDot } from "./text";
import { i18n } from "./i18n-server";
import { callApi } from "./google";
import { getCurrentLocale } from "./i18n-special";

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
    (a, b) =>
      projects.indexOf(getEntryId(a)!) - projects.indexOf(getEntryId(b)!)
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
    ({ channels }, params) =>
      channels.list({
        ...params,
        mine: true,
        part: ["contentDetails"],
        fields: [
          params.fields,
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

  const showreel = await callApi(
    ({ playlistItems }, params) =>
      playlistItems.list({
        ...params,
        playlistId: uploadPlaylist,
        part: ["contentDetails", "snippet"],
        fields: [
          params.fields,
          "items(contentDetails/videoId,snippet/title)",
        ].join(),
      }),
    astro,
    "https://www.googleapis.com/auth/youtube.readonly"
  );

  return showreel?.items?.find(({ snippet }) =>
    snippet?.title?.startsWith("Showreel")
  )?.contentDetails?.videoId;
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
