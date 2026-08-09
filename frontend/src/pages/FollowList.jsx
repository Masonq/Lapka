import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { api } from "../api/client";
import { useDocumentTitle } from "../useDocumentTitle";

export default function FollowList() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "following" ? "following" : "followers";
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const title = mode === "following" ? "Подписки" : "Подписчики";
  useDocumentTitle(title);

  useEffect(() => {
    setList(null);
    const loader = mode === "following" ? api.following : api.followers;
    loader(id).then(setList).catch(() => setList([]));
  }, [id, mode]);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{title}</span>
        <span style={{ width: 44 }} />
      </div>

      {list === null && <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Загружаем…</p>}

      {list?.length === 0 && (
        <div className="empty-state">
          <Users size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
          <div className="empty-state-title">Пока никого</div>
          {mode === "following" ? "Ещё ни на кого не подписан(а)" : "Пока нет подписчиков"}
        </div>
      )}

      {list?.map((u) => (
        <Link key={u.id} to={`/users/${u.id}`} className="card" style={{
          display: "flex", alignItems: "center", gap: 12, borderRadius: 16, padding: "12px 14px", marginBottom: 8,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, overflow: "hidden",
          }}>
            {u.avatar_url ? (
              <img src={u.avatar_url} alt={u.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              u.display_name[0]?.toUpperCase()
            )}
          </div>
          <div>
            <div className="subhead" style={{ fontSize: 14 }}>{u.display_name}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.city}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
