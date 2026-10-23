import { describe, expect, it } from 'vitest';
import {
  MAX_FILL_MS,
  MIN_FILL_MS,
  computeElapsed,
  isElapsedInRange,
  isTooFast,
} from '../../src/lib/form-timing';

describe('form-timing — константы', () => {
  it('диапазон соответствует контракту API', () => {
    expect(MIN_FILL_MS).toBe(3000);
    expect(MAX_FILL_MS).toBe(86_400_000);
  });
});

describe('computeElapsed', () => {
  it('вычисляет разницу между моментами', () => {
    expect(computeElapsed(1_000, 5_000)).toBe(4_000);
  });

  it('округляет дробные миллисекунды', () => {
    expect(computeElapsed(1_000, 1_001.4)).toBe(1);
    expect(computeElapsed(1_000, 1_001.6)).toBe(2);
  });

  it('приводит отрицательную разницу к нулю', () => {
    expect(computeElapsed(5_000, 1_000)).toBe(0);
  });

  it('возвращает ноль для нечисловых значений', () => {
    expect(computeElapsed(Number.NaN, 1_000)).toBe(0);
    expect(computeElapsed(1_000, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('по умолчанию использует текущее время', () => {
    expect(computeElapsed(Date.now() - 10)).toBeGreaterThanOrEqual(10);
  });
});

describe('isElapsedInRange', () => {
  it('принимает границы диапазона', () => {
    expect(isElapsedInRange(MIN_FILL_MS)).toBe(true);
    expect(isElapsedInRange(MAX_FILL_MS)).toBe(true);
  });

  it('отклоняет значения вне диапазона', () => {
    expect(isElapsedInRange(MIN_FILL_MS - 1)).toBe(false);
    expect(isElapsedInRange(MAX_FILL_MS + 1)).toBe(false);
  });

  it('отклоняет нечисловые значения', () => {
    expect(isElapsedInRange(Number.NaN)).toBe(false);
  });
});

describe('isTooFast', () => {
  it('считает слишком быстрой отправку раньше порога', () => {
    expect(isTooFast(MIN_FILL_MS - 1)).toBe(true);
    expect(isTooFast(MIN_FILL_MS)).toBe(false);
  });

  it('считает нечисловое значение подозрительным', () => {
    expect(isTooFast(Number.NaN)).toBe(true);
  });
});
