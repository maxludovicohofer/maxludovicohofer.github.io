import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    "./rehype-*.{mjs,mts}",
  ],
  theme: {
    extend: {},
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss-intersect"),
    require("tailwind-scrollbar-hide"),
  ],
} satisfies Config;
