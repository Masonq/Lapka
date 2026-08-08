import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, UserCircle, PawPrint, Bookmark, Settings as SettingsIcon, ChevronRight } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useDocumentTitle } from "../useDocumentTitle";

export default function Profile() {
  const { isAuthed, userId, login, register, logout } = useAuth();
  useDocumentTitle(isAuthed ? "Профиль" : "Вход");
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState(null);
  const [petsCount, setPetsCount] = useState(null);

  useEffect(() => {
    if (!isAuthed) return;
    api.me().then(setMe).catch(() => setMe(null));
    api.myPets().then((pets) => setPetsCount(pets.length)).catch(() => setPetsCount(null));
  }, [isAuthed]);

  if (isAuthed) {
    return (
      <div>
        <div className="page-header">
          <span className="page-title">Профиль</span>
        </div>

        <div className="card" style={{ borderRadius: 20, padding: 18, display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
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
          <div style={{ flex: 1 }}>
            <div className="subhead" style={{ fontSize: 16 }}>{me?.display_name || "Ты в PetSocial"}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{me?.city}</div>
          </div>
          <button className="btn btn-ghost" onClick={logout} aria-label="Выйти">
            <LogOut size={16} />
          </button>
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
            <div className="subhead" style={{ fontSize: 14 }}>Мои питомцы</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{petsCount === null ? "…" : petsCount === 0 ? "Пока нет ни одного" : `${petsCount}`}</div>
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
            <div className="subhead" style={{ fontSize: 14 }}>Сохранённое</div>
          </div>
          <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
        </Link>

        <Link to={`/users/${userId}`} className="btn btn-ghost btn-block" style={{ marginBottom: 10 }}>
          <UserCircle size={16} /> Открыть свой публичный профиль
        </Link>

        <Link to="/settings" className="btn btn-ghost btn-block">
          <SettingsIcon size={16} /> Настройки
        </Link>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <span className="page-title">{mode === "login" ? "Вход" : "Регистрация"}</span>
      </div>

      <form onSubmit={submit} className="card" style={{ borderRadius: 20, padding: 18 }}>
        {mode === "register" && (
          <div className="field">
            <label htmlFor="auth-name">Имя</label>
            <input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Как к тебе обращаться" autoComplete="name" />
          </div>
        )}
        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="auth-password">Пароль</label>
          <input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Минимум 6 символов" autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </div>
        {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Секунду…" : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>
      </form>

      <p style={{ textAlign: "center", fontSize: 13, marginTop: 14, color: "var(--text-muted)" }}>
        {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
        <a
          href="#"
          style={{ color: "var(--black)", fontWeight: 700 }}
          onClick={(e) => { e.preventDefault(); setMode(mode === "login" ? "register" : "login"); }}
        >
          {mode === "login" ? "Зарегистрироваться" : "Войти"}
        </a>
      </p>

      <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-faint)", marginTop: 20 }}>
        Вход через Telegram появится здесь позже
      </p>
    </div>
  );
}
