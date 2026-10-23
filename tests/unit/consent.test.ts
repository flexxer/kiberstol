import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Store = Record<string, string>;

interface MockWindow {
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
  addEventListener: (type: string, listener: (event: { key: string | null }) => void) => void;
  dispatchStorage: (key: string | null) => void;
}

function createMockWindow(store: Store): MockWindow {
  const listeners = new Set<(event: { key: string | null }) => void>();
  return {
    localStorage: {
      getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
      setItem: (key, value) => {
        store[key] = value;
      },
      removeItem: (key) => {
        delete store[key];
      },
    },
    addEventListener: (type, listener) => {
      if (type === 'storage') listeners.add(listener);
    },
    dispatchStorage: (key) => {
      listeners.forEach((listener) => listener({ key }));
    },
  };
}

let store: Store;
let mockWindow: MockWindow;

beforeEach(() => {
  vi.resetModules();
  store = {};
  mockWindow = createMockWindow(store);
  vi.stubGlobal('window', mockWindow);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function loadConsent() {
  return import('../../src/scripts/consent');
}

describe('consent', () => {
  it('по умолчанию согласие не дано (default-deny)', async () => {
    const { getConsent, hasConsent } = await loadConsent();

    expect(getConsent()).toEqual({});
    expect(hasConsent('analytics')).toBe(false);
    expect(hasConsent('marketing')).toBe(false);
  });

  it('setConsent сохраняет состояние и уведомляет подписчиков', async () => {
    const { setConsent, getConsent, onConsentChange } = await loadConsent();
    const listener = vi.fn();
    onConsentChange(listener);

    setConsent({ analytics: true, marketing: false });

    expect(getConsent()).toEqual({ analytics: true, marketing: false });
    expect(store['kiberstol-consent']).toBe(
      JSON.stringify({ analytics: true, marketing: false }),
    );
    expect(listener).toHaveBeenCalledWith({ analytics: true, marketing: false });
  });

  it('clearConsent удаляет состояние и уведомляет пустым объектом', async () => {
    const { setConsent, clearConsent, getConsent, onConsentChange } = await loadConsent();
    setConsent({ analytics: true, marketing: true });
    const listener = vi.fn();
    onConsentChange(listener);

    clearConsent();

    expect(getConsent()).toEqual({});
    expect(store['kiberstol-consent']).toBeUndefined();
    expect(listener).toHaveBeenCalledWith({});
  });

  it('игнорирует повреждённые данные в localStorage', async () => {
    store['kiberstol-consent'] = '{not json';
    const { getConsent, hasConsent } = await loadConsent();

    expect(getConsent()).toEqual({});
    expect(hasConsent('analytics')).toBe(false);
  });

  it('игнорирует не-объектные значения в localStorage', async () => {
    for (const raw of ['null', 'true', '[]', '"analytics"']) {
      store['kiberstol-consent'] = raw;
      vi.resetModules();
      const { getConsent, hasConsent } = await loadConsent();

      expect(getConsent()).toEqual({});
      expect(hasConsent('analytics')).toBe(false);
    }
  });

  it('нормализует не-boolean поля', async () => {
    store['kiberstol-consent'] = JSON.stringify({ analytics: 'yes', marketing: 1 });
    const { getConsent } = await loadConsent();

    expect(getConsent()).toEqual({ analytics: undefined, marketing: undefined });
  });

  it('отписывает слушателя', async () => {
    const { setConsent, onConsentChange } = await loadConsent();
    const listener = vi.fn();
    const unsubscribe = onConsentChange(listener);

    unsubscribe();
    setConsent({ analytics: true });

    expect(listener).not.toHaveBeenCalled();
  });

  it('ошибка одного слушателя не мешает остальным', async () => {
    const { setConsent, onConsentChange } = await loadConsent();
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    onConsentChange(bad);
    onConsentChange(good);

    expect(() => setConsent({ analytics: true })).not.toThrow();
    expect(good).toHaveBeenCalledWith({ analytics: true, marketing: undefined });
  });

  it('реагирует на изменение localStorage в другой вкладке', async () => {
    const { onConsentChange } = await loadConsent();
    const listener = vi.fn();
    onConsentChange(listener);

    store['kiberstol-consent'] = JSON.stringify({ analytics: false, marketing: false });
    mockWindow.dispatchStorage('kiberstol-consent');

    expect(listener).toHaveBeenCalledWith({ analytics: false, marketing: false });
  });

  it('игнорирует storage-события других ключей', async () => {
    const { onConsentChange } = await loadConsent();
    const listener = vi.fn();
    onConsentChange(listener);

    mockWindow.dispatchStorage('some-other-key');

    expect(listener).not.toHaveBeenCalled();
  });
});
