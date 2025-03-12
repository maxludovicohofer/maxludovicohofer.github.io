import type { AstroGlobal } from "astro";
import { getRole } from "./astro-server";
import { endDot, capitalize, toTextList } from "./text";
import { getCollection } from "astro:content";
import { i18n } from "./i18n-server";
import { removeWatashiWa } from "./l10n";
import { FULL_ADDRESS } from "astro:env/server";
import { getLocaleInfo, localeInfo } from "./i18n-special";
import { defaultLocale } from "./astro-config.mts";

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

  const t = i18n(astro);

  return removeWatashiWa(
    `${
      company
        ? `${await t(
            `I am deeply inspired by {}'s innovative ${mainWorkField} and would be honored to contribute to your team.`,
            { interpolate: company }
          )}${await t(" ")}`
        : ""
    }${await t(
      "I value attention to detail, embrace cutting-edge technologies, and enjoy fostering collaboration to achieve excellent results."
    )}${`${await t(" ")}${await t(
      `Currently transitioning from software engineering to ${
        mainWorkField.includes("game") ? "" : "videogame "
      }${mainWorkField}, which is my lifelong passion.`
    )}`}`
  );
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

  const t = i18n(astro);

  return removeWatashiWa(
    await t(
      endDot(
        `${
          short
            ? `I'm ${withArticle}`
            : `${capitalize(id)} experienced in leadership and software`
        }${
          specializationSentence
            ? `${short ? "" : ","} ${specializationSentence}`
            : ""
        }`
      )
    )
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

  const t = i18n(astro);

  return removeWatashiWa(
    `${await t(
      "My background in software development and leadership has allowed me to develop hard and soft skills that I wish to contribute to the game industry."
    )}${`${await t(" ")}${await t(
      `While new to the professional world of videogames, I have been involved in ${mainWorkField} on academic and personal projects my whole life.`
    )}`}${`${await t(" ")}${await t(
      "I value self-teaching, teamwork, and sharing knowledge with colleagues."
    )}`}${
      company
        ? `${await t(" ")}${await t(
            `I aspire to grow my skills further while learning from a forward-thinking company like {}.}`,
            { interpolate: company }
          )}${await t(" ")}`
        : ""
    }`
  );
};

export const getAddress = async (astro: AstroGlobal) => {
  const t = i18n(astro);

  const address = FULL_ADDRESS ?? "Paese 31038 near Venice, Italy";

  return { raw: address, translated: await t(address, { noCache: true }) };
};

export const getMyName = async (astro: AstroGlobal) => {
  const t = i18n(astro);

  const fullName = ["Max Ludovico", "Hofer"];

  const { surnameFirst, nameSeparator } = getLocaleInfo(astro);
  if (surnameFirst) fullName.reverse();

  const nameParts = fullName.flatMap((part) => part.split(" "));

  const shortNameParts = fullName.map((part) => part.split(" ")[0]);

  const separator = nameSeparator ?? " ";

  return {
    rawButOrdered: nameParts.join(
      localeInfo[defaultLocale].nameSeparator ?? " "
    ),
    translated: await t(nameParts.join(separator)),
    translatedShort: await t(shortNameParts.join(separator)),
  };
};
