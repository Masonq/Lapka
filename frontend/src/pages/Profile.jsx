import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../AuthContext";

export default function Profile() {
  const { isAuthed, login, register, logout } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthed) {
    return (
      <div>
        <div className="top-header">
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 }}>
            Профиль
          </span>
        </div>
        <button className="btn btn-ghost" onClick={logout}>
          <LogOut size={16} /> Выйти
        </button>
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
      <div className="top-header">
        <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 }}>
          {mode === "login" ? "Вход" : "Регистрация"}
        </span>
      </div>

      <form onSubmit={submit} className="glass" style={{ borderRadius: 20, padding: 18 }}>
        {mode === "register" && (
          <div className="field">
            <label>Имя</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Пароль</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        {error && <p style={{ color: "var(--alert)", fontSize: 13 }}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Подождите…" : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>
      </form>

      <p style={{ textAlign: "center", fontSize: 13, marginTop: 14, color: "var(--text-muted)" }}>
        {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
        <a
          href="#"
          style={{ color: "var(--primary-dark)", fontWeight: 700 }}
          onClick={(e) => { e.preventDefault(); setMode(mode === "login" ? "register" : "login"); }}
        >
          {mode === "login" ? "Зарегистрироваться" : "Войти"}
        </a>
      </p>

      <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-faint)", marginTop: 20 }}>
        Вход через Telegram подключается на странице бота LapaBG
      </p>
    </div>
  );
}
