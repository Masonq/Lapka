import { useEffect, useRef } from "react";

/**
 * Замена textarea для случаев, когда обычное поле не даёт скроллить
 * содержимое одним пальцем внутри фиксированной высоты (браузер иногда
 * интерпретирует любое движение по активному тексту как попытку
 * выделения/позиционирования курсора, а не скролл, и это решение
 * принимается на низком, платформенном уровне, не контролируемом через
 * обычный CSS/JS).
 *
 * Здесь скролл реализован вручную: следим за touchstart/touchmove сами,
 * различаем "быстрый свайп" (двигаем содержимое, блокируем нативное
 * поведение через preventDefault) от "медленное/неподвижное касание"
 * (пропускаем нативному long-press-to-select, ничего не трогаем) — по
 * дистанции и скорости движения в первые миллисекунды жеста.
 *
 * contentEditable, не textarea — value синхронизируется через
 * textContent + input-событие. Enter обрабатывается через нативную
 * браузерную команду execCommand('insertLineBreak') — три попытки
 * вручную вставлять текстовый узел "\n" через Range API оказались
 * ненадёжными при живом тестировании (детали в handleKeyDown ниже).
 */
export default function ScrollableTextarea({
  value, onChange, placeholder, id, required, height = 116, style,
}) {
  const ref = useRef(null);
  const touchState = useRef({ active: false, startY: 0, startTime: 0, lastY: 0, scrolling: false });
  const initialized = useRef(false);

  // Значение из React попадает в DOM РОВНО ОДИН РАЗ (при монтировании,
  // важно для режима редактирования — начальный текст приходит извне).
  // Дальше DOM — источник истины, React value только для чтения при
  // отправке формы. Обратная синхронизация "value → DOM" при каждом
  // изменении вызывала гонку между React re-render и DOM selection/
  // cursor state — из-за неё первый Enter не срабатывал корректно
  // (строки слипались без переноса, второй Enter в той же сессии
  // почему-то срабатывал — классический race condition).
  useEffect(() => {
    const el = ref.current;
    if (!el || initialized.current) return;
    el.textContent = value;
    initialized.current = true;
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // insertLineBreak вставляет <br>, не текстовый символ \n — обычный
    // el.textContent полностью игнорирует <br> элементы (не превращает
    // их в \n), поэтому собираем текст вручную, проходя по узлам
    function readText() {
      let text = "";
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent;
        } else if (node.nodeName === "BR") {
          text += "\n";
        } else {
          text += node.textContent;
        }
      }
      return text;
    }

    function handleInput() {
      onChange(readText());
    }

    function handleKeyDown(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        // Три попытки вручную вставлять текстовый узел "\n" через
        // Range API оказались ненадёжными (execCommand insertText —
        // строки слипались без переноса; setStartAfter — курсор попадал
        // в неоднозначную позицию startContainer=родительский DIV;
        // якорный пустой узел после newline — браузер всё равно
        // вставлял следующий символ ПЕРЕД newline, не после). Все три
        // проверены и провалились при живом тестировании.
        // insertLineBreak — нативная браузерная команда именно для
        // этого случая, браузер сам корректно управляет курсором после
        // вставки (это его собственная логика, не ручная DOM-манипуляция).
        // Вставляет <br>, не текстовый \n — учитываем это при чтении
        // текста в handleInput ниже.
        document.execCommand("insertLineBreak");
      }
    }

    function handleTouchStart(e) {
      const t = e.touches[0];
      touchState.current = { active: true, startY: t.clientY, startTime: Date.now(), lastY: t.clientY, scrolling: false };
    }

    function handleTouchMove(e) {
      const s = touchState.current;
      if (!s.active) return;
      const t = e.touches[0];

      if (!s.scrolling) {
        const dist = Math.abs(t.clientY - s.startY);
        const elapsed = Date.now() - s.startTime;
        // Быстрое, заметное движение в первые ~200мс — считаем это
        // намерением скроллить, не выделять. Долгое неподвижное
        // касание (начало long-press) сюда не попадёт — жест останется
        // нетронутым, браузер сам покажет стандартное выделение/лупу
        if (dist > 6 && elapsed < 200) {
          s.scrolling = true;
        }
      }

      if (s.scrolling) {
        e.preventDefault();
        const delta = s.lastY - t.clientY;
        el.scrollTop += delta;
        s.lastY = t.clientY;
      }
    }

    function handleTouchEnd() {
      touchState.current.active = false;
    }

    el.addEventListener("input", handleInput);
    el.addEventListener("keydown", handleKeyDown);
    // passive:false обязателен — иначе preventDefault в touchmove
    // молча игнорируется браузером (частый источник багов именно в
    // этом классе задач)
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("input", handleInput);
      el.removeEventListener("keydown", handleKeyDown);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onChange]);

  return (
    <div
      ref={ref}
      id={id}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      data-required={required || undefined}
      className="scrollable-textarea"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
        borderRadius: "var(--radius-md)",
        padding: "12px 14px",
        fontSize: 16,
        fontFamily: "var(--font-body)",
        color: "var(--text)",
        outline: "none",
        height,
        overflowY: "auto",
        overscrollBehavior: "contain",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        ...style,
      }}
    />
  );
}
