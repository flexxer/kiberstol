import { expect, test } from '@playwright/test';

test.describe('Cookie-согласие', () => {
  test('баннер показывается, принимает выбор и открывается повторно', async ({ page }) => {
    await page.goto('/');

    const banner = page.locator('#cookie-banner');
    await expect(banner).toBeVisible();

    await banner.getByRole('button', { name: 'Принять всё' }).click();
    await expect(banner).toBeHidden();

    const stored = await page.evaluate(() => localStorage.getItem('kiberstol-consent'));
    expect(stored).toContain('"analytics":true');
    expect(stored).toContain('"marketing":true');

    await page.getByRole('button', { name: 'Настройки cookie' }).click();
    await expect(banner).toBeVisible();
  });

  test('отказ сохраняет запрет аналитики и рекламы', async ({ page }) => {
    await page.goto('/');

    const banner = page.locator('#cookie-banner');
    await banner.getByRole('button', { name: 'Отказаться' }).click();
    await expect(banner).toBeHidden();

    const stored = await page.evaluate(() => localStorage.getItem('kiberstol-consent'));
    expect(stored).toContain('"analytics":false');
    expect(stored).toContain('"marketing":false');
  });

  test('аналитика загружается только после согласия и отключается сразу после отзыва', async ({
    page,
  }) => {
    // Блокируем внешние трекеры: проверяем DOM и вызовы API, а не сеть.
    await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
    await page.route('https://mc.yandex.ru/**', (route) => route.abort());

    await page.goto('/');

    const banner = page.locator('#cookie-banner');
    await expect(banner).toBeVisible();

    // В settings.yaml ID пустые — задаём их вручную, чтобы проверить gating.
    await page.evaluate(() => {
      document.body.dataset.ga4Id = 'G-TEST123';
      document.body.dataset.yandexMetrikaId = '99999999';
    });

    // До согласия трекеры не загружены.
    await expect(page.locator('#ga4-script')).toHaveCount(0);
    await expect(page.locator('#ym-script')).toHaveCount(0);

    // Фиксируем вызов ym(..., 'destruct') при отзыве согласия.
    await page.evaluate(() => {
      const w = window as unknown as {
        ym?: (...args: unknown[]) => void;
        __ymCalls?: unknown[][];
      };
      const original = w.ym;
      w.__ymCalls = [];
      w.ym = (...args: unknown[]) => {
        w.__ymCalls!.push(args);
        original?.(...args);
      };
    });

    // Даём согласие на аналитику.
    await banner.getByRole('button', { name: 'Принять всё' }).click();
    await expect(banner).toBeHidden();

    await expect(page.locator('#ga4-script')).toHaveCount(1);
    await expect(page.locator('#ga4-inline')).toHaveCount(1);
    await expect(page.locator('#ym-script')).toHaveCount(1);

    // Отзываем согласие через настройки.
    await page.getByRole('button', { name: 'Настройки cookie' }).click();
    await expect(banner).toBeVisible();
    await banner.locator('input[name="consent-analytics"]').uncheck();
    await banner.getByRole('button', { name: 'Сохранить выбор' }).click();
    await expect(banner).toBeHidden();

    // Трекеры удалены немедленно.
    await expect(page.locator('#ga4-script')).toHaveCount(0);
    await expect(page.locator('#ga4-inline')).toHaveCount(0);
    await expect(page.locator('#ym-script')).toHaveCount(0);

    const state = await page.evaluate(() => {
      const w = window as unknown as {
        'ga-disable-G-TEST123'?: boolean;
        __ymCalls?: unknown[][];
      };
      return {
        gaDisabled: w['ga-disable-G-TEST123'],
        ymCalls: w.__ymCalls ?? [],
      };
    });

    // GA4 явно отключён, Метрика получила destruct.
    expect(state.gaDisabled).toBe(true);
    expect(state.ymCalls).toContainEqual(['99999999', 'destruct']);
  });

  test('отказ не загружает аналитику даже при заданных ID', async ({ page }) => {
    await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
    await page.route('https://mc.yandex.ru/**', (route) => route.abort());

    await page.goto('/');

    const banner = page.locator('#cookie-banner');
    await expect(banner).toBeVisible();

    await page.evaluate(() => {
      document.body.dataset.ga4Id = 'G-TEST456';
      document.body.dataset.yandexMetrikaId = '88888888';
    });

    await banner.getByRole('button', { name: 'Отказаться' }).click();
    await expect(banner).toBeHidden();

    await expect(page.locator('#ga4-script')).toHaveCount(0);
    await expect(page.locator('#ym-script')).toHaveCount(0);
  });
});
