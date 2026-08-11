import { useEffect, useRef } from "react";

/**
 * Textarea, растягивающаяся по высоте вместе с содержимым, вместо
 * фиксированного маленького окошка со скроллом внутри. При вставке
 * длинного текста пользователь сразу видит весь текст целиком (страница
 * скроллится обычным образом), а не крутит скролл внутри крошечного
 * поля на 2-5 строк — именно это и было источником жалобы на "не могу
 * скроллить/редактировать вставленный текст".
 *
 * Не полагаюсь на CSS field-sizing:content (новое свойство, ещё не
 * везде поддерживается, особенно в более старых версиях iOS Safari,
 * а проект мобильно-ориентированный) — пересчитываю высоту через JS
 * при каждом изменении value, это надёжно работает везде.
 *
 * Использование: const ref = useAutoResizeTextarea(value);
 * <textarea ref={ref} value={value} ... style={{ overflow: "hidden", resize: "none" }} />
 */
export function useAutoResizeTextarea(value) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const borderAdjustment = el.offsetHeight - el.clientHeight; // учитывает border при box-sizing:border-box
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + borderAdjustment}px`;
  }, [value]);

  return ref;
}
