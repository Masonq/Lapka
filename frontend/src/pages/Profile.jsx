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
        <div className="page-header">
          <span className="page-title">Профиль</span>
        </div>
        <div className="card" style={{ borderRadius: 20, padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Ты вошёл в LapaBG</div>
          <button className="btn btn-ghost" onClick={logout}>
            <LogOut size={16} /> Выйти
          </button>
        </div>
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
