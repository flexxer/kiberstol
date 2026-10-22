# Качество, тесты и аудит

Документ описывает проверки, которые выполняются локально и в CI.

## Команды

| Команда | Что делает |
|---|---|
| `npm run check` | `astro check`: типы Astro/TS, диагностика `.astro`-файлов |
| `npm run validate:content` | проверка контента: Zod-схемы, связи `product.line`, уникальность SEO, наличие изображений |
| `npm run build` | production-сборка (`output: static` + node adapter для Keystatic) |
| `npm run test:unit` | unit-тесты Vitest (схемы, обязательные поля, SEO, изображения) |
| `npm run test:e2e` | e2e-тесты Playwright (навигация, каталог, форма, cookie-согласие) |
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
- существование изображений (главное, галерея, SEO, контент-блоки).

Схемы вынесены в [`src/lib/content-schemas.ts`](../src/lib/content-schemas.ts), проверки — в [`src/lib/content-validation.ts`](../src/lib/content-validation.ts), чтобы их можно было использовать и в тестах, и в скрипте валидации.

## E2E-тесты (Playwright)

Файлы: `tests/e2e/*.spec.ts`.

Покрытые сценарии:

- загрузка главной, шапка/подвал, якоря `#catalog` и `#contacts`;
- переход из меню в каталог и к форме заявки;
- каталог: линейки, карточки товаров, переход в карточку;
- карточка товара: юридические сведения, цена;
- форма: маска телефона, обязательное согласие на ПД, успешная отправка (запрос к `/api/submit.php` перехватывается);
- cookie-баннер: показ, «Принять всё», «Отказаться», повторное открытие из футера.

Перед запуском нужен `npm run build`: Playwright поднимает `astro preview` на порту `4322`. Браузер устанавливается командой `npx playwright install chromium`.

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

1. `quality`: `npm ci` → `npm run check` → `npm run validate:content` → `npm run build` → `npm run test:unit`.
2. `e2e`: `npm ci` → `npx playwright install --with-deps chromium` → `npm run build` → `npm run test:e2e`; отчёт Playwright загружается артефактом.

## Артефакты

`playwright-report/`, `test-results/`, `reports/` исключены из git.
