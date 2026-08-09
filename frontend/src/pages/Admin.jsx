import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Flag, Trash2, X, BadgeCheck, Wrench, Users } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useSearchContext } from "../SearchContext";

export default function Admin() {
  useDocumentTitle("Админка");
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAuthed } = useAuth();
  const { setSearchConfig } = useSearchContext();
  const [me, setMe] = useState(null);
  const [overview, setOverview] = useState(null);
  const [reports, setReports] = useState(null);
  const [providers, setProviders] = useState(null);
  const [users, setUsers] = useState(null);
  const [userQuery, setUserQuery] = useState("");

  useEffect(() => {
    if (!me?.is_admin) return;
    const timer = setTimeout(() => {
      api.adminUsers(userQuery).then(setUsers).catch(() => setUsers([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [me, userQuery]);

  useEffect(() => {
    if (!me?.is_admin) return;
    setSearchConfig({ value: userQuery, onChange: setUserQuery, placeholder: "Искать по имени или почте…" });
    return () => setSearchConfig(null);
  }, [me, userQuery, setSearchConfig]);

  useEffect(() => {
    if (!isAuthed) return;
    api.me().then(setMe).catch(() => setMe(null));
  }, [isAuthed]);

  function load() {
    api.adminOverview().then(setOverview).catch(() => setOverview(null));
    api.adminReports(false).then(setReports).catch(() => setReports([]));
    api.adminServiceProviders().then(setProviders).catch(() => setProviders([]));
  }

  useEffect(() => {
    if (me?.is_admin) load();
  }, [me]);

  async function dismiss(id) {
    await api.adminDismissReport(id);
    showToast("Жалоба отклонена");
    load();
  }

  async function removePost(id) {
    await api.adminDeletePost(id);
    showToast("Пост удалён");
    load();
  }

  async function removeListing(id) {
    await api.adminDeleteListing(id);
    showToast("Объявление удалено");
    load();
  }

  async function toggleVerify(id) {
    const result = await api.adminToggleVerifyProvider(id);
    showToast(result.is_verified ? "Исполнитель подтверждён" : "Подтверждение снято");
    load();
  }

  if (!isAuthed || me === null) {
    return <div className="empty-state">Загружаем…</div>;
  }

  if (!me.is_admin) {
    return (
      <div className="empty-state">
        <ShieldAlert size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
        <div className="empty-state-title">Доступ только для админов</div>
        Этот раздел не для тебя
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Админка</span>
        <span style={{ width: 44 }} />
      </div>

      {overview && (
        <div className="card-grid" style={{ marginBottom: 20 }}>
          {[
            ["Пользователи", overview.users_count],
            ["Посты", overview.posts_count],
            ["Питомцы", overview.pets_count],
            ["Жалобы", overview.unresolved_reports_count],
          ].map(([label, value]) => (
            <div key={label} className="card" style={{ borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <h3 className="subhead" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <Flag size={16} /> Очередь жалоб
      </h3>

      {reports?.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 20px" }}>Нерассмотренных жалоб нет</div>
      )}

      {reports?.map((r) => (
        <div key={r.id} className="card" style={{ borderRadius: 16, padding: 14, marginBottom: 8 }}>
          {r.post && (
            <Link to={`/posts/${r.post.id}`} className="subhead" style={{ fontSize: 14 }}>
              {r.post.title}
            </Link>
          )}
          {r.listing && (
            <Link to={`/marketplace/${r.listing.id}`} className="subhead" style={{ fontSize: 14 }}>
              {r.listing.title} <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>(объявление)</span>
            </Link>
          )}
          {!r.post && !r.listing && (
            <span style={{ fontSize: 14, color: "var(--text-faint)" }}>Контент уже удалён</span>
          )}
          <div style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 8px" }}>
            Жалоба от {r.reporter.display_name}{r.reason ? `: «${r.reason}»` : ""}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => dismiss(r.id)}>
              <X size={14} /> Отклонить
            </button>
            {r.post && (
              <button
                className="btn"
                style={{ background: "var(--red-tint)", color: "var(--red)" }}
                onClick={() => removePost(r.post.id)}
              >
                <Trash2 size={14} /> Удалить пост
              </button>
            )}
            {r.listing && (
              <button
                className="btn"
                style={{ background: "var(--red-tint)", color: "var(--red)" }}
                onClick={() => removeListing(r.listing.id)}
              >
                <Trash2 size={14} /> Удалить объявление
              </button>
            )}
          </div>
        </div>
      ))}

      <h3 className="subhead" style={{ margin: "24px 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <Wrench size={16} /> Исполнители услуг
      </h3>

      {providers?.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 20px" }}>Пока никто не зарегистрировался</div>
      )}

      {providers?.map((p) => (
        <div key={p.id} className="card" style={{
          borderRadius: 16, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Link to={`/users/${p.user.id}`} className="subhead" style={{ fontSize: 14 }}>{p.user.display_name}</Link>
              {p.is_verified && <BadgeCheck size={14} style={{ color: "var(--green-strong)" }} />}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {p.service_type}{p.rating_count > 0 ? ` · ★ ${p.rating_avg} (${p.rating_count})` : ""}
            </div>
          </div>
          <button
            className={p.is_verified ? "btn btn-ghost" : "btn"}
            style={!p.is_verified ? { background: "var(--green-strong)", color: "#fff" } : undefined}
            onClick={() => toggleVerify(p.id)}
          >
            <BadgeCheck size={14} /> {p.is_verified ? "Снять" : "Подтвердить"}
          </button>
        </div>
      ))}

      <h3 className="subhead" style={{ margin: "24px 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <Users size={16} /> Пользователи
      </h3>


      {users?.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 20px" }}>Никого не нашлось</div>
      )}

      {users?.map((u) => (
        <div key={u.id} className="card" style={{
          borderRadius: 16, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Link to={`/users/${u.id}`} className="subhead" style={{ fontSize: 14 }}>{u.display_name}</Link>
              {u.is_admin && <span className="post-badge" style={{ background: "var(--gray-tint)", color: "var(--text-muted)" }}>admin</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {u.email || "телеграм"} · {u.city} · {u.posts_count} постов · {u.pets_count} питомцев
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
