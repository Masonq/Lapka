import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, MapPin, UserPlus, UserMinus, PlusCircle } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import PostCard from "../components/PostCard";

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { showToast } = useToast();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(community ? community.name : "Сообщество");

  function load() {
    api.community(id).then(setCommunity).catch(() => setNotFound(true));
    api.posts({ community_id: id, limit: 30 }).then(setPosts).catch(() => setPosts([]));
  }

  useEffect(load, [id]);

  async function toggleMembership() {
    setBusy(true);
    try {
      if (community.is_member) await api.leaveCommunity(id);
      else await api.joinCommunity(id);
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Сообщество не найдено</div>
        Возможно, его удалили
      </div>
    );
  }

  if (!community) return <div className="empty-state">Загружаем…</div>;

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Сообщество</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="card" style={{ borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, flexShrink: 0, overflow: "hidden",
            }}>
              {community.avatar_url ? (
                <img src={community.avatar_url} alt={community.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                community.name[0]?.toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="subhead" style={{ fontSize: 18 }}>{community.name}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Users size={13} /> {community.members_count}
                </span>
                {community.city && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={13} /> {community.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {community.description && (
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
              {community.description}
            </p>
          )}

          {isAuthed && (
            <button
              className={community.is_member ? "btn btn-ghost btn-block" : "btn btn-primary btn-block"}
              onClick={toggleMembership}
              disabled={busy}
            >
              {community.is_member ? <UserMinus size={16} /> : <UserPlus size={16} />}
              {community.is_member ? "Покинуть сообщество" : "Вступить"}
            </button>
          )}
        </div>

        {isAuthed && community.is_member && (
          <button
            className="btn btn-ghost btn-block"
            style={{ marginBottom: 16 }}
            onClick={() => navigate(`/new-post?type=general&community_id=${id}`)}
          >
            <PlusCircle size={16} /> Написать в сообщество
          </button>
        )}

        <h3 className="subhead" style={{ marginBottom: 10 }}>Посты сообщества</h3>

        {posts === null && <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Загружаем…</p>}

        {posts?.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
            Пока никто не писал сюда — будь первым
          </p>
        )}

        {posts?.length > 0 && (
          <div className="card-grid">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </div>
    </div>
  );
}
