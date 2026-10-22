/**
 * Генерирует дефолтное OG-изображение `public/assets/og-default.png` (1200×630).
 *
 * Используется как fallback в `SEO.astro`, когда у страницы нет собственного
 * `og:image`. Запуск: `node scripts/generate-og-default.mjs`.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const output = resolve('public/assets/og-default.png');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#070b10"/>
      <stop offset="1" stop-color="#101a24"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#00d4ff"/>
      <stop offset="1" stop-color="#7c5cff"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Сетка -->
  <g stroke="#1b2a38" stroke-width="1" opacity="0.7">
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${i * 120}" y1="0" x2="${i * 120}" y2="630"/>`).join('')}
    ${Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${i * 126}" x2="1200" y2="${i * 126}"/>`).join('')}
  </g>

  <!-- Акцентная полоса -->
  <rect x="0" y="0" width="1200" height="8" fill="url(#accent)"/>

  <!-- Логотип-знак -->
  <g transform="translate(96 150)">
    <rect x="0" y="0" width="120" height="120" rx="28" fill="#00d4ff" opacity="0.12"/>
    <path d="M70.5 16 38 72h22l-6.5 40L90 56H66l4.5-40Z" fill="#00d4ff"/>
    <path d="M38 72h22l-6.5 40L90 56H66l4.5-40L38 72Z" fill="#00d4ff" opacity="0.35"/>
  </g>

  <text x="96" y="360" font-family="Segoe UI, Arial, sans-serif" font-size="76" font-weight="700" fill="#f2f7fb">
    Kiberstol.by
  </text>
  <text x="96" y="430" font-family="Segoe UI, Arial, sans-serif" font-size="38" fill="#9fb3c8">
    Игровые компьютерные столы
  </text>

  <rect x="96" y="480" width="220" height="6" rx="3" fill="url(#accent)"/>

  <text x="96" y="560" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#6f8499">
    Доступное качество · Минск · kiberstol.by
  </text>
</svg>
`;

await mkdir(dirname(output), { recursive: true });
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(output);

console.log(`OG image written: ${output}`);
