import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, KeyRound, Trash2, UserX, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";

export default function Settings() {
  useDocumentTitle("Настройки");
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [blockedUsers, setBlockedUsers] = useState(null);

  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  function loadBlocked() {
    api.blockedUsers().then(setBlockedUsers).catch(() => setBlockedUsers([]));
  }

  useEffect(loadBlocked, []);

  async function unblock(userId) {
    try {
      await api.unblockUser(userId);
      showToast("Разблокирован(а)");
      loadBlocked();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function submitPasswordChange(e) {
    e.preventDefault();
    setPasswordError("");
    setChangingPassword(true);
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      showToast("Пароль изменён");
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setChangingPassword(false);
    }
  }

  async function submitDelete(e) {
    e.preventDefault();
    setDeleteError("");
    setDeleting(true);
    try {
      await api.deleteAccount(deletePassword || undefined);
      logout();
      showToast("Аккаунт удалён");
      navigate("/");
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Настройки</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="card" style={{ borderRadius: 20, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <KeyRound size={17} />
            <h3 className="subhead" style={{ fontSize: 15 }}>Сменить пароль</h3>
          </div>
          <form onSubmit={submitPasswordChange}>
            <div className="field">
              <label htmlFor="current-password">Текущий пароль</label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="field">
              <label htmlFor="new-password">Новый пароль</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Минимум 6 символов"
                autoComplete="new-password"
              />
            </div>
            {passwordError && <p style={{ color: "var(--red)", fontSize: 13 }}>{passwordError}</p>}
            <button className="btn btn-primary btn-block" disabled={changingPassword}>
              {changingPassword ? "Сохраняем…" : "Сохранить пароль"}
            </button>
          </form>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 10 }}>
            Если ты вошёл(-шла) через Telegram, пароля у аккаунта нет
          </p>
        </div>

        <div className="card" style={{ borderRadius: 20, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <UserX size={17} />
            <h3 className="subhead" style={{ fontSize: 15 }}>Заблокированные</h3>
          </div>

          {blockedUsers === null && <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Загружаем…</p>}

          {blockedUsers?.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Никого не заблокировано</p>
          )}

          {blockedUsers?.map((b) => (
            <div key={b.user.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
              borderTop: "1px solid var(--border)",
            }}>
              <Link to={`/users/${b.user.id}`} style={{
                display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, textDecoration: "none", color: "inherit",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: "var(--gray-tint)", color: "var(--text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 800, overflow: "hidden",
                }}>
                  {b.user.avatar_url ? (
                    <img src={b.user.avatar_url} alt={b.user.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    b.user.display_name[0]?.toUpperCase()
                  )}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{b.user.display_name}</span>
              </Link>
              <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => unblock(b.user.id)}>
                <ShieldCheck size={13} /> Разблокировать
              </button>
            </div>
          ))}
        </div>

        <div className="card" style={{ borderRadius: 20, padding: 18, border: "1px solid var(--red-tint)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Trash2 size={17} color="var(--red)" />
            <h3 className="subhead" style={{ fontSize: 15, color: "var(--red)" }}>Удалить аккаунт</h3>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            Удалятся аккаунт, все питомцы, посты, комментарии и анкета исполнителя услуг.
            Отменить это будет нельзя.
          </p>

          {!showDeleteForm ? (
            <button className="btn btn-ghost btn-block" onClick={() => setShowDeleteForm(true)}>
              Удалить аккаунт
            </button>
          ) : (
            <form onSubmit={submitDelete}>
              <div className="field">
                <label htmlFor="delete-password">Подтверди паролем</label>
                <input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Оставь пустым, если вход через Telegram"
                  autoComplete="current-password"
                />
              </div>
              {deleteError && <p style={{ color: "var(--red)", fontSize: 13 }}>{deleteError}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-block"
                  style={{ background: "var(--red)", color: "#fff" }}
                  disabled={deleting}
                >
                  {deleting ? "Удаляем…" : "Точно удалить"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowDeleteForm(false)}>
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
