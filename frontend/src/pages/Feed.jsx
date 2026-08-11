import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useDelayedLoading } from "../useDelayedLoading";
import { useAuth } from "../AuthContext";
import { useSearchContext } from "../SearchContext";
import PostCard from "../components/PostCard";
import PostCardSkeleton from "../components/PostCardSkeleton";
import StoriesRow from "../components/StoriesRow";
import ErrorState from "../components/ErrorState";
import EmptyStateImage from "../components/EmptyStateImage";
import { useDocumentTitle } from "../useDocumentTitle";
import { useTranslation } from "react-i18next";

const FILTERS = [
  { value: "", label: "feed.filter_all" },
  { value: "lost", label: "feed.filter_lost" },
  { value: "found", label: "feed.filter_found" },
  { value: "adopt", label: "feed.filter_adopt" },
  { value: "question", label: "feed.filter_question" },
  { value: "general", label: "feed.filter_general" },
];


const PAGE_SIZE = 20;

export default function Feed() {
  const { t } = useTranslation();
  useDocumentTitle(t("feed.title"));
  const { isAuthed } = useAuth();
  const { setSearchConfig } = useSearchContext();
  const [feedTab, setFeedTab] = useState("for-you");
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const showSkeleton = useDelayedLoading(loading);
  const [loadError, setLoadError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSearchConfig({ value: search, onChange: setSearch, placeholder: t("feed.search_placeholder") });
    return () => setSearchConfig(null);
  }, [search, setSearchConfig]);

  function buildParams(offset) {
    const params = { limit: PAGE_SIZE, offset };
    if (filter) params.type = filter;
    if (debouncedSearch) params.q = debouncedSearch;
    if (feedTab === "following") params.following = true;
    return params;
  }

  function loadFeed() {
    setLoading(true);
    setLoadError(false);
    api
      .posts(buildParams(0))
      .then((result) => {
        setPosts(result);
        setHasMore(result.length === PAGE_SIZE);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }

  useEffect(loadFeed, [filter, debouncedSearch, feedTab]);

  function loadMore() {
    setLoadingMore(true);
    api
      .posts(buildParams(posts.length))
      .then((result) => {
        setPosts((prev) => [...prev, ...result]);
        setHasMore(result.length === PAGE_SIZE);
      })
      .finally(() => setLoadingMore(false));
  }

  return (
    <div>
      <StoriesRow />

      {isAuthed && (
        <div style={{ display: "flex", gap: 4, padding: "0 0 12px" }}>
          <button
            className={`chip${feedTab === "for-you" ? " active" : ""}`}
            onClick={() => setFeedTab("for-you")}
            style={{ flex: 1 }}
          >
            {t("feed.for_you")}
          </button>
          <button
            className={`chip${feedTab === "following" ? " active" : ""}`}
            onClick={() => setFeedTab("following")}
            style={{ flex: 1 }}
          >
            {t("feed.following")}
          </button>
        </div>
      )}

      <div className="chip-row">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`chip${filter === f.value ? " active" : ""}`}
            onClick={() => setFilter(f.value)}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      {showSkeleton && (
        <div className="card-grid">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {!showSkeleton && loadError && <ErrorState onRetry={loadFeed} />}

      {!showSkeleton && !loadError && posts.length === 0 && (
        <div className="empty-state">
          <EmptyStateImage />
          <div className="empty-state-title">
            {debouncedSearch ? t("feed.empty_search") : feedTab === "following" ? t("feed.empty_following") : t("feed.empty_default")}
          </div>
          {debouncedSearch
            ? t("feed.empty_search_hint")
            : feedTab === "following"
              ? t("feed.empty_following_hint")
              : t("feed.empty_default_hint")}
        </div>
      )}

      {!showSkeleton && !loadError && posts.length > 0 && (
        <div className="card-grid">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {!showSkeleton && !loadError && hasMore && (
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 14 }}
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? t("feed.loading_more") : t("feed.show_more")}
        </button>
      )}
    </div>
  );
}
