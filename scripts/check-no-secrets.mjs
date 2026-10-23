#!/usr/bin/env node
/**
 * check-no-secrets.mjs — скан сборки и исходников на утечку секретов.
 *
 * Проверяет `dist/client` и `src`:
 *  - отсутствие `PUBLIC_TG_*` и `data-tg-*` (секреты не должны попадать в клиент);
 *  - отсутствие литералов токена Telegram (`123456789:AA…`);
 *  - отсутствие значений `TG_BOT_TOKEN`/`TG_CHAT_ID` из окружения;
 *  - имена `TG_BOT_TOKEN`/`TG_CHAT_ID` допустимы только в серверном
 *    `dist/client/api/submit.php` (через getenv, без значений);
 *  - отсутствие `.env`-файлов внутри `dist/client`.
 *
 * Запуск после `npm run build`: `npm run check:secrets`.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOTS = ['dist/client', 'src'];
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp4', '.webm', '.mp3', '.wav', '.pdf', '.zip', '.gz',
]);

const findings = [];

function walk(directory, callback) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const info = statSync(path);
    if (info.isDirectory()) {
      walk(path, callback);
    } else {
      callback(path);
    }
  }
}

function normalize(path) {
  return path.replace(/\\/g, '/');
}

function isServerHandler(path) {
  return normalize(path).endsWith('dist/client/api/submit.php');
}

function addFinding(path, message) {
  findings.push(`${normalize(path)}: ${message}`);
}

function isBinary(path) {
  return BINARY_EXTENSIONS.has(extname(path).toLowerCase());
}

const envSecrets = [
  ['TG_BOT_TOKEN', process.env.TG_BOT_TOKEN],
  ['TG_CHAT_ID', process.env.TG_CHAT_ID],
].filter(([, value]) => typeof value === 'string' && value.trim().length >= 6);

const tokenPattern = /\b\d{6,12}:[A-Za-z0-9_-]{30,}\b/;

for (const root of ROOTS) {
  let info;
  try {
    info = statSync(root);
  } catch {
    if (root === 'dist/client') {
      console.error(`[check-no-secrets] Нет ${root}. Сначала выполните: npm run build`);
      process.exit(1);
    }
    continue;
  }

  if (!info.isDirectory()) continue;

  walk(root, (path) => {
    if (isBinary(path)) return;

    const fileName = normalize(path).split('/').pop() ?? '';
    if (/^\.env(\..*)?$/.test(fileName)) {
      addFinding(path, 'файл окружения не должен попадать в артефакты');
      return;
    }

    const content = readFileSync(path, 'utf8');

    if (content.includes('PUBLIC_TG_')) {
      addFinding(path, 'найден запрещённый префикс PUBLIC_TG_');
    }

    if (/\bdata-tg-[\w-]+/i.test(content)) {
      addFinding(path, 'найден data-tg-* атрибут (риск утечки настроек)');
    }

    const tokenMatch = content.match(tokenPattern);
    if (tokenMatch) {
      addFinding(path, 'найден литерал, похожий на токен Telegram-бота');
    }

    for (const [name, value] of envSecrets) {
      if (content.includes(value)) {
        addFinding(path, `найдено значение ${name} из окружения`);
      }
    }

    if (!isServerHandler(path)) {
      for (const name of ['TG_BOT_TOKEN', 'TG_CHAT_ID']) {
        if (content.includes(name)) {
          addFinding(path, `имя ${name} допустимо только в api/submit.php`);
        }
      }
    }
  });
}

if (findings.length > 0) {
  console.error('[check-no-secrets] Найдены потенциальные утечки:');
  for (const finding of findings) {
    console.error(`  - ${finding}`);
  }
  console.error(`[check-no-secrets] Всего: ${findings.length}`);
  process.exit(1);
}

console.log(
  `[check-no-secrets] OK: секретов не найдено (${ROOTS.map(normalize).join(', ')}).`,
);
console.log(
  `[check-no-secrets] ${relative(process.cwd(), 'dist/client')} не содержит значений TG_*.`,
);
