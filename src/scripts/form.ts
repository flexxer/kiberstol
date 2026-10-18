/**
 * form.ts — форма заказа (имя + телефон + чекбоксы согласия).
 *
 * Защита от спам-ботов:
 *  - honeypot: скрытое поле `website` (боты заполняют, люди — нет);
 *  - time-honeypot: форма должна быть заполнена не быстрее 3 секунд.
 *
 * Маска телефона: `+375 XX XXX-XX-XX`.
 * Отправка: `POST /api/submit.php` → Telegram Bot API (токен на сервере).
 */
const MIN_FILL_SECONDS = 3;

function applyPhoneMask(input: HTMLInputElement): void {
  input.addEventListener('input', () => {
    let digits = input.value.replace(/\D/g, '');
    if (digits.startsWith('375')) digits = digits.slice(3);
    digits = digits.slice(0, 9);

    let result = '+375';
    if (digits.length > 0) result += ` ${digits.slice(0, 2)}`;
    if (digits.length > 2) result += ` ${digits.slice(2, 5)}`;
    if (digits.length > 5) result += `-${digits.slice(5, 7)}`;
    if (digits.length > 7) result += `-${digits.slice(7, 9)}`;

    input.value = result;
  });
}

function setStatus(form: HTMLFormElement, message: string, ok: boolean): void {
  let status = form.querySelector<HTMLElement>('[data-form-status]');
  if (!status) {
    status = document.createElement('p');
    status.setAttribute('data-form-status', '');
    status.setAttribute('role', 'status');
    form.appendChild(status);
  }
  status.textContent = message;
  status.className = ok ? 'mt-3 text-sm text-primary' : 'mt-3 text-sm text-red-500';
}

export function initForm(): void {
  const form = document.getElementById('order-form') as HTMLFormElement | null;
  if (!form) return;

  const phoneInput = form.querySelector<HTMLInputElement>('input[name="phone"]');
  if (phoneInput) applyPhoneMask(phoneInput);

  // Фиксируем время показа формы для time-honeypot (клиент + сервер).
  const shownAt = Date.now();
  const tsInput = form.querySelector<HTMLInputElement>('input[name="ts"]');
  if (tsInput) tsInput.value = String(Math.floor(shownAt / 1000));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Honeypot: скрытое поле должно оставаться пустым.
    const honeypot = form.querySelector<HTMLInputElement>('input[name="website"]');
    if (honeypot && honeypot.value !== '') {
      // Бот — молча «принимаем», но ничего не отправляем.
      form.reset();
      return;
    }

    // Time-honeypot: слишком быстрая отправка = бот.
    if (Date.now() - shownAt < MIN_FILL_SECONDS * 1000) {
      setStatus(form, 'Пожалуйста, заполните форму внимательнее.', false);
      return;
    }

    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) submit.disabled = true;

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        setStatus(form, 'Заявка отправлена! Мы свяжемся с вами.', true);
        form.reset();
      } else {
        setStatus(form, 'Не удалось отправить заявку. Попробуйте ещё раз.', false);
      }
    } catch {
      setStatus(form, 'Ошибка сети. Проверьте соединение и попробуйте снова.', false);
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}