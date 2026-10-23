/**
 * phone.ts — нормализация и форматирование белорусских номеров телефонов.
 *
 * Единый источник правды для клиента (маска ввода) и контракта API:
 * номер приводится к виду `375XXXXXXXXX` (ровно 12 цифр).
 *
 * Поддерживаемые варианты ввода:
 *  - `296377663`        → `375296377663` (национальный номер без кода страны);
 *  - `80296377663`      → `375296377663` (устаревший префикс `80`);
 *  - `375296377663`     → `375296377663`;
 *  - `+375 (29) 637-76-63` → `375296377663`.
 */

/** Код страны Беларуси. */
export const COUNTRY_CODE = '375';

/** Количество цифр национального номера (без кода страны). */
export const NATIONAL_LENGTH = 9;

/** Полная длина нормализованного номера. */
export const PHONE_LENGTH = COUNTRY_CODE.length + NATIONAL_LENGTH;

/**
 * Извлекает до 9 цифр национального номера.
 *
 * Используется маской ввода: пользователь может набирать номер с `+375`,
 * с ведущим `80` или без кода страны — маска всегда показывает национальную часть.
 */
export function nationalPhoneDigits(input: string): string {
  let digits = (input ?? '').replace(/\D/g, '');

  // Сначала отбрасываем код страны (маска добавляет `+375` при фокусе),
  // затем — устаревший национальный префикс `80`.
  if (digits.startsWith(COUNTRY_CODE)) {
    digits = digits.slice(COUNTRY_CODE.length);
  }
  if (digits.startsWith('80') && digits.length > 2) {
    digits = digits.slice(2);
  }

  return digits.slice(0, NATIONAL_LENGTH);
}

/**
 * Нормализует телефон до `375XXXXXXXXX`.
 *
 * Возвращает пустую строку, если номер неполный или содержит лишние цифры.
 */
export function normalizePhone(input: string): string {
  let digits = (input ?? '').replace(/\D/g, '');

  // Устаревший национальный префикс `80` → код страны `375`.
  if (digits.startsWith('80') && digits.length === COUNTRY_CODE.length + 8) {
    digits = COUNTRY_CODE + digits.slice(2);
  }

  const national = digits.startsWith(COUNTRY_CODE)
    ? digits.slice(COUNTRY_CODE.length)
    : digits;

  if (national.length !== NATIONAL_LENGTH) return '';
  return COUNTRY_CODE + national;
}

/**
 * Форматирует телефон в маску `+375 XX XXX-XX-XX`.
 *
 * Для неполного ввода возвращает частично заполненную маску
 * (`+375`, `+375 29`, `+375 29 637-76-63`).
 */
export function formatPhone(input: string): string {
  const digits = nationalPhoneDigits(input);

  let result = '+375';
  if (digits.length > 0) result += ` ${digits.slice(0, 2)}`;
  if (digits.length > 2) result += ` ${digits.slice(2, 5)}`;
  if (digits.length > 5) result += `-${digits.slice(5, 7)}`;
  if (digits.length > 7) result += `-${digits.slice(7, 9)}`;

  return result;
}

/** Проверяет, что ввод даёт корректный нормализованный номер. */
export function isValidByPhone(input: string): boolean {
  return normalizePhone(input) !== '';
}
