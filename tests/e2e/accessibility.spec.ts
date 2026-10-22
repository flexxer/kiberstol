import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Аудит доступности (axe-core).
 *
 * Блокирующими считаются нарушения уровня `critical`. Остальные уровни
 * выводятся в отчёт и исправляются отдельными задачами.
 */
const pages = ['/', '/products', '/products/meta-w'];

for (const path of pages) {
  test(`нет critical-нарушений доступности: ${path}`, async ({ page }) => {
    await page.goto(path);

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((violation) => violation.impact === 'critical');

    expect(
      critical,
      `Critical accessibility violations:\n${JSON.stringify(critical, null, 2)}`,
    ).toEqual([]);
  });
}
