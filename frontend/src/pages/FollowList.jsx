import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import EmptyStateImage from "../components/EmptyStateImage";
import { api } from "../api/client";
import { useDocumentTitle } from "../useDocumentTitle";
import { useTranslation } from "react-i18next";

export default function FollowList() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "following" ? "following" : "followers";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const showSkeleton = useDelayedLoading(list === null);
  const title = mode === "following" ? t("follow_list.following_title") : t("follow_list.followers_title");
  useDocumentTitle(title);

  useEffect(() => {
    setList(null);
    const loader = mode === "following" ? api.following : api.followers;
    loader(id).then(setList).catch(() => setList([]));
  }, [id, mode]);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("follow_list.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{title}</span>
        <span style={{ width: 44 }} />
      </div>

      {showSkeleton && <ListItemSkeleton />}

      {!showSkeleton && list?.length === 0 && (
        <div className="empty-state">
          <EmptyStateImage />
          <div className="empty-state-title">{t("follow_list.empty_title")}</div>
          {mode === "following" ? t("follow_list.empty_following_hint") : t("follow_list.empty_followers_hint")}
        </div>
      )}

      {!showSkeleton && list?.map((u) => (
        <Link key={u.id} to={`/users/${u.id}`} className="card" style={{
          display: "flex", alignItems: "center", gap: 12, borderRadius: 16, padding: "12px 14px", marginBottom: 8,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, overflow: "hidden",
          }}>
            {u.avatar_url ? (
              <img src={u.avatar_url} alt={u.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              u.display_name[0]?.toUpperCase()
            )}
          </div>
          <div>
            <div className="subhead" style={{ fontSize: 14 }}>{u.display_name}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.city}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
