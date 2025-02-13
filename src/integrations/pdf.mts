import type { PagesFunction } from "astro-pdf";
import { getPathSections, standardizePath } from "./text";

export const getPrintOptions: PagesFunction = (pathname) => {
  const sections = getPathSections(pathname);

  if (sections.at(-2) === "docs") {
    sections.reverse();
    return `${[...sections.slice(1), sections[0]].join("/")}.pdf`;
  } else if (sections.at(-1) === "pdf") {
    return `${sections.join("/")}.pdf`;
  } else return;
};

export const getPrintPath = (documentPath: string) => {
  const printOptions = getPrintOptions(documentPath);
  const printPath = Array.isArray(printOptions)
    ? printOptions[0]
    : printOptions;

  return printPath
    ? typeof printPath === "string"
      ? printPath
      : typeof printPath === "boolean"
      ? `${documentPath}.pdf`
      : printPath.path?.toString()
    : undefined;
};
