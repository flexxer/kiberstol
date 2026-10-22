import { expect, test } from '@playwright/test';

test.describe('Форма заявки', () => {
  test('отправляет заявку с согласием на обработку ПД', async ({ page }) => {
    await page.route('**/api/submit.php', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/#contacts');
    const form = page.locator('#order-form');
    await expect(form).toBeVisible();

    await form.locator('input[name="name"]').fill('Тест');
    await form.locator('input[name="phone"]').fill('296377663');
    await form.locator('input[name="consent-pd"]').check();

    // Time-honeypot: форма должна быть заполнена не быстрее 3 секунд.
    await page.waitForTimeout(3200);
    await form.locator('button[type="submit"]').click();

    await expect(form.locator('[data-form-status]')).toContainText('Заявка отправлена');
  });

  test('телефон маскируется в формат +375 XX XXX-XX-XX', async ({ page }) => {
    await page.goto('/#contacts');
    const phone = page.locator('#order-form input[name="phone"]');

    await phone.fill('296377663');

    await expect(phone).toHaveValue('+375 29 637-76-63');
  });

  test('согласие на обработку ПД обязательно', async ({ page }) => {
    await page.goto('/#contacts');

    await expect(page.locator('#order-form input[name="consent-pd"]')).toHaveAttribute(
      'required',
      '',
    );
  });
});
