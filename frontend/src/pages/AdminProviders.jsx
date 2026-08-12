import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Wrench, BadgeCheck } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useAdminGuard } from "../useAdminGuard";
import AdminGuard from "../components/AdminGuard";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import { useTranslation } from "react-i18next";

export default function AdminProviders() {
  const { t } = useTranslation();
  useDocumentTitle(t("admin.providers_title"));
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAdmin, showSkeleton } = useAdminGuard();
  const [providers, setProviders] = useState(null);
  const showProvidersSkeleton = useDelayedLoading(providers === null);

  function load() {
    api.adminServiceProviders().then(setProviders).catch(() => setProviders([]));
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function toggleVerify(id) {
    const result = await api.adminToggleVerifyProvider(id);
    showToast(result.is_verified ? t("admin.provider_verified_toast") : t("admin.provider_unverified_toast"));
    load();
  }

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate("/admin")} aria-label={t("admin.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("admin.providers_title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <AdminGuard showSkeleton={showSkeleton} isAdmin={isAdmin}>
        {showProvidersSkeleton && <ListItemSkeleton count={3} />}

        {!showProvidersSkeleton && providers?.length === 0 && (
          <div className="empty-state" style={{ padding: "24px 20px" }}>
            <Wrench size={24} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
            <div>{t("admin.no_providers")}</div>
          </div>
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
      </AdminGuard>
    </div>
  );
}
