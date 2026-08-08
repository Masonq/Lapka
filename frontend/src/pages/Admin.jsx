import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Flag, Trash2, X } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";

export default function Admin() {
  useDocumentTitle("Админка");
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAuthed } = useAuth();
  const [me, setMe] = useState(null);
  const [overview, setOverview] = useState(null);
  const [reports, setReports] = useState(null);

  useEffect(() => {
    if (!isAuthed) return;
    api.me().then(setMe).catch(() => setMe(null));
  }, [isAuthed]);

  function load() {
    api.adminOverview().then(setOverview).catch(() => setOverview(null));
    api.adminReports(false).then(setReports).catch(() => setReports([]));
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
          {r.post ? (
            <Link to={`/posts/${r.post.id}`} className="subhead" style={{ fontSize: 14 }}>
              {r.post.title}
            </Link>
          ) : (
            <span style={{ fontSize: 14, color: "var(--text-faint)" }}>Пост уже удалён</span>
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
          </div>
        </div>
      ))}
    </div>
  );
}
