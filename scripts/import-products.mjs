#!/usr/bin/env node
/**
 * import-products.mjs — импорт карточек товаров из клиентских xlsx в CMS.
 *
 * Источник: `downloads/client-files/Наполнение сайта/Карточки товаров/**` (локально,
 * вне репозитория). Назначение: `src/content/products/<slug>.md` в формате,
 * который читает Keystatic (`format: { data: 'yaml', contentField: 'description' }`).
 *
 * Использование:
 *   npm run import:products -- --dry-run           # только показать план
 *   npm run import:products                        # создать отсутствующие карточки
 *   npm run import:products -- --update            # + обновить юр. поля существующих
 *   npm run import:products -- --force             # перезаписать всё
 *   npm run import:products -- --source="path/to/xlsx-folder"
 *
 * Ручные правки (цены, бейджи, исключения) — `scripts/data/product-overrides.json`.
 * В режиме `--update` сохраняются ручные поля: цена, бейдж, фото, галерея,
 * порядок, SEO, краткое и полное описание.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { readClientProducts } from './lib/xlsx-products.mjs';

const root = process.cwd();
const args = process.argv.slice(2);

const flags = new Set(args.filter((arg) => arg.startsWith('--') && !arg.includes('=')));
const options = Object.fromEntries(
  args
    .filter((arg) => arg.startsWith('--') && arg.includes('='))
    .map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, '').split('=');
      return [key, rest.join('=')];
    }),
);

const isDryRun = flags.has('--dry-run');
const isUpdate = flags.has('--update');
const isForce = flags.has('--force');

const sourceDir =
  options.source ?? join(root, 'downloads', 'client-files', 'Наполнение сайта', 'Карточки товаров');
const productsDir = join(root, 'src', 'content', 'products');
const overridesFile = join(root, 'scripts', 'data', 'product-overrides.json');

/** Поля, которые импорт обновляет в существующих карточках. */
const LEGAL_FIELDS = [
  'manufacturer',
  'manufacturerLocation',
  'importer',
  'supplier',
  'countryOfOrigin',
  'warranty',
  'used',
  'specs',
];

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

if (!existsSync(sourceDir)) {
  fail(
    `Не найдена папка с xlsx: ${relative(root, sourceDir)}\n` +
      '   Скачайте материалы клиента (см. requirements/client-materials-analysis.md) ' +
      'или укажите путь через --source=...',
  );
}

if (!existsSync(overridesFile)) {
  fail(`Не найден файл правок: ${relative(root, overridesFile)}`);
}

const rawOverrides = JSON.parse(readFileSync(overridesFile, 'utf8'));
const defaults = rawOverrides.defaults ?? {};
const overrides = Object.fromEntries(
  Object.entries(rawOverrides.products ?? {}).map(([slug, value]) => [slug, { ...defaults, ...value }]),
);

const { items, warnings, files } = readClientProducts({ root, sourceDir, overrides });

if (!items.length) {
  fail('В xlsx не найдено ни одной карточки (нет листов с «Наименование»).');
}

const seenSlugs = new Map();
for (const item of items) {
  if (seenSlugs.has(item.slug)) {
    fail(
      `Дубликат slug «${item.slug}»: ${seenSlugs.get(item.slug)} и ${item.source}. ` +
        'Переименуйте лист в xlsx или задайте slug в overrides.',
    );
  }
  seenSlugs.set(item.slug, item.source);
}

/** Одинаковые предупреждения схлопываем с количеством (без привязки к листу). */
function groupWarnings(list) {
  const counts = new Map();
  for (const warning of list) {
    const [, ...rest] = warning.split(': ');
    const key = rest.length ? rest.join(': ') : warning;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** Разбирает существующий md на frontmatter и тело. */
function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  return { data: parseYaml(match[1]) ?? {}, body: match[2] ?? '' };
}

/** Рендерит md в формате проекта. */
function renderFile(data, body) {
  const frontmatter = stringifyYaml(data, { lineWidth: 0 }).trimEnd();
  const content = body.trim();
  return `---\n${frontmatter}\n---\n${content ? `\n${content}\n` : ''}`;
}

/** Изменившиеся ключи между старым и новым frontmatter. */
function changedKeys(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
}

function applyUpdate(existing, imported) {
  const data = { ...existing.data };

  for (const field of LEGAL_FIELDS) {
    if (imported[field] !== undefined) data[field] = imported[field];
  }

  // Пустое фото/галерея из импорта не должны затирать ручные значения.
  if (!data.image && imported.image) data.image = imported.image;

  return {
    data,
    body: existing.body,
    changed: changedKeys(existing.data, data),
  };
}

const plan = [];
const unchanged = [];

for (const item of items) {
  const target = join(productsDir, `${item.slug}.md`);
  const exists = existsSync(target);
  const rendered = renderFile(item.product, item.body);

  if (!exists) {
    plan.push({ action: 'create', slug: item.slug, target, rendered, item });
    continue;
  }

  if (isForce) {
    const previous = splitFrontmatter(readFileSync(target, 'utf8'));
    const changed = previous ? changedKeys(previous.data, item.product) : ['все поля'];
    plan.push({ action: 'overwrite', slug: item.slug, target, rendered, item, changed });
    continue;
  }

  if (!isUpdate) {
    unchanged.push({ slug: item.slug, reason: 'уже существует (--update для обновления)' });
    continue;
  }

  const existing = splitFrontmatter(readFileSync(target, 'utf8'));
  if (!existing) {
    unchanged.push({ slug: item.slug, reason: 'нет frontmatter — пропущен' });
    continue;
  }

  const merged = applyUpdate(existing, item.product);
  if (!merged.changed.length) {
    unchanged.push({ slug: item.slug, reason: 'без изменений' });
    continue;
  }

  plan.push({
    action: 'update',
    slug: item.slug,
    target,
    rendered: renderFile(merged.data, merged.body),
    item,
    changed: merged.changed,
  });
}

const created = plan.filter((entry) => entry.action === 'create');
const overwritten = plan.filter((entry) => entry.action === 'overwrite');
const updated = plan.filter((entry) => entry.action === 'update');

console.log(`\nИсточник: ${relative(root, sourceDir)}  (файлов: ${files.length})`);
console.log(`Карточек в xlsx: ${items.length}\n`);

console.log('Разобранные модели:');
for (const item of items) {
  const { product, meta } = item;
  const size = meta.dimensions.width && meta.dimensions.depth ? `${meta.dimensions.width}×${meta.dimensions.depth}` : '—';
  console.log(
    `  ${item.slug.padEnd(12)} ${String(product.line).padEnd(7)} ${size.padEnd(9)} ` +
      `${String(product.price).padStart(4)} BYN  ${meta.decor}`,
  );
}

console.log('\nИзменения:');
for (const entry of plan) {
  const details = entry.changed?.length ? `  [${entry.changed.join(', ')}]` : '';
  console.log(`  ${entry.action.padEnd(10)} ${entry.slug}.md${details}`);
}
if (!plan.length) console.log('  (нет — все карточки уже на месте)');

if (unchanged.length) {
  console.log('\nПропущено:');
  for (const entry of unchanged) console.log(`  ${entry.slug.padEnd(12)} ${entry.reason}`);
}

if (warnings.length) {
  console.log('\nПредупреждения:');
  for (const [warning, count] of groupWarnings(warnings)) {
    console.log(`  • ${warning}${count > 1 ? ` (×${count})` : ''}`);
  }
}

if (isDryRun) {
  console.log('\nℹ️  Режим --dry-run: файлы не записаны.');
  process.exit(0);
}

mkdirSync(productsDir, { recursive: true });
for (const entry of plan) {
  writeFileSync(entry.target, entry.rendered, 'utf8');
}

console.log(
  `\n✅ Готово: создано ${created.length}, обновлено ${updated.length}, ` +
    `перезаписано ${overwritten.length}, без изменений ${unchanged.length}.`,
);
console.log('   Дальше: npm run validate:content && npm run test:unit');
