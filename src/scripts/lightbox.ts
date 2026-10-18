/**
 * lightbox.ts — лайтбокс для галереи изображений.
 *
 * Открывает полноэкранный просмотр по клику на `.gallery-item`
 * (см. Gallery.astro). Закрытие: Esc, клик по фону, кнопка «×».
 */
export function initLightbox(): void {
  const items = document.querySelectorAll<HTMLAnchorElement>('.gallery-item');
  if (items.length === 0) return;

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

  const open = (item: HTMLAnchorElement) => {
    img.src = item.href;
    img.alt = item.querySelector('img')?.alt ?? '';
    caption.textContent = item.dataset.caption ?? '';
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
    document.body.style.overflow = '';
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