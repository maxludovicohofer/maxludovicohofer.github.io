import type { AstroGlobal } from "astro";
import { getRole } from "./astro-server";
import { endDot, capitalize, toTextList } from "./text";
import { getCollection } from "astro:content";

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

export const getMotivationSentence = async (
  astro: AstroGlobal,
  company?: string
) => {
  const {
    role: {
      data: { workFields },
    },
  } = await getRole(astro);

  const mainWorkField = (workFields ??
    (await getCollection("roles"))[0]?.data.workFields)?.[0];

  if (!mainWorkField) return "";

  return `${
    company
      ? `I am deeply inspired by ${company}'s innovative ${mainWorkField} and would be honored to contribute to your team. `
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

export const getSelfPRSentence = async (
  astro: AstroGlobal,
  company?: string
) => {
  const {
    role: {
      data: { workFields },
    },
  } = await getRole(astro);

  const mainWorkField = (workFields ??
    (await getCollection("roles"))[0]?.data.workFields)?.[0];

  if (!mainWorkField) return "";

  return `My background in software development and leadership has allowed me to develop hard and soft skills that I wish to contribute to the game industry. While new to the professional world of videogames, I have been involved in ${mainWorkField} on academic and personal projects my whole life. I value self-teaching, teamwork, and sharing knowledge with colleagues.${
    company
      ? ` I aspire to grow my skills further while learning from a forward-thinking company like ${company}.`
      : ""
  }`;
};
