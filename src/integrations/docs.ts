import { getStaticPaths as getBasePaths } from "@pages/index.astro";
import type { AstroGlobal } from "astro";
import { getCollection } from "astro:content";
import { FULL_ADDRESS } from "astro:env/server";
import { defaultLocale, getShortName, locales, myName } from "./astro-config";
import { getRole } from "./astro-server";
import {
  getBuiltCompanies,
  getCompanyName,
  getCompanyResumeProps,
  getResumeProps,
} from "./content";
import { i18n, type I18nOptions } from "./i18n-server";
import { getCurrentLocale, getLocaleInfo, localeInfo } from "./i18n-special";
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
      id,
      data: { workFields },
    },
  } = await getRole(astro);

  const mainWorkField = (workFields ??
    (await getCollection("roles"))[0]?.data.workFields)?.[0];

  if (!mainWorkField) return "";

  const t = i18n(astro);

  const company = await getCompanyName(astro);
  const { resume, specifyRole } = await getResumeProps(astro);

  const specifiedRole = (Array.isArray(resume) && resume?.[0]?.id) || id;

  return removeWatashiWa(
    `${
      company
        ? `${await t(
            `I am deeply inspired by {}'s innovative {} and would be honored to contribute to your team${specifyRole ? " as a {}" : ""}.`,
            {
              interpolate: [
                company,
                await t(mainWorkField),
                await t(specifiedRole),
              ],
            },
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
    ? `I specialize in ${toTextList(
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

  const professionalSummarySentence =
    "with 3 years of professional experience in programming and leadership";

  return removeWatashiWa(
    await t(
      endDelimiter(
        `${
          short
            ? `I'm ${withArticle} ${professionalSummarySentence}.`
            : `${capitalize(id)} ${professionalSummarySentence}.`
        }${specializationSentence ? ` ${specializationSentence}` : ""}`,
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
    `${
      company
        ? `${await t(
            "My background in software development and leadership has allowed me to develop hard and soft skills that I'd love to contribute to {}.",
            { interpolate: company },
          )}${await t(" ")}`
        : ""
    }${await t(
      "While relatively new to the professional world of videogames, I have been developing games as a hobbyist my whole life.",
    )}${`${await t(" ")}${await t(
      "I value self-teaching, creating an accepting work environment, and sharing know-how with colleagues.",
    )}`}${await t(" ")}${await t(
      "I aspire to grow my skills further while learning from your forward-thinking company.",
    )}${await t(" ")}`,
  );
};

export const getAddress = async (astro: AstroGlobal, options?: I18nOptions) => {
  const t = i18n(astro);

  let address = FULL_ADDRESS ?? "Paese 31038 near Venice, Italy";

  if (FULL_ADDRESS) {
    const localeNation = getLocaleInfo(astro).nationName;
    if (FULL_ADDRESS.endsWith(localeNation)) {
      address = FULL_ADDRESS.replace(new RegExp(`${localeNation}$`), "TV");
    }
  }

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

export const getResumeDocuments = (astro: AstroGlobal) =>
  getCurrentLocale(astro) === "ja" ? ["履歴書", "職務経歴書"] : ["resume"];

export const getExtraItems = async (astro: AstroGlobal) => {
  const t = i18n(astro);

  const { interests } = await getResumeProps(astro);
  const { passions, focuses } = interests ?? {
    passions: ["cinema", "arts"],
    focuses: ["cyberpunk", "cosmic horror"],
  };

  return await Promise.all(
    [
      `passionate about ${toTextList(passions)}, especially ${toTextList(focuses)}`,
      "keeping up to date with the latest technology and research",
      "creating electronic music and worked as mixing and mastering engineer",
    ].map(async (extra) => await t(endDelimiter(capitalize(extra)))),
  );
};

export const getPathsIf = async (
  key: keyof ReturnType<typeof getCompanyResumeProps>,
  ...params: Parameters<typeof getDocumentsBasePaths>
) => {
  const companies = await getBuiltCompanies();

  if (!companies.length) return getDocumentsBasePaths({ dontBuild: true });

  const canBuild = companies.some((company) =>
    locales.some(
      (localeAsResumeKey) =>
        getCompanyResumeProps(company, localeAsResumeKey)[key],
    ),
  );

  if (!canBuild) return getDocumentsBasePaths({ dontBuild: true });

  const jaCompaniesCount = companies.filter(({ data }) => data.ja).length;

  return getDocumentsBasePaths({
    allowedCompanies: companies.map(({ id }) => id),
    ...(jaCompaniesCount
      ? companies.length === jaCompaniesCount
        ? { allowedLocales: ["ja"] }
        : {}
      : { excludedLocales: ["ja"] }),
    ...params[0],
  });
};

export const getDocumentsBasePaths = (
  ...params: Parameters<typeof getBasePaths>
) => getBasePaths({ notPortfolio: true, ...params[0] });
