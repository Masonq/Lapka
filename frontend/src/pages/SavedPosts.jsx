import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import PostCard from "../components/PostCard";
import PostCardSkeleton from "../components/PostCardSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import EmptyStateImage from "../components/EmptyStateImage";
import { useDocumentTitle } from "../useDocumentTitle";
import { useTranslation } from "react-i18next";

export default function SavedPosts() {
  const { t } = useTranslation();
  useDocumentTitle(t("saved_posts.title"));
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const showSkeleton = useDelayedLoading(posts === null);

  useEffect(() => {
    api.savedPosts().then(setPosts).catch(() => setPosts([]));
  }, []);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("saved_posts.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("saved_posts.title")}</span>
        <span style={{ width: 44 }} />
      </div>

      {showSkeleton && (
        <div className="card-grid">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {posts?.length === 0 && (
        <div className="empty-state">
          <EmptyStateImage />
          <div className="empty-state-title">{t("saved_posts.empty_title")}</div>
          {t("saved_posts.empty_hint")}
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
