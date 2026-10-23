/**
 * lightbox.ts — лайтбокс для галереи изображений.
 *
 * Открывает полноэкранный просмотр по клику на `.gallery-item`
 * (см. Gallery.astro). Закрытие: Esc, клик по фону, кнопка «×».
 * Появление/закрытие анимированы (fade + scale).
 */
export function initLightbox(): void {
  const items = document.querySelectorAll<HTMLAnchorElement>('.gallery-item');
  if (items.length === 0) return;

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
  const caption = document.createElement('figcaption');
  caption.className = 'mt-2 text-center text-sm text-white';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'absolute right-4 top-4 text-3xl text-white';
  closeBtn.setAttribute('aria-label', 'Закрыть');
  closeBtn.textContent = '×';

  figure.append(img, caption);
  overlay.append(figure, closeBtn);
  document.body.appendChild(overlay);

  let closeTimer: number | undefined;

  const open = (item: HTMLAnchorElement) => {
    window.clearTimeout(closeTimer);
    img.src = item.href;
    img.alt = item.querySelector('img')?.alt ?? '';
    caption.textContent = item.dataset.caption ?? '';
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

  items.forEach((item) => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      open(item);
    });
  });

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}
