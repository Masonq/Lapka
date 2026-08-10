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

    // Прошлая версия (один re-assert через requestAnimationFrame, т.е. один
    // кадр спустя) оказалась недостаточной — баг воспроизводился, даже когда
    // ПРЕДЫДУЩАЯ страница вообще не была проскроллена. Значит дело не в
    // "запомненной" позиции с прошлой страницы, а в чём-то, что сдвигает
    // САМУ новую страницу уже после её открытия — скорее всего, асинхронно
    // подгружаемый контент (аватарки, картинки историй), который может
    // подъехать через сотни миллисекунд, далеко за пределами одного кадра.
    //
    // Удерживаю scrollY=0 многократно в течение короткого окна после
    // навигации — грубее, чем один точечный сброс, но надёжно перекрывает
    // сдвиг независимо от того, через сколько миллисекунд он произойдёт.
    const delays = [16, 32, 50, 80, 120, 180, 250, 350, 450, 600, 750, 900, 1050, 1200, 1350, 1500];
    const timers = delays.map((delay) =>
      setTimeout(() => {
        if (window.scrollY !== 0) window.scrollTo(0, 0);
      }, delay)
    );

    // Если пользователь сам начал скроллить (тач/колесо/стрелки) — сразу
    // прекращаем принудительную коррекцию, чтобы не мешать реальному вводу
    function cancelAll() {
      timers.forEach(clearTimeout);
      window.removeEventListener("touchstart", cancelAll);
      window.removeEventListener("wheel", cancelAll);
    }
    window.addEventListener("touchstart", cancelAll, { passive: true });
    window.addEventListener("wheel", cancelAll, { passive: true });

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("touchstart", cancelAll);
      window.removeEventListener("wheel", cancelAll);
    };
  }, [pathname]);

  return null;
}
