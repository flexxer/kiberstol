# Прогресс рефакторинга — Kiberstol.by

> Основной план: [`plans/refactoring-v2.md`](refactoring-v2.md).
> Форма заявок: [`plans/refactoring-form-v3.md`](refactoring-form-v3.md) (контракт — [`docs/forms.md`](../docs/forms.md)).
> Обновляется после завершения каждой фазы.

## Аудит 2026-10-23

- [x] Проведён статический аудит проекта.
- [x] Волна 0 (SUB-01): baseline и гигиена входных данных.
- [x] Волна 1 (SUB-02…SUB-05): юр. поля в настройках, `complaints`/`returns`, `privacy`, UI футера и `sameAs`.
- [ ] Волна 2 (SUB-06…SUB-08): заблокирована — нет цен, тарифов доставки и секретов Telegram.
- [x] Волна 3 (SUB-09…SUB-15): SEO линеек, уникальные описания товаров и линеек, копирайт главной.
- [x] Волна 4 (SUB-16…SUB-19): sitemap/404, slug в CMS, runtime и deploy-job.
- [x] Волна 5 (SUB-20…SUB-23): CI a11y/lighthouse, синхронизация docs, housekeeping.
- [ ] SUB-24, SUB-25: заблокированы до данных клиента (аналитика, фото).
- Отчёт: [`audit-2026-10-23.md`](audit-2026-10-23.md).
- Входные данные: [`audit-inputs.md`](audit-inputs.md) — заполнены, запуск по карточкам [`audit-2026-10-23-subtasks.md`](audit-2026-10-23-subtasks.md).
- Журнал запусков: [`audit-2026-10-23-runs.md`](audit-2026-10-23-runs.md).

### Baseline аудита (2026-10-24, SUB-01)

| Проверка | Результат | Примечание |
|---|---|---|
| `npm run check` | ✅ 0 ошибок, 5 hints | 98 файлов; hints — неиспользуемые переменные в скриптах/компонентах |
| `npm run validate:content` | ✅ | 20 товаров, 4 линейки, 6 секций, 6 документов |
| `npm run build` | ✅ | `dist/client` + `dist/server`; предупреждение о размере чанка |
| `npm run test:unit` | ✅ 81 тест | 6 файлов, все зелёные |

### Baseline аудита — повторный прогон после волны 1 (2026-10-24, SUB-01)

| Проверка | Результат | Примечание |
|---|---|---|
| `npm run check` | ✅ 0 ошибок, 0 warnings, 5 hints | 98 файлов; hints те же (скрипты, `Gallery.astro`, `HomeSections.astro`) |
| `npm run validate:content` | ✅ | 20 товаров, 4 линейки, 6 секций, 6 документов |
| `npm run build` | ✅ | 33 статических маршрута, 180 изображений из кеша; предупреждение о размере чанка |
| `npm run test:unit` | ✅ 81 тест | 6 файлов, все зелёные |

Регрессий после волны 1 (SUB-02…SUB-05) нет. Входные данные: опечатка `penansweredding` отсутствует, `meta.updated` = `2026-10-24`. Открытые `pending`: `legal.privacy_policy`, `commercial.prices`, `commercial.delivery_tariffs`, `analytics.*` (4 ID), `ops.rate_limit_dir`, `secrets.status`.

### Итог волны 5 (2026-10-24, SUB-20…SUB-23)

| Проверка | Результат | Примечание |
|---|---|---|
| `npm run check` | ✅ 0 ошибок, 5 hints | 99 файлов |
| `npm run validate:content` | ✅ | 20 товаров, 4 линейки, 6 секций, 6 документов |
| `npm run build` | ✅ | 33 маршрута, 180 изображений |
| `npm run audit:a11y` | ✅ 3/3 | 0 critical-нарушений |
| `npm run audit:lighthouse` | ✅ | performance 84, accessibility 93, best-practices 100, SEO 100 |

- CI: добавлены job `a11y` и `lighthouse` (порог 84/89, отчёты — артефактами).
- Docs: baseline обновлён, `docs/cms.md` (гарантия 12 месяцев, `care`), `architecture.md` (4 линейки), ТЗ (`importer`), решения по объёму — [`adr-003-scope-decisions.md`](adr-003-scope-decisions.md).
- Housekeeping: скрипты фото в [`scripts/photo/`](../scripts/photo/README.md), поле `products.availability` + бейдж и JSON-LD.

## Статус фаз

- [x] Фаза 0 — базовая линия, проверки, ADR формата блоков
- [x] Фаза 1 — контракты, Keystatic production storage, схемы
- [x] Фаза 2 — фиксация утвержденного контента главной (только документация)
- [x] Фаза 3 — карточка товара и страница линейки
- [x] Фаза 4 — формы, согласие, аналитика
- [x] Фаза 5 — SEO и медиа
- [x] Фаза 6 — очистка контента товаров и линеек
- [x] Фаза 7 — актуализация документации и ТЗ
- [x] Фаза 8 — тесты, CI, аудит качества

## Форма v3 — рефакторинг заявок

> План: [`refactoring-form-v3.md`](refactoring-form-v3.md), контракт: [`docs/forms.md`](../docs/forms.md),
> транспорт: [`adr-002-form-transport.md`](adr-002-form-transport.md).

### Статус фаз

- [x] Фаза 0 — baseline и проверка `dist/client/api/submit.php`
- [x] Фаза 1 — модули `phone`, `form-timing`, `form-errors` + unit-тесты
- [x] Фаза 2 — сервер `submit.php` (заголовки, health, origin, тайминг, rate limit, Telegram, dry-run)
- [x] Фаза 3 — клиент (разметка, `form.ts`, конверсии)
- [x] Фаза 4 — e2e, API-тесты, CI (`php -l`, секрет-скан, `test:api`)
- [x] Фаза 5 — документация
- [ ] Фаза 5 — staging/production smoke (ожидает Telegram creds)

### Baseline формы v3 (2026-10-23, до изменений)

| Проверка | Результат | Примечание |
|---|---|---|
| `npm run check` | 0 ошибок, 4 hints | 84 файла |
| `npm run build` | ✅ | `dist/client/api/submit.php` присутствует (5 722 байта) |
| `npm run test:unit` | 36 тестов | схемы, контент, consent |
| `npm run test:e2e` | 14 passed / 2 failed | 2 падения `catalog.spec.ts` — контентные ожидания, не связаны с формой |

### Результат формы v3

| Проверка | Результат | Примечание |
|---|---|---|
| `npm run check` | 0 ошибок, 5 hints | hints — существующие/некритичные |
| `npm run build` | ✅ | `dist/client/api/submit.php` копируется |
| `php -l public/api/submit.php` | ✅ | PHP 8.4 локально, 8.3 в CI |
| `npm run check:secrets` | ✅ | секретов в `dist/client` и `src` нет |
| `npm run test:unit` | 81 тест | +45 к baseline |
| `npm run test:e2e` | 29 passed | реальный `php -S`, `TG_DRY_RUN=1` |
| `npm run test:api` | 22 passed | контракт API + фейковый Telegram |

### Журнал формы v3

| Дата | Фаза | Что сделано | Проверка |
|---|---|---|---|
| 2026-10-23 | 0 | Зафиксирован baseline; проверен `dist/client/api/submit.php`; выявлены 2 старых контентных падения e2e | check/build/unit/e2e |
| 2026-10-23 | 1 | Созданы `src/lib/phone.ts`, `form-timing.ts`, `form-errors.ts`; `form.ts` переведён на них | unit + check + build |
| 2026-10-23 | 1 | Unit-тесты: телефон (маски `29…`, `80…`, `+375…`), тайминг, коды ошибок | 81 unit |
| 2026-10-23 | 2 | `submit.php`: no-store/nosniff, health, method + `Allow`, Origin/Referer | API |
| 2026-10-23 | 2 | `submit.php`: `elapsed`/`ts`, согласия, `page`, валидация и нормализация | API |
| 2026-10-23 | 2 | Rate limit IP + хеш телефона, `flock`, очистка, `TRUSTED_PROXIES` | API |
| 2026-10-23 | 2 | Telegram cURL + fallback, парсинг `ok`, таймаут, dry-run, 503/502 | API |
| 2026-10-23 | 2 | Структурированные ошибки, `error_log` без ПД/токена, `LEADS_LOG_PATH` | API |
| 2026-10-23 | 2 | `scripts/serve-php.mjs` (загрузка `.env`, `--dry-run`, `--env`), `scripts/check-no-secrets.mjs` | check:secrets |
| 2026-10-23 | 2 | Обновлены `.env.example`, `.gitignore`; `php -l` и секрет-скан в CI | CI |
| 2026-10-23 | 3 | `ContactForm.astro`: статус, noscript, лимиты, off-screen honeypot, ссылка вне label, `marketing-consent`, уникальные id, hidden `page` | check |
| 2026-10-23 | 3 | `form.ts`: `elapsed` от первого ввода, сброс, AbortController 15 с, ошибки/aria/фокус, кнопка, `dataset.bound` | e2e |
| 2026-10-23 | 3 | Конверсии `generate_lead` и рекламная цель с учётом `hasConsent` | e2e |
| 2026-10-23 | 4 | Playwright переведён на `php -S` с `TG_DRY_RUN=1`; e2e-сценарии формы | 29 e2e |
| 2026-10-23 | 4 | API-тесты (health, 405/403/422/429/503/502, dry-run, honeypot, тайминг, XSS, rate limit) | 22 API |
| 2026-10-23 | 4 | CI: PHP, `php -l`, `check:secrets`, `test:api`; скрипты `test:api`, `check:secrets`, `serve:php`, `lint:php` | CI |
| 2026-10-23 | 4 | `catalog.spec.ts` приведён к фактическому контенту («Серия …», «12 месяцев») — падения baseline устранены | 29 e2e |
| 2026-10-23 | 5 | Обновлены `docs/forms.md`, `docs/deployment.md`, `docs/quality.md`, `plans/progress.md` | — |

## Базовая линия

| Проверка | Команда | Статус | Примечание |
|---|---|---|---|
| Сборка | `npm run build` | ✅ | `output: static`, node adapter, Keystatic server chunks в `dist/server`, 33 маршрута |
| Типы | `npm run check` | ✅ | 0 ошибок, 5 hints (неиспользуемые переменные/импорт) |
| Контент | `npm run validate:content` | ✅ | 20 товаров, 4 линейки, 6 секций, 6 документов |
| Unit-тесты | `npm run test:unit` | ✅ | 81 тест (Vitest) |
| E2E | `npm run test:e2e` | ✅ | 29 тестов (Playwright, Chromium) |
| API | `npm run test:api` | ✅ | 22 теста (контракт `submit.php`) |
| Доступность | `npm run audit:a11y` | ✅ | 0 critical-нарушений (axe), 3 страницы |
| Lighthouse | `npm run audit:lighthouse` | ✅ | performance 84, accessibility 93, best-practices 100, SEO 100 |

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
| 2026-10-22 | 8 | Схемы вынесены в `src/lib/content-schemas.ts`; добавлены `content-validation.ts` и `scripts/validate-content.ts` | `npm run validate:content` |
| 2026-10-22 | 8 | Vitest: 25 unit-тестов (схемы, обязательные поля, SEO, изображения) | `npm run test:unit` |
| 2026-10-22 | 8 | Playwright: 14 e2e-тестов (навигация, каталог, форма, cookie-согласие) | `npm run test:e2e` |
| 2026-10-22 | 8 | axe-core: 0 critical-нарушений на `/`, `/products`, `/products/meta-w` | `npm run audit:a11y` |
| 2026-10-22 | 8 | Lighthouse: performance 84, accessibility 89, best-practices 100, SEO 100 | `npm run audit:lighthouse` |
| 2026-10-22 | 8 | GitHub Actions: install → check → validate → build → unit → e2e | CI |
| 2026-10-22 | 8 | Добавлен `docs/quality.md` | — |

## Примечания

- `site.labels` используются в каталоге, линейке и карточке товара (фаза 3).
- Cookie-баннер не удаляется из DOM, а скрывается атрибутом `hidden`; ссылка «Настройки cookie» в футере открывает его повторно.
- `submit.php` отклоняет заявку без `consent-pd` (422), проверяет телефон `+375 XX XXX-XX-XX` и ограничивает 5 заявок за 10 минут с одного IP.
- Keystatic routes проверены: в `dist/server/chunks` присутствуют `keystatic-api` и `keystatic-astro-page`.
- Для production CMS нужно задать `PUBLIC_KEYSTATIC_STORAGE=github`, `PUBLIC_KEYSTATIC_GITHUB_REPO_OWNER`, `PUBLIC_KEYSTATIC_GITHUB_REPO_NAME` и OAuth-переменные.
- Утвержденный эталон главной: hero, advantages, catalog (только линейки), delivery, faq, contact. Секции `order`/`banners` и модели на главной — вне рефакторинга v2.
- OG-изображение по умолчанию: `public/assets/og-default.png` (1200×630) — готовый ассет в репозитории. Приоритет: `og:image` страницы → `site.seo.image` → дефолтный баннер.
- `og:site_name` берётся из `site.brand`; `Organization.logo` — `/favicon.svg`, `sameAs` — `viber`/`instagram` из `settings.yaml`.
- `Product` JSON-LD: `availability` берётся из `products.availability` (`in_stock` → `InStock`, `out_of_stock` → `OutOfStock`, `preorder` → `PreOrder`), признак б/у вынесен в `itemCondition` (`UsedCondition`/`NewCondition`).
- Медиа: актуальные загрузки — `src/assets/uploads/**`; `public/assets/uploads` — legacy-заглушка (см. README внутри).
- Юридические страницы: `noindex,nofollow` + исключение из sitemap; в `robots.txt` не закрываются, чтобы поисковики видели `noindex`.
- Контент товаров: гарантийный срок — **12 месяцев** (`commercial.warranty`), синхронизирован с `docs/cms.md`.
- `authorizedBodyPhone` заполнен: `+375 (212) 64-34-04`; TODO снят в `settings.yaml` и `complaints.md`.
- SEO товаров и линеек уникальны; изображения присутствуют в `src/assets/uploads/**`, alt формируется из названия товара/линейки.
- Документация фазы 7: [`architecture.md`](architecture.md), [`kiberstol-tz.md`](../requirements/kiberstol-tz.md), [`docs/deployment.md`](../docs/deployment.md), [`docs/cms.md`](../docs/cms.md). Старый [`refactoring.md`](refactoring.md) — superseded.
- Качество фазы 8: [`docs/quality.md`](../docs/quality.md). Unit-тесты — `npm run test:unit`, e2e — `npm run test:e2e` (нужен `npm run build`), доступность — `npm run audit:a11y`, Lighthouse — `npm run audit:lighthouse`.
- Playwright поднимает `php -S` (через `scripts/serve-php.mjs`) на порту `4322` против `dist/client`; Lighthouse-аудит — против `astro preview` на `4323`.
- CI: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — `quality` (`check` → `validate:content` → `build` → `test:unit`), затем `e2e`, `api`, `a11y`, `lighthouse` и `deploy` (только `main`, FTP).
- Отчёты Lighthouse сохраняются в `reports/` (исключён из git); Playwright — в `playwright-report/` и `test-results/`.
