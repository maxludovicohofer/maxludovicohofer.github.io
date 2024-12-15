import { execSync } from "child_process";
import type { RemarkPlugins } from "astro";

export const remarkLastModified: RemarkPlugins[number] = () => (_, file) => {
  file.data.astro!.frontmatter!.lastModified = execSync(
    `git log -1 --pretty="format:%cI" "${file.history[0]}"`
  ).toString();
};
