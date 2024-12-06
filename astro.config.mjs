// @ts-check
import { defineConfig } from 'astro/config';
import { remarkReadingTime } from './remark-reading-time.mjs';
import { remarkModifiedTime } from './remark-modified-time.mjs';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import tailwind from '@astrojs/tailwind';

import sentry from '@sentry/astro';
import spotlightjs from '@spotlightjs/astro';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), sentry(), spotlightjs()],
  site: 'https://maxludovicohofer.github.io',
  markdown: {
    remarkPlugins: [remarkReadingTime, remarkModifiedTime, remarkMath],
    rehypePlugins: [rehypeKatex]
  },
});