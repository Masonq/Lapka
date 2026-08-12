import { Heart } from "lucide-react";

/**
 * Кнопка лайка на посте — сердце, консистентное с двойным тапом на
 * карточке в ленте (та же реакция "❤️", то же визуальное решение).
 * Раньше здесь был полный пикер из 6 эмодзи с всплывающей панелью —
 * упростили до одной кнопки по просьбе пользователя.
 */
export default function PostReactions({ reactions, myReaction, onReact, onRemove, style }) {
  const liked = myReaction === "❤️";
  const count = reactions?.["❤️"] || 0;

  function handleTap() {
    if (liked) onRemove();
    else onReact("❤️");
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-label="Нравится"
      aria-pressed={liked}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 44, padding: count > 0 ? "0 16px 0 14px" : 0,
        width: count > 0 ? "auto" : 44, justifyContent: "center",
        borderRadius: 22, border: "1px solid var(--border)",
        background: liked ? "var(--primary-tint)" : "var(--surface)",
        color: liked ? "var(--primary-strong)" : "var(--black)",
        cursor: "pointer", transition: "transform 0.12s ease, opacity 0.12s ease",
        ...style,
      }}
    >
      <Heart size={18} fill={liked ? "currentColor" : "none"} />
      {count > 0 && <span style={{ fontSize: 14, fontWeight: 600 }}>{count}</span>}
    </button>
  );
}
