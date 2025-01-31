import { defineConfig, envField } from "astro/config";
import { loadEnv } from "vite";
import remarkMath from "remark-math";
import {
  remarkCreated,
  remarkMinutesRead,
} from "./src/integrations/remark.mts";
import rehypeKatex, { type Options as KatexOptions } from "rehype-katex";

import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";

import sentry from "@sentry/astro";
import pdf, { type PagesFunction } from "astro-pdf";
//! Removed spotlight because of slow performance/memory leak

export const getPrintOptions: PagesFunction = (pathname) => {
  const cleanPathname = pathname.replace(/\/$/, "");

  if (cleanPathname.endsWith("/pdf")) {
    return {
      path: `${cleanPathname.slice(0, cleanPathname.lastIndexOf("/"))}.pdf`,
    };
  } else if (cleanPathname.startsWith("/docs/")) {
    return {
      path: `${cleanPathname.slice(cleanPathname.indexOf("/", 1))}.pdf`,
    };
  } else {
    return;
  }
};

// https://astro.build/config
export default defineConfig({
  site: "https://maxludovicohofer.github.io",
  env: {
    schema: {
      SENTRY_AUTH_TOKEN: envField.string({
        context: "server",
        access: "secret",
      }),
    },
  },
  integrations: [
    tailwind(),
    mdx(),
    partytown({ config: { forward: ["umami.track"] } }),
    sentry({
      dsn: "https://5cccb7f2878ca1b593bab70b7d791312@o4508257933787136.ingest.de.sentry.io/4508257936736336",
      sourceMapsUploadOptions: {
        project: "portfolio",
        authToken: loadEnv(import.meta.env.MODE, process.cwd(), "")
          .SENTRY_AUTH_TOKEN!,
      },
    }),
    pdf({
      pages: getPrintOptions,
    }),
  ],
  markdown: {
    remarkPlugins: [remarkMinutesRead, remarkCreated, remarkMath],
    rehypePlugins: [
      [
        rehypeKatex,
        { macros: { "\\ ": "\\allowbreak\\, " } } satisfies KatexOptions,
      ],
    ],
  },
  i18n: {
    locales: ["en", "ja"],
    defaultLocale: "en",
  },
});
