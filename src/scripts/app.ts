/**
 * app.ts — точка входа клиентских скриптов (bootstrap).
 * Вызывается на `astro:page-load` из BaseLayout.
 *
 * Фаза 5 расширит этот файл: подключение consent, analytics,
 * advertising, carousel, lightbox, faq, reveal, menu.
 */
import { initMenu } from './menu';

export function initPage(): void {
  initMenu();
}