// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Обязателен для SEO: абсолютные URL в sitemap, canonical, Open Graph
  site: 'https://kiberstol.by',

  // Полностью статический режим (автономность, деплой на BY-хостинг)
  output: 'static',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    sitemap({
      // Исключаем служебные и noindex-страницы из sitemap:
      // /keystatic (CMS) и юридические страницы.
      filter: (page) =>
        !page.includes('/keystatic') &&
        !page.includes('/privacy') &&
        !page.includes('/cookie-policy') &&
        !page.includes('/terms') &&
        !page.includes('/returns') &&
        !page.includes('/complaints'),
    }),
  ],
});