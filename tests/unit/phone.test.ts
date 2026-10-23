import { describe, expect, it } from 'vitest';
import {
  COUNTRY_CODE,
  NATIONAL_LENGTH,
  PHONE_LENGTH,
  formatPhone,
  isValidByPhone,
  nationalPhoneDigits,
  normalizePhone,
} from '../../src/lib/phone';

describe('phone — константы', () => {
  it('код страны и длины соответствуют контракту', () => {
    expect(COUNTRY_CODE).toBe('375');
    expect(NATIONAL_LENGTH).toBe(9);
    expect(PHONE_LENGTH).toBe(12);
  });
});

describe('nationalPhoneDigits', () => {
  it('извлекает национальную часть из полного номера', () => {
    expect(nationalPhoneDigits('375296377663')).toBe('296377663');
  });

  it('игнорирует форматирование', () => {
    expect(nationalPhoneDigits('+375 (29) 637-76-63')).toBe('296377663');
  });

  it('принимает номер без кода страны', () => {
    expect(nationalPhoneDigits('296377663')).toBe('296377663');
  });

  it('преобразует устаревший префикс 80', () => {
    expect(nationalPhoneDigits('80296377663')).toBe('296377663');
  });

  it('преобразует префикс 80 после кода страны (маска +375)', () => {
    expect(nationalPhoneDigits('37580296377663')).toBe('296377663');
  });

  it('возвращает пустую строку для пустого ввода', () => {
    expect(nationalPhoneDigits('')).toBe('');
    expect(nationalPhoneDigits('375')).toBe('');
  });

  it('обрезает лишние цифры до 9', () => {
    expect(nationalPhoneDigits('296377663999')).toBe('296377663');
  });
});

describe('normalizePhone', () => {
  it('нормализует номер без кода страны', () => {
    expect(normalizePhone('296377663')).toBe('375296377663');
  });

  it('нормализует номер с префиксом 80', () => {
    expect(normalizePhone('80296377663')).toBe('375296377663');
  });

  it('нормализует полный номер', () => {
    expect(normalizePhone('375296377663')).toBe('375296377663');
  });

  it('нормализует номер с форматированием', () => {
    expect(normalizePhone('+375 (29) 637-76-63')).toBe('375296377663');
  });

  it('возвращает пустую строку для неполного номера', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('29637766')).toBe('');
    expect(normalizePhone('37529637766')).toBe('');
  });

  it('отклоняет лишние цифры', () => {
    expect(normalizePhone('3752963776639')).toBe('');
    expect(normalizePhone('2963776639')).toBe('');
  });

  it('игнорирует нецифровые символы', () => {
    expect(normalizePhone('+375 29 637 76 63')).toBe('375296377663');
  });
});

describe('formatPhone', () => {
  it('форматирует полный номер', () => {
    expect(formatPhone('375296377663')).toBe('+375 29 637-76-63');
    expect(formatPhone('296377663')).toBe('+375 29 637-76-63');
    expect(formatPhone('80296377663')).toBe('+375 29 637-76-63');
    expect(formatPhone('37580296377663')).toBe('+375 29 637-76-63');
  });

  it('возвращает частичную маску по мере ввода', () => {
    expect(formatPhone('')).toBe('+375');
    expect(formatPhone('2')).toBe('+375 2');
    expect(formatPhone('29')).toBe('+375 29');
    expect(formatPhone('296')).toBe('+375 29 6');
    expect(formatPhone('2963')).toBe('+375 29 63');
    expect(formatPhone('29637')).toBe('+375 29 637');
    expect(formatPhone('2963776')).toBe('+375 29 637-76');
    expect(formatPhone('29637766')).toBe('+375 29 637-76-6');
  });

  it('не выходит за пределы маски', () => {
    expect(formatPhone('296377663999')).toBe('+375 29 637-76-63');
  });
});

describe('isValidByPhone', () => {
  it('принимает корректные номера в любом формате', () => {
    expect(isValidByPhone('296377663')).toBe(true);
    expect(isValidByPhone('80296377663')).toBe(true);
    expect(isValidByPhone('+375 (29) 637-76-63')).toBe(true);
  });

  it('отклоняет неполные и лишние номера', () => {
    expect(isValidByPhone('')).toBe(false);
    expect(isValidByPhone('123456')).toBe(false);
    expect(isValidByPhone('3752963776639')).toBe(false);
  });
});
