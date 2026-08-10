import { useEffect, useRef, useState } from "react";
import { Plus, X, Trash2, Loader2 } from "lucide-react";
import { api } from "../api/client";
import { useDelayedLoading } from "../useDelayedLoading";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useTranslation } from "react-i18next";

function timeAgo(iso, t) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return t("stories.just_now");
  return t("stories.hours_ago", { hours });
}

export default function StoriesRow() {
  const { t } = useTranslation();
  const { isAuthed, userId } = useAuth();
  const { showToast } = useToast();
  const [stories, setStories] = useState(null);
  const showSkeleton = useDelayedLoading(stories === null);
  const [viewerAuthorId, setViewerAuthorId] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  function load() {
    if (!isAuthed) return;
    api.stories().then(setStories).catch(() => setStories([]));
  }

  useEffect(load, [isAuthed]);

  if (!isAuthed) return null;

  const groups = [];
  const byAuthor = new Map();
  for (const s of stories || []) {
    if (!byAuthor.has(s.author.id)) {
      byAuthor.set(s.author.id, []);
      groups.push(s.author);
    }
    byAuthor.get(s.author.id).push(s);
  }

  const myStories = byAuthor.get(userId) || [];
  const otherAuthors = groups.filter((a) => a.id !== userId);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      await api.createStory(url);
      showToast(t("stories.published"));
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setUploading(false);
    }
  }

  function openViewer(authorId) {
    setViewerAuthorId(authorId);
    setViewerIndex(0);
  }

  const activeStories = viewerAuthorId ? byAuthor.get(viewerAuthorId) || [] : [];

  function nextStory() {
    if (viewerIndex < activeStories.length - 1) {
      setViewerIndex((i) => i + 1);
    } else {
      setViewerAuthorId(null);
    }
  }

  async function removeStory(id) {
    try {
      await api.deleteStory(id);
      setViewerAuthorId(null);
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if (stories === null) {
    if (!showSkeleton) return null;
    return (
      <div style={{ display: "flex", gap: 12, padding: "2px 0 14px" }} aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <span className="skeleton" style={{ width: 56, height: 56, borderRadius: "50%" }} />
            <span className="skeleton" style={{ width: 36, height: 13, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "2px 0 14px", scrollbarWidth: "none" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => (myStories.length ? openViewer(userId) : fileInputRef.current?.click())}
            style={{
              width: 56, height: 56, borderRadius: "50%", flexShrink: 0, position: "relative",
              border: myStories.length ? "2px solid var(--primary-strong)" : "2px dashed var(--border)",
              background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center",
            }}
            aria-label={myStories.length ? t("stories.my_story_aria") : t("stories.add_story_aria")}
          >
            {uploading ? (
              <Loader2 size={20} className="spin" style={{ color: "var(--text-faint)" }} />
            ) : myStories.length ? (
              <span style={{ fontSize: 18, fontWeight: 800, color: "var(--primary-strong)" }}>
                {myStories[0].author.display_name[0]?.toUpperCase()}
              </span>
            ) : (
              <Plus size={20} style={{ color: "var(--text-faint)" }} />
            )}
            {!myStories.length && (
              <span style={{
                position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: "50%",
                background: "var(--primary-strong)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid var(--bg)",
              }}>
                <Plus size={11} strokeWidth={3} />
              </span>
            )}
          </button>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{myStories.length ? t("stories.you") : t("stories.add")}</span>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleFile} />
        </div>

        {otherAuthors.map((author) => (
          <div key={author.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => openViewer(author.id)}
              style={{
                width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                border: "2px solid var(--primary-strong)", padding: 2, background: "var(--surface)",
              }}
              aria-label={t("stories.story_of_aria", { name: author.display_name })}
            >
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden",
                background: "var(--primary-tint)", color: "#95491B", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 800,
              }}>
                {author.avatar_url ? (
                  <img src={author.avatar_url} alt={author.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  author.display_name[0]?.toUpperCase()
                )}
              </div>
            </button>
            <span style={{ fontSize: 11, color: "var(--text-faint)", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {author.display_name.split(" ")[0]}
            </span>
          </div>
        ))}
      </div>

      {viewerAuthorId && activeStories[viewerIndex] && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 50, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 4, padding: "10px 12px 0" }}>
            {activeStories.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= viewerIndex ? "#fff" : "rgba(255,255,255,0.35)",
              }} />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
              background: "var(--primary-tint)", color: "#95491B", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800,
            }}>
              {activeStories[viewerIndex].author.avatar_url ? (
                <img src={activeStories[viewerIndex].author.avatar_url} alt={activeStories[viewerIndex].author.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                activeStories[viewerIndex].author.display_name[0]?.toUpperCase()
              )}
            </div>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, flex: 1 }}>
              {activeStories[viewerIndex].author.display_name}
              <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 400, marginLeft: 6 }}>
                {timeAgo(activeStories[viewerIndex].created_at, t)}
              </span>
            </div>
            {activeStories[viewerIndex].author.id === userId && (
              <button
                onClick={() => removeStory(activeStories[viewerIndex].id)}
                aria-label={t("stories.delete_story_aria")}
                style={{ color: "#fff", background: "none", border: "none", padding: 6, cursor: "pointer", display: "flex" }}
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={() => setViewerAuthorId(null)}
              aria-label={t("stories.close_aria")}
              style={{ color: "#fff", background: "none", border: "none", padding: 6, cursor: "pointer", display: "flex" }}
            >
              <X size={22} />
            </button>
          </div>

          <div style={{ flex: 1, position: "relative" }} onClick={nextStory}>
            <img src={activeStories[viewerIndex].photo_url} alt={t("stories.story_of_aria", { name: activeStories[viewerIndex].author.display_name })} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            {viewerIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setViewerIndex((i) => i - 1); }}
                style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "35%" }}
                aria-label={t("stories.previous_aria")}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
