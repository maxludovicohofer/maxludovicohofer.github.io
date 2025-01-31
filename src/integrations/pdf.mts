import type { PagesFunction } from "astro-pdf";

export const getPrintOptions: PagesFunction = (pathname) => {
  const options: ReturnType<typeof getPrintOptions> = {
    pdf: {
      margin: {
        top: "0.9in",
        bottom: "0.9in",
        left: "1in",
        right: "1in",
      },
    },
  };

  const cleanPathname = pathname.replace(/\/$/, "");

  if (cleanPathname.startsWith("/docs/"))
    options.path = `${cleanPathname.slice(cleanPathname.indexOf("/", 1))}.pdf`;
  else if (cleanPathname.endsWith("/pdf"))
    options.path = `${cleanPathname.slice(0, cleanPathname.lastIndexOf("/"))}.pdf`;
  else return;

  return options;
};
