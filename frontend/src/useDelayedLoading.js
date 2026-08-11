import { useEffect, useRef, useState } from "react";

/**
 * Раньше (первая версия) скелет ПОЯВЛЯЛСЯ с задержкой — если загрузка была
 * быстрее 200мс, вместо скелета была короткая пустота. На реальном мобильном
 * соединении (не локальная сеть) время загрузки часто попадает в неудобную
 * середину — недостаточно быстро, чтобы пустота не была заметна, но
 * недостаточно медленно, чтобы задержка ощущалась оправданной. Итог —
 * страница на короткое время выглядела "зависшей"/пустой, что хуже, чем
 * просто увидеть скелет сразу.
 *
 * Теперь — обратная стратегия: скелет показывается СРАЗУ (без задержки,
 * без пустоты), но держится минимум minDuration мс, даже если данные
 * пришли раньше. Это по-прежнему решает исходную проблему (мгновенное
 * мигание скелета на 20-50мс выглядит как дёрганье), просто без риска
 * показать пустой экран.
 *
 * Интерфейс (имя, аргументы, возвращаемое значение) не менялся — вызывающий
 * код (везде, где используется этот хук) трогать не нужно.
 */
export function useDelayedLoading(isLoading, minDuration = 300) {
  const [show, setShow] = useState(isLoading);
  const shownAtRef = useRef(isLoading ? Date.now() : null);

  useEffect(() => {
    if (isLoading) {
      shownAtRef.current = Date.now();
      setShow(true);
      return;
    }

    if (shownAtRef.current === null) {
      setShow(false);
      return;
    }

    const elapsed = Date.now() - shownAtRef.current;
    const remaining = minDuration - elapsed;

    if (remaining <= 0) {
      setShow(false);
    } else {
      const timer = setTimeout(() => setShow(false), remaining);
      return () => clearTimeout(timer);
    }
  }, [isLoading, minDuration]);

  return show;
}
