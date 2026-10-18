/**
 * hero.ts — управление фоновым видео в hero-сцене.
 *
 * Уважает `prefers-reduced-motion`: при включённой настройке видео
 * не проигрывается (остаётся статичный постер), чтобы не вызывать
 * дискомфорт у пользователей с чувствительностью к движению.
 */
export function initHero(): void {
  const video = document.querySelector<HTMLVideoElement>('.hero-video video');
  if (!video) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    video.pause();
    video.removeAttribute('autoplay');
  }
}