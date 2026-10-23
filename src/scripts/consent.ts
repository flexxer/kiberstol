/**
 * consent.ts — модель гранулярного согласия (cookie-consent).
 *
 * Хранит согласие пользователя по категориям `analytics` и `marketing`
 * в localStorage (ключ `kiberstol-consent`). Предоставляет API для чтения,
 * записи и отзыва согласия, а также подписку на изменения.
 *
 * Согласие гранулярное (Закон РБ № 99-З о персональных данных):
 * пользователь может отдельно согласиться на аналитику и отдельно на рекламу.
 *
 * Важно: по умолчанию согласие НЕ дано. Любая категория считается
 * запрещённой, пока пользователь явно не установит `true`.
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

/** Проверяет, что распарсенное значение — объект состояния согласия. */
function isConsentState(value: unknown): value is ConsentState {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Нормализует произвольный объект к `ConsentState` (только boolean-поля). */
function normalizeState(value: unknown): ConsentState {
  if (!isConsentState(value)) return {};
  return {
    analytics: typeof value.analytics === 'boolean' ? value.analytics : undefined,
    marketing: typeof value.marketing === 'boolean' ? value.marketing : undefined,
  };
}

/** Уведомляет подписчиков; ошибка одного слушателя не ломает остальные. */
function notify(state: ConsentState): void {
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch {
      /* слушатель не должен ломать цепочку уведомлений */
    }
  });
}

/** Читает текущее состояние согласия из localStorage. */
export function getConsent(): ConsentState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return normalizeState(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Сохраняет состояние согласия и уведомляет подписчиков. */
export function setConsent(state: ConsentState): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeState(state);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    /* localStorage может быть недоступен (private mode) — игнорируем */
  }
  notify(normalized);
}

/**
 * Отзывает согласие: удаляет сохранённое состояние и уведомляет подписчиков
 * пустым состоянием. Трекеры, подписанные на изменения, выгружаются.
 */
export function clearConsent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* localStorage может быть недоступен (private mode) — игнорируем */
  }
  notify({});
}

/** Проверяет, дано ли согласие по конкретной категории (default-deny). */
export function hasConsent(category: ConsentCategory): boolean {
  return getConsent()[category] === true;
}

/** Подписка на изменения согласия (возвращает функцию отписки). */
export function onConsentChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Синхронизация между вкладками: если пользователь отозвал согласие в другой
 * вкладке, трекеры в текущей должны отключиться немедленно.
 */
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    notify(getConsent());
  });
}
