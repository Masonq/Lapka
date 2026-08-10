import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useDocumentTitle } from "../useDocumentTitle";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import EmptyStateImage from "../components/EmptyStateImage";
import ErrorState from "../components/ErrorState";
import { useTranslation } from "react-i18next";

export default function Messages() {
  const { t } = useTranslation();
  useDocumentTitle(t("messages.title"));
  const { isAuthed } = useAuth();

  function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return t("time.just_now");
    if (min < 60) return t("time.min_ago", { min });
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return t("time.hours_ago", { hours: hrs });
    return t("time.days_ago", { days: Math.floor(hrs / 24) });
  }
  const [conversations, setConversations] = useState(null);
  const showSkeleton = useDelayedLoading(conversations === null);
  const [loadError, setLoadError] = useState(false);

  function load() {
    if (!isAuthed) return;
    setLoadError(false);
    api.conversations().then(setConversations).catch(() => setLoadError(true));
  }

  useEffect(load, [isAuthed]);

  if (!isAuthed) {
    return (
      <div className="empty-state">
        <MessageCircle size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
        <div className="empty-state-title">{t("messages.login_required_title")}</div>
        {t("messages.login_required_hint")}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <span className="page-title">{t("messages.title")}</span>
      </div>

      {showSkeleton && !loadError && <ListItemSkeleton />}

      {loadError && <ErrorState onRetry={load} />}

      {!loadError && conversations?.length === 0 && (
        <div className="empty-state">
          <EmptyStateImage />
          <div className="empty-state-title">{t("messages.empty_title")}</div>
          {t("messages.empty_hint")}
        </div>
      )}

      {!loadError && conversations?.map((c) => (
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
