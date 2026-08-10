import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, PawPrint, UserPlus, UserMinus, MessageCircle, UserX, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { pluralize } from "../pluralize";
import PostCard from "../components/PostCard";
import DetailCardSkeleton from "../components/DetailCardSkeleton";
import { useTranslation } from "react-i18next";
import { translateSpecies } from "../dataLabels";

export default function UserProfile() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed, userId } = useAuth();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pets, setPets] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);

  useDocumentTitle(user ? user.display_name : t("user_profile.title"));

  function load() {
    api.user(id).then(setUser).catch(() => setNotFound(true));
    api.posts({ author_id: id, limit: 20 }).then(setPosts).catch(() => setPosts([]));
    api.petsOfUser(id).then(setPets).catch(() => setPets([]));
    api.followers(id).then(setFollowers).catch(() => setFollowers([]));
    api.following(id).then(setFollowingList).catch(() => setFollowingList([]));
    if (isAuthed) {
      api.blockedUsers().then((list) => setIsBlocked(list.some((b) => b.user.id === id))).catch(() => setIsBlocked(false));
    }
  }

  useEffect(load, [id, isAuthed]);

  const isOwnProfile = userId === id;
  const isFollowing = followers.some((f) => f.id === userId);

  async function toggleFollow() {
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await api.unfollow(id);
      } else {
        await api.follow(id);
      }
      const updated = await api.followers(id);
      setFollowers(updated);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setFollowBusy(false);
    }
  }

  async function toggleBlock() {
    if (!isBlocked && !confirmingBlock) {
      setConfirmingBlock(true);
      return;
    }
    setBlockBusy(true);
    try {
      if (isBlocked) {
        await api.unblockUser(id);
        showToast(t("user_profile.unblocked_toast"));
      } else {
        await api.blockUser(id);
        showToast(t("user_profile.blocked_toast"));
      }
      setConfirmingBlock(false);
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBlockBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">{t("user_profile.not_found_title")}</div>
        {t("user_profile.not_found_hint")}
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <div className="page-header">
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("user_profile.back_aria")}>
            <ArrowLeft size={17} strokeWidth={2.2} />
          </button>
          <span className="page-title">{t("user_profile.title")}</span>
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
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("user_profile.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("user_profile.title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="card" style={{ borderRadius: 20, padding: 18, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "var(--primary-tint)",
              color: "#95491B", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800, flexShrink: 0, overflow: "hidden",
            }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                user.display_name[0]?.toUpperCase()
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div className="subhead" style={{ fontSize: 18 }}>{user.display_name}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{user.city}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <Link to={`/users/${id}/connections?mode=followers`} style={{ fontSize: 13, color: "var(--text)", textDecoration: "none" }}>
                  <b>{followers.length}</b> {pluralize(followers.length, [t("plural.follower_one"), t("plural.follower_few"), t("plural.follower_many")])}
                </Link>
                <Link to={`/users/${id}/connections?mode=following`} style={{ fontSize: 13, color: "var(--text)", textDecoration: "none" }}>
                  <b>{followingList.length}</b> {pluralize(followingList.length, [t("plural.following_one"), t("plural.following_few"), t("plural.following_many")])}
                </Link>
              </div>
            </div>
          </div>

          {isAuthed && !isOwnProfile && !isBlocked && (
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                className={isFollowing ? "btn btn-ghost" : "btn btn-primary"}
                style={{ flex: 1 }}
                onClick={toggleFollow}
                disabled={followBusy}
              >
                {isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />}
                {isFollowing ? t("user_profile.unfollow") : t("user_profile.follow")}
              </button>
              <Link to={`/messages/${id}`} className="btn btn-ghost" style={{ flex: 1 }}>
                <MessageCircle size={16} /> {t("user_profile.write")}
              </Link>
            </div>
          )}

          {isAuthed && !isOwnProfile && (
            <button
              className="btn btn-ghost btn-block"
              style={{
                marginTop: 10, fontSize: 13,
                color: confirmingBlock ? "var(--red)" : isBlocked ? "var(--green-strong)" : "var(--text-faint)",
                background: confirmingBlock ? "var(--red-tint)" : undefined,
              }}
              onClick={toggleBlock}
              onBlur={() => setConfirmingBlock(false)}
              disabled={blockBusy}
            >
              {isBlocked ? <ShieldCheck size={14} /> : <UserX size={14} />}
              {isBlocked ? t("user_profile.unblock") : confirmingBlock ? t("user_profile.confirm_block") : t("user_profile.block")}
            </button>
          )}
        </div>

        {pets.length > 0 && (
          <>
            <h3 className="subhead" style={{ marginBottom: 10 }}>{t("user_profile.pets_title")}</h3>
            <div className="card-grid" style={{ marginBottom: 20 }}>
              {pets.map((pet) => (
                <Link key={pet.id} to={`/pets/${pet.id}`} className="card" style={{
                  borderRadius: 20, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: "var(--blue-tint)", color: "var(--blue)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden",
                  }}>
                    {pet.avatar_url ? (
                      <img src={pet.avatar_url} alt={t("pets.photo_alt", { name: pet.name })} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <PawPrint size={18} strokeWidth={2.2} />
                    )}
                  </div>
                  <div>
                    <div className="subhead" style={{ fontSize: 14 }}>{pet.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{translateSpecies(t, pet.species)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <h3 className="subhead" style={{ marginBottom: 10 }}>{t("user_profile.posts_title")}</h3>
        {posts.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-faint)" }}>{t("user_profile.no_posts")}</p>
        )}
        {posts.length > 0 && (
          <div className="card-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
