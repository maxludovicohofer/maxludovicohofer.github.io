// @ts-check
import { defineConfig, envField } from "astro/config";
import { loadEnv } from "vite";
import remarkMath from "remark-math";
import {
  remarkCreated,
  remarkMinutesRead,
} from "./src/integrations/remark/remark-plugins.mts";
import rehypeKatex, { type Options as KatexOptions } from "rehype-katex";
import { execSync } from "child_process";

import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";

import sentry from "@sentry/astro";
//! Removed spotlight because of slow performance/memory leak

const currentBranch = execSync("git branch --show-current").toString();

// https://astro.build/config
export default defineConfig({
  site: `https://${
    currentBranch !== "main" ? `${currentBranch.replaceAll(/\/\./g, "")}.` : ""
  }maxludovicohofer.github.io`,
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
});
