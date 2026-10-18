import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Общая схема SEO-полей, переиспользуемая во всех коллекциях.
 * Все тексты задаются в CMS (Keystatic), не хардкодятся в компонентах.
 */
const seoSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    image: z.string().optional(),
    noindex: z.boolean().default(false),
  })
  .optional();

/**
 * Гибкие блоки контента (`contentBlocks`).
 *
 * Generic-страницы линеек (`/lines/[slug]`) и моделей (`/products/[slug]`)
 * строятся из переиспользуемых блоков. Блоки задаются через `fields.blocks`
 * в Keystatic и рендерятся единым компонентом `ContentBlocks.astro`.
 *
 * Каждый блок — отдельный Astro-компонент в `src/components/blocks/`.
 */
const contentBlocks = z.array(
  z.discriminatedUnion('type', [
    // Hero-баннер страницы
    z.object({
      type: z.literal('hero'),
      heading: z.string(),
      subheading: z.string().optional(),
      image: z.string().optional(),
      ctaText: z.string().optional(),
      ctaHref: z.string().optional(),
    }),
    // WYSIWYG-текст (заголовки, списки, ссылки, жирный/курсив)
    z.object({
      type: z.literal('richText'),
      content: z.string(),
    }),
    // Одиночное inline-изображение
    z.object({
      type: z.literal('image'),
      image: z.string(),
      alt: z.string(),
      caption: z.string().optional(),
      align: z.enum(['left', 'center', 'right']).default('center'),
    }),
    // Карусель изображений
    z.object({
      type: z.literal('imageCarousel'),
      images: z.array(
        z.object({ image: z.string(), alt: z.string(), caption: z.string().optional() }),
      ),
      autoplay: z.boolean().default(false),
    }),
    // Inline-видео
    z.object({
      type: z.literal('video'),
      src: z.string(),
      poster: z.string().optional(),
      controls: z.boolean().default(true),
      autoplay: z.boolean().default(false),
    }),
    // Видео в режиме «gif» (без звука, зациклено, без контролов)
    z.object({
      type: z.literal('videoGif'),
      src: z.string(),
      poster: z.string().optional(),
    }),
    // Сетка/лайтбокс изображений
    z.object({
      type: z.literal('gallery'),
      images: z.array(
        z.object({ image: z.string(), alt: z.string(), caption: z.string().optional() }),
      ),
    }),
    // Кнопка/призыв к действию
    z.object({
      type: z.literal('cta'),
      text: z.string(),
      href: z.string(),
      style: z.enum(['primary', 'secondary', 'outline']).default('primary'),
    }),
    // Аккордеон вопросов-ответов
    z.object({
      type: z.literal('faq'),
      items: z.array(z.object({ question: z.string(), answer: z.string() })),
    }),
    // Таблица характеристик
    z.object({
      type: z.literal('specs'),
      items: z.array(z.object({ name: z.string(), value: z.string() })),
    }),
    // Промо-баннер «важный момент»
    z.object({
      type: z.literal('banner'),
      image: z.string().optional(),
      heading: z.string(),
      text: z.string().optional(),
      href: z.string().optional(),
    }),
    // Многоколоночный блок (каждая колонка — вложенные блоки)
    z.object({
      type: z.literal('columns'),
      columns: z.array(
        z.object({
          heading: z.string().optional(),
          content: z.string().optional(),
        }),
      ),
    }),
    // Цитата/отзыв-вставка
    z.object({
      type: z.literal('quote'),
      text: z.string(),
      author: z.string().optional(),
    }),
    // Разделитель/спейсер
    z.object({
      type: z.literal('divider'),
      style: z.enum(['line', 'space']).default('line'),
    }),
  ]),
);

/**
 * `products` — товары (модели столов).
 * Содержит юридически обязательные поля карточки товара (закон РБ).
 */
const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    title: z.string(), // наименование товара
    line: z.string(), // id линейки (родитель)
    price: z.number(), // цена, BYN
    oldPrice: z.number().optional(),
    shortDescription: z.string(),
    description: z.string(),

    // Юридически обязательные поля карточки
    manufacturer: z.string(), // наименование изготовителя
    manufacturerLocation: z.string(), // местонахождение изготовителя
    supplier: z.string(), // наименование + местонахождение поставщика
    countryOfOrigin: z.string(), // страна происхождения
    warranty: z.string().optional(), // гарантийный срок
    used: z.boolean().default(false), // б/у или конфискован

    specs: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    image: z.string(),
    gallery: z.array(z.string()).optional(),
    badge: z.string().optional(),
    ctaText: z.string().optional(),
    order: z.number().default(0),
    content: contentBlocks,
    seo: seoSchema,
  }),
});

/**
 * `lines` — линейки столов (старт — 3, с перспективой расширения).
 */
const lines = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lines' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    features: z.array(z.string()).optional(),
    order: z.number().default(0),
    content: contentBlocks,
    seo: seoSchema,
  }),
});

/**
 * `site` — единый источник правды для реквизитов ИП, бренда,
 * навигации, аналитики/рекламы и глобальных SEO-полей.
 */
const site = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/site' }),
  schema: z.object({
    brand: z.string(),
    tagline: z.string(),
    fullName: z.string(),
    unp: z.string(),
    registrationDate: z.string(),
    tradeRegistryNumber: z.string(),
    tradeRegistryDate: z.string(),
    phone: z.string(),
    email: z.string(),
    address: z.string(),
    workHours: z.string(),
    authorizedBody: z.string(),
    authorizedBodyPhone: z.string(),
    brandColors: z
      .object({
        primary: z.string(),
        secondary: z.string(),
        neutral: z.string(),
        accent: z.array(z.string()).optional(),
      })
      .optional(),
    paymentMethods: z.array(z.string()),
    deliveryMethods: z.array(z.string()),
    nav: z.array(z.object({ label: z.string(), href: z.string() })),
    analytics: z
      .object({
        ga4Id: z.string().optional(),
        yandexMetrikaId: z.string().optional(),
      })
      .optional(),
    advertising: z
      .object({
        googleAdsId: z.string().optional(),
        yandexDirectId: z.string().optional(),
      })
      .optional(),
    seo: seoSchema,
  }),
});

/**
 * `legal` — юридические документы.
 * Файлы: privacy, cookie-policy, terms, returns, complaints.
 */
const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    updatedAt: z.coerce.date(),
    seo: seoSchema,
  }),
});

/**
 * `sections` — тексты секций главной страницы.
 * Каждая секция — отдельный файл; тексты редактируются в CMS.
 */
const sections = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sections' }),
  schema: z.object({
    title: z.string(),
    heading: z.string().optional(),
    subheading: z.string().optional(),
    body: z.string().optional(),
    ctaText: z.string().optional(),
    ctaHref: z.string().optional(),
    order: z.number().default(0),
  }),
});

/**
 * `faq` — вопросы-ответы (аккордеон на главной).
 */
const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faq' }),
  schema: z.object({
    question: z.string(),
    answer: z.string(),
    order: z.number().default(0),
  }),
});

export const collections = { products, lines, site, legal, sections, faq };