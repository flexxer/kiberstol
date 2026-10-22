/**
 * lighthouse-audit.mjs — аудит производительности и качества страниц.
 *
 * Запускает Lighthouse против локального preview-сервера и сохраняет
 * JSON-отчёт в `reports/`. Требует установленный Chrome/Chromium.
 *
 * Пример:
 *   npm run build
 *   npm run preview -- --host 127.0.0.1 --port 4321
 *   npm run audit:lighthouse -- http://127.0.0.1:4321/
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const url = process.argv[2] ?? 'http://127.0.0.1:4321/';
const chrome = await launch({
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
});

try {
  const result = await lighthouse(url, {
    port: chrome.port,
    output: 'json',
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  });

  if (!result) {
    throw new Error('Lighthouse не вернул результат');
  }

  const reportsDir = join(process.cwd(), 'reports');
  mkdirSync(reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(reportsDir, `lighthouse-${timestamp}.json`);
  writeFileSync(reportPath, result.report);

  const categories = result.lhr.categories;
  const scores = Object.fromEntries(
    Object.entries(categories).map(([key, category]) => [
      key,
      Math.round((category.score ?? 0) * 100),
    ]),
  );

  console.log(`Lighthouse: ${url}`);
  console.log(`  performance:    ${scores.performance}`);
  console.log(`  accessibility:  ${scores.accessibility}`);
  console.log(`  best-practices: ${scores['best-practices']}`);
  console.log(`  seo:            ${scores.seo}`);
  console.log(`Отчёт: ${reportPath}`);
} finally {
  await chrome.kill();
}
