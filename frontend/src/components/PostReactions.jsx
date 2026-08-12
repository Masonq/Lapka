import { useEffect, useRef, useState } from "react";
import { SmilePlus } from "lucide-react";

const ALL_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🐾"];

/**
 * Ряд реакций на пост — компактный по умолчанию: показывает чипы только
 * для эмодзи, у которых счётчик больше нуля, плюс маленькая кнопка
 * "добавить реакцию" сбоку. Полный набор из 6 эмодзи появляется во
 * всплывающей панели по тапу на эту кнопку, не занимает место постоянно
 * (тот же принцип сдержанности, что уже применён к кнопкам действий поста
 * ранее в этой сессии — компактно, пока не нужно развернуть).
 */
export default function PostReactions({ reactions, myReaction, onReact, onRemove }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleTap(emoji) {
    if (myReaction === emoji) onRemove();
    else onReact(emoji);
    setPickerOpen(false);
  }

  const activeEmojis = ALL_EMOJIS.filter((e) => (reactions?.[e] || 0) > 0);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {activeEmojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => handleTap(emoji)}
          className="chip"
          style={{
            padding: "5px 10px", fontSize: 13,
            background: myReaction === emoji ? "var(--primary-tint)" : "var(--surface)",
            borderColor: myReaction === emoji ? "var(--primary-strong)" : "var(--border)",
            color: myReaction === emoji ? "var(--primary-strong)" : "var(--text)",
          }}
        >
          {emoji} {reactions[emoji]}
        </button>
      ))}

      <button
        type="button"
        className="icon-btn"
        onClick={() => setPickerOpen((v) => !v)}
        aria-label="Реакция"
      >
        <SmilePlus size={18} />
      </button>

      {pickerOpen && (
        <div
          className="card"
          style={{
            position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 20,
            display: "flex", gap: 2, padding: 6, boxShadow: "var(--shadow-float)",
          }}
        >
          {ALL_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleTap(emoji)}
              style={{
                width: 36, height: 36, fontSize: 19, background: myReaction === emoji ? "var(--primary-tint)" : "none",
                border: "none", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
