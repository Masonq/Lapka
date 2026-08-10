import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, KeyRound, Trash2, UserX, ShieldCheck, Wrench, Sparkles } from "lucide-react";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";

const SERVICE_TYPES = [
  { value: "sitter", label: "Ситтер" },
  { value: "boarding", label: "Передержка" },
  { value: "trainer", label: "Кинолог" },
  { value: "vet", label: "Ветеринар" },
  { value: "groomer", label: "Грумер" },
];

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

  const [isProvider, setIsProvider] = useState(null);
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [providerForm, setProviderForm] = useState({ service_type: "sitter", description: "", price_from: "", contact: "" });
  const [providerError, setProviderError] = useState("");
  const [submittingProvider, setSubmittingProvider] = useState(false);

  useEffect(() => {
    api.me().then((me) => setIsProvider(me.is_service_provider)).catch(() => setIsProvider(false));
  }, []);

  async function submitProvider(e) {
    e.preventDefault();
    setProviderError("");
    setSubmittingProvider(true);
    try {
      await api.becomeProvider({
        ...providerForm,
        price_from: providerForm.price_from ? Number(providerForm.price_from) : undefined,
      });
      setIsProvider(true);
      setShowProviderForm(false);
      showToast("Анкета опубликована — теперь ты в каталоге услуг");
    } catch (err) {
      setProviderError(err.message);
      showToast(err.message, "error");
    } finally {
      setSubmittingProvider(false);
    }
  }

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
        {isProvider === false && !showProviderForm && (
          <div
            className="card"
            style={{
              borderRadius: 20, padding: 20, marginBottom: 16, position: "relative", overflow: "hidden",
              background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)", color: "#fff", border: "none",
            }}
          >
            <Sparkles size={80} strokeWidth={1.2} style={{ position: "absolute", top: -16, right: -16, opacity: 0.25 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Wrench size={18} />
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Оказываешь услуги для питомцев?</h3>
            </div>
            <p style={{ fontSize: 13, opacity: 0.92, margin: "0 0 16px", maxWidth: 320 }}>
              Ситтер, передержка, кинолог, ветеринар или грумер — регистрация в каталоге услуг
              бесплатная, тебя увидят все владельцы животных в городе.
            </p>
            <button
              className="btn"
              style={{ background: "#fff", color: "var(--primary-strong)", fontWeight: 800 }}
              onClick={() => setShowProviderForm(true)}
            >
              <Wrench size={15} /> Стать исполнителем
            </button>
          </div>
        )}

        {isProvider === true && !showProviderForm && (
          <div className="card" style={{
            borderRadius: 20, padding: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 10,
          }}>
            <ShieldCheck size={18} style={{ color: "var(--green-strong)" }} />
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Ты уже в каталоге услуг — анкета видна всем в разделе «Поиск»
            </div>
          </div>
        )}

        {showProviderForm && (
          <form onSubmit={submitProvider} className="card" style={{ borderRadius: 20, padding: 18, marginBottom: 16 }}>
            <h3 className="subhead" style={{ fontSize: 15, marginBottom: 12 }}>Анкета исполнителя</h3>
            <div className="field">
              <label id="settings-service-type-label">Вид услуги</label>
              <div className="chip-row" role="group" aria-labelledby="settings-service-type-label" style={{ paddingBottom: 2 }}>
                {SERVICE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`chip${providerForm.service_type === t.value ? " active" : ""}`}
                    onClick={() => setProviderForm({ ...providerForm, service_type: t.value })}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="settings-service-description">Описание</label>
              <textarea
                id="settings-service-description" rows={3} required
                value={providerForm.description}
                onChange={(e) => setProviderForm({ ...providerForm, description: e.target.value })}
                placeholder="Опыт, район работы, что входит в услугу"
              />
            </div>
            <div className="field">
              <label htmlFor="settings-service-price">Цена от (динары)</label>
              <input
                id="settings-service-price" type="number" min="0"
                value={providerForm.price_from}
                onChange={(e) => setProviderForm({ ...providerForm, price_from: e.target.value })}
                placeholder="800"
              />
            </div>
            <div className="field">
              <label htmlFor="settings-service-contact">Контакт (телефон/telegram)</label>
              <input
                id="settings-service-contact"
                value={providerForm.contact}
                onChange={(e) => setProviderForm({ ...providerForm, contact: e.target.value })}
                placeholder="+381 6X XXX XXXX или @username"
              />
            </div>
            {providerError && <p style={{ color: "var(--red)", fontSize: 13 }}>{providerError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" disabled={submittingProvider}>
                {submittingProvider ? "Публикуем…" : "Опубликовать анкету"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowProviderForm(false)}>Отмена</button>
            </div>
          </form>
        )}

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

          {blockedUsers === null && <ListItemSkeleton count={2} />}

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
