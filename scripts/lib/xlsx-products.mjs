/**
 * xlsx-products.mjs — чтение клиентских xlsx-карточек и преобразование их
 * в данные, совместимые со схемой `productsSchema`
 * (см. `src/lib/content-schemas.ts`).
 *
 * Формат исходников: один лист = один товар. Метки — в колонке A,
 * значения — в колонках B/C. Разбор устойчив к опечаткам в метках
 * (`Страна проиcхождения`, `Ширина1200мм`, `столшницы` и т.п.).
 */
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';

// `xlsx` — CJS-пакет с ESM-обёрткой без полного набора именованных экспортов,
// поэтому грузим его через createRequire (стабильно на Node 22+).
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

/** Папка карточек → id линейки в CMS. */
const LINE_BY_GROUP = {
  meta: 'meta',
  teco: 'teco',
  tower: 'tower',
  допы: 'addons',
  addons: 'addons',
};

/** Файл-фолбэк с фото линейки (пока нет фото товара). */
const LINE_IMAGE = {
  meta: 'meta/image.jpg',
  teco: 'teco/image.jpg',
  tower: 'tower/image.jpg',
  addons: 'addons/image.png',
};

/** Метки строк: регулярка → ключ поля. */
const LABELS = [
  ['title', /^наимен/i],
  ['line', /^линейк/i],
  ['material', /^материал/i],
  ['color', /^цвет/i],
  ['size', /^размер/i],
  ['country', /^страна/i],
  ['warranty', /^гарант/i],
  ['addons', /^доп\.?\s*компл/i],
  ['skip', /^"?показать/i],
  ['manufacturer', /^изготовит/i],
  ['importer', /^импорт[её]р/i],
  ['supplier', /^поставщик/i],
  ['newItem', /^товар\s+нов/i],
  ['disclaimer', /^производител/i],
  ['description', /^описан/i],
];

/** Схлопывает пробелы/переводы строк и убирает неразрывные пробелы. */
export function normalizeSpace(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** `Tower 13WB` → `tower-13wb`, `M13wb` → `m13wb`. */
export function slugify(value) {
  return normalizeSpace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Рекурсивно собирает `.xlsx` (кроме временных `~$`). */
function findWorkbooks(directory) {
  if (!existsSync(directory)) return [];

  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...findWorkbooks(full));
    } else if (/\.xlsx$/i.test(entry.name) && !entry.name.startsWith('~$')) {
      found.push(full);
    }
  }
  return found.sort();
}

/** Линейка по папке (`.../Tower/...`) или по имени файла (`Карточки Tower.xlsx`). */
function resolveGroup(file) {
  const candidates = [basename(dirname(file)), basename(file, '.xlsx')];
  for (const candidate of candidates) {
    for (const token of candidate.toLowerCase().split(/[^a-zа-яё]+/)) {
      if (LINE_BY_GROUP[token]) return LINE_BY_GROUP[token];
    }
  }
  return null;
}

/**
 * Колонка A → метка, остальные колонки → значения.
 *
 * Реальные листы заполнены неровно:
 *  - значение иногда лежит строкой ниже метки (`Описание` → текст);
 *  - второй изготовитель идёт строкой без метки;
 *  - `Товар новый…` и дисклеймер — это сама метка без значения.
 */
function parseSheet(rows) {
  const fields = {};
  let lastKey = null;

  const isLabel = (text) => LABELS.some(([, pattern]) => pattern.test(text));

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!Array.isArray(row) || !row.length) continue;

    const label = normalizeSpace(row[0]);
    const inlineValues = row
      .slice(1)
      .map(normalizeSpace)
      .filter((value) => value.length > 0);

    // Строка без метки: либо продолжение предыдущего значения (второй
    // изготовитель), либо текст-продолжение (многострочное описание).
    if (!label) {
      if (!lastKey) continue;
      const values = inlineValues.length ? inlineValues : [];
      if (values.length) fields[lastKey] = [...(fields[lastKey] ?? []), ...values];
      continue;
    }

    const matched = LABELS.find(([, pattern]) => pattern.test(label));

    if (!matched) {
      if (lastKey && !inlineValues.length) {
        fields[lastKey] = [...(fields[lastKey] ?? []), label];
      }
      continue;
    }

    const [key] = matched;
    if (key === 'skip') {
      lastKey = null;
      continue;
    }

    let values = inlineValues;

    if (!values.length) {
      if (key === 'newItem' || key === 'disclaimer') {
        values = [label];
      } else {
        const next = rows[index + 1];
        const nextValue = Array.isArray(next) ? normalizeSpace(next[0]) : '';
        if (nextValue && !isLabel(nextValue)) {
          values = [nextValue];
          index += 1;
        }
      }
    }

    lastKey = key;
    if (!values.length) continue;
    fields[key] = [...(fields[key] ?? []), ...values];
  }

  return fields;
}

/** Достаёт размеры из свободного текста («Ширина1200мм; Глубина 830мм»). */
export function parseDimensions(text) {
  const source = normalizeSpace(text);
  const pick = (pattern) => {
    const match = source.match(pattern);
    return match ? Number(match[1]) : null;
  };

  // Часть карточек пишет размер как «1200*830мм» без слов «Ширина/Глубина».
  const pair = source.match(/(\d{2,4})\s*[*xх×]\s*(\d{2,4})/i);

  return {
    width: pick(/Ширин[а-я]*\s*:?\s*(\d+)/i) ?? (pair ? Number(pair[1]) : null),
    depth: pick(/Глубин[а-я]*\s*:?\s*(\d+)/i) ?? (pair ? Number(pair[2]) : null),
    height: pick(/Высот[а-я]*[^0-9]{0,80}?(\d{2,4})/i),
  };
}

/**
 * «столешница: wb (белый с чёрной кромкой)» → { code: 'wb', decor: '...' }.
 * Для остальных значений возвращает текст как есть.
 */
export function parseColor(value) {
  const source = normalizeSpace(value);
  const tabletop = source.match(/^столешниц[а-я]*\s*:\s*([a-z0-9]+)\s*\((.*)\)\s*$/i);

  if (tabletop) {
    return { code: tabletop[1].toLowerCase(), decor: normalizeSpace(tabletop[2]) };
  }

  return { code: null, decor: source };
}

/** «ООО МебельЛэнд М, 223021, ...» → { name, location }. */
function splitOrganization(value) {
  const source = normalizeSpace(value);
  const comma = source.indexOf(',');

  if (comma === -1) return { name: source, location: '' };
  return { name: source.slice(0, comma).trim(), location: source.slice(comma + 1).trim() };
}

/** «1 год» → «12 месяцев», «12 месяца» → «12 месяцев». */
function normalizeWarranty(value, fallback = '12 месяцев') {
  const source = normalizeSpace(value);
  if (!source) return fallback;

  const years = source.match(/(\d+)\s*год/i);
  if (years) return `${Number(years[1]) * 12} месяцев`;

  const months = source.match(/(\d+)\s*мес/i);
  if (months) return `${Number(months[1])} месяцев`;

  return source;
}

/**
 * Уникальные значения через `; `.
 * Клетка может содержать несколько стран через `;`, поэтому значение
 * разбивается перед дедупликацией («Беларусь.» + «Беларусь; Китай»).
 */
function uniqueJoin(values, separator = '; ') {
  const seen = new Set();
  for (const value of values) {
    for (const part of String(value ?? '').split(';')) {
      const clean = normalizeSpace(part).replace(/\.$/, '');
      if (clean) seen.add(clean);
    }
  }
  return [...seen].join(separator);
}

/** Текст описания из xlsx (`•`-пункты) → markdown. */
export function renderDescription(value) {
  const source = normalizeSpace(value);
  if (!source) return '';

  const [intro, ...items] = source
    .split('•')
    .map((part) => normalizeSpace(part))
    .filter(Boolean);

  const lines = [];
  if (intro) lines.push(`**${intro}**`);

  if (items.length) {
    lines.push('');
    for (const item of items) lines.push(`- ${item}`);
  }

  return lines.join('\n');
}

/**
 * Ссылка «доукомплектовать подставкой» для карточек столов.
 * Для самих подставок берём совместимость из строки «Линейка»
 * (`Доп. комплектация` там заполнена копипастом).
 */
function renderAddonBlock(addonsText, line, compatibility) {
  if (line === 'addons') {
    const source = normalizeSpace(compatibility);
    return source ? `**Совместимость:** ${source}` : null;
  }

  const source = normalizeSpace(addonsText);
  if (!source) return null;

  const model = source.match(/\bM(?:13)?(?:wb|w|ob|s)\b/i);

  if (model) {
    const slug = slugify(model[0]);
    return `**Дополнительно** может комплектоваться подставкой под монитор [${model[0]}](/products/${slug})`;
  }

  return `**Дополнение:** ${source}`;
}

/** Ищет фото товара, иначе — фото линейки. */
function resolveImage(root, slug, line) {
  const dir = join(root, 'src', 'assets', 'uploads', slug);

  if (existsSync(dir)) {
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      if (existsSync(join(dir, `image.${ext}`))) {
        return { image: `/assets/uploads/${slug}/image.${ext}`, placeholder: false };
      }
    }
  }

  const fallback = LINE_IMAGE[line];
  if (fallback && existsSync(join(root, 'src', 'assets', 'uploads', fallback))) {
    return { image: `/assets/uploads/${fallback}`, placeholder: true };
  }

  return { image: '', placeholder: true };
}

/** Файлы галереи из `src/assets/uploads/<slug>/gallery`. */
function resolveGallery(root, slug) {
  const dir = join(root, 'src', 'assets', 'uploads', slug, 'gallery');
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => `/assets/uploads/${slug}/gallery/${name}`);
}

/**
 * Превращает распарсенный лист в объект карточки.
 * `specsOverrides` — правки характеристик по названию поля.
 */
export function buildProduct({ fields, line, root, overrides = {}, sheetName = '' }) {
  const warnings = [];
  const isAddon = line === 'addons';
  const slug = slugify(overrides.slug ?? sheetName);
  const compatibility = normalizeSpace(fields.line?.[0] ?? '');

  let title = normalizeSpace(fields.title?.[0] ?? '');
  if (isAddon) {
    // В xlsx встречается копипаст названия (лист M13wb подписан как Mwb),
    // поэтому сверяем хвост названия с именем листа.
    const modelPart = title.replace(/^подставк[а-я]*\s+под\s+монитор\s*/i, '').trim();
    if (slugify(modelPart) !== slugify(sheetName)) {
      title = `Подставка под монитор ${sheetName}`;
      warnings.push(`название на листе («${modelPart || '—'}») не совпадает с листом — исправлено`);
    }
  }

  const materials = fields.material ?? [];
  const colors = fields.color ?? [];
  const sizes = fields.size ?? [];

  const tabletopMaterial = materials[0] ?? '';
  const frameMaterial = materials[1] ?? '';
  const tabletopColor = parseColor(colors[0] ?? '');
  const frameColor = parseColor(colors[1] ?? '');
  const dimensions = parseDimensions(sizes[0] ?? '');
  const frameSize = sizes[1] ?? '';

  const organizations = (fields.manufacturer ?? []).map(splitOrganization);
  const supplier = normalizeSpace(fields.supplier?.[0] ?? '');
  const importer = normalizeSpace(fields.importer?.[0] ?? '');
  const countryOfOrigin = uniqueJoin(fields.country ?? []);

  // Импортёр обязателен только для импортных товаров. Если в карточке он не
  // указан, различаем «частично импортный» (Китай в составе) и товар из РБ.
  const importerFallback = countryOfOrigin.includes('Китай')
    ? supplier
    : 'Импортёр отсутствует (товар произведён в Республике Беларусь)';

  if (!importer) warnings.push('не указан импортёр — подставлено значение по стране происхождения');
  if (!materials.length) warnings.push('не указан материал');
  if (!sizes.length) warnings.push('не указан размер');
  if (!dimensions.width || !dimensions.depth) warnings.push('не удалось разобрать ширину/глубину');

  const specs = [];
  const pushSpec = (name, value) => {
    const overridden = overrides.specs?.[name];
    const finalValue = normalizeSpace(overridden ?? value);
    if (!finalValue) return;
    const existing = specs.find((spec) => spec.name === name);
    if (existing) existing.value = finalValue;
    else specs.push({ name, value: finalValue });
  };

  pushSpec('Материал столешницы', line === 'addons' ? tabletopMaterial : tabletopMaterial);
  if (dimensions.width) pushSpec('Ширина', `${dimensions.width} мм`);
  if (dimensions.depth) pushSpec('Глубина', `${dimensions.depth} мм`);
  if (dimensions.height) {
    pushSpec(
      line === 'addons' ? 'Высота над столешницей' : 'Высота',
      `${dimensions.height} мм`,
    );
  }
  pushSpec(line === 'addons' ? 'Цвет' : 'Цвет столешницы', tabletopColor.decor);
  pushSpec('Материал опор', frameMaterial || (line === 'addons' ? '' : ''));
  pushSpec('Цвет опор', frameColor.decor);
  pushSpec('Размер опор', frameSize);
  if (isAddon) pushSpec('Подходит для линеек', compatibility);

  const decor = tabletopColor.decor;
  const sizeLabel =
    dimensions.width && dimensions.depth ? `${dimensions.width}×${dimensions.depth} мм` : '';
  // У подставок название уже содержит «Подставка под монитор …».
  const displayName = isAddon && !/^подставк/i.test(title) ? `Подставка под монитор ${title}` : title;

  const shortDescription = normalizeSpace(
    overrides.shortDescription ??
      (isAddon
        ? `${displayName}: ${decor}${sizeLabel ? `, ${sizeLabel}` : ''}.`
        : `Игровой стол ${title}: ${decor}${sizeLabel ? `, ${sizeLabel}` : ''}.`),
  );

  const seoTitle = normalizeSpace(
    overrides.seoTitle ??
      (isAddon
        ? `${displayName} — ${decor} | Kiberstol.by`
        : `Стол игровой ${title} — ${decor}${sizeLabel ? `, ${sizeLabel}` : ''} | Kiberstol.by`),
  );
  const seoDescription = normalizeSpace(
    overrides.seoDescription ??
      (isAddon
        ? `${displayName}: ${decor}${sizeLabel ? `, ${sizeLabel}` : ''}. Доставка по Беларуси.`
        : `Игровой стол ${title}: ${decor}${sizeLabel ? `, ${sizeLabel}` : ''}, опоры ${frameColor.decor}. Доставка по Беларуси.`),
  );

  const { image, placeholder } = resolveImage(root, slug, line);
  if (placeholder) warnings.push('нет фото товара — подставлено фото линейки');
  if (!image) warnings.push('не найдено ни фото товара, ни фото линейки');

  const addonBlock = renderAddonBlock(fields.addons?.[0], line, compatibility);

  const content = [];
  if (addonBlock) {
    content.push({ discriminant: 'richText', value: { type: 'richText', content: addonBlock } });
  }
  if (fields.newItem?.[0]) {
    content.push({
      discriminant: 'richText',
      value: { type: 'richText', content: normalizeSpace(fields.newItem[0]) },
    });
  }
  if (fields.disclaimer?.[0]) {
    content.push({
      discriminant: 'richText',
      value: { type: 'richText', content: normalizeSpace(fields.disclaimer[0]) },
    });
  }

  const product = {
    title,
    line,
    price: Number(overrides.price ?? 0),
    ...(overrides.oldPrice ? { oldPrice: Number(overrides.oldPrice) } : {}),
    shortDescription,
    manufacturer: overrides.manufacturer ?? uniqueJoin(organizations.map((org) => org.name)),
    manufacturerLocation:
      overrides.manufacturerLocation ?? uniqueJoin(organizations.map((org) => org.location)),
    importer: overrides.importer ?? (importer || importerFallback),
    supplier: overrides.supplier ?? supplier,
    countryOfOrigin: overrides.countryOfOrigin ?? countryOfOrigin,
    warranty: normalizeWarranty(overrides.warranty ?? fields.warranty?.[0]),
    used: false,
    specs,
    image,
    gallery: resolveGallery(root, slug),
    ...(overrides.badge ? { badge: overrides.badge } : {}),
    ctaText: overrides.ctaText ?? 'Заказать',
    order: Number(overrides.order ?? 0),
    content,
    seo: { title: seoTitle, description: seoDescription, noindex: false },
  };

  return {
    slug,
    product,
    body: renderDescription(fields.description?.[0]),
    warnings,
    meta: {
      title,
      decor,
      dimensions,
      tabletopMaterial,
      frameMaterial,
      tabletopCode: tabletopColor.code,
      frameCode: frameColor.code,
      groups: normalizeSpace(fields.line?.[0] ?? ''),
    },
  };
}

/** Читает все xlsx-карточки проекта. */
export function readClientProducts({ root, sourceDir, overrides = {} }) {
  const files = findWorkbooks(sourceDir);
  const items = [];
  const warnings = [];
  const orderCounters = new Map();

  for (const file of files) {
    const line = resolveGroup(file);
    if (!line) {
      warnings.push(`не удалось определить линейку для ${file}`);
      continue;
    }

    const workbook = XLSX.readFile(file);

    for (const sheetName of workbook.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        raw: false,
        defval: '',
      });
      const fields = parseSheet(rows);

      if (!fields.title?.length) {
        warnings.push(`${basename(file)} / ${sheetName}: лист без «Наименование» — пропущен`);
        continue;
      }

      const sheetSlug = slugify(sheetName);
      const productOverrides = { ...(overrides[sheetSlug] ?? {}) };
      if (productOverrides.order === undefined) {
        const next = orderCounters.get(line) ?? 0;
        productOverrides.order = next;
        orderCounters.set(line, next + 1);
      }

      const built = buildProduct({
        fields,
        line,
        root,
        overrides: productOverrides,
        sheetName,
      });
      items.push({ ...built, source: `${basename(file)} / ${sheetName}` });
      warnings.push(...built.warnings.map((warning) => `${basename(file)} / ${sheetName}: ${warning}`));
    }
  }

  return { items, warnings, files };
}
