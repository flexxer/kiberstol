import { z } from 'zod';

/**
 * Единые Zod-схемы контента.
 *
 * Вынесены из `src/content.config.ts`, чтобы их можно было переиспользовать
 * в unit-тестах (Vitest) и скрипте валидации контента без импорта
 * виртуального модуля `astro:content`.
 *
 * `src/content.config.ts` подключает эти схемы к коллекциям Astro.
 */

/**
 * Общая схема SEO-полей, переиспользуемая во всех коллекциях.
 * Все тексты задаются в CMS (Keystatic), не хардкодятся в компонентах.
 */
export const seoSchema = z
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
/**
 * Блоки контента сериализуются Keystatic'ом (`fields.blocks`) в формате
 * `{ discriminant, value }`, где `discriminant` — тип блока, а `value` — его
 * поля. Схема ниже зеркалит этот формат, чтобы данные из CMS проходили
 * валидацию без ошибок.
 *
 * ВАЖНО: `fields.blocks` всегда пишет `{ discriminant, value }`. Поле `type`
 * внутри `value` — это UI-select Keystatic, который НЕ попадает в сериализацию
 * (Keystatic отбрасывает его и оставляет только `discriminant` + `value`).
 */
/** Универсальный тип блока контента (дискриминант + поля). */
export type ContentBlock = {
  discriminant: string;
  value: Record<string, unknown>;
};

export const contentBlocks: z.ZodType<ContentBlock[]> = z.array(
  z.discriminatedUnion('discriminant', [
    // Hero-баннер страницы
    z.object({
      discriminant: z.literal('hero'),
      value: z.object({
        heading: z.string(),
        subheading: z.string().optional(),
        image: z.string().optional(),
        ctaText: z.string().optional(),
        ctaHref: z.string().optional(),
      }),
    }),
    // WYSIWYG-текст (заголовки, списки, ссылки, жирный/курсив)
    z.object({
      discriminant: z.literal('richText'),
      value: z.object({
        content: z.string(),
      }),
    }),
    // Одиночное inline-изображение
    z.object({
      discriminant: z.literal('image'),
      value: z.object({
        image: z.string(),
        alt: z.string(),
        caption: z.string().optional(),
        align: z.enum(['left', 'center', 'right']).default('center'),
      }),
    }),
    // Карусель изображений
    z.object({
      discriminant: z.literal('imageCarousel'),
      value: z.object({
        images: z.array(
          z.object({ image: z.string(), alt: z.string(), caption: z.string().optional() }),
        ),
        autoplay: z.boolean().default(false),
      }),
    }),
    // Inline-видео
    z.object({
      discriminant: z.literal('video'),
      value: z.object({
        src: z.string(),
        poster: z.string().optional(),
        controls: z.boolean().default(true),
        autoplay: z.boolean().default(false),
      }),
    }),
    // Видео в режиме «gif» (без звука, зациклено, без контролов)
    z.object({
      discriminant: z.literal('videoGif'),
      value: z.object({
        src: z.string(),
        poster: z.string().optional(),
      }),
    }),
    // Сетка/лайтбокс изображений
    z.object({
      discriminant: z.literal('gallery'),
      value: z.object({
        images: z.array(
          z.object({ image: z.string(), alt: z.string(), caption: z.string().optional() }),
        ),
      }),
    }),
    // Кнопка/призыв к действию
    z.object({
      discriminant: z.literal('cta'),
      value: z.object({
        text: z.string(),
        href: z.string(),
        style: z.enum(['primary', 'secondary', 'outline']).default('primary'),
      }),
    }),
    // Аккордеон вопросов-ответов
    z.object({
      discriminant: z.literal('faq'),
      value: z.object({
        items: z.array(z.object({ question: z.string(), answer: z.string() })),
      }),
    }),
    // Таблица характеристик
    z.object({
      discriminant: z.literal('specs'),
      value: z.object({
        items: z.array(z.object({ name: z.string(), value: z.string() })),
      }),
    }),
    // Промо-баннер «важный момент»
    z.object({
      discriminant: z.literal('banner'),
      value: z.object({
        image: z.string().optional(),
        heading: z.string(),
        text: z.string().optional(),
        href: z.string().optional(),
      }),
    }),
    // Многоколоночный блок (каждая колонка — вложенные блоки)
    z.object({
      discriminant: z.literal('columns'),
      value: z.object({
        columns: z.array(
          z.object({
            heading: z.string().optional(),
            content: z.lazy(() => contentBlocks).optional(),
          }),
        ),
      }),
    }),
    // Цитата/отзыв-вставка
    z.object({
      discriminant: z.literal('quote'),
      value: z.object({
        text: z.string(),
        author: z.string().optional(),
      }),
    }),
    // Разделитель/спейсер
    z.object({
      discriminant: z.literal('divider'),
      value: z.object({
        style: z.enum(['line', 'space']).default('line'),
      }),
    }),
  ]),
);

/**
 * `products` — товары (модели столов).
 * Содержит юридически обязательные поля карточки товара (закон РБ).
 */
export const productsSchema = z.object({
  title: z.string(), // наименование товара
  line: z.string(), // id линейки (родитель)
  price: z.number(), // цена, BYN
  oldPrice: z.number().optional(),
  shortDescription: z.string(),
  // `description` — контентное поле (markdown-тело, fields.mdx в Keystatic)

  // Юридически обязательные поля карточки
  manufacturer: z.string(), // наименование изготовителя
  manufacturerLocation: z.string(), // местонахождение изготовителя
  importer: z.string(), // наименование + местонахождение импортера
  supplier: z.string(), // наименование + местонахождение поставщика
  countryOfOrigin: z.string(), // страна происхождения
  warranty: z.string().optional(), // гарантийный срок
  used: z.boolean().default(false), // б/у или конфискован
  // Наличие товара: влияет на бейдж в карточке и JSON-LD `availability`.
  availability: z.enum(['in_stock', 'out_of_stock', 'preorder']).default('in_stock'),

  specs: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  image: z.string(),
  gallery: z.array(z.string()).optional(),
  badge: z.string().optional(),
  ctaText: z.string().optional(),
  order: z.number().default(0),
  content: contentBlocks,
  seo: seoSchema,
});

/**
 * `lines` — линейки столов (старт — 3, с перспективой расширения).
 */
export const linesSchema = z.object({
  title: z.string(),
  // `description` — контентное поле (markdown-тело, fields.mdx в Keystatic)
  image: z.string(),
  features: z.array(z.string()).optional(),
  order: z.number().default(0),
  content: contentBlocks,
  seo: seoSchema,
});

/**
 * `site` — единый источник правды для реквизитов ИП, бренда,
 * навигации, аналитики/рекламы и глобальных SEO-полей.
 */
export const siteSchema = z.object({
  brand: z.string(),
  tagline: z.string(),
  fullName: z.string(),
  unp: z.string(),
  registrationDate: z.string(),
  tradeRegistryNumber: z.string(),
  tradeRegistryDate: z.string(),
  phone: z.string(),
  email: z.string(),
  viber: z.string().optional(),
  instagram: z.string().optional(),
  address: z.string(),
  workHours: z.string(),
  authorizedBody: z.string(),
  authorizedBodyPhone: z.string(),
  // Юридические и контактные реквизиты (аудит 2026-10-23).
  legalAddress: z.string().optional(),
  complaintsBookAddress: z.string().optional(),
  pickupAddress: z.string().optional(),
  belgieRegistration: z.string().optional(),
  telegram: z.string().optional(),
  // Подписи интерфейса (микротексты), чтобы не хардкодить их в компонентах.
  labels: z
    .object({
      specs: z.string().default('Характеристики'),
      productInfo: z.string().default('Сведения о товаре'),
      relatedProducts: z.string().default('Другие модели линейки'),
      lineModels: z.string().default('Модели линейки'),
      catalogTitle: z.string().default('Каталог'),
      catalogDescription: z
        .string()
        .default('Каталог игровых компьютерных столов: линейки и модели.'),
      breadcrumbsHome: z.string().default('Главная'),
      breadcrumbsCatalog: z.string().default('Каталог'),
      cookieSettings: z.string().default('Настройки cookie'),
      // Подписи юридических документов (футер).
      legalPrivacy: z.string().default('Политика конфиденциальности'),
      legalCookiePolicy: z.string().default('Политика cookie'),
      legalTerms: z.string().default('Оплата и доставка'),
      legalReturns: z.string().default('Возврат товара'),
      legalComplaints: z.string().default('Порядок обращений'),
      legalCare: z.string().default('Условия ухода и эксплуатации'),
      // Заголовки блоков футера.
      footerNav: z.string().default('Навигация'),
      footerDocuments: z.string().default('Документы'),
      footerContacts: z.string().default('Контакты'),
      // Подписи юридического блока.
      legalAddress: z.string().default('Юридический адрес'),
      complaintsBookAddress: z.string().default('Книга замечаний и предложений'),
      pickupAddress: z.string().default('Пункт выдачи'),
      authorizedBody: z.string().default('Уполномоченный рассматривать обращения покупателей'),
      authorizedBodyPhone: z.string().default('Телефоны местного исполнительного органа'),
      workHours: z.string().default('Режим работы'),
      paymentMethods: z.string().default('Способы оплаты'),
      deliveryMethods: z.string().default('Способы и сроки доставки'),
    })
    .optional(),
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
});

/**
 * `legal` — юридические документы.
 * Файлы: privacy, cookie-policy, terms, returns, complaints, care.
 */
export const legalSchema = z.object({
  title: z.string(),
  updatedAt: z.coerce.date(),
  seo: seoSchema,
});

/**
 * `sections` — тексты секций главной страницы.
 * Каждая секция — отдельный файл; тексты редактируются в CMS.
 *
 * Поля, специфичные для типа секции, задаются условно через `variant`
 * (дискриминант — `type`). Keystatic сериализует `fields.conditional` в
 * `{ discriminant, value }`, поэтому схема зеркалит этот формат.
 */
export const sectionsSchema = z.object({
  title: z.string(),
  heading: z.string(),
  // `body` — контентное поле (markdown-тело, fields.mdx в Keystatic).
  // Гибкие контент-блоки — доступны для всех типов секций.
  content: contentBlocks.optional(),
  variant: z.discriminatedUnion('discriminant', [
    z.object({
      discriminant: z.literal('hero'),
      value: z.object({
        subheading: z.string().optional(),
        ctaText: z.string().optional(),
        ctaHref: z.string().optional(),
        video: z.boolean().default(false),
      }),
    }),
    z.object({
      discriminant: z.literal('catalog'),
      value: z.object({
        subheading: z.string().optional(),
        ctaText: z.string().optional(),
        ctaHref: z.string().optional(),
      }),
    }),
    z.object({
      discriminant: z.literal('advantages'),
      value: z.null().optional(),
    }),
    z.object({
      discriminant: z.literal('delivery'),
      value: z
        .object({
          paymentMethods: z.array(z.string()).optional(),
          deliveryMethods: z.array(z.string()).optional(),
        })
        .optional(),
    }),
    z.object({
      discriminant: z.literal('order'),
      value: z.object({
        ctaText: z.string().optional(),
        ctaHref: z.string().optional(),
      }),
    }),
    z.object({
      discriminant: z.literal('faq'),
      value: z
        .object({
          items: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
        })
        .optional(),
    }),
    z.object({
      discriminant: z.literal('contact'),
      value: z.null().optional(),
    }),
  ]),
  order: z.number().default(0),
});
