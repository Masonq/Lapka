import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, MapPin, UserPlus, UserMinus, PlusCircle } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useTranslation } from "react-i18next";
import PostCard from "../components/PostCard";
import PostCardSkeleton from "../components/PostCardSkeleton";
import DetailCardSkeleton from "../components/DetailCardSkeleton";

export default function CommunityDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { showToast } = useToast();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(community ? community.name : t("community_detail.title"));

  function load() {
    api.community(id).then(setCommunity).catch(() => setNotFound(true));
    api.posts({ community_id: id, limit: 30 }).then(setPosts).catch(() => setPosts([]));
  }

  useEffect(load, [id]);

  async function toggleMembership() {
    setBusy(true);
    try {
      if (community.is_member) await api.leaveCommunity(id);
      else await api.joinCommunity(id);
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">{t("community_detail.not_found_title")}</div>
        {t("community_detail.not_found_hint")}
      </div>
    );
  }

  if (!community) {
    return (
      <div>
        <div className="page-header">
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("community_detail.back_aria")}>
            <ArrowLeft size={17} strokeWidth={2.2} />
          </button>
          <span className="page-title">{t("community_detail.title")}</span>
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
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("community_detail.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("community_detail.title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="card" style={{ borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, flexShrink: 0, overflow: "hidden",
            }}>
              {community.avatar_url ? (
                <img src={community.avatar_url} alt={community.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                community.name[0]?.toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="subhead" style={{ fontSize: 18 }}>{community.name}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Users size={13} /> {community.members_count}
                </span>
                {community.city && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={13} /> {community.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {community.description && (
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {community.description}
            </p>
          )}

          {isAuthed && (
            <button
              className={community.is_member ? "btn btn-ghost btn-block" : "btn btn-primary btn-block"}
              onClick={toggleMembership}
              disabled={busy}
            >
              {community.is_member ? <UserMinus size={16} /> : <UserPlus size={16} />}
              {community.is_member ? t("community_detail.leave") : t("community_detail.join")}
            </button>
          )}
        </div>

        {isAuthed && community.is_member && (
          <button
            className="btn btn-ghost btn-block"
            style={{ marginBottom: 16 }}
            onClick={() => navigate(`/new-post?type=general&community_id=${id}`)}
          >
            <PlusCircle size={16} /> {t("community_detail.write_to_community")}
          </button>
        )}

        <h3 className="subhead" style={{ marginBottom: 10 }}>{t("community_detail.community_posts")}</h3>

        {posts === null && <div className="card-grid"><PostCardSkeleton /><PostCardSkeleton /></div>}

        {posts?.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
            {t("community_detail.empty_posts")}
          </p>
        )}

        {posts?.length > 0 && (
          <div className="card-grid">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </div>
    </div>
  );
}
