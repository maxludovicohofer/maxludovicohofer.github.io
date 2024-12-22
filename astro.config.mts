// @ts-check
import { defineConfig } from "astro/config";
import { remarkMinutesRead } from "./remark-minutes-read.mts";
import { remarkCreated } from "./remark-created.mts";
import remarkMath from "remark-math";
import rehypeKatex, { type Options as KatexOptions } from "rehype-katex";

import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";

//! Removed sentry and spotlight integrations

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), mdx()],
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
