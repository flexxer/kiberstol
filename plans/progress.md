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
- [ ] 1.3 Коммит + пуш

## Фаза 2 — Базовая разметка и компоненты

- [x] 2.1 `BaseLayout.astro`
- [x] 2.2 `Header.astro` + `Nav.astro` + `Logo.astro`
- [x] 2.3 `Footer.astro` + `LegalBlock.astro`
- [x] 2.4 `SEO.astro` + JSON-LD компоненты (`Organization`, `Product`, `ItemList`, `BreadcrumbList`, `FAQPage`)
- [ ] 2.5 Коммит + пуш

## Фаза 3 — Гибкие блоки контента

- [x] 3.1 `ContentBlocks.astro`
- [x] 3.2 Компоненты блоков (14 блоков)
- [ ] 3.3 Коммит + пуш

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

- [ ] 7.1 `cyberpunk.css` (адаптация под бренд)
- [ ] 7.2 `global.css` + `fonts.css`
- [ ] 7.3 Удалить свитчер тем
- [ ] 7.4 Коммит + пуш

## Фаза 8 — SEO

- [ ] 8.1 JSON-LD (`Product`, `Organization`, `ItemList`, `BreadcrumbList`, `FAQPage`)
- [ ] 8.2 `@astrojs/sitemap` + `robots.txt`
- [ ] 8.3 Семантика (один `h1`, `alt`)
- [ ] 8.4 Коммит + пуш

## Фаза 9 — Юридический контент

- [ ] 9.1 5 файлов `legal/*.md`
- [ ] 9.2 `site/settings.md` (реквизиты)
- [ ] 9.3 Коммит + пуш

## Фаза 10 — Плейсхолдеры контента

- [ ] 10.1 `lines/*.md` + `products/*.md`
- [ ] 10.2 `sections/*.md` + `faq/*.md`
- [ ] 10.3 Коммит + пуш

## Фаза 11 — Сборка и приёмка

- [ ] 11.1 `astro build` без ошибок
- [ ] 11.2 Проверка критериев приёмки
- [ ] 11.3 Финальный коммит + пуш

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
