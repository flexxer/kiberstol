# ADR-001 — Формат сериализации контент-блоков

- **Статус:** принято
- **Дата:** 2026-10-22
- **Контекст:** расхождение между Keystatic, Zod-схемой, Astro-компонентами и документацией.

## Решение

Канонический формат блоков — **`{ discriminant, value }`**.

- `discriminant` — ключ блока в `fields.blocks` (например, `richText`, `image`, `cta`).
- `value` — объект с полями конкретного блока.

Этот же формат используется для `fields.conditional` (поле `variant` секций).

## Обоснование

В установленном `@keystatic/core` `fields.blocks()` возвращает:

```ts
ArrayField<ConditionalField<BasicFormField<keyof Schemas & string>, Schemas>>
```

То есть блок — это `ConditionalField`, который сериализуется как `{ discriminant, value }`.
Формат `{ type, ...fields }` в этой версии **не используется**.

## Последствия

- Zod-схема остаётся на `z.discriminatedUnion('discriminant', ...)`.
- `ContentBlocks.astro` продолжает читать `block.discriminant` и `block.value`.
- Поле `type` внутри `value` — **legacy**: оно осталось от ранней конфигурации и не участвует в рендере. Zod отбрасывает его как неизвестное поле. Новые блоки могут создаваться без `type`.
- [`plans/content-blocks-unification.md`](content-blocks-unification.md) **не выполняется**: его предпосылка о `{ type, ...fields }` неверна.
- Документация (`architecture.md`, ТЗ) должна описывать `{ discriminant, value }`, а не `type`.

## Пример

```yaml
content:
  - discriminant: richText
    value:
      content: |
        **KiberStol** — игровые столы.
  - discriminant: cta
    value:
      text: Смотреть линейки
      href: '#catalog'
      style: secondary
```

## Ссылки

- [`src/content.config.ts`](../src/content.config.ts:36)
- [`src/components/blocks/ContentBlocks.astro`](../src/components/blocks/ContentBlocks.astro:27)
- [`keystatic.config.ts`](../keystatic.config.ts:287)
