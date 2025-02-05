import type { PagesFunction } from "astro-pdf";

export const getPrintOptions: PagesFunction = (pathname) => {
  const cleanPathname = pathname.replace(/\/$/, "");

  if (cleanPathname.startsWith("/docs/")) {
    return {
      path: `${cleanPathname.slice(cleanPathname.indexOf("/", 1))}.pdf`,
    };
  } else if (cleanPathname.endsWith("/pdf")) {
    return {
      path: `${cleanPathname.slice(0, cleanPathname.lastIndexOf("/"))}.pdf`,
    };
  } else return;
};
