import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Настоящий диалог подтверждения для опасных, необратимых действий —
 * не просто смена цвета маленькой иконки (легко тапнуть дважды случайно,
 * не заметив промежуточное состояние). Затемнённый фон + карточка по
 * центру + явные кнопки "Отмена"/"Подтвердить" — пользователь должен
 * осознанно нажать именно на кнопку подтверждения, случайный повторный
 * тап по тому же месту экрана (где была исходная кнопка) попадает в
 * оверлей, не в кнопку подтверждения.
 */
export default function ConfirmDialog({ title, message, confirmLabel, danger = true, onConfirm, onCancel, children }) {
  const { t } = useTranslation();

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{ borderRadius: 20, padding: 20, maxWidth: 340, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{title}</div>
        {message && <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 18 }}>{message}</div>}
        {children}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
            {t("confirm_dialog.cancel")}
          </button>
          <button
            className="btn"
            style={{ flex: 1, background: danger ? "var(--red)" : "var(--primary)", color: "#fff" }}
            onClick={onConfirm}
          >
            {confirmLabel || t("confirm_dialog.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
