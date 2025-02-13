import type { PagesFunction } from "astro-pdf";
import { getPathSections } from "./text";

export const getPrintOptions: PagesFunction = (pathname) => {
  const sections = getPathSections(pathname);

  if (sections.at(-2) === "docs") {
    sections.reverse();
    return {
      path: `${[...sections.slice(1), sections[0]].join("/")}.pdf`,
    };
  } else if (sections.at(-1) === "pdf") {
    return {
      path: `${sections.join("/")}.pdf`,
    };
  } else return;
};
