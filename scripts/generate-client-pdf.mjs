/**
 * generate-client-pdf.mjs — сборка PDF-инструкции для клиента.
 *
 * Источник: docs/client-instructions-analytics-telegram.md
 * Результат: docs/client-instructions-analytics-telegram.pdf
 *
 * Использует уже установленный Playwright Chromium (`page.pdf()`), поэтому
 * дополнительные зависимости не требуются. Markdown → HTML — через `marked`.
 *
 * Запуск: npm run generate:client-pdf
 */
import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { marked } from 'marked';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = path.join(root, 'docs', 'client-instructions-analytics-telegram.md');
const outPath = path.join(root, 'docs', 'client-instructions-analytics-telegram.pdf');

const BRAND = 'Kiberstol.by';
const DOC_TITLE = 'Инструкция: ID для аналитики и формы заявок';

/** Форматирует дату в часовом поясе Минска. */
function formatDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Minsk',
  }).format(date);
}

/** Экранирует HTML-спецсимволы. */
function escapeHtml(value) {
  return value
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

const markdown = await readFile(srcPath, 'utf8');

// Первый H1 используем как заголовок обложки, из тела документа его убираем.
const titleMatch = markdown.match(/^#\s+(.+)$/m);
const title = titleMatch ? titleMatch[1].trim() : DOC_TITLE;
const bodyMarkdown = markdown.replace(/^#\s+.*\r?\n/, '');

const bodyHtml = marked.parse(bodyMarkdown, { gfm: true, breaks: false });

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  :root {
    --ink: #0f172a;
    --muted: #475569;
    --line: #cbd5e1;
    --soft: #f1f5f9;
    --accent: #0ea5e9;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
  }

  body {
    font-family: "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: var(--ink);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .cover {
    border-bottom: 3px solid var(--accent);
    padding-bottom: 14px;
    margin-bottom: 20px;
  }

  .cover .kicker {
    font-size: 8.5pt;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 6px;
  }

  .cover h1 {
    font-size: 23pt;
    line-height: 1.2;
    margin: 0 0 10px;
    color: var(--ink);
  }

  .cover .meta {
    font-size: 9.5pt;
    color: var(--muted);
    margin: 0;
  }

  .cover .badge {
    display: inline-block;
    background: #e0f2fe;
    color: #075985;
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 8.5pt;
    font-weight: 600;
    margin-bottom: 8px;
  }

  h2 {
    font-size: 15pt;
    margin: 22px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--line);
    break-after: avoid;
    page-break-after: avoid;
  }

  h3 {
    font-size: 11.5pt;
    margin: 16px 0 6px;
    break-after: avoid;
    page-break-after: avoid;
  }

  p { margin: 0 0 8px; }

  ul, ol {
    margin: 0 0 10px;
    padding-left: 20px;
  }

  li { margin: 0 0 4px; }

  a {
    color: #0369a1;
    text-decoration: none;
  }

  strong { font-weight: 600; }

  code {
    font-family: "Cascadia Mono", Consolas, "Courier New", monospace;
    font-size: 9pt;
    background: var(--soft);
    border: 1px solid #e2e8f0;
    border-radius: 3px;
    padding: 0 4px;
    white-space: nowrap;
  }

  pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 3px solid var(--accent);
    border-radius: 4px;
    padding: 9px 12px;
    margin: 0 0 10px;
    overflow-wrap: anywhere;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  pre code {
    background: none;
    border: 0;
    padding: 0;
    font-size: 9pt;
    white-space: pre-wrap;
  }

  blockquote {
    margin: 0 0 10px;
    padding: 8px 12px;
    background: #fffbeb;
    border-left: 3px solid #f59e0b;
    border-radius: 0 4px 4px 0;
    color: #78350f;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  blockquote p:last-child { margin-bottom: 0; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 12px;
    font-size: 9pt;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  thead { display: table-header-group; }

  tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  th, td {
    border: 1px solid var(--line);
    padding: 5px 7px;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: var(--soft);
    font-weight: 600;
  }

  hr {
    border: 0;
    border-top: 1px solid #e2e8f0;
    margin: 16px 0;
  }

  h2 + p, h3 + p { margin-top: 0; }
</style>
</head>
<body>
  <header class="cover">
    <span class="badge">${escapeHtml(BRAND)}</span>
    <p class="kicker">Руководство для клиента</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">Дата подготовки: ${escapeHtml(formatDate(new Date()))} · Документ для передачи клиенту</p>
  </header>
  ${bodyHtml}
</body>
</html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });

  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="width:100%;font-size:7.5pt;color:#94a3b8;padding:0 16mm;display:flex;justify-content:space-between;">
        <span>${escapeHtml(BRAND)}</span>
        <span>${escapeHtml(DOC_TITLE)}</span>
      </div>`,
    footerTemplate: `
      <div style="width:100%;font-size:7.5pt;color:#94a3b8;padding:0 16mm;display:flex;justify-content:space-between;">
        <span>Документ подготовлен для клиента</span>
        <span>Стр. <span class="pageNumber"></span> из <span class="totalPages"></span></span>
      </div>`,
    margin: { top: '18mm', bottom: '16mm', left: '16mm', right: '16mm' },
  });
} finally {
  await browser.close();
}

const { size } = await stat(outPath);
console.log(`PDF создан: ${path.relative(root, outPath)} (${(size / 1024).toFixed(1)} КБ)`);
