import { useEffect, useState } from "react";

/**
 * Скелет показывается только если загрузка реально заняла заметное время.
 * Без этого при быстром соединении скелет мелькает на 30-80мс и тут же
 * сменяется реальным контентом — это ощущается как дёрганье/шум, а не
 * как полезная обратная связь. Короткая пустота перед появлением контента
 * (пока не истекла задержка) выглядит спокойнее мгновенного мигания.
 *
 * isLoading — обычно `data === null`. delay по умолчанию 200мс — заметно
 * короче, чем терпение человека начинает иссякать (~300-400мс), но
 * достаточно, чтобы отсечь почти всю "мгновенную" загрузку с быстрых
 * соединений или кэша.
 */
export function useDelayedLoading(isLoading, delay = 200) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  return show;
}
