/**
 * form-errors.ts — коды ошибок API формы и сообщения для пользователя.
 *
 * Контракт ответа: `{ ok: false, error: { code, message, field? } }`.
 * Клиент сопоставляет `code` (и `field` для ошибок валидации) с RU-текстом
 * из этого модуля, поэтому формулировки не дублируются в компонентах.
 */

/** Коды ошибок, которые возвращает `submit.php` (и клиентские коды). */
export type FormErrorCode =
  | 'validation'
  | 'consent_required'
  | 'rate_limited'
  | 'telegram_failed'
  | 'not_configured'
  | 'forbidden_origin'
  | 'method_not_allowed'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'unknown';

/** Сообщения по умолчанию для каждого кода. */
export const FORM_ERROR_MESSAGES: Record<FormErrorCode, string> = {
  validation: 'Проверьте заполнение формы.',
  consent_required: 'Требуется согласие на обработку персональных данных.',
  rate_limited: 'Слишком много заявок. Попробуйте позже.',
  telegram_failed: 'Не удалось отправить заявку. Попробуйте ещё раз.',
  not_configured: 'Сервер временно не принимает заявки. Свяжитесь с нами по телефону.',
  forbidden_origin: 'Отправка заявки с этого адреса запрещена.',
  method_not_allowed: 'Некорректный запрос. Обновите страницу и попробуйте снова.',
  server_error: 'Внутренняя ошибка сервера. Попробуйте позже.',
  network_error: 'Ошибка сети. Проверьте соединение и попробуйте снова.',
  timeout: 'Превышено время ожидания. Попробуйте ещё раз.',
  unknown: 'Не удалось отправить заявку. Попробуйте ещё раз.',
};

/** Уточняющие сообщения для ошибки `validation` по конкретному полю. */
export const FORM_FIELD_MESSAGES: Record<string, string> = {
  name: 'Укажите имя.',
  phone: 'Укажите корректный номер телефона.',
  message: 'Сообщение слишком длинное.',
  'consent-pd': 'Требуется согласие на обработку персональных данных.',
  elapsed: 'Форма заполнена слишком быстро. Попробуйте ещё раз.',
  website: 'Не удалось отправить заявку. Попробуйте ещё раз.',
};

/** Разобранная ошибка формы. */
export interface FormError {
  code: FormErrorCode;
  message: string;
  field?: string;
}

/** Тело ошибки от сервера. */
export interface FormErrorPayload {
  code?: unknown;
  message?: unknown;
  field?: unknown;
}

const KNOWN_CODES = new Set<string>(Object.keys(FORM_ERROR_MESSAGES));

/** Проверяет, что значение — известный код ошибки. */
export function isFormErrorCode(value: unknown): value is FormErrorCode {
  return typeof value === 'string' && KNOWN_CODES.has(value);
}

/** Извлекает объект `error` из ответа API (`{ok:false,error:{…}}` или сам объект). */
export function extractErrorPayload(body: unknown): FormErrorPayload | null {
  if (typeof body !== 'object' || body === null) return null;

  const record = body as Record<string, unknown>;
  const candidate =
    'error' in record && typeof record.error === 'object' && record.error !== null
      ? (record.error as Record<string, unknown>)
      : record;

  return {
    code: candidate.code,
    message: candidate.message,
    field: candidate.field,
  };
}

/**
 * Преобразует ответ API в типизованную ошибку.
 *
 * Для `validation` с известным полем используется уточняющее сообщение.
 * Неизвестный код заменяется на `fallback`; если сервер прислал собственный
 * текст, он используется только для неизвестного кода.
 */
export function resolveFormError(
  payload: unknown,
  fallback: FormErrorCode = 'unknown',
): FormError {
  const data = extractErrorPayload(payload) ?? {};
  const code = isFormErrorCode(data.code) ? data.code : fallback;
  const field = typeof data.field === 'string' && data.field !== '' ? data.field : undefined;

  let message = FORM_ERROR_MESSAGES[code];

  if (code === 'validation' && field && FORM_FIELD_MESSAGES[field]) {
    message = FORM_FIELD_MESSAGES[field];
  } else if (!isFormErrorCode(data.code) && typeof data.message === 'string' && data.message.trim() !== '') {
    message = data.message;
  }

  return { code, message, field };
}
