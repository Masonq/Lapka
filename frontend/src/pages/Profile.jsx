import { useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, UserCircle } from "lucide-react";
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

  if (isAuthed) {
    return (
      <div>
        <div className="page-header">
          <span className="page-title">Профиль</span>
        </div>
        <div className="card" style={{ borderRadius: 20, padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Ты вошёл в LapaBG</div>
          <button className="btn btn-ghost" onClick={logout}>
            <LogOut size={16} /> Выйти
          </button>
        </div>
        <Link to={`/users/${userId}`} className="btn btn-ghost btn-block">
          <UserCircle size={16} /> Открыть свой профиль
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
