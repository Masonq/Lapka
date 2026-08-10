import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="empty-state">
      <div className="empty-state-title">{t("not_found.title")}</div>
      {t("not_found.hint")}
      <div style={{ marginTop: 16 }}>
        <Link to="/" className="btn btn-primary">{t("not_found.go_home")}</Link>
      </div>
    </div>
  );
}
