import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, UserPlus, MessageCircle, Eye, Heart } from "lucide-react";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import EmptyStateImage from "../components/EmptyStateImage";
import ErrorState from "../components/ErrorState";
import { api } from "../api/client";
import { useDocumentTitle } from "../useDocumentTitle";
import { useTranslation } from "react-i18next";

export default function Notifications() {
  const { t } = useTranslation();
  useDocumentTitle(t("notifications.title"));
  const navigate = useNavigate();

  function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return t("time.just_now");
    if (min < 60) return t("time.min_ago", { min });
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return t("time.hours_ago", { hours: hrs });
    return t("time.days_ago", { days: Math.floor(hrs / 24) });
  }
  const [items, setItems] = useState(null);
  const showSkeleton = useDelayedLoading(items === null);
  const [loadError, setLoadError] = useState(false);

  function load() {
    setLoadError(false);
    api.notifications().then(setItems).catch(() => setLoadError(true));
  }

  useEffect(load, []);

  async function markAllRead() {
    await api.markAllNotificationsRead();
    load();
  }

  async function openNotification(n) {
    if (!n.is_read) await api.markNotificationRead(n.id);
    if (n.post_id) navigate(`/posts/${n.post_id}`);
    else navigate(`/users/${n.actor.id}`);
  }

  const hasUnread = items?.some((n) => !n.is_read);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("notifications.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("notifications.title")}</span>
        {hasUnread ? (
          <button className="btn btn-ghost" onClick={markAllRead} style={{ padding: "8px 12px", fontSize: 12 }}>
            {t("notifications.mark_all_read")}
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 0 14px", scrollbarWidth: "none" }}>
        <div style={{
          flexShrink: 0, width: 260, borderRadius: 18, padding: 16,
          background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)", color: "#fff",
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{t("notifications.promo1_title")}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>{t("notifications.promo1_text")}</div>
        </div>
        <Link to="/settings" style={{
          flexShrink: 0, width: 260, borderRadius: 18, padding: 16, textDecoration: "none",
          background: "var(--surface)", border: "1px solid var(--border)", display: "block",
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4, color: "var(--text)" }}>{t("notifications.promo2_title")}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("notifications.promo2_text")}</div>
        </Link>
      </div>

      {showSkeleton && !loadError && <ListItemSkeleton />}

      {loadError && <ErrorState onRetry={load} />}

      {!loadError && items?.length === 0 && (
        <div className="empty-state">
          <EmptyStateImage />
          <div className="empty-state-title">{t("notifications.empty_title")}</div>
          {t("notifications.empty_hint")}
        </div>
      )}

      {!loadError && items?.map((n) => (
        <button
          key={n.id}
          onClick={() => openNotification(n)}
          className="card"
          style={{
            width: "100%", textAlign: "left", borderRadius: 16, padding: "12px 14px", marginBottom: 8,
            display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            background: n.is_read ? "var(--surface)" : "var(--primary-tint)",
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: "var(--gray-tint)", color: "var(--text-muted)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {n.type === "follow" && <UserPlus size={16} />}
            {n.type === "comment" && <MessageCircle size={16} />}
            {n.type === "sighting" && <Eye size={16} />}
            {n.type === "welcome" && <Heart size={16} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {n.type === "welcome" ? (
              <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                <b>{t("notifications.welcome_title")}</b>
                <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
                  {t("notifications.welcome_text")}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 14 }}>
                <b>{n.actor.display_name}</b>{" "}
                {n.type === "follow" && t("notifications.action_follow")}
                {n.type === "comment" && t("notifications.action_comment")}
                {n.type === "sighting" && t("notifications.action_sighting")}
                {n.post_title && <> «{n.post_title}»</>}
              </div>
            )}
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{timeAgo(n.created_at)}</div>
          </div>
          {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary-strong)", flexShrink: 0 }} />}
        </button>
      ))}
    </div>
  );
}
