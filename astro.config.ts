import { defineConfig, envField } from "astro/config";
import rehypeKatex, { type Options as KatexOptions } from "rehype-katex";
import remarkMath from "remark-math";
import { loadEnv } from "vite";
import { remarkCreated, remarkMinutesRead } from "./src/integrations/remark";

import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";
import tailwindcss from "@tailwindcss/vite";

import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import sentry from "@sentry/astro";
import pdf from "astro-pdf";
import { locales } from "./src/integrations/astro-config";
import { getPrintOptions } from "./src/integrations/pdf";
//! Removed spotlight because of slow performance/memory leak

// https://astro.build/config
export default defineConfig({
  site: "https://maxludovicohofer.github.io",

  env: {
    schema: {
      SENTRY_AUTH_TOKEN: envField.string({
        context: "server",
        access: "secret",
      }),
      DEEPL_API_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      GOOGLE_CLIENT_SECRET: envField.string({
        context: "server",
        access: "secret",
      }),
      GOOGLE_CREDENTIALS: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      GITHUB_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      PHONE_NUMBER: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      FULL_ADDRESS: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      BUILD_MODE: envField.enum({
        context: "server",
        access: "secret",
        values: ["public", "local"],
        default: "local",
      }),
    },
  },

  integrations: [
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
      baseOptions: {
        pdf: {
          format: "A4",
          margin: {
            top: 70,
            bottom: 70,
            left: 70,
            right: 70,
          },
        },
      },
    }),
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },

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
    locales,
    defaultLocale: locales[0],
  },

  adapter: node({
    mode: "standalone",
  }),

  build: {
    client: "./",
  },
});