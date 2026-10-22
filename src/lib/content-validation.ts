import type { ZodType } from 'zod';
import {
  legalSchema,
  linesSchema,
  productsSchema,
  sectionsSchema,
  siteSchema,
} from './content-schemas';

/**
 * Чистые функции валидации контента.
 *
 * Используются скриптом `scripts/validate-content.ts` и unit-тестами.
 * Не зависят от файловой системы и `astro:content`, поэтому легко тестируются.
 */

export interface ContentEntry {
  /** Путь к файлу относительно корня проекта (для сообщений). */
  file: string;
  /** Разобранный frontmatter (или весь YAML для `settings.yaml`). */
  data: Record<string, unknown>;
}

export interface ValidationIssue {
  file: string;
  field?: string;
  message: string;
}

export interface ContentBundle {
  products: ContentEntry[];
  lines: ContentEntry[];
  legal: ContentEntry[];
  sections: ContentEntry[];
  site?: ContentEntry;
}

/** Проверяет данные одной записи по Zod-схеме. */
export function validateSchema(
  schema: ZodType,
  data: unknown,
  file: string,
): ValidationIssue[] {
  const result = schema.safeParse(data);
  if (result.success) return [];

  return result.error.issues.map((issue) => ({
    file,
    field: issue.path.length > 0 ? issue.path.join('.') : undefined,
    message: issue.message,
  }));
}

/** Проверяет, что `product.line` ссылается на существующую линейку. */
export function validateLineReferences(
  products: ContentEntry[],
  lineIds: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const product of products) {
    const line = product.data.line;
    if (typeof line === 'string' && !lineIds.has(line)) {
      issues.push({
        file: product.file,
        field: 'line',
        message: `Линейка "${line}" не найдена среди lines/*.md`,
      });
    }
  }

  return issues;
}

/**
 * Проверяет уникальность SEO-заголовков и описаний.
 * Дубликаты недопустимы: поисковики считают их копиями.
 */
export function validateUniqueSeo(entries: ContentEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, string>();

  for (const entry of entries) {
    const seo = entry.data.seo as { title?: unknown; description?: unknown } | undefined;
    if (!seo) continue;

    for (const field of ['title', 'description'] as const) {
      const raw = seo[field];
      if (typeof raw !== 'string') continue;
      const value = raw.trim();
      if (!value) continue;

      const key = `${field}:${value.toLowerCase()}`;
      const existing = seen.get(key);
      if (existing) {
        issues.push({
          file: entry.file,
          field: `seo.${field}`,
          message: `Дублируется с ${existing}: "${value}"`,
        });
      } else {
        seen.set(key, entry.file);
      }
    }
  }

  return issues;
}

/**
 * Проверяет существование изображений, на которые ссылается контент.
 * `exists` принимает контентный путь (`/assets/uploads/...`) и возвращает
 * `true`, если файл найден в `src/assets` или `public`.
 */
export function validateImages(
  entries: ContentEntry[],
  exists: (contentPath: string) => boolean,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const check = (file: string, field: string, value: unknown): void => {
    if (typeof value !== 'string' || value.length === 0) return;
    // Внешние URL и data-URI не проверяем.
    if (!value.startsWith('/assets/')) return;
    if (!exists(value)) {
      issues.push({ file, field, message: `Изображение не найдено: ${value}` });
    }
  };

  for (const entry of entries) {
    check(entry.file, 'image', entry.data.image);

    const gallery = entry.data.gallery;
    if (Array.isArray(gallery)) {
      gallery.forEach((image, index) => check(entry.file, `gallery.${index}`, image));
    }

    const seo = entry.data.seo as { image?: unknown } | undefined;
    check(entry.file, 'seo.image', seo?.image);

    const content = entry.data.content;
    if (Array.isArray(content)) {
      content.forEach((block, index) => {
        const value = (block as { value?: Record<string, unknown> }).value;
        if (!value) return;

        check(entry.file, `content.${index}.image`, value.image);
        check(entry.file, `content.${index}.poster`, value.poster);

        const images = value.images;
        if (Array.isArray(images)) {
          images.forEach((image, imageIndex) => {
            const src =
              typeof image === 'string'
                ? image
                : (image as { image?: unknown } | undefined)?.image;
            check(entry.file, `content.${index}.images.${imageIndex}`, src);
          });
        }
      });
    }
  }

  return issues;
}

/** Полная проверка контента: схемы, связи, SEO, изображения. */
export function validateContent(
  bundle: ContentBundle,
  imageExists: (contentPath: string) => boolean,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const product of bundle.products) {
    issues.push(...validateSchema(productsSchema, product.data, product.file));
  }
  for (const line of bundle.lines) {
    issues.push(...validateSchema(linesSchema, line.data, line.file));
  }
  for (const document of bundle.legal) {
    issues.push(...validateSchema(legalSchema, document.data, document.file));
  }
  for (const section of bundle.sections) {
    issues.push(...validateSchema(sectionsSchema, section.data, section.file));
  }
  if (bundle.site) {
    issues.push(...validateSchema(siteSchema, bundle.site.data, bundle.site.file));
  }

  const lineIds = new Set(bundle.lines.map((line) => line.file.replace(/^.*\//, '').replace(/\.md$/, '')));
  issues.push(...validateLineReferences(bundle.products, lineIds));

  const seoEntries = [...bundle.products, ...bundle.lines];
  issues.push(...validateUniqueSeo(seoEntries));

  const imageEntries = [...bundle.products, ...bundle.lines, ...bundle.sections];
  issues.push(...validateImages(imageEntries, imageExists));

  return issues;
}
