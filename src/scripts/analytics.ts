/**
 * analytics.ts — загрузка систем аналитики (gated).
 *
 * GA4 (Google Analytics 4) и Яндекс.Метрика загружаются ТОЛЬКО после
 * явного согласия пользователя на категорию `analytics` (Закон РБ № 99-З).
 * Идентификаторы берутся из `site.settings` (единый источник правды) и
 * передаются через `data-*` атрибуты на `<body>` (см. BaseLayout.astro).
 *
 * При отзыве согласия трекеры отключаются, cookie удаляются.
 */
import { hasConsent, onConsentChange } from './consent';

interface AnalyticsConfig {
  ga4Id?: string;
  yandexMetrikaId?: string;
}

let loaded = false;

function readConfig(): AnalyticsConfig {
  const body = document.body;
  return {
    ga4Id: body.dataset.ga4Id || undefined,
    yandexMetrikaId: body.dataset.yandexMetrikaId || undefined,
  };
}

/** Загружает GA4 (gtag.js). */
function loadGa4(id: string): void {
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

/** Удаляет ранее загруженные трекеры и их cookie. */
function unload(): void {
  ['ga4-script', 'ga4-inline', 'ym-script'].forEach((id) => {
    document.getElementById(id)?.remove();
  });
  // Удаляем cookie трекеров.
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name.startsWith('_ga') || name.startsWith('_ym_') || name === '_gid') {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
  // Сбрасываем глобальные объекты.
  (window as unknown as Record<string, unknown>).dataLayer = undefined;
  (window as unknown as Record<string, unknown>).ym = undefined;
}

/** Инициализирует аналитику с учётом текущего согласия. */
export function initAnalytics(): void {
  const apply = () => {
    const { ga4Id, yandexMetrikaId } = readConfig();
    if (hasConsent('analytics')) {
      if (ga4Id) loadGa4(ga4Id);
      if (yandexMetrikaId) loadYandexMetrika(yandexMetrikaId);
      loaded = true;
    } else if (loaded) {
      unload();
      loaded = false;
    }
  };

  apply();
  onConsentChange(apply);
}