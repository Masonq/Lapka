import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Users, Wrench, Ban, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useSearchContext } from "../SearchContext";
import { useAdminGuard } from "../useAdminGuard";
import { usePaginatedAdminList } from "../usePaginatedAdminList";
import AdminGuard from "../components/AdminGuard";
import ConfirmDialog from "../components/ConfirmDialog";
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
  // Пользователь, для которого сейчас открыт диалог подтверждения бана —
  // сам объект (не только id), чтобы показать имя в тексте диалога
  const [banningUser, setBanningUser] = useState(null);
  const [banReasonInput, setBanReasonInput] = useState("");

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

  async function confirmBan() {
    const user = banningUser;
    setBanningUser(null);
    try {
      await api.adminBanUser(user.id, true, banReasonInput.trim() || undefined);
      showToast(t("admin.user_banned_toast"));
      reload();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function unban(userId) {
    try {
      await api.adminBanUser(userId, false);
      showToast(t("admin.user_unbanned_toast"));
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
          <div key={u.id} className="card" style={{ borderRadius: 16, padding: 14, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
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
                  {u.is_banned && (
                    <span className="badge badge-sm" style={{ background: "var(--red-tint)", color: "var(--red)" }}>
                      <Ban size={10} /> {t("admin.banned_badge")}
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

            {!u.is_admin && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                {u.is_banned ? (
                  <>
                    {u.ban_reason && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                        {t("admin.ban_reason_label")} «{u.ban_reason}»
                      </div>
                    )}
                    <button className="btn btn-ghost" onClick={() => unban(u.id)}>
                      <ShieldCheck size={14} /> {t("admin.unban")}
                    </button>
                  </>
                ) : (
                  <button
                    className="btn"
                    style={{ background: "var(--red-tint)", color: "var(--red)" }}
                    onClick={() => { setBanningUser(u); setBanReasonInput(""); }}
                  >
                    <Ban size={14} /> {t("admin.ban")}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {!showUsersSkeleton && hasMore && (
          <button className="btn btn-ghost btn-block" onClick={loadMore} disabled={loadingMore} style={{ marginTop: 8 }}>
            {loadingMore ? t("admin.loading_more") : t("admin.load_more")}
          </button>
        )}
      </AdminGuard>

      {banningUser && (
        <ConfirmDialog
          title={t("admin.ban_confirm_title", { name: banningUser.display_name })}
          message={t("admin.ban_confirm_message")}
          confirmLabel={t("admin.ban")}
          danger
          onConfirm={confirmBan}
          onCancel={() => setBanningUser(null)}
        >
          <input
            type="text"
            value={banReasonInput}
            onChange={(e) => setBanReasonInput(e.target.value)}
            placeholder={t("admin.ban_reason_placeholder")}
            autoFocus
            style={{
              width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px",
              fontSize: 14, fontFamily: "var(--font-body)", background: "var(--surface)", color: "var(--text)",
              marginBottom: 18, boxSizing: "border-box",
            }}
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
