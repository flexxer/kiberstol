# Прогресс разработки — Kiberstol.by

> Документ трекинга прогресса. **Обязательно обновлять после каждого выполненного шага** (отметить `[x]`, при необходимости добавить заметку).
> План: [`plans/architecture.md`](architecture.md). Требования: [`requirements/kiberstol-tz.md`](../requirements/kiberstol-tz.md).

## Правила ведения

- После каждого шага — коммит и пуш в репозиторий `kiberstol`.
- Отмечать выполненный шаг `[x]`, текущий — `[-]`.
- В колонке «Заметка» фиксировать результат/проблемы.

---

## Фаза 0 — Инициализация проекта и репозитория

- [x] 0.1 Создать git-репозиторий `kiberstol` (локально + remote)
- [x] 0.2 Инициализировать Astro-проект (на базе FastPage, без Sveltia)
- [x] 0.3 Установить зависимости (Astro, Tailwind, sitemap, Keystatic, React, шрифты)
- [x] 0.4 Настроить `astro.config.mjs`
- [x] 0.5 Создать `.gitignore`, `.env.example`
- [x] 0.6 Коммит + пуш

## Фаза 1 — Контентная модель

- [x] 1.1 `src/content.config.ts` (схемы `products`, `lines`, `site`, `legal`, `sections`, `faq` + `contentBlocks` + `seoSchema`)
- [x] 1.2 Структура `src/content/*` (плейсхолдеры `lines`, `products`, `legal`, `faq`)
- [x] 1.3 Коммит + пуш

## Фаза 2 — Базовая разметка и компоненты

- [x] 2.1 `BaseLayout.astro`
- [x] 2.2 `Header.astro` + `Nav.astro` + `Logo.astro`
- [x] 2.3 `Footer.astro` + `LegalBlock.astro`
- [x] 2.4 `SEO.astro` + JSON-LD компоненты (`Organization`, `Product`, `ItemList`, `BreadcrumbList`, `FAQPage`)
- [x] 2.5 Коммит + пуш

## Фаза 3 — Гибкие блоки контента

- [x] 3.1 `ContentBlocks.astro`
- [x] 3.2 Компоненты блоков (14 блоков)
- [x] 3.3 Коммит + пуш

## Фаза 4 — Страницы

- [x] 4.1 `index.astro` (главная) — секции в порядке §4.1 ТЗ (Hero → Каталог → Доставка/оплата → Заказ → Баннеры → FAQ → Форма)
- [x] 4.2 `products/index.astro` (каталог: линейки → модели)
- [x] 4.3 `lines/[slug].astro` (generic, `getStaticPaths` + `ContentBlocks`)
- [x] 4.4 `products/[slug].astro` (карточка: юр. поля + блоки + JSON-LD Product/Breadcrumb)
- [x] 4.5 5 юридических страниц (`privacy`, `cookie-policy`, `terms`, `returns`, `complaints`)
- [x] 4.6 Коммит + пуш

## Фаза 5 — Функциональные модули

- [x] 5.1 `form.ts` + `public/api/submit.php`
- [x] 5.2 `consent.ts` + `cookie-consent.ts`
- [x] 5.3 `analytics.ts` + `advertising.ts`
- [x] 5.4 `carousel.ts` + `lightbox.ts`
- [x] 5.5 `faq.ts`, `reveal.ts`, `menu.ts`, `app.ts`
- [x] 5.6 Коммит + пуш

## Фаза 6 — Keystatic CMS

- [x] 6.1 `keystatic.config.ts`
- [x] 6.2 `src/pages/keystatic/[...params].astro`
- [x] 6.3 Медиа-слой (`public/assets/uploads`)
- [x] 6.4 Коммит + пуш

## Фаза 7 — Тема cyberpunk

- [x] 7.1 `cyberpunk.css` (адаптация под бренд)
- [x] 7.2 `global.css` + `fonts.css`
- [x] 7.3 Удалить свитчер тем
- [x] 7.4 Коммит + пуш

## Фаза 8 — SEO

- [x] 8.1 JSON-LD (`Product`, `Organization`, `ItemList`, `BreadcrumbList`, `FAQPage`)
- [x] 8.2 `@astrojs/sitemap` + `robots.txt`
- [x] 8.3 Семантика (один `h1`, `alt`)
- [x] 8.4 Коммит + пуш

## Фаза 9 — Юридический контент

- [x] 9.1 5 файлов `legal/*.md`
- [x] 9.2 `site/settings.md` (реквизиты)
- [x] 9.3 Коммит + пуш

## Фаза 10 — Плейсхолдеры контента

- [x] 10.1 `lines/*.md` + `products/*.md`
- [x] 10.2 `sections/*.md` + `faq/*.md`
- [x] 10.3 Коммит + пуш

## Фаза 11 — Сборка и приёмка

- [x] 11.1 `astro build` без ошибок
- [x] 11.2 Проверка критериев приёмки
- [x] 11.3 Финальный коммит + пуш

---

## Журнал изменений

| Дата | Шаг | Заметка |
|---|---|---|
| 2026-10-18 | 0.1–0.6 | Инициализирован Astro-проект (Astro 7.4, Tailwind 4.3, Keystatic, React 19), установлены зависимости, `astro build` проходит. Создан репозиторий `flexxer/kiberstol`, первый коммит запушен. |
| 2026-10-18 | 1.1–1.2, 4.1 | Создан `content.config.ts` (коллекции `site` + `sections` + `seoSchema`), контент-файлы `site/settings.md` и `sections/home.md`. `index.astro` переписан без хардкода: заголовок/описание/SEO берутся из CMS. `astro build` проходит. |
| 2026-10-18 | 1.1–1.2, 2.1–2.4 | Расширен `content.config.ts` (коллекции `products`, `lines`, `legal`, `faq` + `contentBlocks` + `seoSchema`). Созданы плейсхолдеры `lines/*`, `products/*`, `legal/*`, `faq/*`. Реализованы `BaseLayout`, `Header`+`Nav`+`Logo`, `Footer`+`LegalBlock`, `SEO` + JSON-LD (`Organization`, `Product`, `ItemList`, `BreadcrumbList`, `FAQPage`). `index.astro` переведён на `BaseLayout`. `astro build` проходит. |
| 2026-10-18 | 3.1–3.2 | Реализованы гибкие блоки контента: `ContentBlocks.astro` (маппинг `type` → компонент) и 14 компонентов в `src/components/blocks/` (`Hero`, `RichText`, `Image`, `ImageCarousel`, `Video`, `VideoGif`, `Gallery`, `Cta`, `Faq`, `Specs`, `Banner`, `Columns`, `Quote`, `Divider`). Интерактив (карусель, лайтбокс, аккордеон) подключается в Фазе 5. `astro build` проходит. |
| 2026-10-18 | 4.1–4.6 | Реализованы все страницы Фазы 4: `index.astro` (секции в порядке §4.1 ТЗ), `products/index.astro` (каталог линейки→модели), `lines/[slug].astro` и `products/[slug].astro` (generic через `getStaticPaths` + `ContentBlocks`), 5 юридических страниц (`privacy`, `cookie-policy`, `terms`, `returns`, `complaints` через `render()`). JSON-LD (`Organization`, `ItemList`, `FAQPage`, `Product`, `BreadcrumbList`) встроен в страницы. `astro build` проходит (12 страниц). |
| 2026-10-18 | 5.1–5.6 | Реализованы функциональные модули Фазы 5: `form.ts` (honeypot + time-honeypot + маска `+375 XX XXX-XX-XX` → `POST /api/submit.php` → Telegram) + `public/api/submit.php` (серверная защита, токен через `getenv`); `consent.ts` + `cookie-consent.ts` (гранулярное согласие аналитика/маркетинг, баннер в `BaseLayout`); `analytics.ts` + `advertising.ts` (gated-загрузка GA4/Метрика/Ads/Директ после согласия, отзыв удаляет cookie); `carousel.ts` + `lightbox.ts`; `faq.ts`, `reveal.ts`, `menu.ts`, `app.ts` (bootstrap). Форма на главной дополнена чекбоксами ПД/реклама и honeypot-полями. `astro build` проходит (12 страниц). |
| 2026-10-18 | 6.1–6.4 | Реализована Keystatic CMS (Фаза 6): `keystatic.config.ts` (коллекции `products`, `lines`, `site` (singleton), `legal`, `sections`, `faq` + гибкие блоки `contentBlocks` через `fields.blocks` с полем `type` для совместимости с Zod-схемой `discriminatedUnion`). Подключена интеграция `@keystatic/astro` (маршруты `/keystatic` и `/api/keystatic`). Медиа-слой `public/assets/uploads` (WebP, quality 80, ≤2000px). Для серверных маршрутов CMS добавлен адаптер `@astrojs/node` (`output: 'static'` + `mode: 'standalone'` — контентные страницы остаются статичными). `astro build` проходит (12 статичных страниц + серверные маршруты CMS). |
| 2026-10-18 | 7.1–7.4 | Реализована тема cyberpunk (Фаза 7): `src/styles/themes/cyberpunk.css` — единственная фиксированная тема, адаптированная под бренд (голубой `#00d4ff` / фиолетовый `#8b5cf6` / белый на тёмном фоне). Определены семантические Tailwind-токены (`text-text`, `text-muted`, `text-primary`, `text-accent`, `bg-bg`, `bg-surface`, `bg-primary`, `bg-secondary`, `border-border`, `border-primary`) через `@theme`, неоновое свечение, кастомная утилита `link-underline`, адаптация `prose` под тёмную тему. `src/styles/fonts.css` — self-host шрифты (Manrope/Unbounded/Inter/JetBrains Mono, variable). `global.css` переведён на Tailwind v4 (`@plugin '@tailwindcss/typography'`). Свитчер тем отсутствует (ничего удалять не потребовалось). `astro build` проходит (12 страниц). |
| 2026-10-18 | 8.1–8.4 | Завершена Фаза 8 (SEO): JSON-LD (`Product`+`Offer` BYN, `Organization`, `ItemList`, `BreadcrumbList`, `FAQPage`) уже встроены в страницы; добавлены `public/robots.txt` (закрыты `/keystatic`, `/api/`, юр. страницы) и `public/favicon.svg`; `@astrojs/sitemap` генерирует `sitemap-index.xml` с исключением служебных/юр. страниц. Семантика: один `h1` на страницу, `alt` у всех изображений. `astro build` проходит. |
| 2026-10-18 | 9.1–9.3 | Завершена Фаза 9 (юридический контент): написаны 5 документов `legal/*.md` (privacy, cookie-policy, terms, returns, complaints) с полными текстами по закону РБ № 99-З и Пост. №778; `site/settings.md` дополнен полями `analytics`/`advertising` и уточнён `authorizedBodyPhone`. `astro build` проходит. |
| 2026-10-18 | 10.1–10.3 | Завершена Фаза 10 (плейсхолдеры контента): наполнены `lines/*.md` (3 линейки «Старт»/«Про»/«Макс») и `products/*.md` (2 модели с юр. полями); созданы `sections/*.md` (hero, advantages, delivery, order, contact) и `faq/*.md` (4 вопроса). `astro build` проходит (12 страниц). |
| 2026-10-18 | 11.1–11.3 | Завершена Фаза 11 (сборка и приёмка). `npm run build` (`astro build`) выполняется без ошибок: 12 статичных страниц + серверные маршруты Keystatic, `sitemap-index.xml` сгенерирован. Критерии приёмки §13 ТЗ проверены: обязательные сведения берутся из CMS (`LegalBlock` из `site/settings.md`), форма (honeypot + time-honeypot + маска + обязательное согласие ПД) → Telegram, cookie-баннер с гранулярным согласием и отзывом, юр. поля карточки + цена BYN, 5 юр. страниц + `robots.txt`/`sitemap` с исключениями, JSON-LD (`Organization`/`Product+Offer`/`ItemList`/`BreadcrumbList`/`FAQPage`), один `h1`/`alt`, разделение слоёв (контент в CMS, UI в CSS, без inline-стилей). Финальный коммит запушен. |
