import type { AstroGlobal } from "astro";
import { defaultLocale } from "./astro-config";
import { getCurrentLocale, localeInfo } from "./i18n-special";

export const toSentenceCase = (text: string, astro?: AstroGlobal) => {
  const locale = astro ? getCurrentLocale(astro) : defaultLocale;

  return `${text.charAt(0).toLocaleUpperCase(locale)}${text
    .slice(1)
    .toLocaleLowerCase(locale)}`;
};

export const toTitleCase = (text: string, astro?: AstroGlobal) =>
  text
    .split(" ")
    .map((text) => capitalize(text, astro))
    .join(" ");

export const capitalize = (text: string, astro?: AstroGlobal) =>
  `${text
    .charAt(0)
    .toLocaleUpperCase(
      astro ? getCurrentLocale(astro) : defaultLocale,
    )}${text.slice(1)}`;

export const uncapitalize = (text: string, astro?: AstroGlobal) =>
  `${text
    .charAt(0)
    .toLocaleLowerCase(
      astro ? getCurrentLocale(astro) : defaultLocale,
    )}${text.slice(1)}`;

export const endDelimiter = (text: string, delimiter = ".") =>
  new RegExp(`[${localeInfo[defaultLocale].delimiters}]$`).test(text)
    ? text
    : `${text}${delimiter}`;

export const isRemoteLink = (link: string) => link.startsWith("http");

export const isMailLink = (link: string) => link.startsWith("mailto:");

export const isTelLink = (link: string) => link.startsWith("tel:");

export const isGeoLink = (link: string) => link.startsWith("geo:");

export const isFileLink = (link: string) =>
  isRemoteLink(link)
    ? new URL(link).pathname.includes(".")
    : link.includes(".");

export const getMaximumWordsInLimit = (text: string, limit: number) => {
  let shortened = text;

  if (shortened.length < limit) return shortened;

  // Shorten page name
  const words = shortened.split(" ");
  shortened = words[0]!;

  // Is one word, must slice
  if (shortened.length > limit) return shortened.slice(0, limit);

  // Multiple words, select the most that can fit
  let index = 1;
  while (true) {
    const joinedWords = `${shortened} ${words[index]}`;
    if (joinedWords.length < limit) shortened = joinedWords;
    else break;
    index++;
  }

  return shortened;
};

export const standardizePath = (pathname: string) =>
  `/${pathname.replace(/(^\/+)|(\/+$)/g, "")}`;

export const getPathSection = (pathname: string, position = -1) => {
  const sections = getPathSections(pathname);
  return sections[position >= 0 ? position : sections.length + position]!;
};

export const getPathSections = (
  pathname: string,
  ...params: Parameters<string[]["slice"]>
) =>
  standardizePath(pathname)
    .slice(1)
    .split("/")
    .slice(...params);

export const getHumanPathSection = (
  ...params: Parameters<typeof getPathSection>
) =>
  getPathSection(...params)
    .replaceAll("-", " ")
    .split(".")[0]!;

export const makePath = (humanName: string) =>
  humanName.toLocaleLowerCase(defaultLocale).replaceAll(" ", "-");

export const toTextList = (text: string[]) => {
  const length = text.length;

  if (length > 1) {
    return `${text.slice(0, -1).join(", ")}${
      length === 2 ? "" : ","
    } and ${text[text.length - 1]}`;
  }

  return text[0] ?? "";
};

export const diff = (str1: string, str2: string) => {
  const differences: {
    index: number;
    a: string;
    aCode: number;
    b: string;
    bCode: number;
  }[] = [];

  Array.from({ length: Math.max(str1.length, str2.length) }).forEach((_, i) => {
    if (str1[i] !== str2[i]) {
      differences.push({
        index: i,
        a: str1[i]!,
        aCode: str1.charCodeAt(i),
        b: str2[i]!,
        bCode: str2.charCodeAt(i),
      });
    }
  });

  return differences;
};

export const highlightCharacter = (
  text: string,
  index: number,
  charactersAfter = 0,
) =>
  `${text.slice(0, index)}➡️${text[index] ?? ""}⬅️${text.slice(
    index + 1,
    charactersAfter ? index + charactersAfter : undefined,
  )}`;

export const fixNewLines = (text: string) => text.replaceAll("\r\n", "\n");
