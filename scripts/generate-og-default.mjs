/**
 * Генерирует дефолтное OG-изображение `public/assets/og-default.png` (1200×630)
 * на основе фирменного логотипа `downloads/kiberlogo.png`.
 *
 * Используется как fallback в `SEO.astro`, когда у страницы нет собственного
 * `og:image`. Запуск: `node scripts/generate-og-default.mjs`.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const source = resolve('downloads/kiberlogo.png');
const output = resolve('public/assets/og-default.png');

const WIDTH = 1200;
const HEIGHT = 630;

// Логотип без прозрачных полей — чтобы он занимал предсказуемую площадь.
const trimmed = await sharp(source).trim({ threshold: 1 }).png().toBuffer();

const logo = await sharp(trimmed)
  .resize({ width: 210, height: 210, fit: 'inside' })
  .png()
  .toBuffer();

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#05070f"/>
      <stop offset="1" stop-color="#0b1020"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#37c5fa"/>
      <stop offset="1" stop-color="#4438b6"/>
    </linearGradient>
    <radialGradient id="glow-cyan" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#37c5fa" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#37c5fa" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-violet" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#7c6cff" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#7c6cff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>

  <!-- Неоновые ореолы -->
  <circle cx="220" cy="220" r="230" fill="url(#glow-cyan)"/>
  <circle cx="1050" cy="560" r="280" fill="url(#glow-violet)"/>

  <!-- Сетка -->
  <g stroke="#1c2740" stroke-width="1" opacity="0.55">
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${i * 120}" y1="0" x2="${i * 120}" y2="${HEIGHT}"/>`).join('')}
    ${Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${i * 126}" x2="${WIDTH}" y2="${i * 126}"/>`).join('')}
  </g>

  <!-- Акцентная полоса -->
  <rect x="0" y="0" width="${WIDTH}" height="8" fill="url(#accent)"/>

  <text x="96" y="400" font-family="Segoe UI, Arial, sans-serif" font-size="76" font-weight="700" fill="#e6f1ff">
    Kiberstol.by
  </text>
  <text x="96" y="470" font-family="Segoe UI, Arial, sans-serif" font-size="38" fill="#8b9bb8">
    Игровые компьютерные столы
  </text>

  <rect x="96" y="520" width="220" height="6" rx="3" fill="url(#accent)"/>

  <text x="96" y="580" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#6f8499">
    Доступное качество · Минск · kiberstol.by
  </text>
</svg>
`;

const background = await sharp(Buffer.from(svg)).png().toBuffer();

await mkdir(dirname(output), { recursive: true });
await sharp(background)
  .composite([{ input: logo, left: 96, top: 110 }])
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(`OG image written: ${output}`);
