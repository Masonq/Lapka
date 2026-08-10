import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, PlusCircle } from "lucide-react";
import PostCardSkeleton from "../components/PostCardSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import EmptyStateImage from "../components/EmptyStateImage";
import ErrorState from "../components/ErrorState";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useDocumentTitle } from "../useDocumentTitle";
import PostCard from "../components/PostCard";
import { useTranslation } from "react-i18next";

const TABS = [
  { value: "active", label: "adoption.filter_active" },
  { value: "resolved", label: "adoption.filter_resolved" },
];

export default function Adoption() {
  const { t } = useTranslation();
  useDocumentTitle(t("adoption.title"));
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const [tab, setTab] = useState("active");
  const [posts, setPosts] = useState(null);
  const showSkeleton = useDelayedLoading(posts === null);
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
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("adoption.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("adoption.page_title")}</span>
        {isAuthed ? (
          <Link to="/new-post?type=adopt" className="icon-btn" aria-label={t("adoption.add_aria")}>
            <PlusCircle size={17} strokeWidth={2.2} />
          </Link>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {TABS.map((tb) => (
          <button key={tb.value} className={`chip${tab === tb.value ? " active" : ""}`} onClick={() => setTab(tb.value)}>
            {t(tb.label)}
          </button>
        ))}
      </div>

      {showSkeleton && !loadError && <div className="card-grid"><PostCardSkeleton /><PostCardSkeleton /></div>}

      {loadError && <ErrorState onRetry={load} />}

      {!loadError && posts?.length === 0 && (
        <div className="empty-state">
          <EmptyStateImage />
          <div className="empty-state-title">
            {tab === "active" ? t("adoption.empty_active") : t("adoption.empty_resolved")}
          </div>
          {tab === "active" && isAuthed && t("adoption.empty_hint")}
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
