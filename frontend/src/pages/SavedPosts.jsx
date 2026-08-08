import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark } from "lucide-react";
import { api } from "../api/client";
import PostCard from "../components/PostCard";
import PostCardSkeleton from "../components/PostCardSkeleton";
import { useDocumentTitle } from "../useDocumentTitle";

export default function SavedPosts() {
  useDocumentTitle("Сохранённое");
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    api.savedPosts().then(setPosts).catch(() => setPosts([]));
  }, []);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Сохранённое</span>
        <span style={{ width: 44 }} />
      </div>

      {posts === null && (
        <div className="card-grid">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {posts?.length === 0 && (
        <div className="empty-state">
          <Bookmark size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
          <div className="empty-state-title">Пока ничего не сохранено</div>
          Нажми на закладку у поста, чтобы вернуться к нему позже
        </div>
      )}

      {posts?.length > 0 && (
        <div className="card-grid">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
