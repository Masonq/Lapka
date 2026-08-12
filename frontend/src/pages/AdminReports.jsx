import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Flag, X, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useAdminGuard } from "../useAdminGuard";
import AdminGuard from "../components/AdminGuard";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import { useTranslation } from "react-i18next";

export default function AdminReports() {
  const { t } = useTranslation();
  useDocumentTitle(t("admin.reports_queue_title"));
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAdmin, showSkeleton } = useAdminGuard();
  const [reports, setReports] = useState(null);
  const showReportsSkeleton = useDelayedLoading(reports === null);

  function load() {
    api.adminReports(false).then(setReports).catch(() => setReports([]));
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

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

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate("/admin")} aria-label={t("admin.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("admin.reports_queue_title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <AdminGuard showSkeleton={showSkeleton} isAdmin={isAdmin}>
        {showReportsSkeleton && <ListItemSkeleton count={3} />}

        {!showReportsSkeleton && reports?.length === 0 && (
          <div className="empty-state" style={{ padding: "24px 20px" }}>
            <Flag size={24} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
            <div>{t("admin.no_reports")}</div>
          </div>
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
      </AdminGuard>
    </div>
  );
}
