/**
 * app.ts — точка входа клиентских скриптов (bootstrap).
 * Вызывается на `astro:page-load` из BaseLayout.
 *
 * Подключает все функциональные модули Фазы 5:
 * consent, cookie-consent, analytics, advertising, form,
 * carousel, lightbox, faq, reveal, menu.
 */
import { initMenu } from './menu';
import { initForm } from './form';
import { initCarousel } from './carousel';
import { initLightbox } from './lightbox';
import { initFaq } from './faq';
import { initReveal } from './reveal';
import { initCookieConsent } from './cookie-consent';
import { initAnalytics } from './analytics';
import { initAdvertising } from './advertising';

export function initPage(): void {
  initMenu();
  initForm();
  initCarousel();
  initLightbox();
  initFaq();
  initReveal();
  initCookieConsent();
  initAnalytics();
  initAdvertising();
}