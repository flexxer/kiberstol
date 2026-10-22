# Прогресс рефакторинга — Kiberstol.by

> План: [`plans/refactoring-v2.md`](refactoring-v2.md).
> Обновляется после завершения каждой фазы.

## Статус фаз

- [x] Фаза 0 — базовая линия, проверки, ADR формата блоков
- [x] Фаза 1 — контракты, Keystatic production storage, схемы
- [ ] Фаза 2 — фиксация утвержденного контента главной (только документация)
- [ ] Фаза 3 — карточка товара и страница линейки
- [ ] Фаза 4 — формы, согласие, аналитика
- [ ] Фаза 5 — SEO и медиа
- [ ] Фаза 6 — очистка контента товаров и линеек
- [ ] Фаза 7 — актуализация документации и ТЗ
- [ ] Фаза 8 — тесты, CI, аудит качества

## Базовая линия

| Проверка | Команда | Статус | Примечание |
|---|---|---|---|
| Сборка | `npm run build` | ✅ | `output: static`, node adapter, Keystatic server chunks в `dist/server` |
| Типы | `npm run check` | ✅ | 0 ошибок, 4 hints (неиспользуемые переменные/импорт) |
| Контент | ручная проверка | ⏳ | выполняется в фазе 6 |

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

## Примечания

- `site.labels` добавлены в схему и CMS; использование в компонентах — фаза 3.
- Keystatic routes проверены: в `dist/server/chunks` присутствуют `keystatic-api` и `keystatic-astro-page`.
- Для production CMS нужно задать `PUBLIC_KEYSTATIC_STORAGE=github`, `PUBLIC_KEYSTATIC_GITHUB_REPO_OWNER`, `PUBLIC_KEYSTATIC_GITHUB_REPO_NAME` и OAuth-переменные.
