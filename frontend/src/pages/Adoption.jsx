import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, PlusCircle } from "lucide-react";
import PostCardSkeleton from "../components/PostCardSkeleton";
import ErrorState from "../components/ErrorState";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useDocumentTitle } from "../useDocumentTitle";
import PostCard from "../components/PostCard";

const TABS = [
  { value: "active", label: "Ищут дом" },
  { value: "resolved", label: "Уже пристроены" },
];

export default function Adoption() {
  useDocumentTitle("Приюты и пристройство");
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const [tab, setTab] = useState("active");
  const [posts, setPosts] = useState(null);
  const [loadError, setLoadError] = useState(false);

  function load() {
    setPosts(null);
    setLoadError(false);
    api
      .posts({ type: "adopt", is_resolved: tab === "resolved", limit: 30 })
      .then(setPosts)
      .catch(() => setLoadError(true));
  }

  useEffect(load, [tab]);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Пристройство</span>
        {isAuthed ? (
          <Link to="/new-post?type=adopt" className="icon-btn" aria-label="Разместить питомца">
            <PlusCircle size={17} strokeWidth={2.2} />
          </Link>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.value} className={`chip${tab === t.value ? " active" : ""}`} onClick={() => setTab(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {posts === null && !loadError && <div className="card-grid"><PostCardSkeleton /><PostCardSkeleton /></div>}

      {loadError && <ErrorState onRetry={load} />}

      {!loadError && posts?.length === 0 && (
        <div className="empty-state">
          <Heart size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
          <div className="empty-state-title">
            {tab === "active" ? "Пока никого не пристраивают" : "Пока никого не пристроили"}
          </div>
          {tab === "active" && isAuthed && "Если ищешь дом для питомца — создай пост через + вверху"}
        </div>
      )}

      {!loadError && posts?.length > 0 && (
        <div className="card-grid">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
