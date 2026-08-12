import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useAdminGuard } from "../useAdminGuard";
import { usePaginatedAdminList } from "../usePaginatedAdminList";
import AdminGuard from "../components/AdminGuard";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import { useTranslation } from "react-i18next";

export default function AdminStories() {
  const { t } = useTranslation();
  useDocumentTitle(t("admin.stories_title"));
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAdmin, showSkeleton } = useAdminGuard();

  const { items: stories, hasMore, loadingMore, loadMore, reload } = usePaginatedAdminList(
    (offset, limit) => api.adminStories(limit, offset),
    [isAdmin]
  );
  const showStoriesSkeleton = useDelayedLoading(stories === null);

  async function removeStory(id) {
    await api.adminDeleteStory(id);
    showToast(t("admin.story_deleted_toast"));
    reload();
  }

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate("/admin")} aria-label={t("admin.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("admin.stories_title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <AdminGuard showSkeleton={showSkeleton} isAdmin={isAdmin}>
        {showStoriesSkeleton && <ListItemSkeleton count={3} />}

        {!showStoriesSkeleton && stories?.length === 0 && (
          <div className="empty-state" style={{ padding: "24px 20px" }}>
            <ImageIcon size={24} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
            <div>{t("admin.no_stories")}</div>
          </div>
        )}

        {!showStoriesSkeleton && stories?.map((s) => (
          <div key={s.id} className="card" style={{
            borderRadius: 16, padding: 10, marginBottom: 8, display: "flex", alignItems: "center", gap: 12,
          }}>
            <img
              src={s.photo_url}
              alt=""
              style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link to={`/users/${s.author.id}`} className="subhead" style={{ fontSize: 14 }}>
                {s.author.display_name}
              </Link>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {t("admin.story_expires_at")} {new Date(s.expires_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <button
              className="icon-btn"
              style={{ flexShrink: 0 }}
              onClick={() => removeStory(s.id)}
              aria-label={t("admin.delete")}
            >
              <Trash2 size={16} style={{ color: "var(--red)" }} />
            </button>
          </div>
        ))}

        {!showStoriesSkeleton && hasMore && (
          <button className="btn btn-ghost btn-block" onClick={loadMore} disabled={loadingMore} style={{ marginTop: 8 }}>
            {loadingMore ? t("admin.loading_more") : t("admin.load_more")}
          </button>
        )}
      </AdminGuard>
    </div>
  );
}
