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
 * `fields.blocks` сериализует блоки как `{ discriminant, value }`, где
 * `discriminant` — ключ блока, а `value` — его поля. Это совпадает с
 * Zod-схемой `z.discriminatedUnion('discriminant', ...)` и читается
 * `ContentBlocks.astro`.
 *
 * Поле `type` внутри `value` — legacy: оно осталось от ранней конфигурации,
 * не участвует в рендере и отбрасывается Zod как неизвестное. Новые блоки
 * можно создавать без него. См. `plans/adr-001-content-blocks.md`.
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
 * Каждый блок — `object` с полями конкретного блока. Дискриминант
 * (`discriminant`) задаётся самим `fields.blocks`, поэтому отдельное поле
 * `type` не требуется. Оставшиеся `type`-select — legacy для совместимости
 * с уже созданным контентом.
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
      images: fields.array(imageItem, {
        label: 'Изображения',
        itemLabel: (props) => props.fields.alt.value || 'Изображение',
      }),
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
      images: fields.array(imageItem, {
        label: 'Изображения',
        itemLabel: (props) => props.fields.alt.value || 'Изображение',
      }),
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
      items: fields.array(faqItem, {
        label: 'Вопросы-ответы',
        itemLabel: (props) => props.fields.question.value || 'Вопрос',
      }),
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
      items: fields.array(specItem, {
        label: 'Характеристики',
        itemLabel: (props) => props.fields.name.value || 'Характеристика',
      }),
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
          { label: 'Колонки', itemLabel: (props) => props.fields.heading.value || 'Колонка' },
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
  // Идентификатор записи = имя файла (публичный URL /products/<slug>).
  // Отдельное поле `slug` фиксирует его, чтобы переименование товара в CMS
  // не меняло URL.
  slugField: 'slug',
  format: { data: 'yaml', contentField: 'description' },
  columns: ['title', 'line', 'price'],
  schema: {
    title: fields.text({ label: 'Наименование товара', validation: { isRequired: true } }),
    slug: fields.slug({
      name: {
        label: 'Slug (идентификатор, не менять)',
        description: 'Совпадает с именем файла и публичным URL /products/<slug>',
        validation: { isRequired: true },
      },
      slug: { label: 'Slug (имя файла)' },
    }),
    line: fields.relationship({
      label: 'Линейка',
      collection: 'lines',
      validation: { isRequired: true },
    }),
    price: fields.number({ label: 'Цена, BYN', validation: { isRequired: true } }),
    oldPrice: fields.number({ label: 'Старая цена, BYN' }),
    shortDescription: fields.text({
      label: 'Краткое описание',
      multiline: true,
      validation: { isRequired: true },
    }),
    description: fields.mdx({ label: 'Полное описание', extension: 'md' }),

    // Юридически обязательные поля карточки (закон РБ)
    manufacturer: fields.text({ label: 'Изготовитель', validation: { isRequired: true } }),
    manufacturerLocation: fields.text({
      label: 'Местонахождение изготовителя',
      validation: { isRequired: true },
    }),
    importer: fields.text({
      label: 'Импортер (наименование + местонахождение)',
      validation: { isRequired: true },
    }),
    supplier: fields.text({
      label: 'Поставщик (наименование + местонахождение)',
      validation: { isRequired: true },
    }),
    countryOfOrigin: fields.text({
      label: 'Страна происхождения',
      validation: { isRequired: true },
    }),
    warranty: fields.text({ label: 'Гарантийный срок' }),
    used: fields.checkbox({ label: 'Б/у или конфискованный товар', defaultValue: false }),
    availability: fields.select({
      label: 'Наличие',
      options: [
        { label: 'В наличии', value: 'in_stock' },
        { label: 'Нет в наличии', value: 'out_of_stock' },
        { label: 'Под заказ', value: 'preorder' },
      ],
      defaultValue: 'in_stock',
    }),

    specs: fields.array(specItem, {
      label: 'Характеристики',
      itemLabel: (props) => props.fields.name.value || 'Характеристика',
    }),
    image: fields.image({
      label: 'Главное фото',
      directory: 'src/assets/uploads',
      publicPath: '/assets/uploads',
      validation: { isRequired: true },
    }),
    gallery: fields.array(
      fields.image({ label: 'Фото', directory: 'src/assets/uploads', publicPath: '/assets/uploads' }),
      {
        label: 'Галерея',
        itemLabel: (props) => props.value?.filename || 'Фото',
      },
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
  // Идентификатор записи = имя файла (публичный URL /lines/<slug>).
  // Отдельное поле `slug` фиксирует его, чтобы переименование линейки в CMS
  // не меняло URL.
  slugField: 'slug',
  format: { data: 'yaml', contentField: 'description' },
  columns: ['title', 'order'],
  schema: {
    title: fields.text({ label: 'Название линейки', validation: { isRequired: true } }),
    slug: fields.slug({
      name: {
        label: 'Slug (идентификатор, не менять)',
        description: 'Совпадает с именем файла и публичным URL /lines/<slug>',
        validation: { isRequired: true },
      },
      slug: { label: 'Slug (имя файла)' },
    }),
    description: fields.mdx({ label: 'Описание', extension: 'md' }),
    image: fields.image({
      label: 'Изображение',
      directory: 'src/assets/uploads',
      publicPath: '/assets/uploads',
      validation: { isRequired: true },
    }),
    features: fields.array(fields.text({ label: 'Особенность' }), {
      label: 'Особенности',
      itemLabel: (props) => props.value || 'Особенность',
    }),
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
    viber: fields.text({ label: 'Viber (ссылка)' }),
    instagram: fields.text({ label: 'Instagram (ссылка)' }),
    address: fields.text({ label: 'Адрес' }),
    workHours: fields.text({ label: 'Режим работы' }),
    authorizedBody: fields.text({ label: 'Уполномоченный орган' }),
    authorizedBodyPhone: fields.text({ label: 'Телефон уполномоченного органа' }),
    legalAddress: fields.text({
      label: 'Юридический адрес ИП',
      description: 'Адрес регистрации индивидуального предпринимателя',
    }),
    complaintsBookAddress: fields.text({
      label: 'Адрес книги замечаний и предложений',
    }),
    pickupAddress: fields.text({
      label: 'Адрес пункта выдачи',
      description: 'Оставьте пустым, если отдельного пункта выдачи нет',
    }),
    belgieRegistration: fields.text({
      label: 'Регистрация в БелГИЭ',
      description: 'Справочное поле, в интерфейсе сайта не выводится',
    }),
    telegram: fields.text({
      label: 'Telegram (ссылка t.me)',
      description: 'Только ссылка вида https://t.me/…; телефон сюда не подходит',
    }),
    labels: fields.object(
      {
        specs: fields.text({ label: 'Характеристики' }),
        productInfo: fields.text({ label: 'Сведения о товаре' }),
        relatedProducts: fields.text({ label: 'Другие модели линейки' }),
        orderCta: fields.text({ label: 'Кнопка заказа (карточка товара)' }),
        addons: fields.text({ label: 'Кнопка аксессуаров (карточка товара)' }),
        lineModels: fields.text({ label: 'Модели линейки' }),
        catalogTitle: fields.text({ label: 'Заголовок каталога' }),
        catalogDescription: fields.text({ label: 'Описание каталога', multiline: true }),
        breadcrumbsHome: fields.text({ label: 'Хлебные крошки: главная' }),
        breadcrumbsCatalog: fields.text({ label: 'Хлебные крошки: каталог' }),
        cookieSettings: fields.text({ label: 'Ссылка «Настройки cookie»' }),
        legalPrivacy: fields.text({ label: 'Документ: политика конфиденциальности' }),
        legalCookiePolicy: fields.text({ label: 'Документ: политика cookie' }),
        legalTerms: fields.text({ label: 'Документ: оплата и доставка' }),
        legalReturns: fields.text({ label: 'Документ: возврат товара' }),
        legalComplaints: fields.text({ label: 'Документ: порядок обращений' }),
        legalCare: fields.text({ label: 'Документ: уход и эксплуатация' }),
        footerNav: fields.text({ label: 'Футер: заголовок навигации' }),
        footerDocuments: fields.text({ label: 'Футер: заголовок документов' }),
        footerContacts: fields.text({ label: 'Футер: заголовок контактов' }),
        legalAddress: fields.text({ label: 'Юр. блок: юридический адрес' }),
        complaintsBookAddress: fields.text({ label: 'Юр. блок: книга замечаний' }),
        pickupAddress: fields.text({ label: 'Юр. блок: пункт выдачи' }),
        authorizedBody: fields.text({ label: 'Юр. блок: уполномоченный орган' }),
        authorizedBodyPhone: fields.text({ label: 'Юр. блок: телефон органа' }),
        workHours: fields.text({ label: 'Юр. блок: режим работы' }),
        paymentMethods: fields.text({ label: 'Юр. блок: способы оплаты' }),
        deliveryMethods: fields.text({ label: 'Юр. блок: способы доставки' }),
      },
      { label: 'Подписи интерфейса' },
    ),
    nav: fields.array(
      fields.object(
        {
          label: fields.text({ label: 'Название пункта' }),
          href: fields.text({ label: 'Ссылка' }),
        },
        { label: 'Пункт меню' },
      ),
      { label: 'Навигация', itemLabel: (props) => props.fields.label.value || 'Пункт меню' },
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
  // Идентификатор записи = имя файла. Отдельное поле `slug` фиксирует его,
  // чтобы переименование заголовка в CMS не ломало `getEntry('legal', 'privacy')`.
  slugField: 'slug',
  format: { data: 'yaml', contentField: 'body' },
  columns: ['title', 'updatedAt'],
  schema: {
    title: fields.text({ label: 'Название документа', validation: { isRequired: true } }),
    slug: fields.slug({
      name: {
        label: 'Slug (идентификатор, не менять)',
        description: 'Совпадает с именем файла; изменение ломает ссылки getEntry()',
        validation: { isRequired: true },
      },
      slug: { label: 'Slug (имя файла)' },
    }),
    updatedAt: fields.date({ label: 'Дата обновления', defaultValue: { kind: 'today' } }),
    body: fields.mdx({ label: 'Текст документа', extension: 'md' }),
    seo: fields.object(seoFields, { label: 'SEO' }),
  },
});

/** `sections` — тексты секций главной. */
const sections = collection({
  label: 'Секции главной',
  path: 'src/content/sections/*',
  // Идентификатор записи = имя файла. Отдельное поле `slug` фиксирует его,
  // чтобы переименование заголовка в CMS не ломало `getEntry('sections', 'delivery')`.
  slugField: 'slug',
  format: { data: 'yaml', contentField: 'body' },
  columns: ['title', 'order'],
  schema: {
    title: fields.text({ label: 'Название секции', validation: { isRequired: true } }),
    slug: fields.slug({
      name: {
        label: 'Slug (идентификатор, не менять)',
        description: 'Совпадает с именем файла; изменение ломает ссылки getEntry()',
        validation: { isRequired: true },
      },
      slug: { label: 'Slug (имя файла)' },
    }),
    heading: fields.text({ label: 'Заголовок', validation: { isRequired: true } }),
    body: fields.mdx({ label: 'Текст', extension: 'md' }),
    // Гибкие контент-блоки (картинки, видео, кнопки и т.д.) — доступны
    // для всех типов секций.
    content: contentBlocks,
    // Поля, специфичные для типа секции, задаются условно по `type`.
    // Сериализуется в `{ discriminant, value }` (см. zod-схему `variant`).
    variant: fields.conditional(
      fields.select({
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
      {
        hero: fields.object({
          subheading: fields.text({ label: 'Подзаголовок' }),
          ctaText: fields.text({ label: 'Текст кнопки' }),
          ctaHref: fields.text({ label: 'Ссылка кнопки' }),
          video: fields.checkbox({ label: 'Фоновое видео', defaultValue: false }),
        }),
        catalog: fields.object({
          subheading: fields.text({ label: 'Подзаголовок' }),
          ctaText: fields.text({ label: 'Текст кнопки' }),
          ctaHref: fields.text({ label: 'Ссылка кнопки' }),
        }),
        advantages: fields.empty(),
        delivery: fields.object({
          paymentMethods: fields.array(fields.text({ label: 'Способ оплаты' }), {
            label: 'Способы оплаты',
            itemLabel: (props) => props.value || 'Способ оплаты',
          }),
          deliveryMethods: fields.array(fields.text({ label: 'Способ и срок доставки' }), {
            label: 'Способы и сроки доставки',
            itemLabel: (props) => props.value || 'Способ доставки',
          }),
        }),
        order: fields.object({
          ctaText: fields.text({ label: 'Текст кнопки' }),
          ctaHref: fields.text({ label: 'Ссылка кнопки' }),
        }),
        faq: fields.object({
          items: fields.array(faqItem, {
            label: 'Вопросы-ответы',
            itemLabel: (props) => props.fields.question.value || 'Вопрос',
          }),
        }),
        contact: fields.empty(),
      },
    ),
    order: fields.number({ label: 'Порядок сортировки', defaultValue: 0 }),
  },
});

// ---------------------------------------------------------------------------
// Конфиг
// ---------------------------------------------------------------------------

// Production: GitHub storage (git-based CMS, GitHub OAuth).
// Local development: local storage, чтобы не требовать OAuth.
// В production задайте PUBLIC_KEYSTATIC_STORAGE=github и параметры репозитория.
const useGitHubStorage = import.meta.env.PUBLIC_KEYSTATIC_STORAGE === 'github';
const githubRepo = {
  owner: import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO_OWNER ?? 'OWNER',
  name: import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO_NAME ?? 'kiberstol',
};

export default config({
  storage: useGitHubStorage
    ? { kind: 'github', repo: githubRepo }
    : { kind: 'local' },
  ui: {
    brand: { name: 'Kiberstol.by' },
  },
  collections: {
    products,
    lines,
    legal,
    sections,
  },
  singletons: {
    site,
  },
});