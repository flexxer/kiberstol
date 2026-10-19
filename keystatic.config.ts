import { config, collection, singleton, fields } from '@keystatic/core';

/**
 * Keystatic CMS — конфигурация.
 *
 * Git-based CMS (GitHub OAuth). Коллекции зеркалируют Zod-схемы из
 * `src/content.config.ts` (единый источник правды для контента).
 *
 * Медиа-слой: `fields.image`/`fields.file` пишут в `src/assets/uploads`.
 * Оптимизация (ресайз, WebP/AVIF, quality) выполняется на этапе сборки
 * через `astro:assets` (см. `src/lib/image.ts`).
 *
 * Гибкие блоки контента (`contentBlocks`) задаются через `fields.blocks`.
 * Каждый блок — `object` с полем `type` (select с фиксированным значением),
 * чтобы сериализованная структура совпадала с Zod-схемой
 * `z.discriminatedUnion('type', ...)` и читалась `ContentBlocks.astro`.
 */

// ---------------------------------------------------------------------------
// Переиспользуемые схемы
// ---------------------------------------------------------------------------

/** SEO-поля (общие для всех коллекций). */
const seoFields = {
  title: fields.text({ label: 'SEO-заголовок', description: 'Title тег страницы' }),
  description: fields.text({
    label: 'SEO-описание',
    description: 'Meta description',
    multiline: true,
  }),
  image: fields.image({
    label: 'SEO-изображение (og:image)',
    directory: 'src/assets/uploads',
    publicPath: '/assets/uploads',
    validation: { isRequired: false },
  }),
  noindex: fields.checkbox({
    label: 'Закрыть от индексации (noindex)',
    defaultValue: false,
  }),
};

/** Массив изображений с alt и подписью (карусель/галерея). */
const imageItem = fields.object(
  {
    image: fields.image({
      label: 'Изображение',
      directory: 'src/assets/uploads',
      publicPath: '/assets/uploads',
      validation: { isRequired: true },
    }),
    alt: fields.text({ label: 'Alt-текст', validation: { isRequired: true } }),
    caption: fields.text({ label: 'Подпись', multiline: true }),
  },
  { label: 'Изображение' },
);

/** Массив «название → значение» (характеристики). */
const specItem = fields.object(
  {
    name: fields.text({ label: 'Название', validation: { isRequired: true } }),
    value: fields.text({ label: 'Значение', validation: { isRequired: true } }),
  },
  { label: 'Характеристика' },
);

/** Массив «вопрос → ответ» (FAQ-блок). */
const faqItem = fields.object(
  {
    question: fields.text({ label: 'Вопрос', validation: { isRequired: true } }),
    answer: fields.text({ label: 'Ответ', multiline: true, validation: { isRequired: true } }),
  },
  { label: 'Вопрос-ответ' },
);

// ---------------------------------------------------------------------------
// Гибкие блоки контента (contentBlocks)
// ---------------------------------------------------------------------------

/**
 * Каждый блок — `object` с полем `type` (select с единственным значением),
 * чтобы итоговая структура `{ type, ...поля }` совпадала с Zod-схемой.
 */
/**
 * Leaf-блоки — могут вкладываться внутрь блока `columns`.
 * Исключены `hero` и `columns` (чтобы избежать бесконечной вложенности).
 */
const leafBlocks = {
  richText: {
    label: 'Текст (markdown)',
    schema: fields.object({
      type: fields.select({
        label: 'Тип блока',
        options: [{ label: 'Rich text', value: 'richText' }],
        defaultValue: 'richText',
      }),
      content: fields.text({
        label: 'Содержимое',
        description:
          'Markdown: заголовки (#), списки (-), **жирный**, *курсив*, [ссылка](url).',
        multiline: true,
        validation: { isRequired: true },
      }),
    }),
  },
  image: {
    label: 'Изображение',
    schema: fields.object({
      type: fields.select({
        label: 'Тип блока',
        options: [{ label: 'Изображение', value: 'image' }],
        defaultValue: 'image',
      }),
      image: fields.image({
        label: 'Изображение',
        directory: 'src/assets/uploads',
        publicPath: '/assets/uploads',
        validation: { isRequired: true },
      }),
      alt: fields.text({ label: 'Alt-текст', validation: { isRequired: true } }),
      caption: fields.text({ label: 'Подпись', multiline: true }),
      align: fields.select({
        label: 'Выравнивание',
        options: [
          { label: 'По центру', value: 'center' },
          { label: 'Слева', value: 'left' },
          { label: 'Справа', value: 'right' },
        ],
        defaultValue: 'center',
      }),
    }),
  },
  imageCarousel: {
    label: 'Карусель изображений',
    schema: fields.object({
      type: fields.select({
        label: 'Тип блока',
        options: [{ label: 'Карусель', value: 'imageCarousel' }],
        defaultValue: 'imageCarousel',
      }),
      images: fields.array(imageItem, { label: 'Изображения' }),
      autoplay: fields.checkbox({ label: 'Автопрокрутка', defaultValue: false }),
    }),
  },
  video: {
    label: 'Видео',
    schema: fields.object({
      type: fields.select({
        label: 'Тип блока',
        options: [{ label: 'Видео', value: 'video' }],
        defaultValue: 'video',
      }),
      src: fields.text({ label: 'URL/файл видео', validation: { isRequired: true } }),
      poster: fields.image({ label: 'Постер', directory: 'src/assets/uploads', publicPath: '/assets/uploads' }),
      controls: fields.checkbox({ label: 'Показывать контролы', defaultValue: true }),
      autoplay: fields.checkbox({ label: 'Автовоспроизведение', defaultValue: false }),
    }),
  },
  videoGif: {
    label: 'Видео (gif-режим)',
    schema: fields.object({
      type: fields.select({
        label: 'Тип блока',
        options: [{ label: 'Видео-gif', value: 'videoGif' }],
        defaultValue: 'videoGif',
      }),
      src: fields.text({ label: 'URL/файл видео', validation: { isRequired: true } }),
      poster: fields.image({ label: 'Постер', directory: 'src/assets/uploads', publicPath: '/assets/uploads' }),
    }),
  },
  gallery: {
    label: 'Галерея',
    schema: fields.object({
      type: fields.select({
        label: 'Тип блока',
        options: [{ label: 'Галерея', value: 'gallery' }],
        defaultValue: 'gallery',
      }),
      images: fields.array(imageItem, { label: 'Изображения' }),
    }),
  },
  cta: {
    label: 'Кнопка (CTA)',
    schema: fields.object({
      type: fields.select({
        label: 'Тип блока',
        options: [{ label: 'CTA', value: 'cta' }],
        defaultValue: 'cta',
      }),
      text: fields.text({ label: 'Текст', validation: { isRequired: true } }),
      href: fields.text({ label: 'Ссылка', validation: { isRequired: true } }),
      style: fields.select({
        label: 'Стиль',
        options: [
          { label: 'Основная', value: 'primary' },
          { label: 'Вторичная', value: 'secondary' },
          { label: 'Контурная', value: 'outline' },
        ],
        defaultValue: 'primary',
      }),
    }),
  },
  faq: {
    label: 'Аккордеон FAQ',
    schema: fields.object({
      type: fields.select({
        label: 'Тип блока',
        options: [{ label: 'FAQ', value: 'faq' }],
        defaultValue: 'faq',
      }),
      items: fields.array(faqItem, { label: 'Вопросы-ответы' }),
    }),
  },
  specs: {
    label: 'Таблица характеристик',
    schema: fields.object({
      type: fields.select({
        label: 'Тип блока',
        options: [{ label: 'Характеристики', value: 'specs' }],
        defaultValue: 'specs',
      }),
      items: fields.array(specItem, { label: 'Характеристики' }),
    }),
  },
  banner: {
    label: 'Промо-баннер',
    schema: fields.object({
      type: fields.select({
        label: 'Тип блока',
        options: [{ label: 'Баннер', value: 'banner' }],
        defaultValue: 'banner',
      }),
      image: fields.image({ label: 'Изображение', directory: 'src/assets/uploads', publicPath: '/assets/uploads' }),
      heading: fields.text({ label: 'Заголовок', validation: { isRequired: true } }),
      text: fields.text({ label: 'Текст', multiline: true }),
      href: fields.text({ label: 'Ссылка' }),
    }),
  },
  quote: {
    label: 'Цитата',
    schema: fields.object({
      type: fields.select({
        label: 'Тип блока',
        options: [{ label: 'Цитата', value: 'quote' }],
        defaultValue: 'quote',
      }),
      text: fields.text({ label: 'Текст', multiline: true, validation: { isRequired: true } }),
      author: fields.text({ label: 'Автор' }),
    }),
  },
  divider: {
    label: 'Разделитель',
    schema: fields.object({
      type: fields.select({
        label: 'Тип блока',
        options: [{ label: 'Разделитель', value: 'divider' }],
        defaultValue: 'divider',
      }),
      style: fields.select({
        label: 'Стиль',
        options: [
          { label: 'Линия', value: 'line' },
          { label: 'Отступ', value: 'space' },
        ],
        defaultValue: 'line',
      }),
    }),
  },
};

const contentBlocks = fields.blocks(
  {
    ...leafBlocks,
    hero: {
      label: 'Hero-баннер',
      schema: fields.object({
        type: fields.select({
          label: 'Тип блока',
          options: [{ label: 'Hero', value: 'hero' }],
          defaultValue: 'hero',
        }),
        heading: fields.text({ label: 'Заголовок', validation: { isRequired: true } }),
        subheading: fields.text({ label: 'Подзаголовок', multiline: true }),
        image: fields.image({ label: 'Фоновое изображение', directory: 'src/assets/uploads', publicPath: '/assets/uploads' }),
        ctaText: fields.text({ label: 'Текст кнопки' }),
        ctaHref: fields.text({ label: 'Ссылка кнопки' }),
      }),
    },
    columns: {
      label: 'Колонки',
      schema: fields.object({
        type: fields.select({
          label: 'Тип блока',
          options: [{ label: 'Колонки', value: 'columns' }],
          defaultValue: 'columns',
        }),
        columns: fields.array(
          fields.object(
            {
              heading: fields.text({ label: 'Заголовок колонки' }),
              content: fields.blocks(leafBlocks, { label: 'Блоки колонки' }),
            },
            { label: 'Колонка' },
          ),
          { label: 'Колонки' },
        ),
      }),
    },
  },
  { label: 'Блоки контента' },
);

// ---------------------------------------------------------------------------
// Коллекции
// ---------------------------------------------------------------------------

/** `products` — модели столов (товары). */
const products = collection({
  label: 'Товары',
  path: 'src/content/products/*',
  slugField: 'title',
  format: { data: 'yaml', contentField: 'description' },
  columns: ['title', 'line', 'price'],
  schema: {
    title: fields.slug({ name: { label: 'Наименование товара' } }),
    line: fields.text({ label: 'ID линейки (родитель)', validation: { isRequired: true } }),
    price: fields.number({ label: 'Цена, BYN', validation: { isRequired: true } }),
    oldPrice: fields.number({ label: 'Старая цена, BYN' }),
    shortDescription: fields.text({ label: 'Краткое описание', multiline: true }),
    description: fields.mdx({ label: 'Полное описание', extension: 'md' }),

    // Юридически обязательные поля карточки (закон РБ)
    manufacturer: fields.text({ label: 'Изготовитель', validation: { isRequired: true } }),
    manufacturerLocation: fields.text({ label: 'Местонахождение изготовителя' }),
    supplier: fields.text({ label: 'Поставщик (наименование + местонахождение)' }),
    countryOfOrigin: fields.text({ label: 'Страна происхождения' }),
    warranty: fields.text({ label: 'Гарантийный срок' }),
    used: fields.checkbox({ label: 'Б/у или конфискованный товар', defaultValue: false }),

    specs: fields.array(specItem, { label: 'Характеристики' }),
    image: fields.image({
      label: 'Главное фото',
      directory: 'src/assets/uploads',
      publicPath: '/assets/uploads',
      validation: { isRequired: true },
    }),
    gallery: fields.array(
      fields.image({ label: 'Фото', directory: 'src/assets/uploads', publicPath: '/assets/uploads' }),
      { label: 'Галерея' },
    ),
    badge: fields.text({ label: 'Бейдж' }),
    ctaText: fields.text({ label: 'Текст кнопки заказа' }),
    order: fields.number({ label: 'Порядок сортировки', defaultValue: 0 }),
    content: contentBlocks,
    seo: fields.object(seoFields, { label: 'SEO' }),
  },
});

/** `lines` — линейки столов. */
const lines = collection({
  label: 'Линейки',
  path: 'src/content/lines/*',
  slugField: 'title',
  format: { data: 'yaml', contentField: 'description' },
  columns: ['title', 'order'],
  schema: {
    title: fields.slug({ name: { label: 'Название линейки' } }),
    description: fields.mdx({ label: 'Описание', extension: 'md' }),
    image: fields.image({
      label: 'Изображение',
      directory: 'src/assets/uploads',
      publicPath: '/assets/uploads',
      validation: { isRequired: true },
    }),
    features: fields.array(fields.text({ label: 'Особенность' }), { label: 'Особенности' }),
    order: fields.number({ label: 'Порядок сортировки', defaultValue: 0 }),
    content: contentBlocks,
    seo: fields.object(seoFields, { label: 'SEO' }),
  },
});

/** `site` — единый источник правды (реквизиты ИП, бренд, навигация, аналитика). */
const site = singleton({
  label: 'Настройки сайта',
  path: 'src/content/site/settings',
  format: { data: 'yaml' },
  schema: {
    brand: fields.text({ label: 'Бренд', validation: { isRequired: true } }),
    tagline: fields.text({ label: 'Слоган' }),
    fullName: fields.text({ label: 'ФИО ИП', validation: { isRequired: true } }),
    unp: fields.text({ label: 'УНП', validation: { isRequired: true } }),
    registrationDate: fields.text({ label: 'Дата регистрации ИП' }),
    tradeRegistryNumber: fields.text({ label: 'Номер в торговом реестре' }),
    tradeRegistryDate: fields.text({ label: 'Дата включения в торговый реестр' }),
    phone: fields.text({ label: 'Телефон' }),
    email: fields.text({ label: 'Email' }),
    address: fields.text({ label: 'Адрес' }),
    workHours: fields.text({ label: 'Режим работы' }),
    authorizedBody: fields.text({ label: 'Уполномоченный орган' }),
    authorizedBodyPhone: fields.text({ label: 'Телефон уполномоченного органа' }),
    brandColors: fields.object(
      {
        primary: fields.text({ label: 'Основной цвет' }),
        secondary: fields.text({ label: 'Вторичный цвет' }),
        neutral: fields.text({ label: 'Нейтральный цвет' }),
        accent: fields.array(fields.text({ label: 'Акцентный цвет' }), { label: 'Акцентные цвета' }),
      },
      { label: 'Фирменные цвета' },
    ),
    paymentMethods: fields.array(fields.text({ label: 'Способ оплаты' }), { label: 'Способы оплаты' }),
    deliveryMethods: fields.array(fields.text({ label: 'Способ доставки' }), { label: 'Способы доставки' }),
    nav: fields.array(
      fields.object(
        {
          label: fields.text({ label: 'Название пункта' }),
          href: fields.text({ label: 'Ссылка' }),
        },
        { label: 'Пункт меню' },
      ),
      { label: 'Навигация' },
    ),
    analytics: fields.object(
      {
        ga4Id: fields.text({ label: 'Google Analytics 4 ID' }),
        yandexMetrikaId: fields.text({ label: 'Яндекс.Метрика ID' }),
      },
      { label: 'Аналитика' },
    ),
    advertising: fields.object(
      {
        googleAdsId: fields.text({ label: 'Google Ads ID' }),
        yandexDirectId: fields.text({ label: 'Яндекс.Директ ID' }),
      },
      { label: 'Реклама' },
    ),
    seo: fields.object(seoFields, { label: 'SEO' }),
  },
});

/** `legal` — юридические документы. */
const legal = collection({
  label: 'Юридические документы',
  path: 'src/content/legal/*',
  slugField: 'title',
  format: { data: 'yaml', contentField: 'body' },
  columns: ['title', 'updatedAt'],
  schema: {
    title: fields.slug({ name: { label: 'Название документа' } }),
    updatedAt: fields.date({ label: 'Дата обновления', defaultValue: { kind: 'today' } }),
    body: fields.mdx({ label: 'Текст документа', extension: 'md' }),
    seo: fields.object(seoFields, { label: 'SEO' }),
  },
});

/** `sections` — тексты секций главной. */
const sections = collection({
  label: 'Секции главной',
  path: 'src/content/sections/*',
  slugField: 'title',
  format: { data: 'yaml', contentField: 'body' },
  columns: ['title', 'type', 'order'],
  schema: {
    title: fields.slug({ name: { label: 'Название секции' } }),
    type: fields.select({
      label: 'Тип секции',
      options: [
        { label: 'Hero', value: 'hero' },
        { label: 'Каталог', value: 'catalog' },
        { label: 'Преимущества', value: 'advantages' },
        { label: 'Доставка и оплата', value: 'delivery' },
        { label: 'Оформление заказа', value: 'order' },
        { label: 'FAQ', value: 'faq' },
        { label: 'Контакты', value: 'contact' },
      ],
      defaultValue: 'advantages',
    }),
    heading: fields.text({ label: 'Заголовок' }),
    subheading: fields.text({ label: 'Подзаголовок' }),
    body: fields.mdx({ label: 'Текст', extension: 'md' }),
    ctaText: fields.text({ label: 'Текст кнопки' }),
    ctaHref: fields.text({ label: 'Ссылка кнопки' }),
    video: fields.checkbox({ label: 'Фоновое видео (hero)', defaultValue: false }),
    content: contentBlocks,
    order: fields.number({ label: 'Порядок сортировки', defaultValue: 0 }),
  },
});

/** `faq` — вопросы-ответы. */
const faq = collection({
  label: 'FAQ',
  path: 'src/content/faq/*',
  slugField: 'question',
  format: { data: 'yaml', contentField: 'answer' },
  columns: ['question', 'order'],
  schema: {
    question: fields.slug({ name: { label: 'Вопрос' } }),
    answer: fields.mdx({ label: 'Ответ', extension: 'md' }),
    order: fields.number({ label: 'Порядок сортировки', defaultValue: 0 }),
  },
});

// ---------------------------------------------------------------------------
// Конфиг
// ---------------------------------------------------------------------------

export default config({
  storage: {
    kind: 'local',
  },
  ui: {
    brand: { name: 'Kiberstol.by' },
  },
  collections: {
    products,
    lines,
    legal,
    sections,
    faq,
  },
  singletons: {
    site,
  },
});