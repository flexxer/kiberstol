/**
 * cookie-consent.ts — UI баннера cookie-согласия.
 *
 * Показывает баннер с гранулярным выбором: аналитика и маркетинг.
 * Пользователь может принять всё, отказаться или выбрать категории.
 * После решения баннер скрывается, состояние сохраняется через `consent.ts`.
 *
 * Баннер рендерится в `BaseLayout.astro` (элемент `#cookie-banner`) и по
 * умолчанию скрыт атрибутом `hidden`, чтобы не было FOUC. Показ/скрытие
 * выполняется через атрибут `hidden`, а не удаление из DOM — это позволяет
 * повторно открыть баннер по ссылке «Настройки cookie» в футере.
 */
import { getConsent, setConsent, type ConsentState } from './consent';

function getBanner(): HTMLElement | null {
  return document.getElementById('cookie-banner');
}

/** Синхронизирует чекбоксы баннера с сохранённым состоянием согласия. */
function syncInputs(banner: HTMLElement): void {
  const state = getConsent();
  const analyticsInput = banner.querySelector<HTMLInputElement>(
    'input[name="consent-analytics"]',
  );
  const marketingInput = banner.querySelector<HTMLInputElement>(
    'input[name="consent-marketing"]',
  );
  if (analyticsInput) analyticsInput.checked = state.analytics === true;
  if (marketingInput) marketingInput.checked = state.marketing === true;
}

/** Показывает баннер и синхронизирует его состояние. */
function showBanner(banner: HTMLElement): void {
  syncInputs(banner);
  banner.hidden = false;
}

/** Скрывает баннер, не удаляя его из DOM. */
function hideBanner(banner: HTMLElement): void {
  banner.hidden = true;
}

/**
 * Навешивает обработчики на кнопки баннера. Идемпотентно: повторный вызов
 * не создаёт дублирующихся слушателей.
 */
function bindBanner(banner: HTMLElement): void {
  if (banner.dataset.bound === 'true') return;
  banner.dataset.bound = 'true';

  const analyticsInput = banner.querySelector<HTMLInputElement>(
    'input[name="consent-analytics"]',
  );
  const marketingInput = banner.querySelector<HTMLInputElement>(
    'input[name="consent-marketing"]',
  );

  const apply = (state: ConsentState) => {
    setConsent(state);
    hideBanner(banner);
  };

  banner.querySelector('[data-consent="accept-all"]')?.addEventListener('click', () => {
    apply({ analytics: true, marketing: true });
  });

  banner.querySelector('[data-consent="reject-all"]')?.addEventListener('click', () => {
    apply({ analytics: false, marketing: false });
  });

  banner.querySelector('[data-consent="save"]')?.addEventListener('click', () => {
    apply({
      analytics: analyticsInput?.checked ?? false,
      marketing: marketingInput?.checked ?? false,
    });
  });
}

/**
 * Открывает баннер повторно (например, по ссылке «Настройки cookie» в футере).
 * Экспортируется для использования из других модулей.
 */
export function openConsentBanner(): void {
  const banner = getBanner();
  if (!banner) return;
  bindBanner(banner);
  showBanner(banner);
}

export function initCookieConsent(): void {
  const banner = getBanner();
  if (!banner) return;

  // Обработчики нужны всегда: баннер можно открыть повторно из футера.
  bindBanner(banner);

  // Ссылки/кнопки «Настройки cookie» в любом месте страницы.
  document.querySelectorAll<HTMLElement>('[data-open-consent]').forEach((trigger) => {
    if (trigger.dataset.bound === 'true') return;
    trigger.dataset.bound = 'true';
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      showBanner(banner);
    });
  });

  // Если решение уже принято — баннер остаётся скрытым.
  const existing = getConsent();
  if (existing.analytics !== undefined || existing.marketing !== undefined) {
    hideBanner(banner);
    return;
  }

  showBanner(banner);
}
