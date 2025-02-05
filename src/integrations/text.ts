export const toSentenceCase = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

export const toTitleCase = (text: string) =>
  text.split(" ").map(capitalize).join(" ");

export const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const isRemoteLink = (link: string) => link.startsWith("http");

export const isMailLink = (link: string) => link.startsWith("mailto:");

export const isTelLink = (link: string) => link.startsWith("tel:");

export const isFileLink = (link: string) =>
  isRemoteLink(link)
    ? new URL(link).pathname.includes(".")
    : link.includes(".");

export const getLinkName = (link: string) => {
  let linkName = "";

  if (isRemoteLink(link)) {
    linkName = new URL(link).host.split(".").at(-2)!;
  } else if (isMailLink(link)) {
    linkName = link.slice(7);
  } else if (isTelLink(link)) {
    linkName = link.slice(4);
  } else {
    linkName = link
      .replace(/(^\/+)|(\/+$)/g, "")
      .split("/")
      .at(-1)!
      .replaceAll("-", " ")
      .split(".")[0]!;
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
