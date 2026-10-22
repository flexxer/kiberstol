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
npm run preview
```

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
   - отправку формы (заявка приходит в Telegram).

> Если CMS на production не требуется, серверные маршруты можно не поднимать:
> статическая часть продолжит работать, но `/keystatic` будет недоступен.

---

## 5. SEO и медиа после сборки

| Артефакт | Как формируется |
|---|---|
| `sitemap.xml` | `@astrojs/sitemap`; исключены `/keystatic` и юридические страницы |
| `robots.txt` | [`public/robots.txt`](../public/robots.txt); юридические страницы не закрыты `Disallow` (работает `noindex`) |
| `og-default.png` | [`public/assets/og-default.png`](../public/assets/og-default.png), пересоздаётся `node scripts/generate-og-default.mjs` |
| Изображения | `src/assets/uploads/**` → `astro:assets` + `sharp` (WebP/AVIF, ресайз) |

Приоритет `og:image`: изображение страницы → `site.seo.image` →
`/assets/og-default.png`.

---

## 6. Чек-лист перед публикацией

- [ ] `npm run check` — без ошибок.
- [ ] `npm run build` — без ошибок.
- [ ] Заполнены `TG_BOT_TOKEN`, `TG_CHAT_ID`.
- [ ] Для production CMS задан `PUBLIC_KEYSTATIC_STORAGE=github` и OAuth-переменные.
- [ ] Заменён плейсхолдер `authorizedBodyPhone` в
      [`settings.yaml`](../src/content/site/settings.yaml:16).
- [ ] Подтверждён гарантийный срок «24 месяца» в контенте товаров.
- [ ] Проверены `/sitemap.xml`, `/robots.txt`, `og-default.png`.
- [ ] Отправлена тестовая заявка через форму.
