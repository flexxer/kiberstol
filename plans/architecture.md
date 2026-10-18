# Архитектурный план разработки — Kiberstol.by

> Детальный план поэтапной реализации интернет-магазина игровых столов на базе типового проекта FastPage.
> Источник требований: [`requirements/kiberstol-tz.md`](../requirements/kiberstol-tz.md).
> Прогресс отслеживается в [`plans/progress.md`](progress.md) — обновляется после каждого шага.

---

## 0. Сводка зафиксированных решений

| Вопрос | Решение |
|---|---|
| Фреймворк | **Astro 7** (SSG, `output: 'static'`), Content Layer API (`loader: glob()`) |
| CMS | **Keystatic** (git-based, GitHub OAuth, `fields.blocks`) — вместо Sveltia из FastPage |
| Стилизация | **Tailwind CSS v4** (`@tailwindcss/vite`) + CSS-переменные |
| Тема | **Одна фиксированная cyberpunk** (без свитчера), адаптирована под бренд |
| Интерактив | Vanilla JS/TS, без сторонних библиотек |
| Форма | `POST /api/submit.php` → Telegram Bot API, токен через `getenv` |
| Защита форм | Honeypot + time-based honeypot |
| SEO | Сквозной слой: `SEO.astro` + JSON-LD + `@astrojs/sitemap` + семантика |
| Деплой | BY-хостинг, домен `.BY` |

---

## 1. Технологический стек и зависимости

### 1.1. Зависимости (`package.json`)

| Пакет | Назначение |
|---|---|
| `astro` (^7) | Фреймворк SSG |
| `@astrojs/sitemap` | Автогенерация `sitemap.xml` |
| `@tailwindcss/vite` + `tailwindcss` (^4) | Стилизация (CSS-first) |
| `@tailwindcss/typography` | Стили rich-text (WYSIWYG) |
| `@fontsource-variable/*` | Self-host шрифты (OFL, кириллица) |
| `@keystatic/core` | Ядро CMS |
| `@keystatic/astro` | Интеграция Keystatic с Astro |
| `react` + `react-dom` | Peer-зависимости Keystatic (UI админки) |

> **Отличие от FastPage:** `@sveltia/cms` заменяется на `@keystatic/core` + `@keystatic/astro` + `react`/`react-dom`.

### 1.2. Скрипты

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  }
}
```

---

## 2. Структура проекта

```text
/
├── public/
│   ├── assets/                    # Статические ресурсы (логотип, og-баннеры)
│   │   └── uploads/               # Контент-медиа (фото товаров, WebP ≤2000px)
│   ├── api/
│   │   └── submit.php             # Приём заявок → Telegram
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── content.config.ts          # Zod-схемы всех коллекций
│   ├── content/
│   │   ├── products/              # Модели столов (.md)
│   │   ├── lines/                 # Линейки столов (.md)
│   │   ├── site/                  # settings.md — реквизиты, nav, аналитика
│   │   ├── legal/                 # privacy, cookie-policy, terms, returns, complaints
│   │   ├── sections/              # Тексты секций главной
│   │   └── faq/                   # Вопросы-ответы
│   ├── components/
│   │   ├── layout/                # Header, Nav, Footer, LegalBlock
│   │   ├── blocks/                # Гибкие блоки контента + ContentBlocks.astro
│   │   ├── ui/                    # Carousel, Lightbox, CookieBanner, Logo
│   │   └── seo/                   # SEO.astro + jsonld/*
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── styles/
│   │   ├── global.css
│   │   ├── fonts.css
│   │   └── themes/cyberpunk.css   # Единственная тема
│   ├── scripts/
│   │   ├── app.ts                 # Bootstrap (astro:page-load)
│   │   ├── consent.ts             # Модель согласия
│   │   ├── cookie-consent.ts      # UI баннера
│   │   ├── analytics.ts           # GA4 + Яндекс.Метрика (gated)
│   │   ├── advertising.ts         # Google Ads + Яндекс.Директ (gated)
│   │   ├── form.ts                # Honeypot + маска + отправка
│   │   ├── carousel.ts            # Слайдер
│   │   ├── lightbox.ts            # Лайтбокс
│   │   ├── faq.ts                 # Аккордеон
│   │   ├── reveal.ts              # Reveal-on-scroll
│   │   └── menu.ts                # Мобильное меню
│   └── pages/
│       ├── index.astro            # Главная
│       ├── products/
│       │   ├── index.astro        # /products — каталог
│       │   └── [slug].astro       # /products/[slug] — карточка
│       ├── lines/
│       │   └── [slug].astro       # /lines/[slug] — линейка
│       ├── privacy.astro
│       ├── cookie-policy.astro
│       ├── terms.astro
│       ├── returns.astro
│       ├── complaints.astro
│       └── keystatic/
│           └── [...params].astro  # /keystatic — CMS
├── keystatic.config.ts            # Конфиг Keystatic
├── astro.config.mjs               # output: static, sitemap, Tailwind, Keystatic
└── package.json
```

---

## 3. Контентная модель (коллекции)

Полные Zod-схемы — в [`requirements/kiberstol-tz.md`](../requirements/kiberstol-tz.md) §6. Кратко:

| Коллекция | Назначение | Ключевые поля |
|---|---|---|
| `products` | Модели столов | `title`, `line`, `price`, юр. поля (manufacturer, supplier, countryOfOrigin, warranty, used), `specs`, `image`, `gallery`, `badge`, `content` (blocks), `seo` |
| `lines` | Линейки столов | `title`, `description`, `image`, `features`, `content` (blocks), `seo` |
| `site` | Реквизиты ИП (единый источник правды) | `brand`, `fullName`, `unp`, `registrationDate`, `tradeRegistryNumber/Date`, `phone`, `email`, `address`, `workHours`, `authorizedBody`, `authorizedBodyPhone`, `brandColors`, `paymentMethods`, `deliveryMethods`, `nav`, `analytics`, `advertising` |
| `legal` | Юр. документы | `title`, `updatedAt`, `seo` |
| `sections` | Тексты секций главной | переиспользуется из FastPage |
| `faq` | Вопросы-ответы | `question`, `answer`, `order` |

> **Исключено из FastPage:** `blog`, `showcase`, `testimonials`, `instagram`, `integrations`, `products` (услуги). Добавлено: `lines`.

### Гибкие блоки контента (`contentBlocks`)

Блоки: `hero`, `richText`, `image`, `imageCarousel`, `video`, `videoGif`, `gallery`, `cta`, `faq`, `specs`, `banner`, `columns`, `quote`, `divider`. Каждый — отдельный Astro-компонент в `src/components/blocks/`, рендерятся через `ContentBlocks.astro`.

---

## 4. Поэтапный план реализации

### Фаза 0 — Инициализация проекта и репозитория

| # | Шаг | Результат |
|---|---|---|
| 0.1 | Создать git-репозиторий `kiberstol` (локально + remote) | `.git/`, remote `origin` |
| 0.2 | Инициализировать Astro-проект (на базе FastPage, без Sveltia) | `package.json`, `astro.config.mjs`, `tsconfig.json` |
| 0.3 | Установить зависимости (Astro, Tailwind, sitemap, Keystatic, React, шрифты) | `node_modules/`, `package-lock.json` |
| 0.4 | Настроить `astro.config.mjs` (`site`, `output: 'static'`, Tailwind, sitemap, Keystatic) | рабочий `astro dev` |
| 0.5 | Создать `.gitignore`, `.env.example` | базовые файлы |
| 0.6 | Коммит + пуш | зафиксированная точка старта |

### Фаза 1 — Контентная модель

| # | Шаг | Результат |
|---|---|---|
| 1.1 | `src/content.config.ts` — схемы `products`, `lines`, `site`, `legal`, `sections`, `faq` + `contentBlocks` + `seoSchema` | валидация контента |
| 1.2 | Создать структуру `src/content/*` с плейсхолдер-файлами | коллекции читаются |
| 1.3 | Коммит + пуш | — |

### Фаза 2 — Базовая разметка и переиспользуемые компоненты

| # | Шаг | Результат |
|---|---|---|
| 2.1 | `BaseLayout.astro` (html/head/body, ClientRouter, слоты) | единый layout |
| 2.2 | `Header.astro` + `Nav.astro` (логотип, бренд, телефон, меню) | шапка |
| 2.3 | `Footer.astro` + `LegalBlock.astro` (обязательные сведения ИП) | футер с юр. блоком |
| 2.4 | `SEO.astro` + JSON-LD компоненты (`Organization`, `Product`, `ItemList`, `BreadcrumbList`, `FAQPage`) | SEO-слой |
| 2.5 | Коммит + пуш | — |

### Фаза 3 — Гибкие блоки контента

| # | Шаг | Результат |
|---|---|---|
| 3.1 | `ContentBlocks.astro` (маппинг типа блока → компонент) | рендер массива блоков |
| 3.2 | Компоненты блоков: `hero`, `richText`, `image`, `imageCarousel`, `video`, `videoGif`, `gallery`, `cta`, `faq`, `specs`, `banner`, `columns`, `quote`, `divider` | все блоки |
| 3.3 | Коммит + пуш | — |

### Фаза 4 — Страницы

| # | Шаг | Результат |
|---|---|---|
| 4.1 | `index.astro` — главная (секции в порядке §4.1 ТЗ) | главная |
| 4.2 | `products/index.astro` — каталог (линейки → модели) | `/products` |
| 4.3 | `lines/[slug].astro` — страница линейки (generic, `getStaticPaths`) | `/lines/[slug]` |
| 4.4 | `products/[slug].astro` — карточка модели (юр. поля + блоки) | `/products/[slug]` |
| 4.5 | 5 юридических страниц (`privacy`, `cookie-policy`, `terms`, `returns`, `complaints`) | юр. страницы |
| 4.6 | Коммит + пуш | — |

### Фаза 5 — Функциональные модули (vanilla TS)

| # | Шаг | Результат |
|---|---|---|
| 5.1 | `form.ts` + `public/api/submit.php` (honeypot, маска, Telegram) | заявки |
| 5.2 | `consent.ts` + `cookie-consent.ts` (гранулярное согласие) | cookie-баннер |
| 5.3 | `analytics.ts` + `advertising.ts` (gated) | аналитика/реклама |
| 5.4 | `carousel.ts` + `lightbox.ts` | галерея |
| 5.5 | `faq.ts`, `reveal.ts`, `menu.ts`, `app.ts` | интерактив |
| 5.6 | Коммит + пуш | — |

### Фаза 6 — Keystatic CMS

| # | Шаг | Результат |
|---|---|---|
| 6.1 | `keystatic.config.ts` (коллекции, `fields.blocks`, медиа) | конфиг CMS |
| 6.2 | `src/pages/keystatic/[...params].astro` | маршрут `/keystatic` |
| 6.3 | Настройка медиа-слоя (`public/assets/uploads`, WebP ≤2000px) | загрузка медиа |
| 6.4 | Коммит + пуш | — |

### Фаза 7 — Тема cyberpunk

| # | Шаг | Результат |
|---|---|---|
| 7.1 | `cyberpunk.css` — адаптация под бренд (голубой/фиолетовый/белый) | тема |
| 7.2 | `global.css` + `fonts.css` (self-host шрифты) | стили |
| 7.3 | Удалить свитчер тем (одна фиксированная тема) | без переключателя |
| 7.4 | Коммит + пуш | — |

### Фаза 8 — SEO

| # | Шаг | Результат |
|---|---|---|
| 8.1 | JSON-LD `Product + Offer` (BYN), `Organization`, `ItemList`, `BreadcrumbList`, `FAQPage` | разметка |
| 8.2 | `@astrojs/sitemap` (исключить `/keystatic`, юр. страницы) + `robots.txt` | sitemap/robots |
| 8.3 | Семантика: один `h1`, `alt` у фото | семантика |
| 8.4 | Коммит + пуш | — |

### Фаза 9 — Юридический контент

| # | Шаг | Результат |
|---|---|---|
| 9.1 | `legal/privacy.md`, `cookie-policy.md`, `terms.md`, `returns.md`, `complaints.md` | юр. тексты |
| 9.2 | `site/settings.md` — реквизиты ИП, реестр, оплата/доставка | реквизиты |
| 9.3 | Коммит + пуш | — |

### Фаза 10 — Плейсхолдеры контента

| # | Шаг | Результат |
|---|---|---|
| 10.1 | `lines/*.md` (3 линейки) + `products/*.md` (модели) с плейсхолдерами | каталог |
| 10.2 | `sections/*.md` + `faq/*.md` | тексты главной |
| 10.3 | Коммит + пуш | — |

### Фаза 11 — Сборка и приёмка

| # | Шаг | Результат |
|---|---|---|
| 11.1 | `astro build` без ошибок | статическая сборка |
| 11.2 | Проверка критериев приёмки (§13 ТЗ) | готовность |
| 11.3 | Финальный коммит + пуш | — |

---

## 5. Ключевые отличия от FastPage

| Аспект | FastPage | Kiberstol |
|---|---|---|
| CMS | Sveltia (`@sveltia/cms`) | Keystatic (`@keystatic/core` + `@keystatic/astro`) |
| Темы | 3 темы + свитчер | 1 фиксированная cyberpunk |
| Товары | Услуги (`priceFrom`) | Физические товары (`price` + юр. поля) |
| Коллекции | blog, showcase, testimonials, instagram, integrations | + `lines`, − blog/showcase/testimonials/instagram/integrations |
| Страницы | oferta/privacy/cookie-policy | privacy/cookie-policy/terms/returns/complaints |
| Каталог | `/products/[slug]` | `/products` + `/lines/[slug]` + `/products/[slug]` |
| Гибкие блоки | нет | `fields.blocks` + `ContentBlocks.astro` |
