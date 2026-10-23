import { expect, test } from '@playwright/test';

test.describe('Каталог', () => {
  test('показывает линейки и модели', async ({ page }) => {
    await page.goto('/products');

    await expect(page.locator('h1')).toContainText('Каталог');
    await expect(page.getByRole('heading', { name: 'Серия Meta', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Серия Teco', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Серия Tower', exact: true })).toBeVisible();
    await expect(page.locator('a[href="/products/meta-w"]')).toBeVisible();
  });

  test('переход в карточку товара', async ({ page }) => {
    await page.goto('/products');

    await page.locator('a[href="/products/meta-w"]').first().click();

    await expect(page).toHaveURL(/\/products\/meta-w$/);
    await expect(page.locator('h1')).toContainText('Meta W');
    await expect(page.getByText('399 BYN')).toBeVisible();
  });

  test('карточка товара содержит юридические сведения', async ({ page }) => {
    await page.goto('/products/meta-w');

    await page.getByRole('button', { name: /Сведения о товаре/ }).click();

    await expect(page.getByText('ООО МебельЛэнд М')).toBeVisible();
    await expect(page.getByText('Республика Беларусь; Китай')).toBeVisible();
    await expect(page.getByText('12 месяцев')).toBeVisible();
  });
});
