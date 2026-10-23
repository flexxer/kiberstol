/**
 * Генерирует фирменные ассеты Kiberstol из исходного логотипа
 * `downloads/kiberlogo.png`:
 *
 *  - `src/assets/logo.png`         — обрезанный логотип для Astro `<Image>`
 *  - `public/assets/logo.png`      — тот же логотип для JSON-LD / внешних ссылок
 *  - `public/favicon-32.png`       — favicon 32×32
 *  - `public/favicon-192.png`      — иконка 192×192 (PWA / Android)
 *  - `public/favicon-512.png`      — иконка 512×512 (PWA / Android)
 *  - `public/apple-touch-icon.png` — 180×180 для iOS
 *  - `public/favicon.ico`          — ICO с PNG-содержимым (32×32)
 *  - `public/favicon.svg`          — SVG-обёртка с встроенным PNG (128×128)
 *
 * Запуск: `node scripts/generate-brand-assets.mjs`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const source = resolve('downloads/kiberlogo.png');

const outputs = {
  logoSrc: resolve('src/assets/logo.png'),
  logoPublic: resolve('public/assets/logo.png'),
  favicon32: resolve('public/favicon-32.png'),
  favicon192: resolve('public/favicon-192.png'),
  favicon512: resolve('public/favicon-512.png'),
  appleTouch: resolve('public/apple-touch-icon.png'),
  faviconIco: resolve('public/favicon.ico'),
  faviconSvg: resolve('public/favicon.svg'),
};

const BG_START = '#05070f';
const BG_END = '#0b1020';

/** Обрезает прозрачные поля исходного логотипа. */
const trimmed = await sharp(source).trim({ threshold: 1 }).png().toBuffer();
const trimmedMeta = await sharp(trimmed).metadata();

/**
 * Рендерит квадратную иконку: тёмный фон + центрированный логотип.
 *
 * @param {number} size Размер иконки в px.
 * @param {{ rounded?: boolean, padding?: number }} [options]
 *   rounded — скруглённые углы (для favicon); padding — доля отступа с каждой стороны.
 */
async function renderIcon(size, { rounded = true, padding = size <= 32 ? 0.08 : 0.16 } = {}) {
  const inner = Math.max(1, Math.round(size * (1 - padding * 2)));

  const logo = await sharp(trimmed)
    .resize({ width: inner, height: inner, fit: 'inside' })
    .png()
    .toBuffer();
  const logoMeta = await sharp(logo).metadata();

  const left = Math.round((size - logoMeta.width) / 2);
  const top = Math.round((size - logoMeta.height) / 2);

  const radius = rounded ? Math.round(size * 0.22) : 0;
  const background = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${BG_START}"/>
          <stop offset="1" stop-color="${BG_END}"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
    </svg>
  `;

  return sharp(Buffer.from(background))
    .composite([{ input: logo, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Оборачивает PNG в минимальный ICO-контейнер (PNG-сжатие поддерживается). */
function pngToIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette size
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // image size
  entry.writeUInt32LE(22, 12); // image offset

  return Buffer.concat([header, entry, png]);
}

// Логотип для сайта (прозрачный фон, 512px по ширине).
const logo512 = await sharp(trimmed)
  .resize({ width: 512 })
  .png({ compressionLevel: 9 })
  .toBuffer();

// Favicon-набор.
const icon32 = await renderIcon(32);
const icon192 = await renderIcon(192);
const icon512 = await renderIcon(512);
const appleTouch = await renderIcon(180, { rounded: false, padding: 0.14 });
const icon128 = await renderIcon(128);

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <image href="data:image/png;base64,${icon128.toString('base64')}" width="128" height="128"/>
</svg>
`;

await Promise.all([
  mkdir(dirname(outputs.logoSrc), { recursive: true }),
  mkdir(dirname(outputs.logoPublic), { recursive: true }),
]);

await Promise.all([
  writeFile(outputs.logoSrc, logo512),
  writeFile(outputs.logoPublic, logo512),
  writeFile(outputs.favicon32, icon32),
  writeFile(outputs.favicon192, icon192),
  writeFile(outputs.favicon512, icon512),
  writeFile(outputs.appleTouch, appleTouch),
  writeFile(outputs.faviconIco, pngToIco(icon32, 32)),
  writeFile(outputs.faviconSvg, faviconSvg),
]);

console.log(
  `Brand assets written from ${trimmedMeta.width}×${trimmedMeta.height} logo:\n` +
    Object.values(outputs)
      .map((file) => `  - ${file}`)
      .join('\n'),
);
