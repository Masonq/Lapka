import { useState } from "react";

/**
 * Рендерит markdown-подобную разметку (тот же синтаксис, что вставляет
 * ScrollableTextarea — свой тулбар или нативное системное форматирование
 * iOS) в реальные React-элементы. БЕЗОПАСНО по конструкции: результат —
 * обычные React-элементы с текстовыми children, не dangerouslySetInnerHTML
 * — весь текст экранируется автоматически самим React, никакого сырого
 * HTML от пользователя никогда не попадает в DOM напрямую.
 *
 * Ссылки отдельно проверяются на схему (только http/https разрешены) —
 * без этого можно было бы вставить javascript: URL.
 *
 * Простой последовательный парсер (не полноценный CommonMark) —
 * на каждом шаге ищет ближайшее совпадение любого из маркеров, всё до
 * него — обычный текст, содержимое внутри маркеров парсится рекурсивно
 * (поддержка вложенности, например **_жирный курсив_**). Известное
 * ограничение: несбалансированный маркер (открыт, но не закрыт) просто
 * не совпадёт с регулярным выражением и останется видимым как есть —
 * безопасный, не ломающий вёрстку исход, актуально для обрезанных
 * превью в ленте.
 */
const PATTERNS = [
  { name: "bold", regex: /\*\*(.+?)\*\*/ },
  { name: "underline", regex: /\+\+(.+?)\+\+/ },
  { name: "strike", regex: /~~(.+?)~~/ },
  { name: "spoiler", regex: /\|\|(.+?)\|\|/ },
  { name: "link", regex: /\[(.+?)\]\((.+?)\)/ },
  { name: "italic", regex: /_(.+?)_/ },
];

function findEarliestMatch(text) {
  let best = null;
  for (const { name, regex } of PATTERNS) {
    const m = regex.exec(text);
    if (m && (best === null || m.index < best.match.index)) {
      best = { name, match: m };
    }
  }
  return best;
}

function SpoilerSpan({ text }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      onClick={() => setRevealed(true)}
      role="button"
      tabIndex={0}
      style={{
        cursor: revealed ? "text" : "pointer",
        borderRadius: 4,
        padding: "0 2px",
        background: revealed ? "transparent" : "var(--text-faint)",
        color: revealed ? "inherit" : "transparent",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {text}
    </span>
  );
}

function parseInline(text, keyPrefix) {
  const nodes = [];
  let remaining = text;
  let counter = 0;

  while (remaining.length > 0) {
    const found = findEarliestMatch(remaining);
    if (!found) {
      nodes.push(remaining);
      break;
    }
    const { name, match } = found;
    const before = remaining.slice(0, match.index);
    if (before) nodes.push(before);

    const key = `${keyPrefix}-${counter++}`;
    if (name === "link") {
      const linkText = match[1];
      const url = match[2];
      const isSafe = /^https?:\/\//i.test(url);
      if (isSafe) {
        nodes.push(
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary-strong)", textDecoration: "underline" }}
            onClick={(e) => e.stopPropagation()}
          >
            {parseInline(linkText, key)}
          </a>
        );
      } else {
        // Небезопасная или нераспознанная схема (например javascript:) —
        // не делаем ссылкой, показываем как обычный текст
        nodes.push(match[0]);
      }
    } else if (name === "bold") {
      nodes.push(<strong key={key}>{parseInline(match[1], key)}</strong>);
    } else if (name === "italic") {
      nodes.push(<em key={key}>{parseInline(match[1], key)}</em>);
    } else if (name === "underline") {
      nodes.push(<u key={key}>{parseInline(match[1], key)}</u>);
    } else if (name === "strike") {
      nodes.push(<s key={key}>{parseInline(match[1], key)}</s>);
    } else if (name === "spoiler") {
      nodes.push(<SpoilerSpan key={key} text={match[1]} />);
    }

    remaining = remaining.slice(match.index + match[0].length);
  }

  return nodes;
}

export default function FormattedText({ text, className, style, as: Tag = "span" }) {
  if (!text) return null;
  return (
    <Tag className={className} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", ...style }}>
      {parseInline(text, "root")}
    </Tag>
  );
}
