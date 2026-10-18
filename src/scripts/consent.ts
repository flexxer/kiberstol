/**
 * consent.ts — модель гранулярного согласия (cookie-consent).
 *
 * Хранит согласие пользователя по категориям `analytics` и `marketing`
 * в localStorage (ключ `kiberstol-consent`). Предоставляет API для чтения,
 * записи и отзыва согласия, а также подписку на изменения.
 *
 * Согласие гранулярное (Закон РБ № 99-З о персональных данных):
 * пользователь может отдельно согласиться на аналитику и отдельно на рекламу.
 */

export type ConsentCategory = 'analytics' | 'marketing';

export interface ConsentState {
  /** true — согласие дано, false — отказ, undefined — решение не принято */
  analytics?: boolean;
  marketing?: boolean;
}

const STORAGE_KEY = 'kiberstol-consent';

type Listener = (state: ConsentState) => void;

const listeners = new Set<Listener>();

/** Читает текущее состояние согласия из localStorage. */
export function getConsent(): ConsentState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConsentState) : {};
  } catch {
    return {};
  }
}

/** Сохраняет состояние согласия и уведомляет подписчиков. */
export function setConsent(state: ConsentState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* localStorage может быть недоступен (private mode) — игнорируем */
  }
  listeners.forEach((fn) => fn(state));
}

/** Проверяет, дано ли согласие по конкретной категории. */
export function hasConsent(category: ConsentCategory): boolean {
  return getConsent()[category] === true;
}

/** Подписка на изменения согласия (возвращает функцию отписки). */
export function onConsentChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}