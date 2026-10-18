/**
 * reveal.ts — анимация появления при прокрутке (reveal-on-scroll).
 *
 * Элементы с атрибутом `data-reveal` плавно появляются при попадании
 * в область видимости. Уважает `prefers-reduced-motion`.
 */
export function initReveal(): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (elements.length === 0) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    elements.forEach((el) => el.classList.add('reveal-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );

  elements.forEach((el) => observer.observe(el));
}