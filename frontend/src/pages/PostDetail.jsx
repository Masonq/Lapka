import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, CheckCircle2, Trash2, Bookmark, Flag, Eye, Plus, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import DetailCardSkeleton from "../components/DetailCardSkeleton";

const TYPE_LABELS = {
  lost: "Потерялся",
  found: "Найден",
  adopt: "Ищет дом",
  question: "Вопрос",
  general: "Пост",
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  return `${Math.floor(hrs / 24)} дн назад`;
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed, userId } = useAuth();
  const { showToast } = useToast();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reported, setReported] = useState(false);
  const [sightings, setSightings] = useState([]);
  const [showSightingForm, setShowSightingForm] = useState(false);
  const [sightingLocation, setSightingLocation] = useState("");
  const [sightingNote, setSightingNote] = useState("");
  const [submittingSighting, setSubmittingSighting] = useState(false);
  useDocumentTitle(post ? post.title : "Пост");

  function load() {
    api.post(id).then(setPost).catch(() => setNotFound(true));
    api.comments(id).then(setComments).catch(() => setComments([]));
    api.sightings(id).then(setSightings).catch(() => setSightings([]));
  }

  useEffect(load, [id]);

  async function submitComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api.addComment(id, { body: text });
      setText("");
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function markResolved() {
    await api.resolvePost(id);
    showToast("Отмечено решённым");
    load();
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await api.deletePost(id);
    showToast("Пост удалён");
    navigate("/");
  }

  async function toggleSave() {
    try {
      if (post.is_saved) await api.unsavePost(id);
      else await api.savePost(id);
      setPost((p) => ({ ...p, is_saved: !p.is_saved }));
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function submitReport(e) {
    e.preventDefault();
    try {
      await api.reportPost(id, reportReason.trim() || undefined);
      setReported(true);
      setShowReportForm(false);
      showToast("Жалоба отправлена");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function submitSighting(e) {
    e.preventDefault();
    if (!sightingLocation.trim()) return;
    setSubmittingSighting(true);
    try {
      await api.addSighting(id, { location: sightingLocation, note: sightingNote || undefined });
      setSightingLocation("");
      setSightingNote("");
      setShowSightingForm(false);
      showToast("Спасибо, отметил(а)");
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmittingSighting(false);
    }
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Пост не найден</div>
        Возможно, его удалили или ссылка устарела
      </div>
    );
  }

  if (!post) {
    return (
      <div>
        <div className="page-header">
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
            <ArrowLeft size={17} strokeWidth={2.2} />
          </button>
          <span className="page-title">Пост</span>
          <span style={{ width: 44 }} />
        </div>
        <div className="detail-shell">
          <DetailCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Пост</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="post-card card" style={{ marginBottom: 20 }}>
          {post.photo_url && (
            <img src={post.photo_url} alt={post.title} className="post-card-photo" />
          )}
          <span className={`post-badge ${post.type}`}>
            {post.is_resolved && <CheckCircle2 size={12} />}
            {post.is_resolved ? "Решено" : TYPE_LABELS[post.type]}
          </span>
          {post.author.is_staff && (
            <span className="badge badge-solid badge-sm" style={{ marginLeft: 6 }}>
              <ShieldCheck size={11} /> Администрация
            </span>
          )}
          <h2 className="post-title">{post.title}</h2>
          <p className="post-body">{post.body}</p>
          {post.last_seen_location && (
            <div className="post-meta" style={{ marginBottom: 8 }}>
              <span className="post-meta-item"><MapPin size={13} /> {post.last_seen_location}</span>
            </div>
          )}
          <div className="post-meta">
            <Link to={`/users/${post.author.id}`} className="post-meta-author">{post.author.display_name}</Link>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {isAuthed && !post.is_resolved && (post.type === "lost" || post.type === "found") && (
              <button className="btn btn-ghost" onClick={markResolved}>
                <CheckCircle2 size={16} /> Отметить решённым
              </button>
            )}
            {isAuthed && (
              <button className="btn btn-ghost" onClick={toggleSave}>
                <Bookmark size={16} fill={post.is_saved ? "currentColor" : "none"} />
                {post.is_saved ? "Сохранено" : "Сохранить"}
              </button>
            )}
            {post.author.id === userId && (
              <button
                className="btn btn-ghost"
                style={confirmingDelete ? { background: "var(--red-tint)", color: "var(--red)" } : undefined}
                onClick={handleDelete}
                onBlur={() => setConfirmingDelete(false)}
              >
                <Trash2 size={16} /> {confirmingDelete ? "Точно удалить?" : "Удалить пост"}
              </button>
            )}
            {isAuthed && post.author.id !== userId && !reported && (
              <button className="btn btn-ghost" onClick={() => setShowReportForm((v) => !v)}>
                <Flag size={16} /> Пожаловаться
              </button>
            )}
            {reported && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-faint)" }}>
                <Flag size={14} /> Жалоба отправлена
              </span>
            )}
          </div>

          {showReportForm && (
            <form onSubmit={submitReport} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <textarea
                rows={2}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Что не так с постом? (необязательно)"
                style={{
                  width: "100%", border: "1px solid var(--border)", borderRadius: 12,
                  padding: "8px 12px", fontSize: 16, fontFamily: "var(--font-body)", marginBottom: 8, resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary">Отправить жалобу</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowReportForm(false)}>Отмена</button>
              </div>
            </form>
          )}
        </div>

        {(post.type === "lost" || post.type === "found") && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 className="subhead" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <Eye size={16} /> Видели тут ({sightings.length})
              </h3>
              {isAuthed && !showSightingForm && (
                <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setShowSightingForm(true)}>
                  <Plus size={14} /> Я видел(а)
                </button>
              )}
            </div>

            {showSightingForm && (
              <form onSubmit={submitSighting} className="card" style={{ borderRadius: 16, padding: 14, marginBottom: 10 }}>
                <div className="field">
                  <label htmlFor="sighting-location">Где видели</label>
                  <input
                    id="sighting-location"
                    value={sightingLocation}
                    onChange={(e) => setSightingLocation(e.target.value)}
                    required
                    placeholder="Например: угол Кнез Михайловой и Васиной"
                  />
                </div>
                <div className="field">
                  <label htmlFor="sighting-note">Подробности</label>
                  <textarea
                    id="sighting-note"
                    rows={2}
                    value={sightingNote}
                    onChange={(e) => setSightingNote(e.target.value)}
                    placeholder="Куда побежал(а), в каком состоянии — необязательно"
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" disabled={submittingSighting}>
                    {submittingSighting ? "Отправляем…" : "Отправить"}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowSightingForm(false)}>Отмена</button>
                </div>
              </form>
            )}

            {sightings.length === 0 && !showSightingForm && (
              <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Пока никто не отмечал наблюдений</p>
            )}

            {sightings.map((s) => (
              <div key={s.id} className="card" style={{ borderRadius: 16, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700 }}>
                  <MapPin size={13} /> {s.location}
                </div>
                {s.note && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{s.note}</div>}
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
                  {s.reporter.display_name} · {timeAgo(s.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 className="subhead" style={{ marginBottom: 10 }}>
          Комментарии ({comments.length})
        </h3>

        {comments.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 12 }}>
            Пока нет комментариев — можешь стать первым
          </p>
        )}

        {comments.map((c) => (
          <div key={c.id} className="card" style={{ borderRadius: 16, padding: "10px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <Link to={`/users/${c.author.id}`} className="post-meta-author" style={{ fontSize: 12 }}>
                {c.author.display_name}
              </Link>
              {c.author.is_staff && (
                <span className="badge badge-solid badge-sm" style={{ padding: "2px 7px" }}>
                  <ShieldCheck size={10} /> Администрация
                </span>
              )}
            </div>
            <div style={{ fontSize: 14 }}>{c.body}</div>
          </div>
        ))}

        {isAuthed ? (
          <form onSubmit={submitComment} style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              style={{
                flex: 1, border: "1px solid var(--border)", borderRadius: 999,
                padding: "10px 16px", fontSize: 16, background: "var(--surface)",
              }}
              placeholder="Написать комментарий…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn btn-primary">Отправить</button>
          </form>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 12 }}>
            Войди, чтобы оставить комментарий
          </p>
        )}
      </div>
    </div>
  );
}
