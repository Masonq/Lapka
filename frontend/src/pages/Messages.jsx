import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useDocumentTitle } from "../useDocumentTitle";
import ListItemSkeleton from "../components/ListItemSkeleton";

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ч`;
  return `${Math.floor(hrs / 24)} дн`;
}

export default function Messages() {
  useDocumentTitle("Сообщения");
  const { isAuthed } = useAuth();
  const [conversations, setConversations] = useState(null);

  useEffect(() => {
    if (!isAuthed) return;
    api.conversations().then(setConversations).catch(() => setConversations([]));
  }, [isAuthed]);

  if (!isAuthed) {
    return (
      <div className="empty-state">
        <MessageCircle size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
        <div className="empty-state-title">Нужно войти</div>
        Чтобы писать другим людям, сначала войди в аккаунт
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <span className="page-title">Сообщения</span>
      </div>

      {conversations === null && <ListItemSkeleton />}

      {conversations?.length === 0 && (
        <div className="empty-state">
          <MessageCircle size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
          <div className="empty-state-title">Пока пусто</div>
          Напиши кому-нибудь с его профиля — переписка появится здесь
        </div>
      )}

      {conversations?.map((c) => (
        <Link
          key={c.partner.id}
          to={`/messages/${c.partner.id}`}
          className="card"
          style={{
            display: "flex", alignItems: "center", gap: 12, borderRadius: 16, padding: "12px 14px", marginBottom: 8,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, overflow: "hidden",
          }}>
            {c.partner.avatar_url ? (
              <img src={c.partner.avatar_url} alt={c.partner.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              c.partner.display_name[0]?.toUpperCase()
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span className="subhead" style={{ fontSize: 14 }}>{c.partner.display_name}</span>
              <span style={{ fontSize: 12, color: "var(--text-faint)", flexShrink: 0 }}>{timeAgo(c.last_message_at)}</span>
            </div>
            <div style={{
              fontSize: 13, color: c.unread_count > 0 ? "var(--black)" : "var(--text-muted)",
              fontWeight: c.unread_count > 0 ? 700 : 400,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {c.last_message}
            </div>
          </div>
          {c.unread_count > 0 && (
            <span style={{
              minWidth: 20, height: 20, borderRadius: 999, background: "var(--primary-strong)", color: "#fff",
              fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0,
            }}>
              {c.unread_count > 9 ? "9+" : c.unread_count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
