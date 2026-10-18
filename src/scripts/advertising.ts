/**
 * advertising.ts — загрузка систем рекламы (gated).
 *
 * Google Ads и Яндекс.Директ загружаются ТОЛЬКО после явного согласия
 * пользователя на категорию `marketing` (Закон РБ № 99-З).
 * Идентификаторы берутся из `site.settings` и передаются через `data-*`
 * атрибуты на `<body>` (см. BaseLayout.astro).
 *
 * При отзыве согласия трекеры отключаются, cookie удаляются.
 */
import { hasConsent, onConsentChange } from './consent';

interface AdvertisingConfig {
  googleAdsId?: string;
  yandexDirectId?: string;
}

let loaded = false;

function readConfig(): AdvertisingConfig {
  const body = document.body;
  return {
    googleAdsId: body.dataset.googleAdsId || undefined,
    yandexDirectId: body.dataset.yandexDirectId || undefined,
  };
}

/** Загружает Google Ads (конверсии). */
function loadGoogleAds(id: string): void {
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

/** Удаляет ранее загруженные трекеры и их cookie. */
function unload(): void {
  ['gads-script', 'gads-inline', 'yd-script'].forEach((id) => {
    document.getElementById(id)?.remove();
  });
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name.startsWith('_gcl') || name.startsWith('_ym_')) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}

/** Инициализирует рекламные трекеры с учётом текущего согласия. */
export function initAdvertising(): void {
  const apply = () => {
    const { googleAdsId, yandexDirectId } = readConfig();
    if (hasConsent('marketing')) {
      if (googleAdsId) loadGoogleAds(googleAdsId);
      if (yandexDirectId) loadYandexDirect(yandexDirectId);
      loaded = true;
    } else if (loaded) {
      unload();
      loaded = false;
    }
  };

  apply();
  onConsentChange(apply);
}