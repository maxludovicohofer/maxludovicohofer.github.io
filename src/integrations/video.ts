import dayjs from "dayjs";
import duration, { type Duration } from "dayjs/plugin/duration";
import {
  addBaseToLink,
  applyMatch,
  getSortedPosts,
  matchRoles,
} from "./astro-server";
import type { AstroGlobal } from "astro";
import { getEntryId } from "@layouts/document/Document.astro";
import { capitalize, endDot } from "./text";
import { i18n } from "./i18n-server";

export const generateShowreelCaptions = async (astro: AstroGlobal) => {
  const projects = [
    "steelsilk-championship",
    "lolita",
    "inversion",
    "duchessas-world",
  ];

  const scenesPerProject = 5;
  const secondsPerProject = 30;

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
            .slice(0, secondsPerProject / scenesPerProject - (awards ? 2 : 1)),
          ...(awards ? [`Won ${awards[0]}`] : []),
        ];
      })
    )
  ).flat();

  const t = i18n(astro);

  dayjs.extend(duration);

  const captions: { start: Duration; end: Duration; text: string }[] = [];

  for (let index = 0; index < projects.length * scenesPerProject; index++) {
    const start = dayjs.duration(
      index * (secondsPerProject / scenesPerProject) * 1000
    );
    captions.push({
      start,
      end: start.add({ seconds: secondsPerProject / scenesPerProject }),
      text: await t(endDot(capitalize(subtitles[index]!))),
    });
  }

  const { writeFile } = await import("fs/promises");

  await writeFile(
    `src/data/videos/showreel-captions-${(await addBaseToLink(astro)).split("/").slice(1).reverse().join("-")}.srt`,
    captions
      .map(
        ({ start, end, text }, index) =>
          `${index}\n${start.format("HH:mm:ss,SSS")} --> ${end.format("HH:mm:ss,SSS")}\n${text}`
      )
      .join("\n\n")
  );

  // TODO USE YOUTUBE DATA API TO DUPLICATE SHOWREEL FOR EACH ROLE AND AUTO UPLOAD CAPTIONS FOR IT FROM PORTFOLIO DATA
};
