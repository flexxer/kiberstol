import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

let sequence = 0;

/** Уникальный национальный номер (9 цифр), чтобы не упираться в лимит по телефону. */
function uniquePhone(): string {
  sequence += 1;
  const suffix = String((Date.now() + sequence) % 10_000_000).padStart(7, '0');
  return `29${suffix}`;
}

/** Уникальный IP через X-Forwarded-For (сервер доверяет 127.0.0.1). */
function uniqueIp(): string {
  const random = () => Math.floor(Math.random() * 254) + 1;
  return `10.${random()}.${random()}.${random()}`;
}

async function prepare(page: Page): Promise<Locator> {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': uniqueIp() });
  await page.goto('/#contacts');

  const form = page.locator('#order-form');
  await expect(form).toBeVisible();
  return form;
}

async function fillValid(form: Locator, phone = uniquePhone()): Promise<void> {
  await form.locator('input[name="name"]').fill('Тест');
  await form.locator('input[name="phone"]').fill(phone);
  await form.locator('input[name="consent-pd"]').check();
}

/** Ждём превышения минимального времени заполнения (3 с). */
async function waitForTiming(page: Page): Promise<void> {
  await page.waitForTimeout(3_200);
}

test.describe('Форма заявки', () => {
  test('отправляет заявку end-to-end через PHP в dry-run', async ({ page }) => {
    const form = await prepare(page);
    await fillValid(form);
    await waitForTiming(page);

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/submit.php') && response.request().method() === 'POST',
    );

    await form.locator('button[type="submit"]').click();
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, dryRun: true });

    const status = form.locator('[data-form-status]');
    await expect(status).toContainText('Заявка отправлена');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveAttribute('aria-live', 'polite');

    // Форма сброшена после успеха.
    await expect(form.locator('input[name="name"]')).toHaveValue('');
  });

  test('маскирует телефон 296377663', async ({ page }) => {
    const form = await prepare(page);
    const phone = form.locator('input[name="phone"]');

    await phone.fill('296377663');

    await expect(phone).toHaveValue('+375 29 637-76-63');
  });

  test('маскирует телефон с префиксом 80', async ({ page }) => {
    const form = await prepare(page);
    const phone = form.locator('input[name="phone"]');

    await phone.fill('80296377663');

    await expect(phone).toHaveValue('+375 29 637-76-63');
  });

  test('согласие на обработку ПД обязательно', async ({ page }) => {
    const form = await prepare(page);

    await expect(form.locator('input[name="consent-pd"]')).toHaveAttribute('required', '');
  });

  test('передаёт marketing-consent, page и elapsed', async ({ page }) => {
    let body = '';
    await page.route('**/api/submit.php', async (route) => {
      body = route.request().postData() ?? '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    const form = await prepare(page);
    await fillValid(form);
    await form.locator('input[name="marketing-consent"]').check();
    await waitForTiming(page);
    await form.locator('button[type="submit"]').click();

    await expect(form.locator('[data-form-status]')).toContainText('Заявка отправлена');
    expect(body).toContain('name="marketing-consent"');
    expect(body).toContain('name="page"');
    expect(body).toContain('name="elapsed"');
  });

  test('honeypot: заполненное поле website блокирует отправку', async ({ page }) => {
    let requests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/submit.php')) requests += 1;
    });

    const form = await prepare(page);
    await fillValid(form);
    await waitForTiming(page);

    await form.locator('input[name="website"]').evaluate((element) => {
      (element as HTMLInputElement).value = 'spam-bot';
    });
    await form.locator('button[type="submit"]').click();
    await page.waitForTimeout(300);

    expect(requests).toBe(0);
    await expect(form.locator('input[name="name"]')).toHaveValue('');
  });

  test('быстрая отправка показывает предупреждение и не отправляет запрос', async ({ page }) => {
    let requests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/submit.php')) requests += 1;
    });

    const form = await prepare(page);
    await fillValid(form);
    await form.locator('button[type="submit"]').click();

    await expect(form.locator('[data-form-status]')).toContainText('внимательнее');
    expect(requests).toBe(0);
  });

  test('повторная отправка после сброса проходит', async ({ page }) => {
    let requests = 0;
    await page.route('**/api/submit.php', async (route) => {
      requests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    const form = await prepare(page);

    await fillValid(form);
    await waitForTiming(page);
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[data-form-status]')).toContainText('Заявка отправлена');

    await fillValid(form);
    await waitForTiming(page);
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[data-form-status]')).toContainText('Заявка отправлена');

    expect(requests).toBe(2);
  });

  test('429: показывает сообщение о превышении лимита', async ({ page }) => {
    await page.route('**/api/submit.php', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: { code: 'rate_limited', message: 'Слишком много заявок. Попробуйте позже.' },
        }),
      });
    });

    const form = await prepare(page);
    await fillValid(form);
    await waitForTiming(page);
    await form.locator('button[type="submit"]').click();

    await expect(form.locator('[data-form-status]')).toContainText('Слишком много заявок');
  });

  test('500: показывает сообщение об ошибке сервера', async ({ page }) => {
    await page.route('**/api/submit.php', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: { code: 'server_error', message: 'Внутренняя ошибка сервера. Попробуйте позже.' },
        }),
      });
    });

    const form = await prepare(page);
    await fillValid(form);
    await waitForTiming(page);
    await form.locator('button[type="submit"]').click();

    await expect(form.locator('[data-form-status]')).toContainText('Внутренняя ошибка');
  });

  test('502: показывает сообщение о недоступности Telegram', async ({ page }) => {
    await page.route('**/api/submit.php', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: { code: 'telegram_failed', message: 'Не удалось отправить заявку. Попробуйте ещё раз.' },
        }),
      });
    });

    const form = await prepare(page);
    await fillValid(form);
    await waitForTiming(page);
    await form.locator('button[type="submit"]').click();

    await expect(form.locator('[data-form-status]')).toContainText('Не удалось отправить заявку');
  });

  test('XSS в имени не исполняется и заявка принимается', async ({ page }) => {
    const form = await prepare(page);
    let dialogShown = false;
    page.on('dialog', async (dialog) => {
      dialogShown = true;
      await dialog.dismiss();
    });

    await form
      .locator('input[name="name"]')
      .fill('<img src=x onerror="window.__xss = 1">');
    await form.locator('input[name="phone"]').fill(uniquePhone());
    await form.locator('input[name="consent-pd"]').check();
    await waitForTiming(page);
    await form.locator('button[type="submit"]').click();

    await expect(form.locator('[data-form-status]')).toContainText('Заявка отправлена');
    expect(dialogShown).toBe(false);
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__xss)).toBeUndefined();
  });

  test('ошибка валидации: aria-invalid, описание и фокус на поле', async ({ page }) => {
    await page.route('**/api/submit.php', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: {
            code: 'validation',
            field: 'phone',
            message: 'Укажите корректный номер телефона.',
          },
        }),
      });
    });

    const form = await prepare(page);
    await fillValid(form);
    await waitForTiming(page);
    await form.locator('button[type="submit"]').click();

    const phone = form.locator('input[name="phone"]');
    const error = form.locator('[data-field-error="phone"]');

    await expect(phone).toHaveAttribute('aria-invalid', 'true');
    await expect(phone).toHaveAttribute('aria-describedby', 'order-form-phone-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Укажите корректный номер телефона');
    await expect(phone).toBeFocused();

    const results = await new AxeBuilder({ page }).include('#order-form').analyze();
    expect(results.violations.filter((violation) => violation.impact === 'critical')).toEqual([]);
  });
});

test.describe('Конверсии после успешной заявки', () => {
  test('отправляет generate_lead и рекламную цель при согласии', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'kiberstol-consent',
        JSON.stringify({ analytics: true, marketing: true }),
      );
    });

    await page.route('**/api/submit.php', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    const form = await prepare(page);
    await page.evaluate(() => {
      const tracking = window as unknown as Record<string, unknown>;
      tracking.__events = [];
      tracking.gtag = (...args: unknown[]) => {
        (tracking.__events as unknown[][]).push(['gtag', ...args]);
      };
      tracking.ym = (...args: unknown[]) => {
        (tracking.__events as unknown[][]).push(['ym', ...args]);
      };
      document.body.dataset.ga4Id = 'G-TEST';
      document.body.dataset.yandexMetrikaId = '123';
      document.body.dataset.googleAdsId = 'AW-TEST';
      document.body.dataset.yandexDirectId = '456';
    });

    await fillValid(form);
    await waitForTiming(page);
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[data-form-status]')).toContainText('Заявка отправлена');

    const events = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__events as unknown[][],
    );
    const serialized = JSON.stringify(events);

    expect(serialized).toContain('generate_lead');
    expect(serialized).toContain('reachGoal');
    expect(serialized).toContain('conversion');
  });

  test('без согласия события не отправляются', async ({ page }) => {
    await page.route('**/api/submit.php', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    const form = await prepare(page);
    await page.evaluate(() => {
      const tracking = window as unknown as Record<string, unknown>;
      tracking.__events = [];
      tracking.gtag = (...args: unknown[]) => {
        (tracking.__events as unknown[][]).push(['gtag', ...args]);
      };
      tracking.ym = (...args: unknown[]) => {
        (tracking.__events as unknown[][]).push(['ym', ...args]);
      };
      document.body.dataset.ga4Id = 'G-TEST';
      document.body.dataset.yandexMetrikaId = '123';
      document.body.dataset.googleAdsId = 'AW-TEST';
      document.body.dataset.yandexDirectId = '456';
    });

    await fillValid(form);
    await waitForTiming(page);
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[data-form-status]')).toContainText('Заявка отправлена');

    const events = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__events as unknown[][],
    );
    expect(events).toHaveLength(0);
  });
});

test.describe('Форма без JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('HTML содержит noscript с телефоном и форма доступна', async ({ page, request }) => {
    const response = await request.get('/');
    const html = await response.text();

    // HTML-фолбэк отдаётся сервером всегда (не зависит от гидрации JS).
    expect(html).toContain('Если форма не отправляется, позвоните');
    expect(html).toMatch(/<noscript>[\s\S]*href="tel:\+375/);

    // Парсим полученный HTML без JS: noscript-контент должен быть виден.
    // getByText не индексирует текст внутри <noscript>, поэтому берём locator.
    await page.setContent(html);
    await expect(page.locator('#order-form noscript p')).toContainText(
      'Если форма не отправляется, позвоните',
    );
    await expect(page.locator('#order-form noscript a[href^="tel:"]')).toBeVisible();

    // Без JS форма остаётся в разметке и доступна для нативного POST.
    await page.goto('/#contacts');
    await expect(page.locator('#order-form')).toBeVisible();
    await expect(page.locator('#order-form input[name="name"]')).toBeVisible();
    await expect(page.locator('#order-form button[type="submit"]')).toBeVisible();
  });
});
