# Качество, тесты и аудит

Документ описывает проверки, которые выполняются локально и в CI.

## Команды

| Команда | Что делает |
|---|---|
| `npm run check` | `astro check`: типы Astro/TS, диагностика `.astro`-файлов |
| `npm run validate:content` | проверка контента: Zod-схемы, связи `product.line`, уникальность SEO, наличие изображений |
| `npm run build` | production-сборка (`output: static` + node adapter для Keystatic) |
| `php -l public/api/submit.php` / `npm run lint:php` | синтаксис PHP-обработчика формы |
| `npm run check:secrets` | скан `dist/client` и `src` на `TG_*`, литералы токена и `PUBLIC_TG_*` |
| `npm run test:unit` | unit-тесты Vitest (схемы, телефон, тайминг, ошибки, согласие) |
| `npm run test:e2e` | e2e-тесты Playwright на реальном PHP (`php -S`, `TG_DRY_RUN=1`) |
| `npm run test:api` | API-контракт `/api/submit.php` (Playwright request + фейковый Telegram) |
| `npm run serve:php -- --dry-run` | локальный PHP-сервер над `dist/client` без creds |
| `npm run audit:a11y` | axe-core аудит доступности через Playwright |
| `npm run audit:lighthouse` | Lighthouse-аудит производительности/SEO/доступности |

## Unit-тесты (Vitest)

Файлы: `tests/unit/*.test.ts`.

Проверяется:

- `productsSchema`, `linesSchema`, `siteSchema`, `legalSchema`, `sectionsSchema`;
- обязательные юридические поля товара;
- формат контент-блоков `{ discriminant, value }`, включая вложенные `columns`;
- значения по умолчанию (`used`, `order`, подписи интерфейса);
- уникальность SEO-заголовков и описаний;
- ссылки `product.line` на существующие линейки;
- существование изображений (главное, галерея, SEO, контент-блоки);
- [`phone.ts`](../src/lib/phone.ts:1): нормализация `375XXXXXXXXX`, маска, `29…`/`80…`/`+375…`;
- [`form-timing.ts`](../src/lib/form-timing.ts:1): `MIN_FILL_MS`, `MAX_FILL_MS`, `computeElapsed`;
- [`form-errors.ts`](../src/lib/form-errors.ts:1): коды, RU-сообщения, поля;
- [`consent.ts`](../src/scripts/consent.ts:1): default-deny, отзыв, синхронизация вкладок.

Схемы вынесены в [`src/lib/content-schemas.ts`](../src/lib/content-schemas.ts), проверки — в [`src/lib/content-validation.ts`](../src/lib/content-validation.ts), чтобы их можно было использовать и в тестах, и в скрипте валидации.

## E2E-тесты (Playwright)

Файлы: `tests/e2e/*.spec.ts`.

Покрытые сценарии:

- загрузка главной, шапка/подвал, якоря `#catalog` и `#contacts`;
- переход из меню в каталог и к форме заявки;
- каталог: линейки, карточки товаров, переход в карточку;
- карточка товара: юридические сведения, цена;
- форма (реальный PHP в dry-run): happy path, маски `29…` и `80…`, обязательное
  согласие, `marketing-consent`/`page`/`elapsed`, honeypot, быстрая отправка,
  повторная отправка, 429/500/502, XSS, `aria-invalid`/фокус/a11y ошибок;
- конверсии `generate_lead` и рекламная цель только при согласии;
- no-JS: HTML с `<noscript>` и телефоном, форма без JS;
- cookie-баннер: показ, «Принять всё», «Отказаться», повторное открытие из футера.

Перед запуском нужен `npm run build`: Playwright поднимает
`node scripts/serve-php.mjs --dry-run` (`php -S` над `dist/client`) на порту `4322`.
Creds не нужны; каждому тесту выдаётся уникальный `X-Forwarded-For` и телефон,
а `RATE_LIMIT_DIR` создаётся свежим на прогон. Браузер устанавливается командой
`npx playwright install chromium`.

## API-тесты (Playwright request)

Файлы: `tests/api/*.spec.ts`. Конфигурация: [`playwright.api.config.ts`](../playwright.api.config.ts:1).

Поднимаются отдельные PHP-серверы: dry-run, без creds, реальная отправка в фейковый
Telegram и сервер с ошибкой Telegram. Проверяются:

- health (`configured`, `dryRun`);
- 405 + `Allow`, 403 (нет/чужой Origin, разрешённый Referer);
- 422 (согласие, телефон, имя, сообщение);
- honeypot и тайминг (`elapsed < 3000`, отсутствие `elapsed`, legacy `ts`);
- dry-run и `503 not_configured`;
- нормализация телефона, `page`, согласия в сообщении, экранирование XSS;
- `502 telegram_failed`;
- rate limit по IP и по телефону.

`tests/api/fake-telegram.mjs` — локальный двойник Telegram Bot API.

## Доступность (axe)

`tests/e2e/accessibility.spec.ts` запускает axe-core на `/`, `/products` и `/products/meta-w`. Блокирующими считаются нарушения уровня `critical`; остальные выводятся в отчёт Playwright.

## Lighthouse

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4323
npm run audit:lighthouse -- http://127.0.0.1:4323/
```

Отчёт сохраняется в `reports/lighthouse-*.json` (каталог в `.gitignore`). Базовый прогон на главной: performance 84, accessibility 89, best-practices 100, SEO 100.

## CI

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

1. `quality`: PHP 8.3 → `npm ci` → `php -l` → `npm run check` → `npm run validate:content` → `npm run build` → `npm run check:secrets` → `npm run test:unit`.
2. `e2e`: PHP 8.3 → `npm ci` → Playwright Chromium → `npm run build` → `npm run test:e2e`; отчёт загружается артефактом.
3. `api`: PHP 8.3 → `npm ci` → `npm run build` → `npm run test:api`.

Для локального PHP нужен `php` в `PATH`; версия проверена на PHP 8.3/8.4.

## Артефакты

`playwright-report/`, `test-results/`, `reports/` исключены из git.
