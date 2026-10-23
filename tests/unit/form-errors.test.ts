import { describe, expect, it } from 'vitest';
import {
  FORM_ERROR_MESSAGES,
  FORM_FIELD_MESSAGES,
  extractErrorPayload,
  isFormErrorCode,
  resolveFormError,
  type FormErrorCode,
} from '../../src/lib/form-errors';

describe('form-errors — справочники', () => {
  it('содержит непустое сообщение для каждого кода', () => {
    (Object.keys(FORM_ERROR_MESSAGES) as FormErrorCode[]).forEach((code) => {
      expect(FORM_ERROR_MESSAGES[code].trim()).not.toBe('');
    });
  });

  it('содержит уточнения для телефона и согласия', () => {
    expect(FORM_FIELD_MESSAGES.phone).toContain('телефон');
    expect(FORM_FIELD_MESSAGES['consent-pd']).toContain('согласие');
  });
});

describe('isFormErrorCode', () => {
  it('распознаёт известные коды', () => {
    expect(isFormErrorCode('validation')).toBe(true);
    expect(isFormErrorCode('rate_limited')).toBe(true);
  });

  it('отклоняет неизвестные и нестроковые значения', () => {
    expect(isFormErrorCode('boom')).toBe(false);
    expect(isFormErrorCode(42)).toBe(false);
    expect(isFormErrorCode(null)).toBe(false);
  });
});

describe('extractErrorPayload', () => {
  it('извлекает вложенный объект error', () => {
    expect(
      extractErrorPayload({
        ok: false,
        error: { code: 'validation', field: 'phone', message: 'x' },
      }),
    ).toEqual({ code: 'validation', field: 'phone', message: 'x' });
  });

  it('поддерживает плоский объект ошибки', () => {
    expect(extractErrorPayload({ code: 'rate_limited' })).toEqual({
      code: 'rate_limited',
      field: undefined,
      message: undefined,
    });
  });

  it('возвращает null для не-объектов', () => {
    expect(extractErrorPayload(null)).toBeNull();
    expect(extractErrorPayload('error')).toBeNull();
  });
});

describe('resolveFormError', () => {
  it('сопоставляет код с сообщением', () => {
    expect(resolveFormError({ error: { code: 'consent_required' } })).toEqual({
      code: 'consent_required',
      message: FORM_ERROR_MESSAGES.consent_required,
      field: undefined,
    });
  });

  it('использует уточнение по полю для validation', () => {
    expect(resolveFormError({ error: { code: 'validation', field: 'phone' } })).toEqual({
      code: 'validation',
      message: FORM_FIELD_MESSAGES.phone,
      field: 'phone',
    });
  });

  it('возвращает общее сообщение для неизвестного поля', () => {
    expect(resolveFormError({ error: { code: 'validation', field: 'unknown' } }).message).toBe(
      FORM_ERROR_MESSAGES.validation,
    );
  });

  it('использует fallback для неизвестного кода и текст сервера', () => {
    expect(resolveFormError({ error: { code: 'boom', message: 'Текст сервера' } })).toEqual({
      code: 'unknown',
      message: 'Текст сервера',
      field: undefined,
    });
  });

  it('игнорирует текст сервера для известного кода', () => {
    expect(
      resolveFormError({ error: { code: 'rate_limited', message: 'Другой текст' } }).message,
    ).toBe(FORM_ERROR_MESSAGES.rate_limited);
  });

  it('возвращает fallback для пустого ответа', () => {
    expect(resolveFormError(null, 'network_error')).toEqual({
      code: 'network_error',
      message: FORM_ERROR_MESSAGES.network_error,
      field: undefined,
    });
  });

  it('поддерживает плоский формат ошибки', () => {
    expect(resolveFormError({ code: 'telegram_failed' }).code).toBe('telegram_failed');
  });
});
