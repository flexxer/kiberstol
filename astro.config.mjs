// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  // Обязателен для SEO: абсолютные URL в sitemap, canonical, Open Graph
  site: 'https://kiberstol.by',

  // Полностью статический режим (автономность, деплой на BY-хостинг).
  // Node-адаптер нужен только для серверных маршрутов Keystatic CMS
  // (/keystatic, /api/keystatic) — все контентные страницы остаются статичными.
  output: 'static',
  adapter: node({ mode: 'standalone' }),

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    // React-рендерер для UI Keystatic CMS (client:only="react")
    react(),
    // Keystatic CMS: инжектит маршруты /keystatic/[...params] и /api/keystatic/[...params]
    // и резолвит `virtual:keystatic-config` → ./keystatic.config.ts
    keystatic(),
    sitemap({
      // Исключаем служебные и noindex-страницы из sitemap:
      // /keystatic (CMS), юридические страницы и /care (noindex).
      filter: (page) =>
        !page.includes('/keystatic') &&
        !page.includes('/privacy') &&
        !page.includes('/cookie-policy') &&
        !page.includes('/terms') &&
        !page.includes('/returns') &&
        !page.includes('/complaints') &&
        !page.includes('/care'),
    }),
  ],
});