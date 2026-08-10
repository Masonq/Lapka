import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, KeyRound, Trash2, UserX, ShieldCheck, Wrench, Sparkles, Sun, Moon, Languages } from "lucide-react";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useTheme } from "../ThemeContext";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";

const SERVICE_TYPES = [
  { value: "sitter", label: "settings.service_sitter" },
  { value: "boarding", label: "settings.service_boarding" },
  { value: "trainer", label: "settings.service_trainer" },
  { value: "vet", label: "settings.service_vet" },
  { value: "groomer", label: "settings.service_groomer" },
];

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  useDocumentTitle(t("settings.title"));

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [passwordCode, setPasswordCode] = useState("");
  const [requestingPasswordCode, setRequestingPasswordCode] = useState(false);

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
      showToast(t("toast.provider_published"));
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
      showToast(t("toast.unblocked"));
      loadBlocked();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function requestPasswordCode(e) {
    e.preventDefault();
    setPasswordError("");
    setRequestingPasswordCode(true);
    try {
      await api.requestPasswordChangeCode({ current_password: currentPassword });
      setPasswordCodeSent(true);
      showToast(t("toast.code_sent"));
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setRequestingPasswordCode(false);
    }
  }

  async function submitPasswordChange(e) {
    e.preventDefault();
    setPasswordError("");
    setChangingPassword(true);
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword, code: passwordCode });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordCode("");
      setPasswordCodeSent(false);
      showToast(t("toast.password_changed"));
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
      showToast(t("toast.account_deleted"));
      navigate("/");
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("settings.back")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("settings.title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{t("settings.theme_dark")}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {theme === "dark" ? t("settings.theme_on") : t("settings.theme_off")}
                </div>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("settings.theme_disable_aria") : t("settings.theme_enable_aria")}
              aria-pressed={theme === "dark"}
              style={{
                width: 48, height: 28, borderRadius: 999, position: "relative", flexShrink: 0,
                background: theme === "dark" ? "var(--primary-strong)" : "var(--border)",
                transition: "background 0.2s",
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: theme === "dark" ? 23 : 3,
                width: 22, height: 22, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }} />
            </button>
          </div>
        </div>

        <div className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Languages size={18} />
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t("settings.language")}</div>
            </div>
            <div style={{ display: "flex", background: "var(--gray-tint)", borderRadius: 999, padding: 3 }}>
              <button
                onClick={() => setLanguage("ru")}
                aria-pressed={i18n.language === "ru"}
                style={{
                  padding: "6px 14px", borderRadius: 999, fontWeight: 700, fontSize: 13,
                  background: i18n.language === "ru" ? "var(--surface)" : "transparent",
                  color: i18n.language === "ru" ? "var(--text)" : "var(--text-muted)",
                  boxShadow: i18n.language === "ru" ? "var(--shadow-card)" : "none",
                }}
              >
                Русский
              </button>
              <button
                onClick={() => setLanguage("sr")}
                aria-pressed={i18n.language === "sr"}
                style={{
                  padding: "6px 14px", borderRadius: 999, fontWeight: 700, fontSize: 13,
                  background: i18n.language === "sr" ? "var(--surface)" : "transparent",
                  color: i18n.language === "sr" ? "var(--text)" : "var(--text-muted)",
                  boxShadow: i18n.language === "sr" ? "var(--shadow-card)" : "none",
                }}
              >
                Srpski
              </button>
            </div>
          </div>
        </div>

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
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{t("settings.provider_promo_title")}</h3>
            </div>
            <p style={{ fontSize: 13, opacity: 0.92, margin: "0 0 16px", maxWidth: 320 }}>
              {t("settings.provider_promo_text")}
            </p>
            <button
              className="btn"
              style={{ background: "#fff", color: "var(--primary-strong)", fontWeight: 800 }}
              onClick={() => setShowProviderForm(true)}
            >
              <Wrench size={15} /> {t("settings.become_provider")}
            </button>
          </div>
        )}

        {isProvider === true && !showProviderForm && (
          <div className="card" style={{
            borderRadius: 20, padding: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 10,
          }}>
            <ShieldCheck size={18} style={{ color: "var(--green-strong)" }} />
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {t("settings.already_provider")}
            </div>
          </div>
        )}

        {showProviderForm && (
          <form onSubmit={submitProvider} className="card" style={{ borderRadius: 20, padding: 18, marginBottom: 16 }}>
            <h3 className="subhead" style={{ fontSize: 15, marginBottom: 12 }}>{t("settings.provider_form_title")}</h3>
            <div className="field">
              <label id="settings-service-type-label">{t("settings.service_type_label")}</label>
              <div className="chip-row" role="group" aria-labelledby="settings-service-type-label" style={{ paddingBottom: 2 }}>
                {SERVICE_TYPES.map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    className={`chip${providerForm.service_type === st.value ? " active" : ""}`}
                    onClick={() => setProviderForm({ ...providerForm, service_type: st.value })}
                  >
                    {t(st.label)}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="settings-service-description">{t("settings.description_label")}</label>
              <textarea
                id="settings-service-description" rows={3} required
                value={providerForm.description}
                onChange={(e) => setProviderForm({ ...providerForm, description: e.target.value })}
                placeholder={t("settings.description_placeholder")}
              />
            </div>
            <div className="field">
              <label htmlFor="settings-service-price">{t("settings.price_label")}</label>
              <input
                id="settings-service-price" type="number" min="0"
                value={providerForm.price_from}
                onChange={(e) => setProviderForm({ ...providerForm, price_from: e.target.value })}
                placeholder="800"
              />
            </div>
            <div className="field">
              <label htmlFor="settings-service-contact">{t("settings.contact_label")}</label>
              <input
                id="settings-service-contact"
                value={providerForm.contact}
                onChange={(e) => setProviderForm({ ...providerForm, contact: e.target.value })}
                placeholder={t("settings.contact_placeholder")}
              />
            </div>
            {providerError && <p style={{ color: "var(--red)", fontSize: 13 }}>{providerError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" disabled={submittingProvider}>
                {submittingProvider ? t("settings.publishing") : t("settings.publish_form")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowProviderForm(false)}>{t("settings.cancel")}</button>
            </div>
          </form>
        )}

        <div className="card" style={{ borderRadius: 20, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <KeyRound size={17} />
            <h3 className="subhead" style={{ fontSize: 15 }}>{t("settings.change_password_title")}</h3>
          </div>
          <form onSubmit={passwordCodeSent ? submitPasswordChange : requestPasswordCode}>
            <div className="field">
              <label htmlFor="current-password">{t("settings.current_password_label")}</label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={passwordCodeSent}
                autoComplete="current-password"
              />
            </div>
            <div className="field">
              <label htmlFor="new-password">{t("settings.new_password_label")}</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder={t("settings.min_6_chars")}
                disabled={passwordCodeSent}
                autoComplete="new-password"
              />
            </div>
            {passwordCodeSent && (
              <div className="field">
                <label htmlFor="password-code">{t("settings.code_from_email_label")}</label>
                <input
                  id="password-code"
                  value={passwordCode}
                  onChange={(e) => setPasswordCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  style={{ fontSize: 18, letterSpacing: 3, textAlign: "center" }}
                />
              </div>
            )}
            {passwordError && <p style={{ color: "var(--red)", fontSize: 13 }}>{passwordError}</p>}
            {passwordCodeSent ? (
              <>
                <button className="btn btn-primary btn-block" disabled={changingPassword || passwordCode.length !== 6}>
                  {changingPassword ? t("settings.saving") : t("settings.confirm_and_save")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  style={{ marginTop: 8 }}
                  onClick={() => { setPasswordCodeSent(false); setPasswordCode(""); }}
                >
                  {t("settings.cancel")}
                </button>
              </>
            ) : (
              <button className="btn btn-primary btn-block" disabled={requestingPasswordCode}>
                {requestingPasswordCode ? t("settings.sending") : t("settings.send_code")}
              </button>
            )}
          </form>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 10 }}>
            {t("settings.telegram_no_password")}
          </p>
        </div>

        <div className="card" style={{ borderRadius: 20, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <UserX size={17} />
            <h3 className="subhead" style={{ fontSize: 15 }}>{t("settings.blocked_title")}</h3>
          </div>

          {blockedUsers === null && <ListItemSkeleton count={2} />}

          {blockedUsers?.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-faint)" }}>{t("settings.no_blocked")}</p>
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
                <ShieldCheck size={13} /> {t("settings.unblock")}
              </button>
            </div>
          ))}
        </div>

        <div className="card" style={{ borderRadius: 20, padding: 18, border: "1px solid var(--red-tint)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Trash2 size={17} color="var(--red)" />
            <h3 className="subhead" style={{ fontSize: 15, color: "var(--red)" }}>{t("settings.delete_account_title")}</h3>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            {t("settings.delete_warning")}
          </p>

          {!showDeleteForm ? (
            <button className="btn btn-ghost btn-block" onClick={() => setShowDeleteForm(true)}>
              {t("settings.delete_account_title")}
            </button>
          ) : (
            <form onSubmit={submitDelete}>
              <div className="field">
                <label htmlFor="delete-password">{t("settings.confirm_password_label")}</label>
                <input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder={t("settings.delete_password_placeholder")}
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
                  {deleting ? t("settings.deleting") : t("settings.confirm_delete")}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowDeleteForm(false)}>
                  {t("settings.cancel")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
