/**
 * advertising.ts — загрузка систем рекламы (gated).
 *
 * Google Ads и Яндекс.Директ загружаются ТОЛЬКО после явного согласия
 * пользователя на категорию `marketing` (Закон РБ № 99-З).
 * Идентификаторы берутся из `site.settings` и передаются через `data-*`
 * атрибуты на `<body>` (см. BaseLayout.astro).
 *
 * При отзыве согласия трекеры отключаются НЕМЕДЛЕННО:
 *  - Google Ads: выставляется `window['ga-disable-<id>'] = true` и удаляются
 *    теги скриптов (удаление тега само по себе не останавливает gtag.js);
 *  - Яндекс.Директ: удаляются теги скриптов;
 *  - удаляются рекламные cookie (`_gcl*`, `_gac*`) с учётом домена.
 *
 * Важно: `window.dataLayer` НЕ обнуляется — он общий с GA4 (analytics.ts),
 * и обнуление сломало бы аналитику, если согласие на неё ещё действует.
 */
import { hasConsent, onConsentChange } from './consent';

interface AdvertisingConfig {
  googleAdsId?: string;
  yandexDirectId?: string;
}

/** Инициализация выполняется один раз; повторные вызовы только применяют состояние. */
let initialized = false;
/** ID, которые реально были загружены — нужны для корректного отключения. */
let activeGoogleAdsId: string | undefined;

function readConfig(): AdvertisingConfig {
  const body = document.body;
  return {
    googleAdsId: body.dataset.googleAdsId || undefined,
    yandexDirectId: body.dataset.yandexDirectId || undefined,
  };
}

/** Загружает Google Ads (конверсии). */
function loadGoogleAds(id: string): void {
  activeGoogleAdsId = id;
  // Снимаем возможный предыдущий запрет (после повторного согласия).
  (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = false;
  if (document.getElementById('gads-script')) return;

  const script = document.createElement('script');
  script.id = 'gads-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  const inline = document.createElement('script');
  inline.id = 'gads-inline';
  inline.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id}');
  `;
  document.head.appendChild(inline);
}

/** Загружает Яндекс.Директ (конверсии). */
function loadYandexDirect(id: string): void {
  if (document.getElementById('yd-script')) return;

  const inline = document.createElement('script');
  inline.id = 'yd-script';
  inline.textContent = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'ym.start':new Date().getTime(),event:'ym.init'});
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true;j.src='https://mc.yandex.ru/metrika/tag.js'+dl;f.parentNode.insertBefore(j,f);})
    (window,document,'script','dataLayer','${id}');
  `;
  document.head.appendChild(inline);
}

/**
 * Удаляет cookie по имени с учётом всех вариантов домена и пути.
 * Рекламные cookie часто ставятся на регистрируемый домен (`.example.by`),
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

/**
 * Удаляет рекламные cookie. `_ym_*` намеренно не трогаем: эти cookie общие
 * с Яндекс.Метрикой (analytics.ts) и удаляются только при отзыве аналитики.
 */
function clearAdvertisingCookies(): void {
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0].trim();
    if (!name) return;
    if (name.startsWith('_gcl') || name.startsWith('_gac')) {
      deleteCookie(name);
    }
  });
}

/** Немедленно отключает ранее загруженные трекеры и удаляет их cookie. */
function unload(): void {
  // Google Ads: gtag.js продолжает работать после удаления тега <script>,
  // поэтому явно запрещаем отправку данных для ID.
  if (activeGoogleAdsId) {
    (window as unknown as Record<string, unknown>)[`ga-disable-${activeGoogleAdsId}`] = true;
  }

  ['gads-script', 'gads-inline', 'yd-script'].forEach((id) => {
    document.getElementById(id)?.remove();
  });

  clearAdvertisingCookies();

  activeGoogleAdsId = undefined;
}

/** Применяет текущее состояние согласия. */
function apply(): void {
  const { googleAdsId, yandexDirectId } = readConfig();

  if (hasConsent('marketing')) {
    if (googleAdsId) loadGoogleAds(googleAdsId);
    if (yandexDirectId) loadYandexDirect(yandexDirectId);
    return;
  }

  // Согласия нет — гарантированно выгружаем всё, что могло быть загружено.
  unload();
}

/** Инициализирует рекламные трекеры с учётом текущего согласия. */
export function initAdvertising(): void {
  if (!initialized) {
    initialized = true;
    onConsentChange(apply);
  }
  apply();
}

interface AdvertisingTrackingWindow extends Window {
  gtag?: (...args: unknown[]) => void;
  ym?: (id: string, action: string, goal?: string) => void;
}

/** Имя рекламной цели по умолчанию. */
export const ADVERTISING_CONVERSION_GOAL = 'lead';

/**
 * Отправляет рекламную конверсию после успешной заявки.
 *
 * События отправляются только при согласии на категорию `marketing`
 * (default-deny). Для Google Ads используется `gtag('event','conversion')`,
 * для Яндекс.Директа — `ym(...,'reachGoal', goal)`.
 */
export function trackAdvertisingConversion(
  goal: string = ADVERTISING_CONVERSION_GOAL,
): void {
  if (!hasConsent('marketing')) return;

  const { googleAdsId, yandexDirectId } = readConfig();
  const trackingWindow = window as unknown as AdvertisingTrackingWindow;

  if (googleAdsId && typeof trackingWindow.gtag === 'function') {
    trackingWindow.gtag('event', 'conversion', { send_to: googleAdsId });
  }

  if (yandexDirectId && typeof trackingWindow.ym === 'function') {
    trackingWindow.ym(yandexDirectId, 'reachGoal', goal);
  }
}
