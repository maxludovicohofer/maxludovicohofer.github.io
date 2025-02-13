export const toSentenceCase = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

export const toTitleCase = (text: string) =>
  text.split(" ").map(capitalize).join(" ");

export const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const isRemoteLink = (link: string) => link.startsWith("http");

export const isMailLink = (link: string) => link.startsWith("mailto:");

export const isTelLink = (link: string) => link.startsWith("tel:");

export const isGeoLink = (link: string) => link.startsWith("geo:");

export const isFileLink = (link: string) =>
  isRemoteLink(link)
    ? new URL(link).pathname.includes(".")
    : link.includes(".");

export const getLinkName = (link: string, pretty?: boolean) => {
  let linkName = "";

  if (isRemoteLink(link)) {
    const url = new URL(link);

    if (!pretty) {
      linkName = url.host.split(".").at(-2)!;
    } else {
      linkName =
        url.hostname === "maps.google.com" ? url.searchParams.get("q")! : link;
    }
  } else if (isMailLink(link)) {
    linkName = link.slice(7);
  } else if (isTelLink(link)) {
    linkName = link.slice(4);

    if (pretty) {
      const sections = linkName.match(/.{1,3}/g)!;
      if (sections.at(-1)!.length < 3) {
        sections[sections.length - 2] = `${sections.at(-2)}${sections.pop()}`;
      }

      linkName = sections.join(" ");
    }
  } else if (isGeoLink(link)) {
    linkName = link.slice(4);
  } else {
    linkName = getHumanPathSection(link);
  }

  return toSentenceCase(linkName);
};

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
  pathname.replace(/(^\/+)|(\/+$)/g, "");

export const getPathSection = (pathname: string, position: number = -1) =>
  getPathSections(pathname).at(position);

export const getPathSections = (
  pathname: string,
  ...params: Parameters<string[]["slice"]>
) =>
  standardizePath(pathname)
    .split("/")
    .slice(...params);

export const getHumanPathSection = (
  ...params: Parameters<typeof getPathSection>
) =>
  getPathSection(...params)!
    .replaceAll("-", " ")
    .split(".")[0]!;

export const makePath = (humanName: string) =>
  humanName.toLowerCase().replaceAll(" ", "-");
