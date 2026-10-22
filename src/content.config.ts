import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  legalSchema,
  linesSchema,
  productsSchema,
  sectionsSchema,
  siteSchema,
} from './lib/content-schemas';

/**
 * Коллекции контента Astro.
 *
 * Сами Zod-схемы вынесены в `src/lib/content-schemas.ts`, чтобы их можно было
 * переиспользовать в unit-тестах и скрипте валидации контента без импорта
 * виртуального модуля `astro:content`.
 */

/** `products` — товары (модели столов). */
const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: productsSchema,
});

/** `lines` — линейки столов. */
const lines = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lines' }),
  schema: linesSchema,
});

/** `site` — единый источник правды (реквизиты, бренд, навигация, SEO). */
const site = defineCollection({
  loader: glob({ pattern: '**/*.{md,yaml}', base: './src/content/site' }),
  schema: siteSchema,
});

/** `legal` — юридические документы. */
const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: legalSchema,
});

/** `sections` — тексты секций главной страницы. */
const sections = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sections' }),
  schema: sectionsSchema,
});

export const collections = { products, lines, site, legal, sections };
