import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X, AlertTriangle, MapPinCheck, Heart } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
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

const QUICK_ACTIONS = [
  { type: "lost", label: "Потерялся", icon: AlertTriangle, tint: "var(--red-tint)", color: "var(--red)" },
  { type: "found", label: "Нашёлся", icon: MapPinCheck, tint: "var(--green-tint)", color: "var(--green-strong)" },
  { type: "adopt", label: "Ищет дом", icon: Heart, tint: "var(--primary-tint)", color: "#95491B" },
];

const PAGE_SIZE = 20;

export default function Feed() {
  useDocumentTitle("Лента");
  const { isAuthed } = useAuth();
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
        <div style={{ display: "flex", gap: 10, padding: "4px 0 16px" }}>
          {QUICK_ACTIONS.map(({ type, label, icon: Icon, tint, color }) => (
            <Link
              key={type}
              to={`/new-post?type=${type}`}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "12px 4px", borderRadius: 16, background: tint, color,
              }}
            >
              <Icon size={19} strokeWidth={2.2} />
              <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
            </Link>
          ))}
        </div>
      )}

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

      <div className="search-bar sticky-search">
        <Search size={17} strokeWidth={2.2} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Искать по ленте: кличка, район…"
          aria-label="Поиск по ленте"
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch("")} aria-label="Очистить поиск">
            <X size={14} strokeWidth={2.4} />
          </button>
        )}
      </div>

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
