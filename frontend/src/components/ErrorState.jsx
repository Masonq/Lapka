import { AlertTriangle, RotateCw } from "lucide-react";

export default function ErrorState({ onRetry, message = "Не удалось загрузить" }) {
  return (
    <div className="empty-state error-state">
      <AlertTriangle size={28} style={{ marginBottom: 8, color: "var(--red)" }} />
      <div className="empty-state-title">{message}</div>
      Проверь интернет-соединение и попробуй снова
      {onRetry && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onRetry}>
            <RotateCw size={15} /> Повторить
          </button>
        </div>
      )}
    </div>
  );
}
