import type { AstroGlobal } from "astro";
import { getRole } from "./astro-server";
import { endDot, capitalize, toTextList } from "./text";
import { getCollection } from "astro:content";
import { PHONE_NUMBER } from "astro:env/server";

export const getWorkFieldsSentence = async (astro: AstroGlobal) => {
  const {
    role: {
      data: { workFields },
    },
  } = await getRole(astro);

  const resolvedWorkFields =
    workFields ?? (await getCollection("roles"))[0]?.data.workFields;

  if (!resolvedWorkFields) return "";

  return `Especially involved in ${toTextList(resolvedWorkFields)}.`;
};

export const getMotivationSentence = async (astro: AstroGlobal) => {
  const {
    role: {
      data: { workFields },
    },
  } = await getRole(astro);

  const mainWorkField = (workFields ??
    (await getCollection("roles"))[0]?.data.workFields)?.[0];

  if (!mainWorkField) return "";

  // Do not include company motivation if public
  return `${
    astro.url.hostname !== astro.site?.hostname
      ? `I am deeply inspired by your innovative ${mainWorkField} and would be honored to contribute to your team. `
      : ""
  }I value attention to detail, embrace cutting-edge technologies, and enjoy fostering collaboration to achieve excellent results. Currently transitioning from software engineering to ${
    mainWorkField.includes("game") ? "" : "videogame "
  }${mainWorkField}, which is my lifelong passion.`;
};

export const getSummary = async (astro: AstroGlobal, short?: boolean) => {
  const {
    role: {
      data: { id, withArticle, specializations },
    },
  } = await getRole(astro);

  const resolvedSpecializations =
    specializations ?? (await getCollection("roles"))[0]?.data.specializations;

  const specializationSentence = resolvedSpecializations
    ? `specialized in ${toTextList(
        resolvedSpecializations.filter(
          (specialization) =>
            id.search(new RegExp(`\\b${specialization}\\b`)) === -1
        )
      )}`
    : "";

  return endDot(
    `${
      short
        ? `I'm ${withArticle}`
        : `${capitalize(id)} experienced in leadership and software`
    }${
      specializationSentence
        ? `${short ? "" : ","} ${specializationSentence}`
        : ""
    }`
  );
};
