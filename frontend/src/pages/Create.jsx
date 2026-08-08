import { useNavigate } from "react-router-dom";
import { AlertTriangle, MapPinCheck, Heart, HelpCircle, MessageSquarePlus } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useDocumentTitle } from "../useDocumentTitle";

// Типы контента, которые реально умеет бэкенд сегодня. Story, Poll, Walk, Event,
// Marketplace Listing и Review из блюпринта пока не реализованы — по правилу самого
// блюпринта ("недоступные пользователю типы скрываются, а не показываются заблокированными")
// не выводим их вовсе, чтобы не обещать того, чего нет
const TYPES = [
  { value: "lost", label: "Потерялся питомец", desc: "Срочный пост с приметами и местом", icon: AlertTriangle, tint: "var(--red-tint)", color: "var(--red)" },
  { value: "found", label: "Нашёлся питомец", desc: "Кто-то потерял — сообщи, где видел", icon: MapPinCheck, tint: "var(--green-tint)", color: "var(--green)" },
  { value: "adopt", label: "Ищет дом", desc: "Пристройство питомца в добрые руки", icon: Heart, tint: "var(--yellow-tint)", color: "#8A6A00" },
  { value: "question", label: "Вопрос соседям", desc: "Спросить совета у сообщества", icon: HelpCircle, tint: "var(--blue-tint)", color: "var(--blue)" },
  { value: "general", label: "Обычный пост", desc: "Поделиться чем угодно про питомца", icon: MessageSquarePlus, tint: "var(--gray-tint)", color: "var(--text-muted)" },
];

export default function Create() {
  useDocumentTitle("Создать");
  const { isAuthed } = useAuth();
  const navigate = useNavigate();

  if (!isAuthed) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Нужно войти</div>
        Чтобы что-то опубликовать, сначала войди в аккаунт
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => navigate("/profile")}>Войти</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <span className="page-title">Что создаём?</span>
      </div>

      <div className="card-grid">
        {TYPES.map(({ value, label, desc, icon: Icon, tint, color }) => (
          <button
            key={value}
            className="card"
            style={{
              borderRadius: 20, padding: 16, textAlign: "left", cursor: "pointer",
              display: "flex", alignItems: "flex-start", gap: 12, border: "1px solid var(--border)",
            }}
            onClick={() => navigate(`/new-post?type=${value}`)}
          >
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: tint, color,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon size={19} strokeWidth={2} />
            </div>
            <div>
              <div className="subhead" style={{ fontSize: 15 }}>{label}</div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "3px 0 0" }}>{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
