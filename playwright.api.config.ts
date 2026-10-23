import { defineConfig } from '@playwright/test';

/**
 * API-тесты контракта `/api/submit.php` на реальном PHP.
 *
 * Поднимает несколько серверов с разными env:
 *  - 4324 — dry-run (без creds);
 *  - 4325 — без creds и без dry-run (503);
 *  - 4326 — фейковый Telegram Bot API;
 *  - 4327 — реальная отправка в фейковый Telegram (успех);
 *  - 4328 — реальная отправка с ошибкой Telegram (502).
 *
 * Свежий RATE_LIMIT_DIR на прогон исключает влияние прошлых запусков.
 */
const NOW = Date.now();
const rateDir = (name: string): string => `tests/.tmp/rate-${name}-${NOW}`;
const PHONE_SUBMIT =
  'node scripts/serve-php.mjs --no-env --env TRUSTED_PROXIES=127.0.0.1 --env TG_DRY_RUN=0';

export default defineConfig({
  testDir: './tests/api',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  projects: [{ name: 'api' }],
  webServer: [
    {
      command:
        `node scripts/serve-php.mjs --dry-run --no-env --port 4324 ` +
        `--env TRUSTED_PROXIES=127.0.0.1 --env RATE_LIMIT_DIR=${rateDir('dry')}`,
      url: 'http://127.0.0.1:4324',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        `node scripts/serve-php.mjs --no-env --port 4325 ` +
        `--env TRUSTED_PROXIES=127.0.0.1 --env RATE_LIMIT_DIR=${rateDir('nc')}`,
      url: 'http://127.0.0.1:4325',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'node tests/api/fake-telegram.mjs',
      url: 'http://127.0.0.1:4326/messages',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command:
        `${PHONE_SUBMIT} --port 4327 --env RATE_LIMIT_DIR=${rateDir('ok')} ` +
        '--env TG_BOT_TOKEN=test-token --env TG_CHAT_ID=test-chat ' +
        '--env TG_API_BASE=http://127.0.0.1:4326',
      url: 'http://127.0.0.1:4327',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        `${PHONE_SUBMIT} --port 4328 --env RATE_LIMIT_DIR=${rateDir('fail')} ` +
        '--env TG_BOT_TOKEN=test-token --env TG_CHAT_ID=fail-chat ' +
        '--env TG_API_BASE=http://127.0.0.1:4326',
      url: 'http://127.0.0.1:4328',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
