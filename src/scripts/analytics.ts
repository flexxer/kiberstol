/**
 * analytics.ts — загрузка систем аналитики (gated).
 *
 * GA4 (Google Analytics 4) и Яндекс.Метрика загружаются ТОЛЬКО после
 * явного согласия пользователя на категорию `analytics` (Закон РБ № 99-З).
 * Идентификаторы берутся из `site.settings` (единый источник правды) и
 * передаются через `data-*` атрибуты на `<body>` (см. BaseLayout.astro).
 *
 * При отзыве согласия трекеры отключаются НЕМЕДЛЕННО:
 *  - GA4: выставляется `window['ga-disable-<id>'] = true` (удаление тега
 *    `<script>` само по себе не останавливает уже исполняемый gtag.js);
 *  - Яндекс.Метрика: вызывается `ym(id, 'destruct')`, который останавливает
 *    счётчик и вебвизор;
 *  - удаляются теги скриптов и cookie трекеров (с учётом домена).
 */
import { hasConsent, onConsentChange } from './consent';

interface AnalyticsConfig {
  ga4Id?: string;
  yandexMetrikaId?: string;
}

/** Инициализация выполняется один раз; повторные вызовы только применяют состояние. */
let initialized = false;
/** ID, которые реально были загружены — нужны для корректного отключения. */
let activeGa4Id: string | undefined;
let activeMetrikaId: string | undefined;

function readConfig(): AnalyticsConfig {
  const body = document.body;
  return {
    ga4Id: body.dataset.ga4Id || undefined,
    yandexMetrikaId: body.dataset.yandexMetrikaId || undefined,
  };
}

/** Загружает GA4 (gtag.js). */
function loadGa4(id: string): void {
  activeGa4Id = id;
  // Снимаем возможный предыдущий запрет (после повторного согласия).
  (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = false;
  if (document.getElementById('ga4-script')) return;

  const script = document.createElement('script');
  script.id = 'ga4-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  const inline = document.createElement('script');
  inline.id = 'ga4-inline';
  inline.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id}');
  `;
  document.head.appendChild(inline);
}

/** Загружает Яндекс.Метрику. */
function loadYandexMetrika(id: string): void {
  activeMetrikaId = id;
  if (document.getElementById('ym-script')) return;

  const inline = document.createElement('script');
  inline.id = 'ym-script';
  inline.textContent = `
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
    (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    ym(${id}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });
  `;
  document.head.appendChild(inline);
}

/**
 * Удаляет cookie по имени с учётом всех вариантов домена и пути.
 * GA/Метрика часто ставят cookie на регистрируемый домен (`.example.by`),
 * поэтому `path=/` без `domain` их не удаляет.
 */
function deleteCookie(name: string): void {
  const host = window.location.hostname;
  const domains = new Set<string>(['', host, `.${host}`]);
  const parts = host.split('.');
  if (parts.length > 2) {
    domains.add(`.${parts.slice(-2).join('.')}`);
  }
  const paths = new Set<string>(['/', window.location.pathname]);

  domains.forEach((domain) => {
    paths.forEach((path) => {
      const base = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
      document.cookie = domain ? `${base}; domain=${domain}` : base;
    });
  });
}

/** Удаляет cookie аналитических трекеров. */
function clearTrackerCookies(): void {
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0].trim();
    if (!name) return;
    if (
      name.startsWith('_ga') ||
      name.startsWith('_gid') ||
      name.startsWith('_gat') ||
      name.startsWith('_ym_')
    ) {
      deleteCookie(name);
    }
  });
}

/** Немедленно отключает ранее загруженные трекеры и удаляет их cookie. */
function unload(): void {
  // GA4: gtag.js продолжает работать после удаления тега <script>,
  // поэтому явно запрещаем отправку данных для measurement ID.
  if (activeGa4Id) {
    (window as unknown as Record<string, unknown>)[`ga-disable-${activeGa4Id}`] = true;
  }

  // Яндекс.Метрика: destruct останавливает счётчик и вебвизор.
  const ym = (window as unknown as Record<string, unknown>).ym;
  if (activeMetrikaId && typeof ym === 'function') {
    try {
      (ym as (id: string, action: string) => void)(activeMetrikaId, 'destruct');
    } catch {
      /* счётчик мог быть уже уничтожен */
    }
  }

  ['ga4-script', 'ga4-inline', 'ym-script'].forEach((id) => {
    document.getElementById(id)?.remove();
  });

  clearTrackerCookies();

  activeGa4Id = undefined;
  activeMetrikaId = undefined;
}

/** Применяет текущее состояние согласия. */
function apply(): void {
  const { ga4Id, yandexMetrikaId } = readConfig();

  if (hasConsent('analytics')) {
    if (ga4Id) loadGa4(ga4Id);
    if (yandexMetrikaId) loadYandexMetrika(yandexMetrikaId);
    return;
  }

  // Согласия нет — гарантированно выгружаем всё, что могло быть загружено.
  unload();
}

/** Инициализирует аналитику с учётом текущего согласия. */
export function initAnalytics(): void {
  if (!initialized) {
    initialized = true;
    onConsentChange(apply);
  }
  apply();
}

interface TrackingWindow extends Window {
  gtag?: (...args: unknown[]) => void;
  ym?: (id: string, action: string, goal?: string) => void;
}

/**
 * Отправляет конверсию `generate_lead` в GA4 и Яндекс.Метрику.
 *
 * События отправляются только при согласии на категорию `analytics`
 * (default-deny): без согласия трекеры не загружены и вызов игнорируется.
 *
 * @param params дополнительные параметры события (например, `form_id`).
 */
export function trackGenerateLead(params: Record<string, unknown> = {}): void {
  if (!hasConsent('analytics')) return;

  const { ga4Id, yandexMetrikaId } = readConfig();
  const trackingWindow = window as unknown as TrackingWindow;

  if (ga4Id && typeof trackingWindow.gtag === 'function') {
    trackingWindow.gtag('event', 'generate_lead', { ...params, send_to: ga4Id });
  }

  if (yandexMetrikaId && typeof trackingWindow.ym === 'function') {
    trackingWindow.ym(yandexMetrikaId, 'reachGoal', 'generate_lead');
  }
}
