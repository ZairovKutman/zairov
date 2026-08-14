// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// When moving to a custom domain, set base: '/' and update site.
export default defineConfig({
  site: 'https://zairovkutman.github.io',
  base: '/zairov',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en', 'ky'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'ru',
        locales: {
          ru: 'ru',
          en: 'en',
          ky: 'ky',
        },
      },
    }),
  ],
});
