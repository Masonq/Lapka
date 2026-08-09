import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router по умолчанию НЕ сбрасывает прокрутку при клиентской навигации —
 * это поведение самого браузера для SPA. Без этого компонента переход, например,
 * из прокрученной вниз ленты в переписку открывает новую страницу с той же
 * позицией скролла: её собственная шапка (page-header) оказывается визуально
 * выше видимой области, спрятанная за прилипающим верхним баром (.top-header).
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
