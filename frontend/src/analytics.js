/**
 * Аналитика — Yandex Metrica, Google Analytics 4, Microsoft Clarity.
 * Каждый сервис подключается НЕЗАВИСИМО и только если задан его ID через
 * переменную окружения (VITE_* — читается Vite на этапе сборки, попадает
 * в собранный бандл как обычная строка, не секрет уровня backend).
 *
 * VITE_YANDEX_METRICA_ID — числовой ID счётчика с metrika.yandex.ru
 * VITE_GA_MEASUREMENT_ID — Measurement ID вида "G-XXXXXXXXXX" с analytics.google.com
 * VITE_CLARITY_PROJECT_ID — Project ID с clarity.microsoft.com
 *
 * Не заданы — соответствующий сервис просто не подключается, без ошибок.
 * На localhost/127.0.0.1 аналитика не грузится вообще (даже если ID заданы
 * в .env для прод-сборки, которую тестируют локально) — иначе локальная
 * разработка засоряла бы реальную статистику тестовыми заходами.
 */

const YANDEX_METRICA_ID = import.meta.env.VITE_YANDEX_METRICA_ID;
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID;

function isLocalhost() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function loadYandexMetrica(counterId) {
  /* eslint-disable */
  (function (m, e, t, r, i, k, a) {
    m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
    m[i].l = 1 * new Date();
    k = e.createElement(t); a = e.getElementsByTagName(t)[0];
    k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
  })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
  /* eslint-enable */

  window.ym(counterId, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    // webvisor (запись сессий пользователя) осознанно выключен по умолчанию —
    // довольно инвазивно для приватности, включать явно отдельным решением,
    // не молча вместе со всей остальной аналитикой
    webvisor: false,
  });
}

function loadGA4(measurementId) {
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  // send_page_view:false — сами шлём page_view на каждый SPA-переход через
  // trackPageview() ниже. Без этого GA4 засчитал бы только самую первую
  // загрузку страницы, роутинг между экранами остался бы невидим для аналитики
  gtag("config", measurementId, { send_page_view: false });
}

function loadClarity(projectId) {
  /* eslint-disable */
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", projectId);
  /* eslint-enable */
}

let initialized = false;

export function initAnalytics() {
  if (initialized || isLocalhost()) return;
  initialized = true;

  if (YANDEX_METRICA_ID) loadYandexMetrica(YANDEX_METRICA_ID);
  if (GA_MEASUREMENT_ID) loadGA4(GA_MEASUREMENT_ID);
  if (CLARITY_PROJECT_ID) loadClarity(CLARITY_PROJECT_ID);
}

/** Вызывается при каждом SPA-переходе (см. App.jsx) — без этого GA4/Metrica
 * видели бы только самую первую загрузку сайта, роутинг между страницами
 * остался бы полностью невидим для аналитики (стандартная проблема любого
 * SPA — аналитика по умолчанию заточена под классические переходы между
 * отдельными HTML-страницами, не под client-side роутинг). */
export function trackPageview(path) {
  if (isLocalhost()) return;

  if (window.gtag) {
    window.gtag("event", "page_view", { page_path: path });
  }
  if (window.ym && YANDEX_METRICA_ID) {
    window.ym(YANDEX_METRICA_ID, "hit", path);
  }
  // Clarity сам отслеживает SPA-навигацию через History API, отдельный вызов не нужен
}
