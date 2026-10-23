/**
 * reveal.ts — плавное появление блоков при прокрутке (reveal-on-scroll).
 *
 * Поведение:
 *  - элементы плавно «прорисовываются» при входе в область видимости;
 *  - направление анимации зависит от направления прокрутки: вниз — блоки
 *    поднимаются снизу, вверх — опускаются сверху;
 *  - при повторном входе в область видимости анимация запускается снова
 *    (страница «рисуется» и при прокрутке вверх, и при прокрутке вниз);
 *  - дочерние элементы группируются и появляются каскадом (stagger);
 *  - уважает `prefers-reduced-motion`;
 *  - безопасен для Astro ClientRouter: предыдущие наблюдатели отключаются
 *    при каждом `astro:page-load`.
 *
 * Элементы можно помечать явно (`data-reveal`, `data-reveal="left"` и т.п.),
 * а также они находятся автоматически по типовым селекторам контента.
 */

/** Типовые элементы контента, которые нужно анимировать автоматически. */
const AUTO_SELECTORS = [
  'main article',
  'main section > h1',
  'main section > h2',
  'main section > h3',
  'main section > p',
  'main section > div > h1',
  'main section > div > h2',
  'main section > div > h3',
  'main section > div > p',
  'main section > div > .prose',
  'main section > .prose',
  'main .grid > *',
  'main .space-y-6 > *',
  'main .space-y-8 > *',
  'main .space-y-12 > *',
  'main .faq-item',
  'main dl > div',
  'main figure',
  'main form',
  'main aside',
  'main .product-gallery',
  'main a.group',
  'main .group.block',
].join(',');

/** Насколько сильно блок смещается в момент появления (px). */
const REVEAL_OFFSET = 24;

let enterObserver: IntersectionObserver | null = null;
let exitObserver: IntersectionObserver | null = null;

let scrollBound = false;
let lastScrollY = 0;
let scrollDirection: 'down' | 'up' = 'down';

/** Отслеживаем направление прокрутки один раз на страницу. */
function bindScrollDirection(): void {
  if (scrollBound) return;
  scrollBound = true;
  lastScrollY = window.scrollY;

  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      if (Math.abs(y - lastScrollY) < 4) return;
      scrollDirection = y > lastScrollY ? 'down' : 'up';
      lastScrollY = y;
    },
    { passive: true },
  );
}

/** Исключаем служебные/вложенные элементы, которым анимация не нужна. */
function isExcluded(el: HTMLElement): boolean {
  if (el.closest('[data-no-reveal]')) return true;
  if (el.closest('[aria-hidden="true"]')) return true;

  // Внутри галереи товара анимируем только корневой контейнер,
  // чтобы не «дёргать» миниатюры и лайтбокс.
  const gallery = el.closest('.product-gallery');
  if (gallery && el !== gallery) return true;

  return false;
}

/** Собираем явно размеченные и автоматически найденные элементы. */
function collectTargets(root: ParentNode): HTMLElement[] {
  const targets = new Set<HTMLElement>();

  root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    if (!isExcluded(el)) targets.add(el);
  });

  root.querySelectorAll<HTMLElement>(AUTO_SELECTORS).forEach((el) => {
    if (!isExcluded(el)) targets.add(el);
  });

  return [...targets];
}

/** Каскадная задержка для элементов внутри одной группы (родителя). */
function applyStagger(targets: HTMLElement[]): void {
  const groups = new Map<Element, HTMLElement[]>();

  for (const el of targets) {
    const parent = el.parentElement;
    if (!parent) continue;
    const group = groups.get(parent);
    if (group) group.push(el);
    else groups.set(parent, [el]);
  }

  for (const group of groups.values()) {
    group.forEach((el, index) => {
      // Ограничиваем задержку, чтобы длинные списки не «тормозили».
      el.style.setProperty('--reveal-delay', `${Math.min(index, 8) * 70}ms`);
    });
  }
}

export function initReveal(): void {
  // ClientRouter: при переходе между страницами отключаем старые наблюдатели.
  enterObserver?.disconnect();
  exitObserver?.disconnect();
  enterObserver = null;
  exitObserver = null;

  const root = document.querySelector('main') ?? document.body;
  const targets = collectTargets(root);
  if (targets.length === 0) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    targets.forEach((el) => {
      el.setAttribute('data-reveal', '');
      el.classList.add('reveal-visible');
    });
    return;
  }

  // Сбрасываем направление на каждой странице (ClientRouter сохраняет модуль).
  lastScrollY = window.scrollY;
  scrollDirection = 'down';

  bindScrollDirection();
  applyStagger(targets);

  targets.forEach((el) => {
    if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
    el.style.setProperty('--reveal-from', `${REVEAL_OFFSET}px`);
  });

  // Fallback для очень старых браузеров.
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('reveal-visible'));
    return;
  }

  // Появление: срабатывает чуть раньше, чем блок дойдёт до нижней кромки.
  enterObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.style.setProperty(
          '--reveal-from',
          scrollDirection === 'up' ? `-${REVEAL_OFFSET}px` : `${REVEAL_OFFSET}px`,
        );
        el.classList.add('reveal-visible');
      }
    },
    {
      threshold: 0.01,
      rootMargin: '0px 0px -10% 0px',
    },
  );

  // Сброс: только когда блок полностью покинул вьюпорт, чтобы не было
  // заметного «затухания» у края экрана. При повторном входе — новая анимация.
  exitObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) continue;
        (entry.target as HTMLElement).classList.remove('reveal-visible');
      }
    },
    { threshold: 0 },
  );

  targets.forEach((el) => {
    enterObserver!.observe(el);
    exitObserver!.observe(el);
  });
}
