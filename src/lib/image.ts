import type { ImageMetadata } from 'astro';

/**
 * Резолв изображений, загруженных через Keystatic.
 *
 * Keystatic сохраняет в контент путь вида `/assets/uploads/...` (или просто
 * имя файла). Файлы физически лежат в `src/assets/uploads/`. Чтобы Astro
 * мог оптимизировать их через `astro:assets` (ресайз, WebP/AVIF, quality),
 * нужно получить `ImageMetadata` по этому пути.
 *
 * `import.meta.glob` собирает все изображения из `src/assets/uploads/**`
 * на этапе сборки, а `resolveImage` сопоставляет контентный путь с реальным
 * файлом. Если файл не найден — возвращает `undefined` (рендер пропускается).
 */

const images = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/uploads/**/*.{png,jpg,jpeg,gif,webp,avif,svg}',
  { eager: true },
);

/**
 * Нормализует контентный путь к ключу `import.meta.glob`.
 * Принимает как `/assets/uploads/line-1/image.png`, так и `image.png`.
 */
function normalizeKey(src: string): string {
  const trimmed = src.replace(/^\/+/, '');
  if (trimmed.startsWith('assets/uploads/')) {
    return `/src/${trimmed}`;
  }
  // Голое имя файла — ищем по суффиксу.
  const suffix = `/${trimmed}`;
  const match = Object.keys(images).find((key) => key.endsWith(suffix));
  return match ?? `/src/assets/uploads/${trimmed}`;
}

/**
 * Возвращает `ImageMetadata` для контентного пути изображения.
 * `undefined`, если файл не найден.
 */
export function resolveImage(src: string | undefined | null): ImageMetadata | undefined {
  if (!src) return undefined;
  const key = normalizeKey(src);
  return images[key]?.default;
}