import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// Браузер по умолчанию сам пытается восстановить прежнюю позицию скролла при
// SPA-навигации (history.scrollRestoration = "auto") — это конкурирует с нашим
// window.scrollTo(0,0) ниже и может частично его перебивать. Отключаю один раз.
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

/**
 * React Router по умолчанию НЕ сбрасывает прокрутку при клиентской навигации —
 * это поведение самого браузера для SPA. Без этого компонента переход, например,
 * из прокрученной вниз ленты в переписку открывает новую страницу с той же
 * позицией скролла: её собственная шапка (page-header) оказывается визуально
 * выше видимой области, спрятанная за прилипающим верхним баром (.top-header).
 *
 * useLayoutEffect, а не useEffect — срабатывает синхронно ДО того, как браузер
 * отрисует кадр. С useEffect был краткий шанс увидеть старую позицию скролла
 * на один кадр перед сбросом (особенно заметно на медленных устройствах).
 *
 * Раньше здесь была ещё многотаймерная страховка (удержание scrollY=0 в
 * течение 1.5с после навигации) — оказалась лишней: реальная причина "съеденного
 * верха страницы" на iOS Safari была не в scrollY вообще, а в 100vh (см.
 * global.css, заменено на 100dvh). Убрал заплатку, раз нашлась настоящая причина.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
