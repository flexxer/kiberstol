# Промпт для запуска рефакторинга формы v3

> Скопируйте текст ниже в новую задачу в режиме Code.

---

Ты — senior full-stack разработчик. Выполни рефакторинг формы заявок Kiberstol.by по готовому плану. Работай по фазам, после каждой фазы — проверки и обновление прогресса.

## Контекст

- Проект: Astro 7 (`output: 'static'`), Tailwind CSS v4, TypeScript, Vitest, Playwright.
- Хостинг: **hoster.by**, PHP подтверждён. Статика сохраняется; приём заявок — `public/api/submit.php`.
- Telegram-реквизиты ещё не получены. Разработка и тесты — через `TG_DRY_RUN=1`. Боевые creds появятся позже.
- Секреты: только переменные окружения хостинга, только `getenv()` в PHP. Запрещено попадание в git, `dist/client`, HTML/JS, `data-*`, `PUBLIC_TG_*`.
- Keystatic и доступность Node на hoster.by — отдельный трек. Не трогай Keystatic, `astro.config.mjs` и контент.

## Источники правды

1. [`plans/refactoring-form-v3.md`](refactoring-form-v3.md) — фазы, задачи, контракт, матрица тестов, критерии приёмки.
2. [`docs/forms.md`](../docs/forms.md) — контракт API: поля, ответы, коды ошибок, env, dry-run, health.
3. [`plans/adr-002-form-transport.md`](adr-002-form-transport.md) — решение по транспорту и секретам.
4. [`plans/architecture.md`](architecture.md) §6 — архитектура формы.
5. [`docs/deployment.md`](../docs/deployment.md) §2.3, §4.1 — деплой и проверка.

## Порядок работ

### Фаза 0 — Базовая линия

- Зафиксируй baseline: `npm run check`, `npm run build`, `npm run test:unit`, `npm run test:e2e`.
- Проверь, что `dist/client/api/submit.php` существует после сборки.
- Не меняй код на этой фазе, только зафиксируй результаты.

### Фаза 1 — Контракты и общие модули

- Создай `src/lib/phone.ts`: `normalizePhone`, `formatPhone`, `isValidByPhone`.
- Создай `src/lib/form-timing.ts`: `MIN_FILL_MS`, `MAX_FILL_MS`, `computeElapsed`.
- Создай `src/lib/form-errors.ts`: коды ошибок и RU-сообщения.
- Добавь unit-тесты в `tests/unit/`.
- Переведи `src/scripts/form.ts` на новые модули без изменения поведения.

### Фаза 2 — Сервер

- Перепиши `public/api/submit.php` по контракту из `docs/forms.md`:
  - заголовки `no-store`, `nosniff`, `Content-Type: application/json`;
  - `GET ?health=1` → `{ok, configured, dryRun}`;
  - method check + `Allow: POST`;
  - проверка `Origin`/`Referer` по `ALLOWED_ORIGINS`;
  - honeypot `website`;
  - тайминг `elapsed` (3000…86400000), `ts` — legacy fallback;
  - `consent-pd` обязателен, `marketing-consent` фиксируется в заявке;
  - валидация и нормализация полей;
  - rate limit IP + хеш телефона, `flock`, очистка, `TRUSTED_PROXIES`;
  - Telegram через cURL с fallback на `file_get_contents`, парсинг `ok`, таймаут;
  - `TG_DRY_RUN=1` → лог + `200 {ok:true, dryRun:true}`;
  - `503 not_configured` без creds;
  - структурированные ошибки `{ok:false, error:{code, message, field?}}`;
  - `error_log` без ПД и токена.
- Добавь `scripts/serve-php.mjs` — загрузка `.env` и запуск `php -S -t dist/client`.
- Добавь `scripts/check-no-secrets.mjs` — скан `dist/client` и `src`.
- Обнови `.env.example` и `.gitignore`.
- Добавь `php -l public/api/submit.php` в CI.

### Фаза 3 — Клиент

- `src/components/blocks/ContactForm.astro`:
  - статус `[data-form-status]` в разметке, `role="status"`, `aria-live="polite"`;
  - `<noscript>` с телефоном;
  - `maxlength`/`pattern`/`inputmode`;
  - honeypot off-screen вместо `display:none`;
  - ссылка политики вне `<label>`;
  - `marketing-consent` вместо `consent-marketing`;
  - уникальный `id` через проп;
  - hidden `page`.
- `src/scripts/form.ts`:
  - `elapsed` от первого ввода, сброс при `resetForm`;
  - `AbortController` с таймаутом 15 с;
  - парсинг JSON-ошибок, `aria-invalid`, `aria-describedby`, фокус на первом невалидном поле;
  - состояние кнопки «Отправка…» + `aria-busy`;
  - защита от двойного связывания (`dataset.bound`).
- События конверсии после `200`: `generate_lead` в GA4 и `reachGoal` в Метрике с учётом `hasConsent('analytics')`; рекламная конверсия — с учётом `hasConsent('marketing')`.

### Фаза 4 — Тесты и CI

- Unit: телефон, тайминг, ошибки.
- Playwright `webServer` → `php -S -t dist/client` с `TG_DRY_RUN=1`.
- E2E: happy path, маска, `80...`, согласия, honeypot, быстрая отправка, повтор, 429, 500, 502, no-JS, a11y.
- API-тесты: 405/403/422/429/503/502/health/dry-run.
- CI: PHP, `php -l`, `test:api`, секрет-скан.
- Скрипты `test:api`, `check:secrets` в `package.json`.

### Фаза 5 — Документация и rollout

- Дописать `docs/forms.md` по фактической реализации.
- Обновить `docs/deployment.md`, `docs/quality.md`, `plans/progress.md`.
- Staging: `TG_DRY_RUN=1` → тестовый чат → боевой чат.
- Пройти production-чек-лист.

## Правила

- После каждой фазы: `npm run check`, `npm run build`, релевантные тесты.
- Одна фаза — один логический коммит/PR.
- Не менять `src/content/**`, `astro.config.mjs`, Keystatic и дизайн.
- Не добавлять зависимости без необходимости.
- Не давать оценок сроков.
- Если контракт неоднозначен — следовать `docs/forms.md`; если и там нет ответа — спросить.
- Секреты не логировать, не коммитить, не выводить в ответах API.

## Definition of Done

- P0/P1 из аудита закрыты.
- Форма работает end-to-end с `TG_DRY_RUN=1` без creds.
- С реальными creds заявка приходит в Telegram.
- `TG_*` отсутствуют в git, `dist/client`, HTML и JS.
- Unit, e2e и API-тесты зелёные в CI.
- `php -l` и секрет-скан в CI.
- Документация обновлена.
- Staging и production прошли smoke.

## Начальный todo list

- [ ] Зафиксировать baseline и проверить `dist/client/api/submit.php`
- [ ] Создать `src/lib/phone.ts`, `form-timing.ts`, `form-errors.ts`
- [ ] Покрыть модули unit-тестами
- [ ] Перевести `form.ts` на модули без изменения поведения
- [ ] Переписать `submit.php`: заголовки, health, method, origin
- [ ] Реализовать `elapsed`/`ts`, согласия, `page` в `submit.php`
- [ ] Реализовать rate limit IP + телефон с `flock` и proxy-aware IP
- [ ] Реализовать Telegram через cURL с fallback, парсингом и dry-run
- [ ] Добавить структурированные ошибки и логирование без ПД
- [ ] Добавить `scripts/serve-php.mjs` и `scripts/check-no-secrets.mjs`
- [ ] Обновить `.env.example` и `.gitignore`
- [ ] Обновить `ContactForm.astro`
- [ ] Обновить `form.ts`
- [ ] Добавить события конверсии
- [ ] Перевести Playwright на `php -S` с `TG_DRY_RUN=1`
- [ ] Добавить e2e-сценарии
- [ ] Добавить API-тесты
- [ ] Обновить CI
- [ ] Обновить документацию и `plans/progress.md`
- [ ] Прогнать staging dry-run и тестовый чат
- [ ] Пройти production-чек-лист
