#!/usr/bin/env node
/**
 * serve-php.mjs — локальный запуск PHP-обработчика формы.
 *
 * Поднимает `php -S` над статической сборкой (`dist/client`) и загружает
 * переменные из `.env`, чтобы форма работала так же, как на хостинге.
 * С флагом `--dry-run` включает TG_DRY_RUN=1 — creds не нужны.
 *
 * Примеры:
 *   node scripts/serve-php.mjs --dry-run
 *   node scripts/serve-php.mjs --port 8080
 *   npm run serve:php -- --dry-run
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const options = {
    host: '127.0.0.1',
    port: '8080',
    root: 'dist/client',
    dryRun: false,
    envFile: '.env',
    /** Явные переменные для дочернего процесса (приоритет выше .env). */
    env: {},
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case '--host':
        options.host = next ?? options.host;
        index += 1;
        break;
      case '--port':
        options.port = next ?? options.port;
        index += 1;
        break;
      case '--root':
        options.root = next ?? options.root;
        index += 1;
        break;
      case '--env-file':
        options.envFile = next ?? options.envFile;
        index += 1;
        break;
      case '--env': {
        const pair = next ?? '';
        const separator = pair.indexOf('=');
        if (separator > 0) {
          options.env[pair.slice(0, separator)] = pair.slice(separator + 1);
        } else {
          console.error(`Invalid --env value (expected KEY=VALUE): ${pair}`);
          process.exit(1);
        }
        index += 1;
        break;
      }
      case '--no-env':
        options.envFile = '';
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log(
          [
            'Usage: node scripts/serve-php.mjs [--host 127.0.0.1] [--port 8080]',
            '       [--root dist/client] [--env-file .env] [--no-env] [--dry-run]',
            '       [--env KEY=VALUE]...',
          ].join('\n'),
        );
        process.exit(0);
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

/** Простой парсер `.env` (KEY=VALUE, без многострочных значений). */
function parseEnvFile(content) {
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;

    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const separator = normalized.indexOf('=');
    if (separator <= 0) continue;

    const key = normalized.slice(0, separator).trim();
    let value = normalized.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

const options = parseArgs(process.argv.slice(2));
const root = resolve(process.cwd(), options.root);

if (!existsSync(root)) {
  console.error(`[serve-php] Нет каталога ${root}. Сначала выполните: npm run build`);
  process.exit(1);
}

const env = { ...process.env };

if (options.envFile) {
  const envPath = resolve(process.cwd(), options.envFile);
  if (existsSync(envPath)) {
    const parsed = parseEnvFile(readFileSync(envPath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      // Переменные окружения процесса имеют приоритет над .env.
      if (env[key] === undefined) env[key] = value;
    }
    console.log(`[serve-php] Загружен ${options.envFile}`);
  } else {
    console.log(`[serve-php] ${options.envFile} не найден — используются только env процесса`);
  }
}

// Явные --env имеют приоритет над .env и наследуемым окружением.
Object.assign(env, options.env);

if (options.dryRun) {
  // Тестовый/локальный режим важнее явных TG_*: creds не используются.
  env.TG_DRY_RUN = '1';
}

if (env.TG_DRY_RUN === '1') {
  // Для локальной проверки: creds не нужны.
  env.TG_BOT_TOKEN = env.TG_BOT_TOKEN ?? '';
  env.TG_CHAT_ID = env.TG_CHAT_ID ?? '';
}

if (!env.ALLOWED_ORIGINS) {
  env.ALLOWED_ORIGINS = [
    `http://${options.host}:${options.port}`,
    `http://localhost:${options.port}`,
  ].join(',');
}

const address = `${options.host}:${options.port}`;
console.log(
  `[serve-php] ${address} → ${root}` +
    `${env.TG_DRY_RUN === '1' ? ' (TG_DRY_RUN=1)' : ''}`,
);
console.log(`[serve-php] ALLOWED_ORIGINS=${env.ALLOWED_ORIGINS}`);

const php = spawn('php', ['-S', address, '-t', root], {
  env,
  stdio: 'inherit',
});

php.on('error', (error) => {
  console.error('[serve-php] Не удалось запустить php:', error.message);
  process.exit(1);
});

php.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    php.kill(signal);
  });
}
