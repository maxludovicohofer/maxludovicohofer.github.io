import { execSync } from "child_process";

export function remarkCreated() {
  return function (_: any, file: any) {
    const filepath = file.history[0];
    const result = execSync(
      `git log --reverse --pretty="format:%cI" "${filepath}"`
    );
    file.data.astro.frontmatter.created = result.toString().split("\n")[0];
  };
}
