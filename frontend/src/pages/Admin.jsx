import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Flag, Wrench, Users, ScrollText, ChevronRight, Image } from "lucide-react";
import { api } from "../api/client";
import { useDocumentTitle } from "../useDocumentTitle";
import { useAdminGuard } from "../useAdminGuard";
import AdminGuard from "../components/AdminGuard";
import { useDelayedLoading } from "../useDelayedLoading";
import { pluralize } from "../pluralize";
import { useTranslation } from "react-i18next";

function SectionLink({ to, icon, title, hint }) {
  return (
    <Link to={to} className="card" style={{
      display: "flex", alignItems: "center", gap: 12, padding: 16,
      marginBottom: 8, textDecoration: "none", color: "inherit",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: "var(--primary-tint)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        color: "var(--primary-strong)",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="subhead" style={{ fontSize: 15 }}>{title}</div>
        {hint && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{hint}</div>}
      </div>
      <ChevronRight size={18} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
    </Link>
  );
}

export default function Admin() {
  const { t } = useTranslation();
  useDocumentTitle(t("admin.title"));
  const navigate = useNavigate();
  const { isAdmin, showSkeleton } = useAdminGuard();
  const [overview, setOverview] = useState(null);
  const showOverviewSkeleton = useDelayedLoading(overview === null);

  useEffect(() => {
    if (isAdmin) api.adminOverview().then(setOverview).catch(() => setOverview(null));
  }, [isAdmin]);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("admin.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("admin.title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <AdminGuard showSkeleton={showSkeleton} isAdmin={isAdmin}>
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

        <SectionLink
          to="/admin/reports"
          icon={<Flag size={19} />}
          title={t("admin.reports_queue_title")}
          hint={overview ? `${overview.unresolved_reports_count} ${pluralize(overview.unresolved_reports_count, [t("admin.report_word_one"), t("admin.report_word_few"), t("admin.report_word_many")])}` : undefined}
        />
        <SectionLink to="/admin/providers" icon={<Wrench size={19} />} title={t("admin.providers_title")} />
        <SectionLink to="/admin/users" icon={<Users size={19} />} title={t("admin.users_title")} />
        <SectionLink to="/admin/communities" icon={<Users size={19} />} title={t("admin.communities_title")} />
        <SectionLink to="/admin/stories" icon={<Image size={19} />} title={t("admin.stories_title")} />
        <SectionLink to="/admin/audit-log" icon={<ScrollText size={19} />} title={t("admin.audit_log_title")} />
      </AdminGuard>
    </div>
  );
}
