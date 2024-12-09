import getReadingTime from "reading-time";
import { toString } from "mdast-util-to-string";

export function remarkMinutesRead() {
  return function (tree: any, file: any) {
    const textOnPage = toString(tree);
    const readingTime = getReadingTime(textOnPage);
    // readingTime.text will give us minutes read as a friendly string,
    // i.e. "3 min read"
    file.data.astro.frontmatter.minutesRead = readingTime.minutes;
  };
}
