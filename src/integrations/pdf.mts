import type { PagesFunction } from "astro-pdf";
import { standardizePath } from "./text";

export const getPrintOptions: PagesFunction = (pathname) => {
  const cleanPathname = standardizePath(pathname);

  if (cleanPathname.startsWith("docs/") || cleanPathname.endsWith("/pdf")) {
    return {
      path: `${cleanPathname}.pdf`,
    };
  } else return;
};
