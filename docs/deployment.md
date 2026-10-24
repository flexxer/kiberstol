# Деплой — Kiberstol.by

> Практическое руководство по сборке и публикации сайта.
> Архитектура — [`plans/architecture.md`](../plans/architecture.md),
> CMS — [`docs/cms.md`](cms.md).

---

## 1. Требования

| Компонент | Версия / примечание |
|---|---|
| Node.js | `>= 22.12.0` (см. `engines` в [`package.json`](../package.json:5)) |
| npm | поставляется с Node.js |
| PHP | для `public/api/submit.php` (приём заявок → Telegram) |
| Хостинг | BY-хостинг, домен `.BY` |

Установка зависимостей:

```bash
npm ci
```

---

## 2. Переменные окружения

Скопируйте [`.env.example`](../.env.example) в `.env` и заполните значения.
Секреты **не коммитятся**.

### 2.1. Telegram (сервер)

| Переменная | Назначение |
|---|---|
| `TG_BOT_TOKEN` | Токен Telegram-бота |
| `TG_CHAT_ID` | ID чата для заявок |

Используются только в [`public/api/submit.php`](../public/api/submit.php) через
`getenv()`. На клиент не попадают.

### 2.2. Keystatic CMS

| Переменная | Назначение |
|---|---|
| `PUBLIC_KEYSTATIC_STORAGE` | `local` (разработка) или `github` (production) |
| `PUBLIC_KEYSTATIC_GITHUB_REPO_OWNER` | Владелец репозитория |
| `PUBLIC_KEYSTATIC_GITHUB_REPO_NAME` | Имя репозитория |
| `KEYSTATIC_GITHUB_CLIENT_ID` | GitHub OAuth Client ID |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret |
| `KEYSTATIC_SECRET` | Секрет подписи сессии Keystatic |
| `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | Slug GitHub App (если используется) |

> В production обязательно `PUBLIC_KEYSTATIC_STORAGE=github` и заполненные
> OAuth-переменные. Иначе CMS будет работать в local-режиме и не сможет
> сохранять контент в репозиторий.

### 2.3. hoster.by: PHP и переменные окружения

Форма заявок работает на PHP-модуле [`public/api/submit.php`](../public/api/submit.php:1).
Секреты задаются **только** в окружении хостинга и не коммитятся.

| Способ | Когда использовать | Примечание |
|---|---|---|
| Панель hoster.by | основной вариант | переменные окружения для PHP-сайта |
| `SetEnv` в `.htaccess` | если панель не поддерживает env | файл не отдаётся Apache, но хранить секреты в webroot нежелательно |
| `env[...]` в PHP-FPM pool | VPS/выделенный сервер | требует доступа к конфигу |
| `auto_prepend_file` вне webroot | shared-хостинг | файл с `putenv()` вне `public_html` |

Переменные:

| Переменная | Обяз. | Назначение |
|---|---|---|
| `TG_BOT_TOKEN` | prod | токен бота |
| `TG_CHAT_ID` | prod | чат/группа для заявок |
| `TG_DRY_RUN` | нет | `1` — валидация + лог + `200`, без Telegram |
| `ALLOWED_ORIGINS` | нет | домены через запятую (production и staging) |
| `TRUSTED_PROXIES` | нет | IP/CIDR прокси для `X-Forwarded-For` |
| `FORM_CONSENT_VERSION` | нет | версия согласия в заявке |
| `RATE_LIMIT_DIR` | нет | каталог счётчиков (должен быть доступен PHP на запись) |
| `LEADS_LOG_PATH` | нет | опциональный лог заявок вне webroot |
| `TG_API_BASE` | нет | только тесты/диагностика, в production не задавать |

Правила:

- `ALLOWED_ORIGINS` должен включать все домены, с которых отправляется форма
  (например, `https://kiberstol.by,https://staging.kiberstol.by`).
- `TRUSTED_PROXIES` задавайте только при реальном прокси; иначе IP будет определяться
  по `REMOTE_ADDR`.
- `RATE_LIMIT_DIR` по умолчанию — системный temp; на shared-хостинге убедитесь,
  что PHP может писать в каталог.
- `LEADS_LOG_PATH` (если включён) — вне webroot, с ограниченными правами.
- `PUBLIC_TG_*` запрещены.
- `FORM_CONSENT_VERSION` — версия редакции согласия на обработку ПД; текущее
  значение `1`. При изменении редакции
  [`privacy.md`](../src/content/legal/privacy.md) версию нужно повысить.
- Срок хранения заявок и связанных персональных данных — **12 месяцев**
  (см. [`privacy.md`](../src/content/legal/privacy.md)), после чего данные
  удаляются или обезличиваются.

### 2.4. Хранение, согласие, заголовки, мониторинг

| Тема | Решение | Где настраивается |
|---|---|---|
| Срок хранения ПД | **12 месяцев** с момента заявки, далее удаление/обезличивание | `privacy.md`, `LEADS_LOG_PATH` |
| Версия согласия | `FORM_CONSENT_VERSION=1`; при смене редакции политики — поднять | env хостинга |
| Security headers | Настраиваются в **панели hoster.by**; `.htaccess` в репозитории не создаём | панель хостера |
| Мониторинг | **Не внедряем** (решение клиента); контроль — `error_log` и health-эндпоинт | — |
| Staging | **Отсутствует**; smoke-проверки выполняются только на production | — |

> Аналитика (GA4, Яндекс.Метрика, Ads, Директ) подключается только после
> согласия пользователя; ID задаются в `site.analytics` / `site.advertising`.

Локально переменные подхватывает `npm run serve:php` из `.env`:

```bash
npm run serve:php -- --dry-run
```

Проверка после настройки:

```http
GET https://kiberstol.by/api/submit.php?health=1
```

Ожидается `{"ok":true,"configured":true,"dryRun":false}`. Значения секретов не раскрываются.

Для staging и локальной проверки используйте `TG_DRY_RUN=1` — форма работает без
Telegram и без боевых creds.

> **Keystatic:** `/keystatic` и `/api/keystatic` требуют Node-процесс. На hoster.by
> доступность Node проверяется отдельно; это не влияет на форму. См.
> [`plans/adr-002-form-transport.md`](../plans/adr-002-form-transport.md:1).

---

## 3. Сборка

```bash
npm run check   # astro check — проверка типов
npm run build   # astro build — статическая сборка
```

Результат:

- `dist/` — статические страницы и ассеты;
- `dist/server/` — серверные чанки Keystatic (`keystatic-api`,
  `keystatic-astro-page`), обслуживаемые Node-адаптером.

`output: 'static'` + `@astrojs/node` (standalone) означают, что контентные
страницы статичны, а серверные маршруты `/keystatic` и `/api/keystatic`
обслуживаются Node-процессом.

### 3.1. Локальная проверка production-сборки

```bash
npm run build
npm run preview                     # статические страницы; PHP не исполняется
npm run serve:php -- --dry-run      # форма на реальном PHP без creds
```

`dist/client/api/submit.php` — копия обработчика; проверьте, что она есть после сборки.

---

## 4. Публикация

1. Соберите проект (`npm run build`).
2. Выгрузите содержимое `dist/` на хостинг.
3. Запустите Node-процесс для серверных маршрутов Keystatic (если CMS нужна
   на production) с переменными окружения из §2.
4. Убедитесь, что `public/api/submit.php` доступен по `/api/submit.php` и
   получает `TG_BOT_TOKEN`/`TG_CHAT_ID` из окружения PHP.
5. Проверьте:
   - `/` — главная;
   - `/products`, `/lines/[slug]`, `/products/[slug]`;
   - `/keystatic` — вход в CMS;
   - `/sitemap.xml`, `/robots.txt`;
   - `GET /api/submit.php?health=1` — `configured:true`;
   - отправку формы (заявка приходит в Telegram).

### 4.1. Проверка формы после деплоя

1. Локально/в CI: `php -l public/api/submit.php`, `npm run check:secrets`,
   `npm run test:api`.
2. Убедиться, что `dist/client/api/submit.php` есть и не содержит значений `TG_*`.
3. `TG_DRY_RUN=1` → отправить заявку → `200 {ok:true, dryRun:true}`, в Telegram пусто.
4. Задать боевые `TG_BOT_TOKEN`/`TG_CHAT_ID` → `health=1` → `configured:true`.
5. Отправить тестовую заявку в тестовый чат.
6. Переключить `TG_CHAT_ID` на боевой чат, отправить контрольную заявку.
7. Проверить `error_log` на 4xx/5xx и отсутствие токена/ПД в логах.
8. Проверить `429` (rate limit) и `403` (чужой origin) на staging.

### 4.2. Артефакты деплоя и CMS runtime

Решение по runtime CMS: **`node_on_hoster`** — на хостинге постоянно работает
Node-процесс, который обслуживает только `/keystatic` и `/api/keystatic`.
Контентные страницы остаются статическими.

| Артефакт | Куда | Что обслуживает |
|---|---|---|
| `dist/client/` | webroot (`public_html`) | статические страницы, ассеты, `api/submit.php` |
| Node-процесс (`dist/server/entry.mjs`) | отдельный порт/сервис хостинга | `/keystatic`, `/api/keystatic` |

Переменные Node-процесса (см. §2.2): `PUBLIC_KEYSTATIC_STORAGE=github`,
`PUBLIC_KEYSTATIC_GITHUB_REPO_OWNER`, `PUBLIC_KEYSTATIC_GITHUB_REPO_NAME`,
`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`,
`KEYSTATIC_SECRET`, `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`.

Переменные PHP-обработчика (см. §2.3): `TG_BOT_TOKEN`, `TG_CHAT_ID`,
`ALLOWED_ORIGINS=https://kiberstol.by`, `FORM_CONSENT_VERSION=1`,
`RATE_LIMIT_DIR` (TODO: указать каталог на хостинге), `LEADS_LOG_PATH`
(не требуется — оставить пустым).

Деплой статики — GitHub Actions, job `deploy` (только `main`), выгрузка по FTP:
`local-dir: ./dist/client/`, секреты `FTP_SERVER`, `FTP_USERNAME`,
`FTP_PASSWORD`. Пока секреты не добавлены, job пропускает выгрузку и остаётся
зелёным.

> Если CMS на production не требуется, серверные маршруты можно не поднимать:
> статическая часть продолжит работать, но `/keystatic` будет недоступен.

---

## 5. SEO и медиа после сборки

| Артефакт | Как формируется |
|---|---|
| `sitemap.xml` | `@astrojs/sitemap`; исключены `/keystatic` и юридические страницы |
| `robots.txt` | [`public/robots.txt`](../public/robots.txt); юридические страницы не закрыты `Disallow` (работает `noindex`) |
| `og-default.png` | [`public/assets/og-default.png`](../public/assets/og-default.png) — готовый ассет в репозитории |
| Логотип и favicon | `src/assets/logo.png`, `public/favicon*.png`, `public/favicon.ico`, `public/favicon.svg` — готовые ассеты в репозитории |
| Изображения | `src/assets/uploads/**` → `astro:assets` + `sharp` (WebP/AVIF, ресайз) |

Приоритет `og:image`: изображение страницы → `site.seo.image` →
`/assets/og-default.png`.

---

## 6. Чек-лист перед публикацией

- [ ] `npm run check` — без ошибок.
- [ ] `npm run build` — без ошибок.
- [ ] `php -l public/api/submit.php` — без ошибок.
- [ ] `npm run check:secrets` — секретов в `dist/client` и `src` нет.
- [ ] `npm run test:unit`, `npm run test:e2e`, `npm run test:api` — зелёные.
- [ ] Заполнены `TG_BOT_TOKEN`, `TG_CHAT_ID` только в env хостинга.
- [ ] `ALLOWED_ORIGINS` = `https://kiberstol.by` (staging отсутствует).
- [ ] `RATE_LIMIT_DIR` доступен PHP на запись; `LEADS_LOG_PATH` — вне webroot.
- [ ] `GET /api/submit.php?health=1` → `configured:true`, `dryRun:false`.
- [ ] Для production CMS задан `PUBLIC_KEYSTATIC_STORAGE=github` и OAuth-переменные.
- [x] `authorizedBodyPhone` заполнен: `+375 (212) 64-34-04`.
- [x] Гарантийный срок в контенте товаров — «12 месяцев».
- [ ] Security headers включены в панели hoster.by (`.htaccess` не создаём).
- [ ] Проверены `/sitemap.xml`, `/robots.txt`, `og-default.png`.
- [ ] Отправлена тестовая заявка через форму; проверен `error_log` без токена и ПД.

### 6.1. Rollout формы

| Шаг | Среда | Действие |
|---|---|---|
| 1 | локально | `build` + `serve:php -- --dry-run` + `test:e2e` |
| 2 | CI | `php -l`, `check:secrets`, unit, e2e, API |
| 3 | production | `TG_DRY_RUN=1`, health, отправка заявки (staging отсутствует) |
| 4 | production | боевые creds → тестовый чат |
| 5 | production | боевой чат, одна контрольная заявка |
| 6 | production | `error_log`, rate limit, отсутствие секретов |
