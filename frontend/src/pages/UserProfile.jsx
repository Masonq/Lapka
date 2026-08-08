import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, PawPrint, UserPlus, UserMinus, MessageCircle } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import PostCard from "../components/PostCard";

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed, userId } = useAuth();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pets, setPets] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useDocumentTitle(user ? user.display_name : "Профиль");

  function load() {
    api.user(id).then(setUser).catch(() => setNotFound(true));
    api.posts({ author_id: id, limit: 20 }).then(setPosts).catch(() => setPosts([]));
    api.petsOfUser(id).then(setPets).catch(() => setPets([]));
    api.followers(id).then(setFollowers).catch(() => setFollowers([]));
  }

  useEffect(load, [id]);

  const isOwnProfile = userId === id;
  const isFollowing = followers.some((f) => f.id === userId);

  async function toggleFollow() {
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await api.unfollow(id);
      } else {
        await api.follow(id);
      }
      const updated = await api.followers(id);
      setFollowers(updated);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setFollowBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Пользователь не найден</div>
        Возможно, аккаунт удалён
      </div>
    );
  }

  if (!user) return <div className="empty-state">Загружаем профиль…</div>;

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Профиль</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="card" style={{ borderRadius: 20, padding: 18, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "var(--primary-tint)",
              color: "#95491B", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800, flexShrink: 0, overflow: "hidden",
            }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                user.display_name[0]?.toUpperCase()
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div className="subhead" style={{ fontSize: 18 }}>{user.display_name}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {user.city} · {followers.length} {followers.length === 1 ? "подписчик" : "подписчиков"}
              </div>
            </div>
          </div>

          {isAuthed && !isOwnProfile && (
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                className={isFollowing ? "btn btn-ghost" : "btn btn-primary"}
                style={{ flex: 1 }}
                onClick={toggleFollow}
                disabled={followBusy}
              >
                {isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />}
                {isFollowing ? "Отписаться" : "Подписаться"}
              </button>
              <Link to={`/messages/${id}`} className="btn btn-ghost" style={{ flex: 1 }}>
                <MessageCircle size={16} /> Написать
              </Link>
            </div>
          )}
        </div>

        {pets.length > 0 && (
          <>
            <h3 className="subhead" style={{ marginBottom: 10 }}>Питомцы</h3>
            <div className="card-grid" style={{ marginBottom: 20 }}>
              {pets.map((pet) => (
                <Link key={pet.id} to={`/pets/${pet.id}`} className="card" style={{
                  borderRadius: 20, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: "var(--blue-tint)", color: "var(--blue)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden",
                  }}>
                    {pet.avatar_url ? (
                      <img src={pet.avatar_url} alt={`Фото ${pet.name}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <PawPrint size={18} strokeWidth={2.2} />
                    )}
                  </div>
                  <div>
                    <div className="subhead" style={{ fontSize: 14 }}>{pet.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{pet.species}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <h3 className="subhead" style={{ marginBottom: 10 }}>Посты</h3>
        {posts.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Пока ничего не публиковал</p>
        )}
        {posts.length > 0 && (
          <div className="card-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
