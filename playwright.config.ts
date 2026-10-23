import { defineConfig, devices } from '@playwright/test';

const PORT = 4322;
const BASE_URL = `http://127.0.0.1:${PORT}`;
// Свежий каталог счётчиков на каждый прогон: тесты не зависят от прошлых запусков.
const RATE_DIR = `tests/.tmp/rate-e2e-${Date.now()}`;

/**
 * Playwright: e2e-тесты и аудит доступности.
 *
 * Тесты запускаются против production-сборки (`dist/client`), которую
 * обслуживает реальный PHP (`php -S`), а не `astro preview`: только так
 * проверяется контракт `/api/submit.php`. Перед запуском нужен `npm run build`.
 *
 * TG_DRY_RUN=1 — заявки не уходят в Telegram; creds не требуются.
 * TRUSTED_PROXIES=127.0.0.1 — тесты передают уникальный X-Forwarded-For,
 * чтобы не упираться в общий rate limit при параллельном запуске.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/serve-php.mjs --dry-run --no-env --port ${PORT} --env TRUSTED_PROXIES=127.0.0.1 --env RATE_LIMIT_DIR=${RATE_DIR}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
