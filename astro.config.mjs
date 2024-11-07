// @ts-check
import { defineConfig } from 'astro/config';
import { remarkReadingTime } from './remark-reading-time.mjs';

import tailwind from '@astrojs/tailwind';

import sentry from '@sentry/astro';
import spotlightjs from '@spotlightjs/astro';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), sentry(), spotlightjs()],
  site: 'https://maxludovicohofer.github.io',
  markdown: {
    remarkPlugins: [remarkReadingTime],
  },
});