/**
 * menu.ts — мобильное меню (бургер-навигация).
 * Управляет элементами `#menu-toggle` и `#mobile-menu` в Header.
 */
export function initMenu(): void {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');

  if (!toggle || !menu) return;

  const close = () => {
    menu.classList.add('hidden');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const isOpen = !menu.classList.contains('hidden');
    menu.classList.toggle('hidden', isOpen);
    toggle.setAttribute('aria-expanded', String(!isOpen));
  });

  // Закрываем меню при клике по ссылке.
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', close);
  });
}