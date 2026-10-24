/**
 * modal.ts — модальные диалоги на нативном `<dialog>` (см. `Modal.astro`).
 *
 * Поведение:
 *  - открытие по клику на `[data-modal-open="<id>"]` (триггер обычно ссылка,
 *    поэтому без JS он ведёт на резервный адрес);
 *  - `showModal()` — нативный focus trap, инертный фон и закрытие по Esc;
 *  - закрытие по `[data-modal-close]` и клику на фон (`::backdrop`);
 *  - блокировка прокрутки страницы, пока диалог открыт;
 *  - фокус ставится в первое поле ввода, иначе в первый focusable-элемент.
 *
 * Защита от повторного связывания: `dataset.modalBound`.
 */
export function initModal(): void {
  const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[data-modal]');
  if (dialogs.length === 0) return;

  const focusTarget = (dialog: HTMLDialogElement): void => {
    const preferred = dialog.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([tabindex="-1"]), textarea:not([tabindex="-1"]), select',
    );
    const fallback = dialog.querySelector<HTMLElement>(
      'button:not([data-modal-close]), [href], [tabindex]:not([tabindex="-1"])',
    );
    (preferred ?? fallback ?? dialog).focus();
  };

  const openDialog = (dialog: HTMLDialogElement): void => {
    if (dialog.open) return;

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      // Древние браузеры: без focus trap, но контент доступен.
      dialog.setAttribute('open', '');
    }

    document.body.style.overflow = 'hidden';
    focusTarget(dialog);
  };

  document.querySelectorAll<HTMLElement>('[data-modal-open]').forEach((trigger) => {
    if (trigger.dataset.modalBound === 'true') return;
    trigger.dataset.modalBound = 'true';

    trigger.addEventListener('click', (event) => {
      const id = trigger.dataset.modalOpen;
      const dialog = id ? document.getElementById(id) : null;
      if (!(dialog instanceof HTMLDialogElement)) return;

      event.preventDefault();
      openDialog(dialog);
    });
  });

  dialogs.forEach((dialog) => {
    if (dialog.dataset.modalBound === 'true') return;
    dialog.dataset.modalBound = 'true';

    dialog.querySelectorAll<HTMLElement>('[data-modal-close]').forEach((button) => {
      button.addEventListener('click', () => dialog.close());
    });

    // Клик по `::backdrop` приходит с `target === dialog`.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener('close', () => {
      document.body.style.overflow = '';
    });
  });
}
