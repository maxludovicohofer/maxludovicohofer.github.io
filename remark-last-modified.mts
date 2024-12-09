import { execSync } from "child_process";

export function remarkLastModified() {
  return function (_: any, file: any) {
    const filepath = file.history[0];
    const result = execSync(`git log -1 --pretty="format:%cI" "${filepath}"`);
    file.data.astro.frontmatter.lastModified = result.toString();
  };
}
