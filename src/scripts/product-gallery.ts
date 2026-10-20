/**
 * product-gallery.ts — галерея на странице товара.
 *
 * Управляет элементами (см. products/[slug].astro):
 *  - `.product-gallery` — контейнер галереи;
 *  - `.product-gallery-main` — главное изображение (`<img>`);
 *  - `.product-gallery-thumb` — миниатюра (кнопка с `data-src`/`data-alt`);
 *  - `.product-gallery-lightbox` — кнопка/ссылка, открывающая лайтбокс.
 *
 * Клик по миниатюре меняет `src`/`alt` главного изображения.
 * Клик по главному изображению открывает полноэкранный лайтбокс.
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

      // Лайтбокс (переиспользует паттерн lightbox.ts).
      const overlay = document.createElement('div');
      overlay.className =
        'lightbox fixed inset-0 z-[100] hidden items-center justify-center bg-black/80 p-4';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Просмотр изображения');

      const figure = document.createElement('figure');
      figure.className = 'max-h-full max-w-full';
      const img = document.createElement('img');
      img.className = 'max-h-[85vh] max-w-full rounded';
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'absolute right-4 top-4 text-3xl text-white';
      closeBtn.setAttribute('aria-label', 'Закрыть');
      closeBtn.textContent = '×';

      figure.append(img);
      overlay.append(figure, closeBtn);
      document.body.appendChild(overlay);

      const open = () => {
        img.src = main.src;
        img.alt = main.alt;
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        document.body.style.overflow = 'hidden';
      };
      const close = () => {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        document.body.style.overflow = '';
      };

      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
      });

      // Клик по миниатюре — подмена главного изображения.
      thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const src = thumb.dataset.src;
          const alt = thumb.dataset.alt;
          if (src) main.src = src;
          if (alt) main.alt = alt;
        });
      });

      // Клик по главному изображению — лайтбокс.
      lightboxTrigger?.addEventListener('click', (event) => {
        event.preventDefault();
        open();
      });
    });
}