import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Flag, Trash2, X, BadgeCheck, Wrench, Users, ScrollText } from "lucide-react";
import { api } from "../api/client";
import { useDelayedLoading } from "../useDelayedLoading";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useSearchContext } from "../SearchContext";
import PawLoader from "../components/PawLoader";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { useTranslation } from "react-i18next";

const ACTION_LABELS = {
  dismiss_report: "admin.audit_dismiss_report",
  delete_post: "admin.audit_delete_post",
  delete_listing: "admin.audit_delete_listing",
  delete_story: "admin.audit_delete_story",
  delete_community: "admin.audit_delete_community",
  set_role: "admin.audit_set_role",
  verify_provider: "admin.audit_verify_provider",
  unverify_provider: "admin.audit_unverify_provider",
};

export default function Admin() {
  const { t, i18n } = useTranslation();
  useDocumentTitle(t("admin.title"));
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAuthed } = useAuth();
  const { setSearchConfig } = useSearchContext();
  const [me, setMe] = useState(null);
  const showSkeleton = useDelayedLoading(me === null);
  const [overview, setOverview] = useState(null);
  const showOverviewSkeleton = useDelayedLoading(overview === null);
  const [reports, setReports] = useState(null);
  const showReportsSkeleton = useDelayedLoading(reports === null);
  const [providers, setProviders] = useState(null);
  const showProvidersSkeleton = useDelayedLoading(providers === null);
  const [users, setUsers] = useState(null);
  const showUsersSkeleton = useDelayedLoading(users === null);
  const [communities, setCommunities] = useState(null);
  const showCommunitiesSkeleton = useDelayedLoading(communities === null);
  const [auditLog, setAuditLog] = useState(null);
  const showAuditLogSkeleton = useDelayedLoading(auditLog === null);
  const [userQuery, setUserQuery] = useState("");

  useEffect(() => {
    if (!me?.is_admin) return;
    const timer = setTimeout(() => {
      api.adminUsers(userQuery).then(setUsers).catch(() => setUsers([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [me, userQuery]);

  async function changeRole(userId, role) {
    try {
      await api.adminSetUserRole(userId, role);
      showToast(t("admin.role_updated_toast"));
      api.adminUsers(userQuery).then(setUsers).catch(() => {});
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  useEffect(() => {
    if (!me?.is_admin) return;
    setSearchConfig({ value: userQuery, onChange: setUserQuery, placeholder: t("admin.search_placeholder") });
    return () => setSearchConfig(null);
  }, [me, userQuery, setSearchConfig]);

  useEffect(() => {
    if (!isAuthed) return;
    api.me().then(setMe).catch(() => setMe(null));
  }, [isAuthed]);

  function load() {
    api.adminOverview().then(setOverview).catch(() => setOverview(null));
    api.adminReports(false).then(setReports).catch(() => setReports([]));
    api.adminServiceProviders().then(setProviders).catch(() => setProviders([]));
    api.communities().then(setCommunities).catch(() => setCommunities([]));
    api.adminAuditLog().then(setAuditLog).catch(() => setAuditLog([]));
  }

  async function deleteCommunity(id) {
    try {
      await api.adminDeleteCommunity(id);
      showToast(t("admin.community_deleted_toast"));
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  useEffect(() => {
    if (me?.is_admin) load();
  }, [me]);

  async function dismiss(id) {
    await api.adminDismissReport(id);
    showToast(t("admin.report_dismissed_toast"));
    load();
  }

  async function removePost(id) {
    await api.adminDeletePost(id);
    showToast(t("admin.post_deleted_toast"));
    load();
  }

  async function removeListing(id) {
    await api.adminDeleteListing(id);
    showToast(t("admin.listing_deleted_toast"));
    load();
  }

  async function toggleVerify(id) {
    const result = await api.adminToggleVerifyProvider(id);
    showToast(result.is_verified ? t("admin.provider_verified_toast") : t("admin.provider_unverified_toast"));
    load();
  }

  if (!isAuthed || me === null) {
    if (!showSkeleton) return null;
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}>
        <PawLoader size={40} />
      </div>
    );
  }

  if (!me.is_admin) {
    return (
      <div className="empty-state">
        <ShieldAlert size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
        <div className="empty-state-title">{t("admin.access_denied_title")}</div>
        {t("admin.access_denied_hint")}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("admin.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("admin.title")}</span>
        <span style={{ width: 44 }} />
      </div>

      {showOverviewSkeleton && (
        <div className="card-grid" style={{ marginBottom: 20 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card" style={{ borderRadius: 16, padding: "14px 16px" }}>
              <span className="skeleton" style={{ width: 40, height: 22, display: "block", marginBottom: 6 }} />
              <span className="skeleton" style={{ width: 70, height: 12, display: "block" }} />
            </div>
          ))}
        </div>
      )}

      {overview && (
        <div className="card-grid" style={{ marginBottom: 20 }}>
          {[
            [t("admin.stat_users"), overview.users_count],
            [t("admin.stat_posts"), overview.posts_count],
            [t("admin.stat_pets"), overview.pets_count],
            [t("admin.stat_reports"), overview.unresolved_reports_count],
          ].map(([label, value]) => (
            <div key={label} className="card" style={{ borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <h3 className="subhead" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <Flag size={16} /> {t("admin.reports_queue_title")}
      </h3>

      {showReportsSkeleton && <ListItemSkeleton count={2} />}

      {!showReportsSkeleton && reports?.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 20px" }}>{t("admin.no_reports")}</div>
      )}

      {!showReportsSkeleton && reports?.map((r) => (
        <div key={r.id} className="card" style={{ borderRadius: 16, padding: 14, marginBottom: 8 }}>
          {r.post && (
            <Link to={`/posts/${r.post.id}`} className="subhead" style={{ fontSize: 14 }}>
              {r.post.title}
            </Link>
          )}
          {r.listing && (
            <Link to={`/marketplace/${r.listing.id}`} className="subhead" style={{ fontSize: 14 }}>
              {r.listing.title} <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>{t("admin.listing_suffix")}</span>
            </Link>
          )}
          {!r.post && !r.listing && (
            <span style={{ fontSize: 14, color: "var(--text-faint)" }}>{t("admin.content_deleted")}</span>
          )}
          <div style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 8px" }}>
            {t("admin.report_from")} {r.reporter.display_name}{r.reason ? `: «${r.reason}»` : ""}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => dismiss(r.id)}>
              <X size={14} /> {t("admin.dismiss")}
            </button>
            {r.post && (
              <button
                className="btn"
                style={{ background: "var(--red-tint)", color: "var(--red)" }}
                onClick={() => removePost(r.post.id)}
              >
                <Trash2 size={14} /> {t("admin.delete_post")}
              </button>
            )}
            {r.listing && (
              <button
                className="btn"
                style={{ background: "var(--red-tint)", color: "var(--red)" }}
                onClick={() => removeListing(r.listing.id)}
              >
                <Trash2 size={14} /> {t("admin.delete_listing")}
              </button>
            )}
          </div>
        </div>
      ))}

      <h3 className="subhead" style={{ margin: "24px 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <Wrench size={16} /> {t("admin.providers_title")}
      </h3>

      {showProvidersSkeleton && <ListItemSkeleton count={2} />}

      {!showProvidersSkeleton && providers?.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 20px" }}>{t("admin.no_providers")}</div>
      )}

      {!showProvidersSkeleton && providers?.map((p) => (
        <div key={p.id} className="card" style={{
          borderRadius: 16, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Link to={`/users/${p.user.id}`} className="subhead" style={{ fontSize: 14 }}>{p.user.display_name}</Link>
              {p.is_verified && <BadgeCheck size={14} style={{ color: "var(--green-strong)" }} />}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {p.service_type}{p.rating_count > 0 ? ` · ★ ${p.rating_avg} (${p.rating_count})` : ""}
            </div>
          </div>
          <button
            className={p.is_verified ? "btn btn-ghost" : "btn"}
            style={!p.is_verified ? { background: "var(--green-strong)", color: "#fff" } : undefined}
            onClick={() => toggleVerify(p.id)}
          >
            <BadgeCheck size={14} /> {p.is_verified ? t("admin.unverify") : t("admin.verify")}
          </button>
        </div>
      ))}

      <h3 className="subhead" style={{ margin: "24px 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <Users size={16} /> {t("admin.users_title")}
      </h3>


      {showUsersSkeleton && <ListItemSkeleton count={2} />}

      {!showUsersSkeleton && users?.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 20px" }}>{t("admin.no_users")}</div>
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
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {u.email || t("admin.telegram_label")} · {u.city} · {u.posts_count} {t("admin.posts_count_suffix")} · {u.pets_count} {t("admin.pets_count_suffix")}
            </div>
          </div>
          {!u.is_admin && (
            <select
              value={u.role || "user"}
              onChange={(e) => changeRole(u.id, e.target.value)}
              style={{
                border: "1px solid var(--border)", borderRadius: 10, padding: "6px 8px",
                fontSize: 12, fontFamily: "var(--font-body)", background: "var(--surface)", flexShrink: 0,
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

      <h3 className="subhead" style={{ margin: "24px 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <Users size={16} /> {t("admin.communities_title")}
      </h3>

      {showCommunitiesSkeleton && <ListItemSkeleton count={2} />}

      {!showCommunitiesSkeleton && communities?.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 20px" }}>{t("admin.no_communities")}</div>
      )}

      {!showCommunitiesSkeleton && communities?.map((c) => (
        <div key={c.id} className="card" style={{
          borderRadius: 16, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="subhead" style={{ fontSize: 14 }}>{c.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {c.members_count} {t("admin.members_suffix")}{c.city ? ` · ${c.city}` : ""}
            </div>
          </div>
          <button className="btn" style={{ background: "var(--red-tint)", color: "var(--red)" }} onClick={() => deleteCommunity(c.id)}>
            <Trash2 size={14} /> {t("admin.delete")}
          </button>
        </div>
      ))}

      <h3 className="subhead" style={{ margin: "24px 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <ScrollText size={16} /> {t("admin.audit_log_title")}
      </h3>

      {showAuditLogSkeleton && <ListItemSkeleton count={3} />}

      {!showAuditLogSkeleton && auditLog?.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 20px" }}>{t("admin.no_audit_log")}</div>
      )}

      {!showAuditLogSkeleton && auditLog?.map((a) => (
        <div key={a.id} className="card" style={{ borderRadius: 16, padding: 14, marginBottom: 8 }}>
          <div style={{ fontSize: 13 }}>
            <b>{a.admin ? a.admin.display_name : t("admin.audit_unknown_admin")}</b>
            {" — "}
            {t(ACTION_LABELS[a.action] || a.action)}
            {a.note ? ` «${a.note}»` : ""}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
            {new Date(a.created_at).toLocaleString(i18n.language === "sr" ? "sr-Latn-RS" : "ru-RU")}
          </div>
        </div>
      ))}
    </div>
  );
}
