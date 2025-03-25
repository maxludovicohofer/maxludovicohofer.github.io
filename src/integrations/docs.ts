import type { AstroGlobal } from "astro";
import { getCollection } from "astro:content";
import { FULL_ADDRESS } from "astro:env/server";
import { defaultLocale, getShortName, myName } from "./astro-config";
import { getRole } from "./astro-server";
import { getCompanyName } from "./content";
import { i18n, type I18nOptions } from "./i18n-server";
import { getLocaleInfo, localeInfo } from "./i18n-special";
import { removeWatashiWa } from "./l10n";
import { capitalize, endDelimiter, toTextList } from "./text";

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

  const t = i18n(astro);

  const company = await getCompanyName(astro);

  return removeWatashiWa(
    `${
      company
        ? `${await t(
            `I am deeply inspired by {}'s innovative ${mainWorkField} and would be honored to contribute to your team.`,
            { interpolate: company },
          )}${await t(" ")}`
        : ""
    }${await t(
      "I value attention to detail, embrace cutting-edge technologies, and enjoy fostering collaboration to achieve excellent results.",
    )}${`${await t(" ")}${await t(
      `Currently transitioning from software engineering to ${
        mainWorkField.includes("game") ? "" : "videogame "
      }${mainWorkField}, which is my lifelong passion.`,
    )}`}`,
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
            !new RegExp(
              `\\b${
                specialization.endsWith("s")
                  ? `${specialization}*`
                  : specialization
              }\\b`,
            ).test(id),
        ),
      )}`
    : "";

  const t = i18n(astro);

  return removeWatashiWa(
    await t(
      endDelimiter(
        `${
          short
            ? `I'm ${withArticle}`
            : `${capitalize(id)} experienced in leadership and software`
        }${
          specializationSentence
            ? `${short ? "" : ","} ${specializationSentence}`
            : ""
        }`,
      ),
    ),
  );
};

export const getSelfPRSentence = async (astro: AstroGlobal) => {
  const {
    role: {
      data: { workFields },
    },
  } = await getRole(astro);

  const mainWorkField = (workFields ??
    (await getCollection("roles"))[0]?.data.workFields)?.[0];

  if (!mainWorkField) return "";

  const t = i18n(astro);

  const company = await getCompanyName(astro);

  return removeWatashiWa(
    `${await t(
      "My background in software development and leadership has allowed me to develop hard and soft skills that I wish to contribute to the game industry.",
    )}${`${await t(" ")}${await t(
      `While new to the professional world of videogames, I have been involved in ${mainWorkField} on academic and personal projects my whole life.`,
    )}`}${`${await t(" ")}${await t(
      "I value self-teaching, teamwork, and sharing knowledge with colleagues.",
    )}`}${
      company
        ? `${await t(" ")}${await t(
            `I aspire to grow my skills further while learning from a forward-thinking company like {}.}`,
            { interpolate: company },
          )}${await t(" ")}`
        : ""
    }`,
  );
};

export const getAddress = async (astro: AstroGlobal, options?: I18nOptions) => {
  const t = i18n(astro);

  const address = FULL_ADDRESS ?? "Paese 31038 near Venice, Italy";

  return {
    raw: address,
    translated: await t(address, { noCache: true, ...options }),
  };
};

export const getMyName = async (astro: AstroGlobal) => {
  const t = i18n(astro);
  const { surnameFirst, nameSeparator } = getLocaleInfo(astro);

  const fullName = surnameFirst
    ? [myName.surname, myName.name]
    : [myName.name, myName.surname];

  const nameParts = fullName.flatMap((part) => part.split(" "));
  const shortNameParts = getShortName(fullName);

  const separator = nameSeparator ?? " ";

  return {
    rawButOrdered: nameParts.join(
      localeInfo[defaultLocale].nameSeparator ?? " ",
    ),
    translated: await t(nameParts.join(separator)),
    translatedShort: await t(shortNameParts.join(separator)),
  };
};
