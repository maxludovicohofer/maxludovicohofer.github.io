// @ts-check
import { defineConfig } from "astro/config";
import { remarkMinutesRead } from "./remark-minutes-read.mts";
import { remarkCreated } from "./remark-created.mts";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import tailwind from "@astrojs/tailwind";

import sentry from "@sentry/astro";
import spotlightjs from "@spotlightjs/astro";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), sentry(), spotlightjs()],
  site: "https://maxludovicohofer.github.io",
  markdown: {
    remarkPlugins: [remarkMinutesRead, remarkCreated, remarkMath],
    rehypePlugins: [[rehypeKatex, { macros: { "\\ ": "\\allowbreak\\," } }]],
  },
});
