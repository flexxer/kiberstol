import { expect, test, type APIRequestContext } from '@playwright/test';

const DRY = 'http://127.0.0.1:4324/api/submit.php';
const NOT_CONFIGURED = 'http://127.0.0.1:4325/api/submit.php';
const SUCCESS = 'http://127.0.0.1:4327/api/submit.php';
const FAILURE = 'http://127.0.0.1:4328/api/submit.php';
const MOCK_MESSAGES = 'http://127.0.0.1:4326/messages';

let sequence = 0;

function uniquePhone(): string {
  sequence += 1;
  const suffix = String((Date.now() + sequence) % 10_000_000).padStart(7, '0');
  return `29${suffix}`;
}

function uniqueIp(): string {
  const random = () => Math.floor(Math.random() * 254) + 1;
  return `10.${random()}.${random()}.${random()}`;
}

function formatPhone(national: string): string {
  return `+375 ${national.slice(0, 2)} ${national.slice(2, 5)}-${national.slice(5, 7)}-${national.slice(7, 9)}`;
}

interface PostOptions {
  /** null — не отправлять Origin; undefined — выставить по URL. */
  origin?: string | null;
  ip?: string;
}

async function post(
  request: APIRequestContext,
  url: string,
  data: Record<string, string>,
  options: PostOptions = {},
) {
  const headers: Record<string, string> = {
    'content-type': 'application/x-www-form-urlencoded',
    'x-forwarded-for': options.ip ?? uniqueIp(),
  };

  if (options.origin !== null) {
    headers.origin = options.origin ?? new URL(url).origin;
  }

  return request.post(url, {
    headers,
    data: new URLSearchParams(data).toString(),
  });
}

function validForm(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    name: 'API Тест',
    phone: uniquePhone(),
    'consent-pd': 'on',
    elapsed: '5000',
    ...overrides,
  };
}

async function messages(request: APIRequestContext): Promise<Array<{ chatId: string; text: string; parseMode: string }>> {
  const response = await request.get(MOCK_MESSAGES);
  expect(response.status()).toBe(200);
  return (await response.json()) as Array<{ chatId: string; text: string; parseMode: string }>;
}

test.beforeEach(async ({ request }) => {
  const response = await request.delete(MOCK_MESSAGES);
  expect(response.status()).toBe(200);
});

test.describe('Health-check', () => {
  test('dry-run: configured=false, dryRun=true', async ({ request }) => {
    const response = await request.get(`${DRY}?health=1`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true, configured: false, dryRun: true });
  });

  test('creds заданы: configured=true, dryRun=false', async ({ request }) => {
    const response = await request.get(`${SUCCESS}?health=1`);
    expect(await response.json()).toEqual({ ok: true, configured: true, dryRun: false });
  });

  test('без creds: configured=false, dryRun=false', async ({ request }) => {
    const response = await request.get(`${NOT_CONFIGURED}?health=1`);
    expect(await response.json()).toEqual({ ok: true, configured: false, dryRun: false });
  });
});

test.describe('Метод и origin', () => {
  test('GET без health → 405 и Allow: POST', async ({ request }) => {
    const response = await request.get(DRY);
    expect(response.status()).toBe(405);
    expect(response.headers()['allow']).toBe('POST');
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'method_not_allowed' },
    });
  });

  test('POST без Origin/Referer → 403', async ({ request }) => {
    const response = await post(request, DRY, validForm(), { origin: null });
    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'forbidden_origin' },
    });
  });

  test('POST с чужим Origin → 403', async ({ request }) => {
    const response = await post(request, DRY, validForm(), {
      origin: 'https://evil.example',
    });
    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'forbidden_origin' },
    });
  });

  test('POST с разрешённым Referer → 200 dryRun', async ({ request }) => {
    const response = await request.post(DRY, {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-forwarded-for': uniqueIp(),
        referer: 'http://127.0.0.1:4324/#contacts',
      },
      data: new URLSearchParams(validForm()).toString(),
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true, dryRun: true });
  });
});

test.describe('Валидация', () => {
  test('без consent-pd → 422 consent_required', async ({ request }) => {
    const response = await post(request, DRY, validForm({ 'consent-pd': '' }));
    expect(response.status()).toBe(422);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'consent_required', field: 'consent-pd' },
    });
  });

  test('некорректный телефон → 422 validation phone', async ({ request }) => {
    const response = await post(request, DRY, validForm({ phone: '12345' }));
    expect(response.status()).toBe(422);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'validation', field: 'phone' },
    });
  });

  test('пустое имя → 422 validation name', async ({ request }) => {
    const response = await post(request, DRY, validForm({ name: '   ' }));
    expect(response.status()).toBe(422);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'validation', field: 'name' },
    });
  });

  test('длинное сообщение → 422 validation message', async ({ request }) => {
    const response = await post(request, DRY, validForm({ message: 'x'.repeat(1001) }));
    expect(response.status()).toBe(422);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'validation', field: 'message' },
    });
  });
});

test.describe('Honeypot и тайминг', () => {
  test('honeypot → 200 без Telegram', async ({ request }) => {
    const response = await post(request, SUCCESS, validForm({ website: 'spam' }));
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await messages(request)).toHaveLength(0);
  });

  test('elapsed < 3000 → 200 без Telegram', async ({ request }) => {
    const response = await post(request, SUCCESS, validForm({ elapsed: '1000' }));
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await messages(request)).toHaveLength(0);
  });

  test('elapsed отсутствует, ts свежий → 200 без Telegram', async ({ request }) => {
    const { elapsed: _elapsed, ...withoutElapsed } = validForm();
    const response = await post(request, SUCCESS, {
      ...withoutElapsed,
      ts: String(Math.floor(Date.now() / 1000)),
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await messages(request)).toHaveLength(0);
  });

  test('elapsed отсутствует, ts старый → заявка проходит', async ({ request }) => {
    const phone = uniquePhone();
    const { elapsed: _elapsed, ...withoutElapsed } = validForm({ phone });
    const response = await post(request, SUCCESS, {
      ...withoutElapsed,
      ts: String(Math.floor(Date.now() / 1000) - 60),
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const received = await messages(request);
    expect(received).toHaveLength(1);
    expect(received[0]?.text).toContain(`Телефон: ${formatPhone(phone)}`);
  });
});

test.describe('Режимы отправки', () => {
  test('dry-run → 200 {ok:true,dryRun:true}', async ({ request }) => {
    const response = await post(request, DRY, validForm());
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true, dryRun: true });
  });

  test('без creds и не dry-run → 503 not_configured', async ({ request }) => {
    const response = await post(request, NOT_CONFIGURED, validForm());
    expect(response.status()).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'not_configured' },
    });
  });
});

test.describe('Telegram', () => {
  test('нормализует телефон и передаёт page, согласия', async ({ request }) => {
    const phone = uniquePhone();
    const response = await post(
      request,
      SUCCESS,
      validForm({
        phone: `+375 (${phone.slice(0, 2)}) ${phone.slice(2, 5)}-${phone.slice(5, 7)}-${phone.slice(7, 9)}`,
        'marketing-consent': 'on',
        page: '/products/meta-w',
        message: 'Комментарий',
      }),
    );

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const received = await messages(request);
    expect(received).toHaveLength(1);

    const message = received[0]!;
    expect(message.chatId).toBe('test-chat');
    expect(message.parseMode).toBe('HTML');
    expect(message.text).toContain(`Телефон: ${formatPhone(phone)}`);
    expect(message.text).toContain('Страница: /products/meta-w');
    expect(message.text).toContain('Согласие ПД: да (1)');
    expect(message.text).toContain('Согласие на рекламу: да');
    expect(message.text).toContain('Сообщение: Комментарий');
  });

  test('XSS в имени экранируется для parse_mode=HTML', async ({ request }) => {
    const response = await post(
      request,
      SUCCESS,
      validForm({ name: '<script>alert(1)</script>' }),
    );

    expect(response.status()).toBe(200);

    const message = (await messages(request))[0]!;
    const ampersand = String.fromCharCode(38);
    expect(message.text).toContain(
      `Имя: ${ampersand}lt;script${ampersand}gt;alert(1)${ampersand}lt;/script${ampersand}gt;`,
    );
    expect(message.text).not.toContain('<script>');
  });

  test('ошибка Telegram → 502 telegram_failed', async ({ request }) => {
    const response = await post(request, FAILURE, validForm());
    expect(response.status()).toBe(502);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'telegram_failed' },
    });
  });
});

test.describe('Rate limit', () => {
  test('429 по IP после 5 заявок', async ({ request }) => {
    const ip = uniqueIp();

    for (let index = 0; index < 5; index += 1) {
      const response = await post(request, DRY, validForm(), { ip });
      expect(response.status()).toBe(200);
    }

    const limited = await post(request, DRY, validForm(), { ip });
    expect(limited.status()).toBe(429);
    expect(await limited.json()).toMatchObject({
      ok: false,
      error: { code: 'rate_limited' },
    });
  });

  test('429 по телефону после 3 заявок', async ({ request }) => {
    const phone = uniquePhone();

    for (let index = 0; index < 3; index += 1) {
      const response = await post(request, DRY, validForm({ phone }));
      expect(response.status()).toBe(200);
    }

    const limited = await post(request, DRY, validForm({ phone }));
    expect(limited.status()).toBe(429);
    expect(await limited.json()).toMatchObject({
      ok: false,
      error: { code: 'rate_limited' },
    });
  });
});
