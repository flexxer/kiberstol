/**
 * faq.ts — аккордеон вопросов-ответов.
 *
 * Управляет элементами `.faq-item` (см. Faq.astro и секцию FAQ на главной):
 *  - `.faq-question` — кнопка-заголовок;
 *  - `.faq-answer` — раскрываемый ответ.
 * Одновременно открыт только один вопрос.
 */
export function initFaq(): void {
  document.querySelectorAll<HTMLElement>('.faq-item').forEach((item) => {
    const question = item.querySelector<HTMLElement>('.faq-question');
    const answer = item.querySelector<HTMLElement>('.faq-answer');
    const icon = item.querySelector<HTMLElement>('.faq-icon');
    if (!question || !answer) return;

    // Защита от повторной инициализации (ClientRouter может вызвать initPage
    // несколько раз для одного и того же DOM).
    if (question.dataset.bound === 'true') return;
    question.dataset.bound = 'true';

    question.addEventListener('click', () => {
      const isOpen = !answer.classList.contains('hidden');

      // Закрываем все вопросы в текущем контейнере.
      const container = item.parentElement;
      container?.querySelectorAll<HTMLElement>('.faq-item').forEach((other) => {
        other.querySelector('.faq-answer')?.classList.add('hidden');
        other.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
        other.dataset.open = 'false';
        const otherIcon = other.querySelector<HTMLElement>('.faq-icon');
        if (otherIcon) otherIcon.textContent = '+';
      });

      // Открываем/закрываем текущий.
      answer.classList.toggle('hidden', isOpen);
      question.setAttribute('aria-expanded', String(!isOpen));
      item.dataset.open = String(!isOpen);
      if (icon) icon.textContent = isOpen ? '+' : '−';
    });
  });
}