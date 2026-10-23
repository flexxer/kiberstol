/**
 * form-timing.ts — тайминг заполнения формы.
 *
 * `elapsed` — миллисекунды от первого ввода пользователя. В отличие от
 * unix-метки `ts`, не зависит от расхождения часов клиента и сервера.
 *
 * Контракт API: допустимый диапазон `3000…86400000` мс
 * (не быстрее 3 секунд и не старше 24 часов).
 */

/** Минимальное время заполнения формы (3 секунды). */
export const MIN_FILL_MS = 3_000;

/** Максимальное время заполнения формы (24 часа). */
export const MAX_FILL_MS = 86_400_000;

/**
 * Вычисляет прошедшее время в миллисекундах.
 *
 * Отрицательная разница (часы «ушли назад») приводится к нулю,
 * нечисловые значения — тоже.
 */
export function computeElapsed(startedAt: number, now: number = Date.now()): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0;
  const elapsed = now - startedAt;
  return elapsed > 0 ? Math.round(elapsed) : 0;
}

/** Проверяет, что время заполнения находится в допустимом диапазоне. */
export function isElapsedInRange(elapsed: number): boolean {
  return Number.isFinite(elapsed) && elapsed >= MIN_FILL_MS && elapsed <= MAX_FILL_MS;
}

/** Проверяет, что форма заполнена подозрительно быстро. */
export function isTooFast(elapsed: number): boolean {
  return !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS;
}
