// @ts-check
import { defineConfig, envField } from "astro/config";
import { loadEnv } from "vite";
import remarkMath from "remark-math";
import {
  remarkCreated,
  remarkMinutesRead,
} from "./src/integrations/remark/remark-plugins.mts";
import rehypeKatex, { type Options as KatexOptions } from "rehype-katex";

import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";

import sentry from "@sentry/astro";
//! Removed spotlight because of slow performance/memory leak

// https://astro.build/config
export default defineConfig({
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
        authToken: loadEnv(process.env.NODE_ENV!, process.cwd(), "")
          .SENTRY_AUTH_TOKEN!,
      },
    }),
  ],
  site: "https://maxludovicohofer.github.io",
  markdown: {
    remarkPlugins: [remarkMinutesRead, remarkCreated, remarkMath],
    rehypePlugins: [
      [
        rehypeKatex,
        { macros: { "\\ ": "\\allowbreak\\, " } } satisfies KatexOptions,
      ],
    ],
  },
});
