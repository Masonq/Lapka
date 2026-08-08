import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../api/client";
import PostCard from "../components/PostCard";

const FILTERS = [
  { value: "", label: "Все" },
  { value: "lost", label: "Потеряшки" },
  { value: "found", label: "Найдены" },
  { value: "adopt", label: "Ищут дом" },
  { value: "question", label: "Вопросы" },
  { value: "general", label: "Общее" },
];

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = filter ? { type: filter } : {};
    api
      .posts(params)
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
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

      {loading && <div className="empty-state">Загружаем ленту…</div>}

      {!loading && posts.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">Пока пусто</div>
          Будь первым, кто расскажет о своём питомце соседям
        </div>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      <Link to="/new-post" className="fab" aria-label="Новый пост">
        <Plus size={22} strokeWidth={2.4} />
      </Link>
    </div>
  );
}
