import type { RemarkPlugin } from "@astrojs/markdown-remark";
import { execSync } from "child_process";
import getReadingTime from "reading-time";
import { toString } from "mdast-util-to-string";

export const remarkCreated: RemarkPlugin = () => (_, file) => {
  file.data.astro!.frontmatter!.created = execSync(
    `git log --reverse --pretty="format:%cI" "${file.history[0]}"`
  )
    .toString()
    .split("\n")[0];
};

export const remarkMinutesRead: RemarkPlugin = () => (tree, file) => {
  file.data.astro!.frontmatter!.minutesRead = getReadingTime(
    toString(tree)
  ).minutes;
};

export const remarkLastModified: RemarkPlugin = () => (_, file) => {
  file.data.astro!.frontmatter!.lastModified = execSync(
    `git log -1 --pretty="format:%cI" "${file.history[0]}"`
  ).toString();
};
