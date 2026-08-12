import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 30;

/**
 * Пагинация "Загрузить ещё" для списков в админке. fetchPage(offset, limit)
 * должен вернуть массив элементов той страницы. Если вернулось меньше limit —
 * значит это была последняя страница (простой, не требующий отдельного
 * общего счётчика от backend признак конца списка).
 *
 * deps — как и в useEffect, при их смене список сбрасывается и грузится
 * заново с нуля (например, смена поискового запроса).
 */
export function usePaginatedAdminList(fetchPage, deps) {
  const [items, setItems] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  // Отбрасываем результат запроса, начатого до сброса (устаревший поиск),
  // если он придёт позже нового — без этого возможна гонка, где старый,
  // более медленный ответ перезаписывает уже актуальный список
  const requestIdRef = useRef(0);

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current;
    offsetRef.current = 0;
    setItems(null);
    setHasMore(true);
    fetchPage(0, PAGE_SIZE)
      .then((page) => {
        if (requestId !== requestIdRef.current) return;
        setItems(page);
        setHasMore(page.length === PAGE_SIZE);
        offsetRef.current = page.length;
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setItems([]);
        setHasMore(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(load, [load]);

  function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const requestId = requestIdRef.current;
    fetchPage(offsetRef.current, PAGE_SIZE)
      .then((page) => {
        if (requestId !== requestIdRef.current) return;
        setItems((prev) => [...(prev || []), ...page]);
        setHasMore(page.length === PAGE_SIZE);
        offsetRef.current += page.length;
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }

  return { items, hasMore, loadingMore, loadMore, reload: load };
}
