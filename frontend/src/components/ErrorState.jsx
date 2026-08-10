import { AlertTriangle, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ErrorState({ onRetry, message }) {
  const { t } = useTranslation();
  return (
    <div className="empty-state error-state">
      <AlertTriangle size={28} style={{ marginBottom: 8, color: "var(--red)" }} />
      <div className="empty-state-title">{message || t("error.default_message")}</div>
      {t("error.hint")}
      {onRetry && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onRetry}>
            <RotateCw size={15} /> {t("error.retry")}
          </button>
        </div>
      )}
    </div>
  );
}
