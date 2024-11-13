import { execSync } from "child_process";

export function remarkModifiedTime() {
  return function (tree, file) {
    const filepath = file.history[0];
    console.log(filepath);
    const result = execSync(`git log -1 --pretty="format:%cI" "${filepath}"`);
    const otherResult = execSync(`git log --pretty="format:%cI" "${filepath}"`);
    console.log(otherResult.toString());
    file.data.astro.frontmatter.lastModified = result.toString();
  };
}