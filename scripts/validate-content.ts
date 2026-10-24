/**
 * validate-content.ts — проверка контента перед сборкой/деплоем.
 *
 * Проверяет:
 *  - обязательные поля по Zod-схемам (`src/lib/content-schemas.ts`);
 *  - ссылки `product.line` на существующие линейки;
 *  - уникальность SEO-заголовков и описаний;
 *  - существование изображений в `src/assets` или `public`.
 *
 * Запуск: `npm run validate:content`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import {
  validateContent,
  type ContentBundle,
  type ContentEntry,
  type ValidationIssue,
} from '../src/lib/content-validation';

const root = process.cwd();
const contentDir = join(root, 'src', 'content');

/** Читает все `*.md` из каталога и разбирает YAML-frontmatter. */
function readMarkdownEntries(directory: string): ContentEntry[] {
  const absolute = join(contentDir, directory);

  return readdirSync(absolute)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => {
      const file = join(absolute, name);
      const raw = readFileSync(file, 'utf8');
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);

      if (!match) {
        throw new Error(`Не найден YAML-frontmatter: ${relative(root, file)}`);
      }

      return {
        file: relative(root, file).replace(/\\/g, '/'),
        data: parse(match[1]) as Record<string, unknown>,
      };
    });
}

/** Проверяет, что контентный путь изображения существует на диске. */
function imageExists(contentPath: string): boolean {
  const clean = contentPath.replace(/^\/+/, '');
  const candidates = [
    join(root, 'src', clean),
    join(root, 'public', clean),
    join(root, 'src', 'assets', clean.replace(/^assets\//, '')),
  ];

  return candidates.some((candidate) => existsSync(candidate));
}

const siteFile = join(contentDir, 'site', 'settings.yaml');
const bundle: ContentBundle = {
  products: readMarkdownEntries('products'),
  lines: readMarkdownEntries('lines'),
  legal: readMarkdownEntries('legal'),
  sections: readMarkdownEntries('sections'),
  site: {
    file: relative(root, siteFile).replace(/\\/g, '/'),
    data: parse(readFileSync(siteFile, 'utf8')) as Record<string, unknown>,
  },
};

const issues = validateContent(bundle, imageExists);

/**
 * Ожидаемые идентификаторы записей. Идентификатор = имя файла и поле `slug`
 * во frontmatter; переименование заголовка в CMS не должно менять ссылки
 * `getEntry('legal', 'privacy')` и `getEntry('sections', 'delivery')`.
 */
const expectedSlugs: Record<'legal' | 'sections', string[]> = {
  legal: ['privacy', 'cookie-policy', 'terms', 'returns', 'complaints', 'care'],
  sections: ['hero', 'advantages', 'catalog', 'delivery', 'faq', 'contacts'],
};

/** Проверяет наличие и уникальность ожидаемых slug в коллекции. */
function validateExpectedSlugs(
  entries: ContentEntry[],
  expected: string[],
  collection: 'legal' | 'sections',
): ValidationIssue[] {
  const found: ValidationIssue[] = [];
  const seen = new Map<string, string>();

  for (const entry of entries) {
    const raw = entry.data.slug;
    if (typeof raw !== 'string' || raw.trim() === '') {
      found.push({
        file: entry.file,
        field: 'slug',
        message: `Не задан slug для коллекции "${collection}"`,
      });
      continue;
    }

    const value = raw.trim();
    const existing = seen.get(value);
    if (existing) {
      found.push({
        file: entry.file,
        field: 'slug',
        message: `Дублируется с ${existing}: "${value}"`,
      });
    } else {
      seen.set(value, entry.file);
    }
  }

  for (const slug of expected) {
    if (!seen.has(slug)) {
      found.push({
        file: `src/content/${collection}`,
        field: 'slug',
        message: `Отсутствует ожидаемый slug "${slug}"`,
      });
    }
  }

  return found;
}

issues.push(...validateExpectedSlugs(bundle.legal, expectedSlugs.legal, 'legal'));
issues.push(...validateExpectedSlugs(bundle.sections, expectedSlugs.sections, 'sections'));

/**
 * Проверяет уникальность slug и совпадение с именем файла.
 * Для products/lines имя файла = публичный URL, поэтому расхождение
 * означало бы смену адреса страницы.
 */
function validateSlugMatchesFile(
  entries: ContentEntry[],
  collection: 'products' | 'lines',
): ValidationIssue[] {
  const found: ValidationIssue[] = [];
  const seen = new Map<string, string>();

  for (const entry of entries) {
    const raw = entry.data.slug;
    const fileSlug = entry.file.replace(/^.*\//, '').replace(/\.md$/, '');

    if (typeof raw !== 'string' || raw.trim() === '') {
      found.push({
        file: entry.file,
        field: 'slug',
        message: `Не задан slug для коллекции "${collection}"`,
      });
      continue;
    }

    const value = raw.trim();
    if (value !== fileSlug) {
      found.push({
        file: entry.file,
        field: 'slug',
        message: `Slug "${value}" не совпадает с именем файла "${fileSlug}"`,
      });
    }

    const existing = seen.get(value);
    if (existing) {
      found.push({
        file: entry.file,
        field: 'slug',
        message: `Дублируется с ${existing}: "${value}"`,
      });
    } else {
      seen.set(value, entry.file);
    }
  }

  return found;
}

issues.push(...validateSlugMatchesFile(bundle.products, 'products'));
issues.push(...validateSlugMatchesFile(bundle.lines, 'lines'));

if (issues.length === 0) {
  console.log(
    `✅ Контент валиден: ${bundle.products.length} товаров, ${bundle.lines.length} линеек, ` +
      `${bundle.sections.length} секций, ${bundle.legal.length} документов.`,
  );
  process.exit(0);
}

console.error(`❌ Найдено проблем: ${issues.length}`);
for (const issue of issues) {
  const field = issue.field ? ` [${issue.field}]` : '';
  console.error(`  - ${issue.file}${field}: ${issue.message}`);
}
process.exit(1);
