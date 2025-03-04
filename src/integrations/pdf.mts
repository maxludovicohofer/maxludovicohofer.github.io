import type { PagesFunction } from "astro-pdf";
import { getPathSections } from "./text";

export const getPrintOptions: PagesFunction = (pathname) => {
  const sections = getPathSections(pathname);

  const indexOfDocs = sections.slice(0, -1).indexOf("docs");
  if (indexOfDocs !== -1) {
    const [docs] = sections.splice(indexOfDocs, 1);
    const fileName = sections.pop();

    // Order folders by specific-first
    sections.reverse();

    return `${[docs, ...sections, fileName].join("/")}.pdf`;
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
