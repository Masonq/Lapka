import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bold, Italic, Underline, Strikethrough, Link2, EyeOff } from "lucide-react";

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
  const wrapSelectionRef = useRef(null);
  const [toolbar, setToolbar] = useState(null); // { top, left } или null (скрыт)

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
    // их в \n). Кроме того, нативное системное меню iOS ("Форматирование"
    // в меню Копировать/Вставить — встроенная функция WebKit именно для
    // contenteditable, не обход какого-либо ограничения) вставляет
    // настоящие теги <b>/<i>/<u> через execCommand, а не текстовые
    // маркеры — рекурсивно обходим дерево узлов, конвертируя оба пути
    // (свою панель и нативное меню) в один и тот же markdown-синтаксис
    function nodeToText(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeName === "BR") return "\n";
      const inner = Array.from(node.childNodes).map(nodeToText).join("");
      switch (node.nodeName) {
        case "B":
        case "STRONG":
          return `**${inner}**`;
        case "I":
        case "EM":
          return `_${inner}_`;
        case "U":
          return `++${inner}++`;
        case "S":
        case "STRIKE":
        case "DEL":
          return `~~${inner}~~`;
        default:
          return inner;
      }
    }

    function readText() {
      return Array.from(el.childNodes).map(nodeToText).join("");
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

    // Оборачивает выделенный текст маркерами форматирования (например,
    // ** для жирного) — если выделения нет, вставляет маркеры с
    // placeholder-текстом внутри, выделенным, чтобы пользователь мог
    // сразу печатать вместо него. ОДИН range.insertNode() с готовым
    // DocumentFragment, а не несколько последовательных вызовов —
    // порядок вставки при нескольких insertNode() подряд не гарантирован
    // спецификацией, та же категория проблем, что уже подвела с Enter.
    // savedRange — для Link: window.prompt() сам по себе сбрасывает
    // выделение (фокус уходит в системный диалог), поэтому Range нужно
    // захватить ДО открытия prompt, не читать заново после
    function wrapSelection(before, after, placeholderText, savedRange) {
      let range = savedRange;
      if (!range) {
        el.focus();
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        range = sel.getRangeAt(0);
      }
      if (!el.contains(range.commonAncestorContainer)) return;

      const selectedText = range.toString();
      const textToWrap = selectedText || placeholderText;

      range.deleteContents();
      const fragment = document.createDocumentFragment();
      const beforeNode = document.createTextNode(before);
      const middleNode = document.createTextNode(textToWrap);
      const afterNode = document.createTextNode(after);
      fragment.appendChild(beforeNode);
      fragment.appendChild(middleNode);
      fragment.appendChild(afterNode);
      range.insertNode(fragment);

      const sel = window.getSelection();
      const newRange = document.createRange();
      newRange.setStart(middleNode, 0);
      newRange.setEnd(middleNode, middleNode.length);
      sel.removeAllRanges();
      sel.addRange(newRange);

      // Программная DOM-мутация через Range API не вызывает нативное
      // input-событие сама по себе — нужно вручную сообщить React
      onChange(readText());
    }
    wrapSelectionRef.current = wrapSelection;

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

  // Показывает/скрывает всплывающий тулбар в зависимости от того, есть
  // ли непустое выделение внутри НАШЕГО поля. selectionchange — событие
  // уровня document (Selection API глобален, не привязан к элементу),
  // поэтому слушаем на document и сами фильтруем по принадлежности el
  useEffect(() => {
    function handleSelectionChange() {
      const el = ref.current;
      if (!el) return;
      const sel = window.getSelection();
      if (!sel.rangeCount || sel.isCollapsed) {
        setToolbar(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) {
        setToolbar(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setToolbar(null);
        return;
      }
      setToolbar({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  function handleBold() {
    wrapSelectionRef.current?.("**", "**", "жирный текст");
  }
  function handleItalic() {
    wrapSelectionRef.current?.("_", "_", "курсив");
  }
  function handleUnderline() {
    wrapSelectionRef.current?.("++", "++", "подчёркнутый");
  }
  function handleStrike() {
    wrapSelectionRef.current?.("~~", "~~", "зачёркнутый");
  }
  function handleSpoiler() {
    wrapSelectionRef.current?.("||", "||", "скрытый текст");
  }
  function handleLink() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    // cloneRange() — независимая копия, не "живая" ссылка. window.prompt()
    // переключает фокус на системный диалог, что может изменить/сбросить
    // текущее выделение — без клонирования к моменту возврата из prompt
    // исходный range мог бы уже не соответствовать тому, что видел
    // пользователь при нажатии на кнопку
    const savedRange = sel.getRangeAt(0).cloneRange();
    const url = window.prompt("Ссылка (https://...)");
    if (!url) return;
    wrapSelectionRef.current?.("[", `](${url})`, "текст ссылки", savedRange);
  }

  return (
    <div>
      {toolbar && createPortal(
        <div
          className="card"
          style={{
            position: "fixed", top: toolbar.top - 44, left: toolbar.left, transform: "translateX(-50%)",
            zIndex: 30, display: "flex", gap: 2, padding: 4, boxShadow: "var(--shadow-float)",
          }}
        >
          <button type="button" onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()} className="icon-btn" style={{ width: 32, height: 32 }} onClick={handleBold} aria-label="Жирный">
            <Bold size={15} />
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()} className="icon-btn" style={{ width: 32, height: 32 }} onClick={handleItalic} aria-label="Курсив">
            <Italic size={15} />
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()} className="icon-btn" style={{ width: 32, height: 32 }} onClick={handleUnderline} aria-label="Подчёркнутый">
            <Underline size={15} />
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()} className="icon-btn" style={{ width: 32, height: 32 }} onClick={handleStrike} aria-label="Зачёркнутый">
            <Strikethrough size={15} />
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()} className="icon-btn" style={{ width: 32, height: 32 }} onClick={handleLink} aria-label="Ссылка">
            <Link2 size={15} />
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()} className="icon-btn" style={{ width: 32, height: 32 }} onClick={handleSpoiler} aria-label="Скрытый текст">
            <EyeOff size={15} />
          </button>
        </div>,
        document.body
      )}
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
    </div>
  );
}
