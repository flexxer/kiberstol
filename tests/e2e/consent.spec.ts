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
});
