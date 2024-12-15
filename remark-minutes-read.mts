import getReadingTime from "reading-time";
import { toString } from "mdast-util-to-string";
import type { RemarkPlugins } from "astro";

export const remarkMinutesRead: RemarkPlugins[number] = () => (tree, file) => {
  file.data.astro!.frontmatter!.minutesRead = getReadingTime(
    toString(tree)
  ).minutes;
};
