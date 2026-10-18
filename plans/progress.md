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

- [ ] 1.1 `src/content.config.ts` (схемы всех коллекций + `contentBlocks` + `seoSchema`)
- [ ] 1.2 Структура `src/content/*` с плейсхолдер-файлами
- [ ] 1.3 Коммит + пуш

## Фаза 2 — Базовая разметка и компоненты

- [ ] 2.1 `BaseLayout.astro`
- [ ] 2.2 `Header.astro` + `Nav.astro`
- [ ] 2.3 `Footer.astro` + `LegalBlock.astro`
- [ ] 2.4 `SEO.astro` + JSON-LD компоненты
- [ ] 2.5 Коммит + пуш

## Фаза 3 — Гибкие блоки контента

- [ ] 3.1 `ContentBlocks.astro`
- [ ] 3.2 Компоненты блоков (14 блоков)
- [ ] 3.3 Коммит + пуш

## Фаза 4 — Страницы

- [ ] 4.1 `index.astro` (главная)
- [ ] 4.2 `products/index.astro` (каталог)
- [ ] 4.3 `lines/[slug].astro`
- [ ] 4.4 `products/[slug].astro`
- [ ] 4.5 5 юридических страниц
- [ ] 4.6 Коммит + пуш

## Фаза 5 — Функциональные модули

- [ ] 5.1 `form.ts` + `public/api/submit.php`
- [ ] 5.2 `consent.ts` + `cookie-consent.ts`
- [ ] 5.3 `analytics.ts` + `advertising.ts`
- [ ] 5.4 `carousel.ts` + `lightbox.ts`
- [ ] 5.5 `faq.ts`, `reveal.ts`, `menu.ts`, `app.ts`
- [ ] 5.6 Коммит + пуш

## Фаза 6 — Keystatic CMS

- [ ] 6.1 `keystatic.config.ts`
- [ ] 6.2 `src/pages/keystatic/[...params].astro`
- [ ] 6.3 Медиа-слой (`public/assets/uploads`)
- [ ] 6.4 Коммит + пуш

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
