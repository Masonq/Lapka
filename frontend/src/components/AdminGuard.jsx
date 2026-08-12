import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import PawLoader from "./PawLoader";

/**
 * Обёртка для каждой отдельной страницы админки — раньше этот же JSX
 * (skeleton / access-denied / контент) был частью одного большого
 * Admin.jsx, теперь переиспользуется в каждой из 6 разбитых страниц.
 */
export default function AdminGuard({ showSkeleton, isAdmin, children }) {
  const { t } = useTranslation();

  if (showSkeleton) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}>
        <PawLoader size={40} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="empty-state">
        <ShieldAlert size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
        <div className="empty-state-title">{t("admin.access_denied_title")}</div>
        {t("admin.access_denied_hint")}
      </div>
    );
  }

  return children;
}
