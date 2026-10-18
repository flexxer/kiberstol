/**
 * carousel.ts — слайдер изображений.
 *
 * Управляет элементами `.carousel` (см. ImageCarousel.astro):
 *  - `.carousel-track` — лента слайдов;
 *  - `.carousel-prev` / `.carousel-next` — кнопки навигации.
 * Поддержка автопрокрутки через `data-autoplay="true"`.
 */
export function initCarousel(): void {
  document.querySelectorAll<HTMLElement>('.carousel').forEach((carousel) => {
    const track = carousel.querySelector<HTMLElement>('.carousel-track');
    const slides = carousel.querySelectorAll<HTMLElement>('.carousel-slide');
    const prev = carousel.querySelector<HTMLElement>('.carousel-prev');
    const next = carousel.querySelector<HTMLElement>('.carousel-next');

    if (!track || slides.length === 0) return;

    let index = 0;
    let timer: number | undefined;

    const goTo = (i: number) => {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
    };

    const startAutoplay = () => {
      if (carousel.dataset.autoplay !== 'true') return;
      stopAutoplay();
      timer = window.setInterval(() => goTo(index + 1), 5000);
    };
    const stopAutoplay = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };

    prev?.addEventListener('click', () => {
      goTo(index - 1);
      startAutoplay();
    });
    next?.addEventListener('click', () => {
      goTo(index + 1);
      startAutoplay();
    });

    // Пауза при наведении.
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);

    startAutoplay();
  });
}