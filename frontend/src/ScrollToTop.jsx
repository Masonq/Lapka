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
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    // Повторное подтверждение после отрисовки кадра — ловит случаи, когда
    // асинхронно подгружаемый контент (картинки историй, аватарки) успевает
    // сдвинуть layout уже ПОСЛЕ первого сброса, но до того как пользователь
    // увидит страницу. overflow-anchor:none должен это предотвращать сам по
    // себе, но это простая и безопасная страховка вторым слоем.
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
