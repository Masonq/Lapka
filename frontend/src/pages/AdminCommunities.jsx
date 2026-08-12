import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useAdminGuard } from "../useAdminGuard";
import AdminGuard from "../components/AdminGuard";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import { useTranslation } from "react-i18next";

export default function AdminCommunities() {
  const { t } = useTranslation();
  useDocumentTitle(t("admin.communities_title"));
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAdmin, showSkeleton } = useAdminGuard();
  const [communities, setCommunities] = useState(null);
  const showCommunitiesSkeleton = useDelayedLoading(communities === null);

  function load() {
    api.communities().then(setCommunities).catch(() => setCommunities([]));
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function deleteCommunity(id) {
    try {
      await api.adminDeleteCommunity(id);
      showToast(t("admin.community_deleted_toast"));
      load();
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
        <span className="page-title">{t("admin.communities_title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <AdminGuard showSkeleton={showSkeleton} isAdmin={isAdmin}>
        {showCommunitiesSkeleton && <ListItemSkeleton count={3} />}

        {!showCommunitiesSkeleton && communities?.length === 0 && (
          <div className="empty-state" style={{ padding: "24px 20px" }}>
            <Users size={24} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
            <div>{t("admin.no_communities")}</div>
          </div>
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
      </AdminGuard>
    </div>
  );
}
