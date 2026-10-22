# CMS (Keystatic) — Kiberstol.by

> Руководство по работе с контентом через Keystatic.
> Деплой — [`docs/deployment.md`](deployment.md),
> архитектура — [`plans/architecture.md`](../plans/architecture.md).

---

## 1. Обзор

- CMS: **Keystatic** (git-based, GitHub OAuth).
- Конфиг: [`keystatic.config.ts`](../keystatic.config.ts).
- Админка: `/keystatic` (маршруты инжектит `@keystatic/astro`; отдельного
  page-файла нет).
- Контент хранится в репозитории: `src/content/**`, медиа — `src/assets/uploads/**`.

### 1.1. Storage

| Режим | Когда | Настройка |
|---|---|---|
| `local` | Разработка | `PUBLIC_KEYSTATIC_STORAGE=local` |
| `github` | Production | `PUBLIC_KEYSTATIC_STORAGE=github` + OAuth-переменные |

Полный список переменных — в [`docs/deployment.md`](deployment.md) §2.2 и
[`.env.example`](../.env.example).

---

## 2. Коллекции и singleton

| Раздел CMS | Путь | Назначение |
|---|---|---|
| **Товары** (`products`) | `src/content/products/*` | Модели столов, юр. поля, характеристики, галерея, блоки, SEO |
| **Линейки** (`lines`) | `src/content/lines/*` | Линейки столов, описание, особенности, блоки, SEO |
| **Юридические документы** (`legal`) | `src/content/legal/*` | privacy, cookie-policy, terms, returns, complaints |
| **Секции главной** (`sections`) | `src/content/sections/*` | Тексты секций главной |
| **Настройки сайта** (`site`) | `src/content/site/settings.yaml` | Реквизиты ИП, бренд, навигация, аналитика/реклама, подписи, SEO |

> Коллекции `faq` нет: вопросы-ответы редактируются в секции `faq`
> (`sections/faq.md`, `variant.discriminant === 'faq'`).

---

## 3. Настройки сайта (`site`)

Singleton `site` — единый источник правды. Файл:
[`src/content/site/settings.yaml`](../src/content/site/settings.yaml).

Содержит:

- реквизиты ИП: `fullName`, `unp`, `registrationDate`, `tradeRegistryNumber/Date`;
- контакты: `phone`, `email`, `viber`, `instagram`, `address`, `workHours`;
- уполномоченный орган: `authorizedBody`, `authorizedBodyPhone`;
- `labels` — подписи интерфейса (характеристики, сведения о товаре, хлебные
  крошки, «Настройки cookie» и т.д.);
- `nav` — пункты меню;
- `analytics` / `advertising` — ID трекеров (загружаются только после согласия);
- `seo` — глобальные SEO-поля.

> **Не хранится в `site`:** цвета (`brandColors` удалены — только CSS-тема) и
> способы оплаты/доставки (они в `sections/delivery.md`).

---

## 4. Секции главной

Утверждённый эталон (не менять состав/порядок в рамках рефакторинга v2):

| # | Секция | Файл | Якорь |
|---|---|---|---|
| 1 | `hero` | `sections/hero.md` | — |
| 2 | `advantages` | `sections/advantages.md` | `#advantages` |
| 3 | `catalog` | `sections/catalog.md` | `#catalog` |
| 4 | `delivery` | `sections/delivery.md` | `#delivery` |
| 5 | `faq` | `sections/faq.md` | `#faq` |
| 6 | `contact` | `sections/contacts.md` | `#contacts` |

- Каталог на главной показывает **только линейки**.
- Секции `order`/`banners` и модели на главной — вне рефакторинга v2
  (будущее развитие).
- Оплата и доставка редактируются в `sections/delivery.md`
  (`variant.delivery.paymentMethods` / `deliveryMethods`).

---

## 5. Гибкие блоки контента

Блоки задаются через `fields.blocks` и рендерятся
[`ContentBlocks.astro`](../src/components/blocks/ContentBlocks.astro).

Доступные блоки: `hero`, `richText`, `image`, `imageCarousel`, `video`,
`videoGif`, `gallery`, `cta`, `faq`, `specs`, `banner`, `columns`, `quote`,
`divider`.

### 5.1. Формат сериализации

Keystatic сохраняет блок как:

```json
{ "discriminant": "richText", "value": { "content": "..." } }
```

- `discriminant` — тип блока;
- `value` — поля блока;
- поле `type` внутри `value` — **legacy**: не участвует в рендере и
  отбрасывается Zod. Новые блоки можно создавать без него.

Подробнее — [`plans/adr-001-content-blocks.md`](../plans/adr-001-content-blocks.md).

### 5.2. Markdown

| Слой | Механизм |
|---|---|
| Контентные поля документа (`description`, `body`, `answer`) | `fields.mdx` (нативный Keystatic) |
| Блок `richText` внутри `contentBlocks` | `fields.text` + `marked`/`sanitize-html` |

`fields.mdx` несовместим с вложенными `fields.blocks`, поэтому `richText`-блоки
используют `marked`.

---

## 6. Медиа

- Загрузка через `fields.image` / `fields.file`.
- Файлы сохраняются в `src/assets/uploads/**`.
- В контенте хранится путь вида `/assets/uploads/<slug>/<file>`.
- Оптимизация (WebP/AVIF, ресайз ≤ 2000px) — на этапе сборки через
  `astro:assets` и [`src/lib/image.ts`](../src/lib/image.ts).
- `public/assets/uploads` — legacy-заглушка, CMS её не использует.

---

## 7. Товары и линейки

### 7.1. Товары (`products`)

Обязательные поля: `title`, `line` (relationship → `lines`), `price`,
`shortDescription`, `manufacturer`, `manufacturerLocation`, `supplier`,
`countryOfOrigin`, `image`.

Дополнительно: `oldPrice`, `warranty`, `used`, `specs`, `gallery`, `badge`,
`ctaText`, `order`, `content` (блоки), `seo`.

> `line` — это **relationship** к коллекции `lines`, а не свободный текст.

### 7.2. Линейки (`lines`)

Поля: `title`, `description`, `image`, `features`, `order`, `content` (блоки),
`seo`.

---

## 8. SEO-поля

Общая схема `seoSchema`: `title`, `description`, `image` (og:image),
`noindex`.

- `noindex` передаётся на главную, каталог, линейку и карточку.
- Юридические страницы: `noindex,nofollow` + исключение из sitemap.
- `og:site_name` берётся из `site.brand`; fallback `og:image` —
  `site.seo.image` → `/assets/og-default.png`.

---

## 9. Рабочий процесс

1. Откройте `/keystatic` и авторизуйтесь через GitHub (production) или
   работайте локально (`local`).
2. Отредактируйте нужную коллекцию/singleton.
3. Сохраните — изменения коммитятся в репозиторий (github storage) или
   пишутся локально (local storage).
4. Запустите `npm run check` и `npm run build`.
5. Опубликуйте сборку (см. [`docs/deployment.md`](deployment.md)).

> Перед публикацией замените плейсхолдер `authorizedBodyPhone` и подтвердите
> гарантийный срок «24 месяца» в контенте товаров.
