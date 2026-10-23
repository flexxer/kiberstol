/**
 * product-gallery.ts — галерея на странице товара.
 *
 * Управляет элементами (см. products/[slug].astro):
 *  - `.product-gallery` — контейнер галереи;
 *  - `.product-gallery-main` — главное изображение (`<img>`);
 *  - `.product-gallery-thumb` — миниатюра (кнопка с `data-src`/`data-alt`);
 *  - `.product-gallery-lightbox` — кнопка/ссылка, открывающая лайтбокс.
 *
 * Клик по миниатюре плавно меняет `src`/`alt` главного изображения.
 * Клик по главному изображению открывает полноэкранный лайтбокс
 * с анимацией появления (fade + scale).
 */
export function initProductGallery(): void {
  document
    .querySelectorAll<HTMLElement>('.product-gallery')
    .forEach((gallery) => {
      const main = gallery.querySelector<HTMLImageElement>('.product-gallery-main');
      const thumbs = gallery.querySelectorAll<HTMLElement>('.product-gallery-thumb');
      const lightboxTrigger =
        gallery.querySelector<HTMLElement>('.product-gallery-lightbox');

      if (!main) return;

      // Плавная смена главного изображения: сначала гасим текущее,
      // затем подменяем `src` и проявляем новое после загрузки.
      let swapToken = 0;
      const swapImage = (src: string, alt: string) => {
        // `main.src` всегда абсолютный, `data-src` может быть относительным.
        if (new URL(src, window.location.href).href === main.src) return;
        const token = ++swapToken;
        main.classList.add('opacity-0');
        window.setTimeout(() => {
          if (token !== swapToken) return;
          main.src = src;
          if (alt) main.alt = alt;
        }, 150);
      };
      main.addEventListener('load', () => main.classList.remove('opacity-0'));
      main.addEventListener('error', () => main.classList.remove('opacity-0'));

      // Лайтбокс (переиспользует паттерн lightbox.ts).
      // Фон непрозрачный (`bg-bg`), чтобы фоновая неоновая «маска» страницы
      // не просвечивала сквозь полноэкранный просмотр.
      const overlay = document.createElement('div');
      overlay.className =
        'lightbox fixed inset-0 z-[100] hidden items-center justify-center bg-bg p-4 opacity-0 transition-opacity duration-300';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Просмотр изображения');

      const figure = document.createElement('figure');
      figure.className = 'max-h-full max-w-full';
      const img = document.createElement('img');
      img.className =
        'max-h-[85vh] max-w-full rounded opacity-0 scale-95 transition duration-300';
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'absolute right-4 top-4 text-3xl text-white';
      closeBtn.setAttribute('aria-label', 'Закрыть');
      closeBtn.textContent = '×';

      figure.append(img);
      overlay.append(figure, closeBtn);
      document.body.appendChild(overlay);

      let closeTimer: number | undefined;

      const open = () => {
        window.clearTimeout(closeTimer);
        img.src = main.src;
        img.alt = main.alt;
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        // Форсируем reflow, чтобы transition сработал после снятия `hidden`.
        void overlay.offsetWidth;
        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');
        img.classList.remove('opacity-0', 'scale-95');
        img.classList.add('opacity-100', 'scale-100');
        document.body.style.overflow = 'hidden';
      };
      const close = () => {
        window.clearTimeout(closeTimer);
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0');
        img.classList.remove('opacity-100', 'scale-100');
        img.classList.add('opacity-0', 'scale-95');
        closeTimer = window.setTimeout(() => {
          overlay.classList.add('hidden');
          overlay.classList.remove('flex');
          document.body.style.overflow = '';
        }, 300);
      };

      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
      });

      // Клик по миниатюре — плавная подмена главного изображения.
      thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const src = thumb.dataset.src;
          const alt = thumb.dataset.alt;
          if (src) swapImage(src, alt ?? main.alt);
        });
      });

      // Клик по главному изображению — лайтбокс.
      lightboxTrigger?.addEventListener('click', (event) => {
        event.preventDefault();
        open();
      });
    });
}
