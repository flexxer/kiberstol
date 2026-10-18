/**
 * cookie-consent.ts — UI баннера cookie-согласия.
 *
 * Показывает баннер с гранулярным выбором: аналитика и маркетинг.
 * Пользователь может принять всё, отказаться или выбрать категории.
 * После решения баннер скрывается, состояние сохраняется через `consent.ts`.
 *
 * Баннер рендерится в `BaseLayout.astro` (элемент `#cookie-banner`).
 */
import { getConsent, setConsent, type ConsentState } from './consent';

export function initCookieConsent(): void {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  // Если решение уже принято — не показываем баннер.
  const existing = getConsent();
  if (existing.analytics !== undefined || existing.marketing !== undefined) {
    banner.remove();
    return;
  }

  const analyticsInput = banner.querySelector<HTMLInputElement>(
    'input[name="consent-analytics"]',
  );
  const marketingInput = banner.querySelector<HTMLInputElement>(
    'input[name="consent-marketing"]',
  );

  const apply = (state: ConsentState) => {
    setConsent(state);
    banner.remove();
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