import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, X } from "lucide-react";
import { api } from "../api/client";
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
    setLoading(true);
    const params = { limit: PAGE_SIZE, offset: 0 };
    if (filter) params.type = filter;
    if (debouncedSearch) params.q = debouncedSearch;
    api
      .posts(params)
      .then((result) => {
        setPosts(result);
        setHasMore(result.length === PAGE_SIZE);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [filter, debouncedSearch]);

  function loadMore() {
    setLoadingMore(true);
    const params = { limit: PAGE_SIZE, offset: posts.length };
    if (filter) params.type = filter;
    if (debouncedSearch) params.q = debouncedSearch;
    api
      .posts(params)
      .then((result) => {
        setPosts((prev) => [...prev, ...result]);
        setHasMore(result.length === PAGE_SIZE);
      })
      .finally(() => setLoadingMore(false));
  }

  return (
    <div>
      <div className="search-bar">
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
          <div className="empty-state-title">{debouncedSearch ? "Ничего не нашлось" : "Пока пусто"}</div>
          {debouncedSearch ? "Попробуй другой запрос" : "Будь первым, кто расскажет о своём питомце соседям"}
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

      <Link to="/create" className="fab" aria-label="Создать">
        <Plus size={22} strokeWidth={2.4} />
      </Link>
    </div>
  );
}
