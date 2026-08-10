import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Flag, Trash2, X, BadgeCheck, Wrench, Users } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useSearchContext } from "../SearchContext";
import PawLoader from "../components/PawLoader";
import { useTranslation } from "react-i18next";

export default function Admin() {
  const { t } = useTranslation();
  useDocumentTitle(t("admin.title"));
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAuthed } = useAuth();
  const { setSearchConfig } = useSearchContext();
  const [me, setMe] = useState(null);
  const [overview, setOverview] = useState(null);
  const [reports, setReports] = useState(null);
  const [providers, setProviders] = useState(null);
  const [users, setUsers] = useState(null);
  const [communities, setCommunities] = useState(null);
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

      {reports?.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 20px" }}>{t("admin.no_reports")}</div>
      )}

      {reports?.map((r) => (
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

      {providers?.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 20px" }}>{t("admin.no_providers")}</div>
      )}

      {providers?.map((p) => (
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


      {users?.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 20px" }}>{t("admin.no_users")}</div>
      )}

      {users?.map((u) => (
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

      {communities?.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 20px" }}>{t("admin.no_communities")}</div>
      )}

      {communities?.map((c) => (
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
    </div>
  );
}
