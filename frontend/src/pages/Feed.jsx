import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useSearchContext } from "../SearchContext";
import PostCard from "../components/PostCard";
import PostCardSkeleton from "../components/PostCardSkeleton";
import { useDocumentTitle } from "../useDocumentTitle";

const FILTERS = [
  { value: "", label: "Все" },
  { value: "lost", label: "Потеряшки" },
  { value: "found", label: "Найдены" },
  { value: "adopt", label: "Ищут дом" },
  { value: "question", label: "Вопросы" },
  { value: "general", label: "Общее" },
];


const PAGE_SIZE = 20;

export default function Feed() {
  useDocumentTitle("Лента");
  const { isAuthed } = useAuth();
  const { setSearchConfig } = useSearchContext();
  const [feedTab, setFeedTab] = useState("for-you");
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setSearchConfig({ value: search, onChange: setSearch, placeholder: "Искать по ленте: кличка, район…" });
    return () => setSearchConfig(null);
  }, [search, setSearchConfig]);

  function buildParams(offset) {
    const params = { limit: PAGE_SIZE, offset };
    if (filter) params.type = filter;
    if (debouncedSearch) params.q = debouncedSearch;
    if (feedTab === "following") params.following = true;
    return params;
  }

  useEffect(() => {
    setLoading(true);
    api
      .posts(buildParams(0))
      .then((result) => {
        setPosts(result);
        setHasMore(result.length === PAGE_SIZE);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [filter, debouncedSearch, feedTab]);

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


      {isAuthed && (
        <div style={{ display: "flex", gap: 4, padding: "0 0 12px" }}>
          <button
            className={`chip${feedTab === "for-you" ? " active" : ""}`}
            onClick={() => setFeedTab("for-you")}
            style={{ flex: 1 }}
          >
            Для тебя
          </button>
          <button
            className={`chip${feedTab === "following" ? " active" : ""}`}
            onClick={() => setFeedTab("following")}
            style={{ flex: 1 }}
          >
            Подписки
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
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="card-grid">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">
            {debouncedSearch ? "Ничего не нашлось" : feedTab === "following" ? "Пока пусто в подписках" : "Пока пусто"}
          </div>
          {debouncedSearch
            ? "Попробуй другой запрос"
            : feedTab === "following"
              ? "Подпишись на кого-нибудь через профиль — их посты появятся здесь"
              : "Будь первым, кто расскажет о своём питомце соседям"}
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="card-grid">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {!loading && hasMore && (
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 14 }}
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? "Загружаем…" : "Показать ещё"}
        </button>
      )}
    </div>
  );
}
