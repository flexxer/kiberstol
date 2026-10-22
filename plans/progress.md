# Прогресс рефакторинга — Kiberstol.by

> План: [`plans/refactoring-v2.md`](refactoring-v2.md).
> Обновляется после завершения каждой фазы.

## Статус фаз

- [x] Фаза 0 — базовая линия, проверки, ADR формата блоков
- [x] Фаза 1 — контракты, Keystatic production storage, схемы
- [x] Фаза 2 — фиксация утвержденного контента главной (только документация)
- [x] Фаза 3 — карточка товара и страница линейки
- [x] Фаза 4 — формы, согласие, аналитика
- [x] Фаза 5 — SEO и медиа
- [x] Фаза 6 — очистка контента товаров и линеек
- [x] Фаза 7 — актуализация документации и ТЗ
- [ ] Фаза 8 — тесты, CI, аудит качества

## Базовая линия

| Проверка | Команда | Статус | Примечание |
|---|---|---|---|
| Сборка | `npm run build` | ✅ | `output: static`, node adapter, Keystatic server chunks в `dist/server` |
| Типы | `npm run check` | ✅ | 0 ошибок, 4 hints (неиспользуемые переменные/импорт) |
| Контент | ручная проверка | ✅ | фаза 6: плейсхолдеры и SEO проверены |

## Журнал

| Дата | Фаза | Что сделано | Проверка |
|---|---|---|---|
| 2026-10-22 | 0 | Добавлены `sharp`, `typescript@6.0.3`, `@astrojs/check`, скрипт `check` | `npm run check` |
| 2026-10-22 | 0 | Создан ADR [`adr-001-content-blocks.md`](adr-001-content-blocks.md) | — |
| 2026-10-22 | 0 | Создан `plans/progress.md` | — |
| 2026-10-22 | 0 | Создана ветка `refactor/v2` | — |
| 2026-10-22 | 1 | Зафиксирован формат блоков `{ discriminant, value }`; `type` помечен как legacy | `npm run check` |
| 2026-10-22 | 1 | [`content-blocks-unification.md`](content-blocks-unification.md) помечен как устаревший | — |
| 2026-10-22 | 1 | Keystatic: условный GitHub/local storage, env-переменные в `.env.example` | `npm run build` |
| 2026-10-22 | 1 | Обязательные поля `products` согласованы между Zod и Keystatic | `npm run check` |
| 2026-10-22 | 1 | `product.line` переведён на relationship к `lines` | `npm run check` |
| 2026-10-22 | 1 | Добавлены `site.labels` (схема, CMS, `settings.yaml`) | `npm run build` |
| 2026-10-22 | 1 | FAQ зафиксирован в `sections` variant; пустая `src/content/faq` удалена; документация обновлена | `npm run build` |
| 2026-10-22 | 1 | `content.config.ts` переведён на `astro/zod`; типизирован `contentBlocks` | `npm run check` |
| 2026-10-22 | 2 | Зафиксирован утвержденный порядок секций главной: hero → advantages → catalog → delivery → faq → contact | — |
| 2026-10-22 | 2 | ТЗ §4.1 переписан под эталон; добавлен §4.3 «Будущее развитие» (order/banners/модели на главной) | — |
| 2026-10-22 | 2 | `architecture.md`: добавлен раздел «Утвержденный состав секций главной», зафиксирован каталог «только линейки» | — |
| 2026-10-22 | 2 | `refactoring-v2.md`: order/banners/модели вынесены в «Будущее развитие» | — |
| 2026-10-22 | 3 | CTA карточки товара ведёт на `/#contacts`; добавлен `ctaText` товарам | `npm run build` |
| 2026-10-22 | 3 | Создан `Breadcrumbs.astro`; используется в каталоге, линейке и карточке | `npm run check` |
| 2026-10-22 | 3 | Подписи «Характеристики», «Сведения о товаре», «Другие модели», «Модели линейки», каталог — из `site.labels` | `npm run check` |
| 2026-10-22 | 3 | `ItemList` добавлен на страницу линейки; `BreadcrumbList` — в каталог | `npm run build` |
| 2026-10-22 | 3 | `Product` JSON-LD: `sku`, `availability`, `brand`, `countryOfOrigin`, `offers.url` | `npm run build` |
| 2026-10-22 | 3 | Удалён неиспользуемый `Image`; устранено дублирование `getImage`/`resolveImage` в карточке | `npm run check` |
| 2026-10-22 | 3 | `noindex` из CMS передаётся на главную, каталог, линейку и карточку; canonical — из `Astro.url` | `npm run check` |
| 2026-10-22 | 4 | Добавлены `clearConsent` и `openConsentBanner`; в футере — «Настройки cookie» | `npm run check` |
| 2026-10-22 | 4 | Баннер cookie скрыт по умолчанию (`hidden`), показывается из `cookie-consent.ts` — без FOUC | `npm run build` |
| 2026-10-22 | 4 | Отзыв согласия выгружает аналитику и рекламу через `onConsentChange` | `npm run check` |
| 2026-10-22 | 4 | `submit.php`: серверная проверка `consent-pd`, валидация телефона, экранирование HTML, rate limiting | `npm run build` |
| 2026-10-22 | 4 | `form.ts`: `ts` обновляется после `form.reset()`; статус формы получил `aria-live="polite"` | `npm run check` |
| 2026-10-22 | 5 | Сгенерирован `public/assets/og-default.png` (1200×630) и скрипт `scripts/generate-og-default.mjs` | `npm run build` |
| 2026-10-22 | 5 | `SEO.astro`: `og:site_name` из `site.brand`; fallback `og:image` — `site.seo.image` → `og-default.png` | `npm run build` |
| 2026-10-22 | 5 | `Organization` JSON-LD: добавлены `logo` и `sameAs` (Viber, Instagram из CMS) | `npm run build` |
| 2026-10-22 | 5 | `Product` JSON-LD: `availability` = InStock, состояние товара — в `itemCondition` | `npm run build` |
| 2026-10-22 | 5 | Удалены пустые `src/assets/uploads/catalog/**`; `public/assets/uploads` задокументирован как legacy | — |
| 2026-10-22 | 5 | `<img>` карточки товара получили `width`/`height` (CLS); `sharp` собирает 23 WebP без ошибок | `npm run build` |
| 2026-10-22 | 5 | `robots.txt`: юридические страницы не закрыты `Disallow` — работают `noindex` + исключение из sitemap | `npm run build` |
| 2026-10-22 | 6 | Убраны ненормативная лексика и шутки из `meta-w`, `meta-ob`, `meta-wb`; гарантия — 24 месяца, бейджи заменены | `npm run check` |
| 2026-10-22 | 6 | Уникальные SEO-заголовки и описания для товаров и линеек; исправлены неверные названия «Макс»/«Про» | `npm run build` |
| 2026-10-22 | 6 | `authorizedBodyPhone` помечен как плейсхолдер в `settings.yaml` и `complaints.md` | — |
| 2026-10-22 | 6 | Проверены обязательные юр. поля, alt, изображения, `ctaText` и полнота `settings.yaml` | `npm run check` |
| 2026-10-22 | 7 | `architecture.md`: `settings.yaml`, `src/assets/uploads`, маршруты Keystatic без page-файла, отсутствие `faq`, `discriminant`, отсутствие `brandColors`, оплата/доставка в `sections`, эталон главной | — |
| 2026-10-22 | 7 | `kiberstol-tz.md`: обновлены `site`-схема, relationship `line`, медиа-путь, SEO `Product`, оплата/доставка | — |
| 2026-10-22 | 7 | `refactoring.md` помечен как superseded со ссылкой на `refactoring-v2.md` | — |
| 2026-10-22 | 7 | Добавлены `docs/deployment.md` и `docs/cms.md` | — |

## Примечания

- `site.labels` используются в каталоге, линейке и карточке товара (фаза 3).
- Cookie-баннер не удаляется из DOM, а скрывается атрибутом `hidden`; ссылка «Настройки cookie» в футере открывает его повторно.
- `submit.php` отклоняет заявку без `consent-pd` (422), проверяет телефон `+375 XX XXX-XX-XX` и ограничивает 5 заявок за 10 минут с одного IP.
- Keystatic routes проверены: в `dist/server/chunks` присутствуют `keystatic-api` и `keystatic-astro-page`.
- Для production CMS нужно задать `PUBLIC_KEYSTATIC_STORAGE=github`, `PUBLIC_KEYSTATIC_GITHUB_REPO_OWNER`, `PUBLIC_KEYSTATIC_GITHUB_REPO_NAME` и OAuth-переменные.
- Утвержденный эталон главной: hero, advantages, catalog (только линейки), delivery, faq, contact. Секции `order`/`banners` и модели на главной — вне рефакторинга v2.
- OG-изображение по умолчанию: `public/assets/og-default.png` (1200×630), пересоздаётся командой `node scripts/generate-og-default.mjs`. Приоритет: `og:image` страницы → `site.seo.image` → дефолтный баннер.
- `og:site_name` берётся из `site.brand`; `Organization.logo` — `/favicon.svg`, `sameAs` — `viber`/`instagram` из `settings.yaml`.
- `Product` JSON-LD: `availability` всегда `InStock`, признак б/у вынесен в `itemCondition` (`UsedCondition`/`NewCondition`).
- Медиа: актуальные загрузки — `src/assets/uploads/**`; `public/assets/uploads` — legacy-заглушка (см. README внутри).
- Юридические страницы: `noindex,nofollow` + исключение из sitemap; в `robots.txt` не закрываются, чтобы поисковики видели `noindex`.
- Контент товаров: гарантийный срок указан как «24 месяца» — требует подтверждения у заказчика.
- `authorizedBodyPhone` — плейсхолдер `+375 212 XX-XX-XX`, помечен TODO в `settings.yaml` и `complaints.md`; заменить перед публикацией.
- SEO товаров и линеек уникальны; изображения присутствуют в `src/assets/uploads/**`, alt формируется из названия товара/линейки.
- Документация фазы 7: [`architecture.md`](architecture.md), [`kiberstol-tz.md`](../requirements/kiberstol-tz.md), [`docs/deployment.md`](../docs/deployment.md), [`docs/cms.md`](../docs/cms.md). Старый [`refactoring.md`](refactoring.md) — superseded.
