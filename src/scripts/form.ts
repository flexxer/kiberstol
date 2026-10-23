/**
 * form.ts — форма заказа (имя + телефон + согласия).
 *
 * Поведение:
 *  - маска телефона `+375 XX XXX-XX-XX` (общий модуль `src/lib/phone.ts`);
 *  - `elapsed` — мс от первого ввода в текстовое поле; сбрасывается при reset;
 *  - honeypot `website` — тихо игнорируем отправку;
 *  - ошибки API разбираются в `{code, field, message}` и показываются
 *    у поля (`aria-invalid` + `aria-describedby`) и в общем статусе;
 *  - запрос ограничен 15 секундами (AbortController);
 *  - кнопка блокируется на время отправки (`disabled`, `aria-busy`);
 *  - после успеха — конверсии `generate_lead` / рекламная цель с учётом согласия.
 *
 * Защита от повторного связывания: `form.dataset.bound`.
 */
import { MIN_FILL_MS, computeElapsed } from '../lib/form-timing';
import { resolveFormError, type FormError, type FormErrorCode } from '../lib/form-errors';
import { formatPhone } from '../lib/phone';
import { trackGenerateLead } from './analytics';
import { trackAdvertisingConversion } from './advertising';

const REQUEST_TIMEOUT_MS = 15_000;

const SUCCESS_MESSAGE = 'Заявка отправлена! Мы свяжемся с вами.';
const SENDING_MESSAGE = 'Отправляем заявку…';
const TOO_FAST_MESSAGE = 'Пожалуйста, заполните форму внимательнее.';

type StatusTone = 'success' | 'error' | 'muted';

const STATUS_CLASSES: Record<StatusTone, string> = {
  success: 'mt-3 text-sm text-primary',
  error: 'mt-3 text-sm text-red-500',
  muted: 'mt-3 text-sm text-muted',
};

/** Проверяет, что значение — обычный объект. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Показывает сообщение в общем статусе формы. */
function setStatus(form: HTMLFormElement, message: string, tone: StatusTone): void {
  let status = form.querySelector<HTMLElement>('[data-form-status]');
  if (!status) {
    status = document.createElement('p');
    status.setAttribute('data-form-status', '');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    form.appendChild(status);
  }

  status.textContent = message;
  status.className = STATUS_CLASSES[tone];
}

/** Сбрасывает ошибки полей. */
function clearFieldErrors(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLElement>('[data-field-error]').forEach((element) => {
    element.hidden = true;
    element.textContent = '';
  });

  form.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach((element) => {
    element.removeAttribute('aria-invalid');
  });
}

/** Показывает ошибку у конкретного поля и переводит на него фокус. */
function showFieldError(form: HTMLFormElement, field: string, message: string): void {
  const errorElement = form.querySelector<HTMLElement>(`[data-field-error="${field}"]`);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.hidden = false;
  }

  const control = form.querySelector<HTMLElement>(`[name="${field}"]`);
  if (control) {
    control.setAttribute('aria-invalid', 'true');
    // Honeypot не фокусируем: поле off-screen.
    if (field !== 'website' && typeof control.focus === 'function') {
      control.focus();
    }
  }
}

/** Показывает структурированную ошибку API. */
function showError(form: HTMLFormElement, error: FormError): void {
  setStatus(form, error.message, 'error');
  if (error.field) {
    showFieldError(form, error.field, error.message);
  }
}

/** Код ошибки по HTTP-статусу, если тело ответа не распознано. */
function fallbackCodeForStatus(status: number): FormErrorCode {
  if (status === 403) return 'forbidden_origin';
  if (status === 405) return 'method_not_allowed';
  if (status === 429) return 'rate_limited';
  if (status === 503) return 'not_configured';
  if (status >= 500) return 'server_error';
  return 'unknown';
}

/** Читает JSON-тело ответа, если оно есть. */
async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Переключает состояние кнопки отправки. */
function setSubmitting(form: HTMLFormElement, submitting: boolean): void {
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const label = button?.querySelector<HTMLElement>('[data-submit-label]') ?? null;

  if (label && !label.dataset.defaultLabel) {
    label.dataset.defaultLabel = label.textContent?.trim() || 'Отправить заявку';
  }

  if (button) {
    button.disabled = submitting;
    button.setAttribute('aria-busy', submitting ? 'true' : 'false');
  }

  if (label) {
    label.textContent = submitting
      ? 'Отправка…'
      : label.dataset.defaultLabel ?? 'Отправить заявку';
  }
}

/** Применяет маску телефона к полю. */
function applyPhoneMask(input: HTMLInputElement): void {
  if (input.dataset.maskBound === 'true') return;
  input.dataset.maskBound = 'true';

  const format = (): void => {
    input.value = formatPhone(input.value);
  };

  input.addEventListener('input', format);

  // Показываем «+375» сразу при фокусе, даже если пользователь ещё ничего не вводил.
  input.addEventListener('focus', () => {
    if (input.value === '') input.value = '+375';
  });

  // Убираем неполный «+375» при потере фокуса, чтобы не скрывать пустой ввод.
  input.addEventListener('blur', () => {
    if (input.value === '+375') input.value = '';
  });
}

/** Настраивает одну форму; повторный вызов безопасен. */
function setupForm(form: HTMLFormElement): void {
  if (form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  const phoneInput = form.querySelector<HTMLInputElement>('input[name="phone"]');
  if (phoneInput) applyPhoneMask(phoneInput);

  const elapsedInput = form.querySelector<HTMLInputElement>('input[name="elapsed"]');
  const tsInput = form.querySelector<HTMLInputElement>('input[name="ts"]');
  const pageInput = form.querySelector<HTMLInputElement>('input[name="page"]');

  const stampTs = (): void => {
    if (tsInput) tsInput.value = String(Math.floor(Date.now() / 1000));
  };

  const stampPage = (): void => {
    if (pageInput) pageInput.value = window.location.pathname;
  };

  // `startedAt` — момент первого ввода в текстовое поле. Чекбоксы и hidden
  // не считаются, чтобы автозаполнение и клик по согласию не давали ложный
  // «слишком быстрый» результат.
  let startedAt: number | null = null;

  const markStart = (event: Event): void => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement &&
      (target.type === 'checkbox' || target.type === 'hidden' || target.type === 'radio')
    ) {
      return;
    }
    if (startedAt === null) startedAt = Date.now();
  };

  form.addEventListener('input', markStart, { passive: true });

  const resetForm = (): void => {
    form.reset();
    startedAt = null;
    if (elapsedInput) elapsedInput.value = '';
    stampTs();
    stampPage();
    clearFieldErrors(form);
  };

  stampTs();
  stampPage();

  let inFlight = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (inFlight) return;

    clearFieldErrors(form);

    // Honeypot: скрытое поле должно оставаться пустым.
    const honeypot = form.querySelector<HTMLInputElement>('input[name="website"]');
    if (honeypot && honeypot.value !== '') {
      // Бот — молча «принимаем», но ничего не отправляем.
      resetForm();
      return;
    }

    // Тайминг от первого ввода. Если ввода не было (автозаполнение),
    // elapsed не отправляем — сервер использует legacy `ts`.
    const elapsed = startedAt === null ? null : computeElapsed(startedAt);
    if (elapsed !== null && elapsed < MIN_FILL_MS) {
      setStatus(form, TOO_FAST_MESSAGE, 'error');
      return;
    }

    if (elapsedInput) {
      elapsedInput.value = elapsed === null ? '' : String(elapsed);
    }

    inFlight = true;
    setSubmitting(form, true);
    setStatus(form, SENDING_MESSAGE, 'muted');

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      const body = await readJson(response);
      const failed = !response.ok || (isRecord(body) && body.ok === false);

      if (!failed) {
        resetForm();
        setStatus(form, SUCCESS_MESSAGE, 'success');
        // Конверсии отправляются только при наличии соответствующего согласия.
        trackGenerateLead({ form_id: form.id });
        trackAdvertisingConversion('lead');
        return;
      }

      showError(form, resolveFormError(body, fallbackCodeForStatus(response.status)));
    } catch {
      const code: FormErrorCode = controller.signal.aborted ? 'timeout' : 'network_error';
      showError(form, resolveFormError(null, code));
    } finally {
      window.clearTimeout(timeoutId);
      inFlight = false;
      setSubmitting(form, false);
    }
  });
}

/** Инициализирует все формы заявок на странице. */
export function initForm(): void {
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form[data-form]'));

  // Совместимость со старым id, если разметка ещё не обновлена.
  const legacy = document.getElementById('order-form');
  if (legacy instanceof HTMLFormElement && !forms.includes(legacy)) {
    forms.push(legacy);
  }

  forms.forEach(setupForm);
}
