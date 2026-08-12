import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Users, Wrench } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useSearchContext } from "../SearchContext";
import { useAdminGuard } from "../useAdminGuard";
import { usePaginatedAdminList } from "../usePaginatedAdminList";
import AdminGuard from "../components/AdminGuard";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import { useTranslation } from "react-i18next";

export default function AdminUsers() {
  const { t, i18n } = useTranslation();
  useDocumentTitle(t("admin.users_title"));
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setSearchConfig } = useSearchContext();
  const { isAdmin, showSkeleton } = useAdminGuard();
  const [userQuery, setUserQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce отдельно от самой пагинации — управляет только КОГДА начинать
  // новый поиск (не дёргать API на каждое нажатие клавиши), а
  // usePaginatedAdminList ниже реагирует на смену debouncedQuery как на
  // обычный сброс списка (deps)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(userQuery), 350);
    return () => clearTimeout(timer);
  }, [userQuery]);

  const { items: users, hasMore, loadingMore, loadMore, reload } = usePaginatedAdminList(
    (offset, limit) => api.adminUsers(debouncedQuery, limit, offset),
    [isAdmin, debouncedQuery]
  );
  const showUsersSkeleton = useDelayedLoading(users === null);

  useEffect(() => {
    if (!isAdmin) return;
    setSearchConfig({ value: userQuery, onChange: setUserQuery, placeholder: t("admin.search_placeholder") });
    return () => setSearchConfig(null);
  }, [isAdmin, userQuery, setSearchConfig, t]);

  async function changeRole(userId, role) {
    try {
      await api.adminSetUserRole(userId, role);
      showToast(t("admin.role_updated_toast"));
      reload();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate("/admin")} aria-label={t("admin.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("admin.users_title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <AdminGuard showSkeleton={showSkeleton} isAdmin={isAdmin}>
        {showUsersSkeleton && <ListItemSkeleton count={4} />}

        {!showUsersSkeleton && users?.length === 0 && (
          <div className="empty-state" style={{ padding: "24px 20px" }}>
            <Users size={24} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
            <div>{t("admin.no_users")}</div>
          </div>
        )}

        {!showUsersSkeleton && users?.map((u) => (
          <div key={u.id} className="card" style={{
            borderRadius: 16, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Link to={`/users/${u.id}`} className="subhead" style={{ fontSize: 14 }}>{u.display_name}</Link>
                {u.is_admin && <span className="badge badge-neutral badge-sm">admin</span>}
                {!u.is_admin && u.role && u.role !== "user" && (
                  <span className="badge badge-primary badge-sm">{u.role === "moderator" ? t("admin.role_moderator_badge") : t("admin.role_editor_badge")}</span>
                )}
                {u.is_service_provider && (
                  <span className="badge badge-sm" style={{ background: "var(--green-tint)", color: "var(--green-strong)" }}>
                    <Wrench size={10} /> {t("admin.service_provider_badge")}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {u.email || t("admin.telegram_label")} · {u.city} · {u.posts_count} {t("admin.posts_count_suffix")} · {u.pets_count} {t("admin.pets_count_suffix")}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>
                {t("admin.registered_on")} {new Date(u.created_at).toLocaleDateString(i18n.language === "sr" ? "sr-Latn-RS" : "ru-RU")}
              </div>
            </div>
            {!u.is_admin && (
              <select
                value={u.role || "user"}
                onChange={(e) => changeRole(u.id, e.target.value)}
                style={{
                  border: "1px solid var(--border)", borderRadius: 10, padding: "6px 8px",
                  fontSize: 12, fontFamily: "var(--font-body)", background: "var(--surface)",
                  color: "var(--text)", flexShrink: 0,
                }}
                aria-label={t("admin.role_aria", { name: u.display_name })}
              >
                <option value="user">{t("admin.role_user")}</option>
                <option value="editor">{t("admin.role_editor")}</option>
                <option value="moderator">{t("admin.role_moderator")}</option>
              </select>
            )}
          </div>
        ))}

        {!showUsersSkeleton && hasMore && (
          <button className="btn btn-ghost btn-block" onClick={loadMore} disabled={loadingMore} style={{ marginTop: 8 }}>
            {loadingMore ? t("admin.loading_more") : t("admin.load_more")}
          </button>
        )}
      </AdminGuard>
    </div>
  );
}
