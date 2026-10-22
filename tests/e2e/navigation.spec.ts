import { expect, test } from '@playwright/test';

test.describe('Навигация', () => {
  test('главная загружается и содержит ключевые секции', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Kiberstol/);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('#catalog')).toBeVisible();
    await expect(page.locator('#contacts')).toBeVisible();
  });

  test('пункт меню «Каталог» ведёт на /products', async ({ page }) => {
    await page.goto('/');

    await page.locator('header nav a[href="/products"]').first().click();

    await expect(page).toHaveURL(/\/products$/);
    await expect(page.locator('h1')).toContainText('Каталог');
  });

  test('ссылка «Контакты» ведёт к форме заявки', async ({ page }) => {
    await page.goto('/');

    await page.locator('header nav a[href="/#contacts"]').first().click();

    await expect(page).toHaveURL(/\/#contacts$/);
    await expect(page.locator('#order-form')).toBeVisible();
  });
});
