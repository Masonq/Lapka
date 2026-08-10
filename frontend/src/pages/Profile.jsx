import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, PawPrint, Bookmark, Settings as SettingsIcon, ShieldAlert, ChevronRight } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { pluralize } from "../pluralize";
import { useTranslation } from "react-i18next";
import TelegramLoginButton from "../components/TelegramLoginButton";

export default function Profile() {
  const { t } = useTranslation();
  const { isAuthed, userId, login, requestRegisterCode, verifyRegisterCode, forgotPassword, resetPassword, loginWithTelegram, logout } = useAuth();
  useDocumentTitle(isAuthed ? t("profile.title") : t("profile.login_title"));
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [resent, setResent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [me, setMe] = useState(null);
  const [followersCount, setFollowersCount] = useState(null);
  const [followingCount, setFollowingCount] = useState(null);

  useEffect(() => {
    if (!isAuthed) return;
    api.me().then(setMe).catch(() => setMe(null));
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed || !userId) return;
    api.followers(userId).then((list) => setFollowersCount(list.length)).catch(() => setFollowersCount(null));
    api.following(userId).then((list) => setFollowingCount(list.length)).catch(() => setFollowingCount(null));
  }, [isAuthed, userId]);

  if (isAuthed) {
    return (
      <div>
        <div className="page-header">
          <span className="page-title">{t("profile.title")}</span>
        </div>

        <div className="card" style={{ borderRadius: 20, padding: 18, display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {me === null ? (
              <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
                <span className="skeleton" style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span className="skeleton skeleton-title" style={{ width: "50%", marginBottom: 6 }} />
                  <span className="skeleton skeleton-line" style={{ width: "30%", marginBottom: 0 }} />
                </div>
              </div>
            ) : (
              <Link to={`/users/${userId}`} style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, flexShrink: 0, overflow: "hidden",
                }}>
                  {me?.avatar_url ? (
                    <img src={me.avatar_url} alt={me.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    me?.display_name?.[0]?.toUpperCase() || "•"
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="subhead" style={{ fontSize: 16 }}>{me?.display_name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{me?.city}</div>
                </div>
              </Link>
            )}
            <button className="btn btn-ghost" onClick={logout} aria-label={t("profile.logout_aria")}>
              <LogOut size={16} />
            </button>
          </div>
          {userId && (
            <div style={{ display: "flex", gap: 12 }}>
              <Link to={`/users/${userId}/connections?mode=followers`} style={{ fontSize: 13, color: "var(--text)", textDecoration: "none" }}>
                <b>{followersCount === null ? "…" : followersCount}</b>{" "}
                {followersCount === null ? t("profile.followers_dots") : pluralize(followersCount, [t("plural.follower_one"), t("plural.follower_few"), t("plural.follower_many")])}
              </Link>
              <Link to={`/users/${userId}/connections?mode=following`} style={{ fontSize: 13, color: "var(--text)", textDecoration: "none" }}>
                <b>{followingCount === null ? "…" : followingCount}</b>{" "}
                {followingCount === null ? t("profile.following_dots") : pluralize(followingCount, [t("plural.following_one"), t("plural.following_few"), t("plural.following_many")])}
              </Link>
            </div>
          )}
        </div>

        <Link to="/pets" className="card" style={{
          borderRadius: 20, padding: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: "var(--blue-tint)", color: "var(--blue)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <PawPrint size={17} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="subhead" style={{ fontSize: 14 }}>{t("profile.my_pets")}</div>
          </div>
          <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
        </Link>

        <Link to="/saved" className="card" style={{
          borderRadius: 20, padding: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Bookmark size={17} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="subhead" style={{ fontSize: 14 }}>{t("profile.saved")}</div>
          </div>
          <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
        </Link>

        <Link to="/settings" className="btn btn-ghost btn-block">
          <SettingsIcon size={16} /> {t("profile.settings")}
        </Link>

        {me?.is_admin && (
          <Link to="/admin" className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>
            <ShieldAlert size={16} /> {t("profile.admin")}
          </Link>
        )}
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await requestRegisterCode(name, email, password);
        setPendingEmail(email);
        setMode("verify-code");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await verifyRegisterCode(pendingEmail, code);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setError("");
    setResent(false);
    try {
      await requestRegisterCode(name, pendingEmail, password);
      setResent(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitForgotPassword(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await forgotPassword(email);
      setPendingEmail(email);
      setMode("reset-password");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitResetPassword(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await resetPassword(pendingEmail, code, newPassword);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const telegramBotConfigured = !!import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

  async function handleTelegramAuth(tgData) {
    setError("");
    try {
      await loginWithTelegram(tgData);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <span className="page-title">
          {mode === "login" ? t("profile.login_title")
            : mode === "register" ? t("profile.register_title")
            : mode === "verify-code" ? t("profile.verify_title")
            : mode === "forgot-password" ? t("profile.forgot_password_title")
            : t("profile.reset_password_title")}
        </span>
      </div>

      {mode === "verify-code" ? (
        <form onSubmit={submitCode} className="card" style={{ borderRadius: 20, padding: 18 }}>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 0, marginBottom: 14 }}>
            {t("profile.code_sent_to")} <b>{pendingEmail}</b> {t("profile.code_sent_hint")}
          </p>
          <div className="field">
            <label htmlFor="auth-code">{t("profile.code_label")}</label>
            <input
              id="auth-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="123456"
              style={{ fontSize: 20, letterSpacing: 4, textAlign: "center" }}
            />
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
          {resent && <p style={{ color: "var(--green-strong)", fontSize: 13 }}>{t("profile.resent")}</p>}
          <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>
            {busy ? t("profile.checking") : t("profile.confirm")}
          </button>
          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={resendCode}>
            {t("profile.resend_code")}
          </button>
        </form>
      ) : mode === "forgot-password" ? (
        <form onSubmit={submitForgotPassword} className="card" style={{ borderRadius: 20, padding: 18 }}>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 0, marginBottom: 14 }}>
            {t("profile.forgot_password_hint")}
          </p>
          <div className="field">
            <label htmlFor="auth-email">{t("profile.email_label")}</label>
            <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" />
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t("profile.just_a_sec") : t("profile.send_reset_code")}
          </button>
          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setMode("login")}>
            {t("profile.back_to_login")}
          </button>
        </form>
      ) : mode === "reset-password" ? (
        <form onSubmit={submitResetPassword} className="card" style={{ borderRadius: 20, padding: 18 }}>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 0, marginBottom: 14 }}>
            {t("profile.code_sent_to")} <b>{pendingEmail}</b> {t("profile.reset_code_hint")}
          </p>
          <div className="field">
            <label htmlFor="reset-code">{t("profile.code_label")}</label>
            <input
              id="reset-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="123456"
              style={{ fontSize: 20, letterSpacing: 4, textAlign: "center" }}
            />
          </div>
          <div className="field">
            <label htmlFor="reset-new-password">{t("profile.new_password_label")}</label>
            <input
              id="reset-new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              required minLength={6} placeholder={t("settings.min_6_chars")} autoComplete="new-password"
            />
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>
            {busy ? t("profile.just_a_sec") : t("profile.reset_password_button")}
          </button>
        </form>
      ) : (
      <form onSubmit={submit} className="card" style={{ borderRadius: 20, padding: 18 }}>
        {mode === "register" && (
          <div className="field">
            <label htmlFor="auth-name">{t("profile.name_label")}</label>
            <input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder={t("profile.name_placeholder")} autoComplete="name" />
          </div>
        )}
        <div className="field">
          <label htmlFor="auth-email">{t("profile.email_label")}</label>
          <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="auth-password">{t("profile.password_label")}</label>
          <input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder={t("settings.min_6_chars")} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </div>
        {mode === "login" && (
          <p style={{ textAlign: "right", margin: "-6px 0 14px" }}>
            <a
              href="#"
              style={{ fontSize: 13, color: "var(--text-muted)" }}
              onClick={(e) => { e.preventDefault(); setError(""); setMode("forgot-password"); }}
            >
              {t("profile.forgot_password_link")}
            </a>
          </p>
        )}
        {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? t("profile.just_a_sec") : mode === "login" ? t("profile.login_button") : t("profile.get_code_button")}
        </button>
      </form>
      )}

      {(mode === "login" || mode === "register") && (
        <p style={{ textAlign: "center", fontSize: 13, marginTop: 14, color: "var(--text-muted)" }}>
          {mode === "login" ? t("profile.no_account") : t("profile.have_account")}
          <a
            href="#"
            style={{ color: "var(--black)", fontWeight: 700 }}
            onClick={(e) => { e.preventDefault(); setMode(mode === "login" ? "register" : "login"); }}
          >
            {mode === "login" ? t("profile.register_link") : t("profile.login_link")}
          </a>
        </p>
      )}

      {(mode === "login" || mode === "register") && telegramBotConfigured && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{t("profile.or_divider")}</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
          <TelegramLoginButton onAuth={handleTelegramAuth} />
        </div>
      )}
    </div>
  );
}
