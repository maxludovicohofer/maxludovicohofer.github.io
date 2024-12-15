import { execSync } from "child_process";
import type { RemarkPlugins } from "astro";

export const remarkCreated: RemarkPlugins[number] = () => (_, file) => {
  file.data.astro!.frontmatter!.created = execSync(
    `git log --reverse --pretty="format:%cI" "${file.history[0]}"`
  )
    .toString()
    .split("\n")[0];
};
