import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ScrollText } from "lucide-react";
import { api } from "../api/client";
import { useDocumentTitle } from "../useDocumentTitle";
import { useAdminGuard } from "../useAdminGuard";
import AdminGuard from "../components/AdminGuard";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
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

const ROLE_LABELS = {
  user: "admin.role_user",
  editor: "admin.role_editor",
  moderator: "admin.role_moderator",
};

export default function AdminAuditLog() {
  const { t, i18n } = useTranslation();
  useDocumentTitle(t("admin.audit_log_title"));
  const navigate = useNavigate();
  const { isAdmin, showSkeleton } = useAdminGuard();
  const [auditLog, setAuditLog] = useState(null);
  const showAuditLogSkeleton = useDelayedLoading(auditLog === null);

  useEffect(() => {
    if (isAdmin) api.adminAuditLog().then(setAuditLog).catch(() => setAuditLog([]));
  }, [isAdmin]);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate("/admin")} aria-label={t("admin.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("admin.audit_log_title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <AdminGuard showSkeleton={showSkeleton} isAdmin={isAdmin}>
        {showAuditLogSkeleton && <ListItemSkeleton count={4} />}

        {!showAuditLogSkeleton && auditLog?.length === 0 && (
          <div className="empty-state" style={{ padding: "24px 20px" }}>
            <ScrollText size={24} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
            <div>{t("admin.no_audit_log")}</div>
          </div>
        )}

        {!showAuditLogSkeleton && auditLog?.map((a) => (
          <div key={a.id} className="card" style={{ borderRadius: 16, padding: 14, marginBottom: 8 }}>
            <div style={{ fontSize: 13 }}>
              <b>{a.admin ? a.admin.display_name : t("admin.audit_unknown_admin")}</b>
              {" — "}
              {t(ACTION_LABELS[a.action] || a.action)}
              {a.note ? ` «${a.action === "set_role" ? t(ROLE_LABELS[a.note] || a.note) : a.note}»` : ""}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
              {new Date(a.created_at).toLocaleString(i18n.language === "sr" ? "sr-Latn-RS" : "ru-RU")}
            </div>
          </div>
        ))}
      </AdminGuard>
    </div>
  );
}
