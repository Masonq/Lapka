import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, CalendarDays, ShoppingBag, Heart, ChevronRight, PawPrint, Map } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import ServiceCardSkeleton from "../components/ServiceCardSkeleton";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import EmptyStateImage from "../components/EmptyStateImage";
import ProviderCard from "../components/ProviderCard";
import PostCard from "../components/PostCard";
import { useDocumentTitle } from "../useDocumentTitle";
import { useSearchContext } from "../SearchContext";
import { pluralize } from "../pluralize";
import { useTranslation } from "react-i18next";
import { translateSpecies } from "../dataLabels";
import { translateBreed } from "../breeds";

const SERVICE_TYPES = [
  { value: "", labelKey: "explore.service_all" },
  { value: "sitter", labelKey: "explore.service_sitter" },
  { value: "boarding", labelKey: "explore.service_boarding" },
  { value: "trainer", labelKey: "explore.service_trainer" },
  { value: "vet", labelKey: "explore.service_vet" },
  { value: "groomer", labelKey: "explore.service_groomer" },
];

const SEARCH_TABS = [
  { value: "posts", labelKey: "explore.search_tab_posts" },
  { value: "people", labelKey: "explore.search_tab_people" },
  { value: "pets", labelKey: "explore.search_tab_pets" },
  { value: "communities", labelKey: "explore.search_tab_communities" },
  { value: "events", labelKey: "explore.search_tab_events" },
];

export default function Explore() {
  const { t } = useTranslation();
  useDocumentTitle(t("explore.title"));
  const { isAuthed } = useAuth();
  const { setSearchConfig } = useSearchContext();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchTab, setSearchTab] = useState("posts");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [providers, setProviders] = useState([]);
  const [serviceFilter, setServiceFilter] = useState("");
  const [loadingServices, setLoadingServices] = useState(true);
  const showServicesSkeleton = useDelayedLoading(loadingServices);
  const [servicesError, setServicesError] = useState(false);

  const [communities, setCommunities] = useState(null);
  const showCommunitiesSkeleton = useDelayedLoading(communities === null);
  const [communitiesError, setCommunitiesError] = useState(false);

  function loadCommunities() {
    setCommunitiesError(false);
    api.communities().then((list) => setCommunities(list.slice(0, 3))).catch(() => setCommunitiesError(true));
  }

  useEffect(loadCommunities, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setSearchConfig({ value: query, onChange: setQuery, placeholder: t("explore.search_placeholder") });
    return () => setSearchConfig(null);
  }, [query, setSearchConfig]);

  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const searchers = {
      posts: () => api.posts({ q: debouncedQuery, limit: 20 }),
      people: () => api.users({ q: debouncedQuery, limit: 20 }),
      pets: () => api.pets({ q: debouncedQuery, limit: 20 }),
      communities: () => api.communities({ q: debouncedQuery }),
      events: () => api.events({ q: debouncedQuery, limit: 20 }),
    };
    searchers[searchTab]()
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery, searchTab]);

  function loadServices() {
    setLoadingServices(true);
    api.services(serviceFilter ? { type: serviceFilter } : {})
      .then(setProviders)
      .catch(() => setProviders([]))
      .finally(() => setLoadingServices(false));
  }

  useEffect(loadServices, [serviceFilter]);

  const isSearching = debouncedQuery.length > 0;

  return (
    <div>
      <div className="page-header">
        <span className="page-title">{t("explore.title")}</span>
      </div>

      {isSearching && (
        <div className="chip-row" style={{ marginBottom: 16 }}>
          {SEARCH_TABS.map((tb) => (
            <button key={tb.value} className={`chip${searchTab === tb.value ? " active" : ""}`} onClick={() => setSearchTab(tb.value)}>
              {t(tb.labelKey)}
            </button>
          ))}
        </div>
      )}

      {isSearching ? (
        <>
          {searching && <p style={{ fontSize: 13, color: "var(--text-faint)" }}>{t("explore.searching")}</p>}

          {!searching && searchResults?.length === 0 && (
            <div className="empty-state">
              <EmptyStateImage />
              <div className="empty-state-title">{t("explore.empty_title")}</div>
              {t("explore.empty_hint")}
            </div>
          )}

          {!searching && searchResults?.length > 0 && searchTab === "posts" && (
            <div className="card-grid">
              {searchResults.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          )}

          {!searching && searchResults?.length > 0 && searchTab === "people" && (
            <div className="card-grid">
              {searchResults.map((u) => (
                <Link key={u.id} to={`/users/${u.id}`} className="card" style={{
                  borderRadius: 20, padding: 16, display: "flex", alignItems: "center", gap: 12,
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
          )}

          {!searching && searchResults?.length > 0 && searchTab === "pets" && (
            <div className="card-grid">
              {searchResults.map((pet) => (
                <Link key={pet.id} to={`/pets/${pet.id}`} className="card" style={{
                  borderRadius: 20, padding: 16, display: "flex", alignItems: "center", gap: 12,
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
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{translateSpecies(t, pet.species)}{pet.breed ? `, ${translateBreed(t, pet.breed)}` : ""}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!searching && searchResults?.length > 0 && searchTab === "communities" && (
            <div className="card-grid">
              {searchResults.map((c) => (
                <Link key={c.id} to={`/communities/${c.id}`} className="card" style={{
                  borderRadius: 20, padding: 16, display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, overflow: "hidden",
                  }}>
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      c.name[0]?.toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="subhead" style={{ fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.members_count} {pluralize(c.members_count, [t("plural.member_one"), t("plural.member_few"), t("plural.member_many")])}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!searching && searchResults?.length > 0 && searchTab === "events" && (
            <div className="card-grid">
              {searchResults.map((ev) => (
                <Link key={ev.id} to={`/events/${ev.id}`} className="card" style={{ borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", height: "100%" }}>
                  <span className="post-badge" style={{ background: "var(--gray-tint)", color: "var(--text-muted)" }}>
                    {ev.type === "walk" ? t("events.walk_chip") : t("events.event_chip")}
                  </span>
                  <h3 className="post-title" style={{ marginTop: 8, fontSize: 15 }}>{ev.title}</h3>
                  {ev.location && (
                    <div className="post-meta"><span className="post-meta-item" style={{ minWidth: 0 }}><MapPin size={13} /> <span className="post-meta-text" title={ev.location}>{ev.location}</span></span></div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <Link to="/nearby" className="card" style={{
            borderRadius: 20, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "var(--blue-tint)", color: "var(--blue)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <MapPin size={17} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="subhead" style={{ fontSize: 14 }}>{t("explore.nearby_title")}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("explore.nearby_hint")}</div>
            </div>
            <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
          </Link>

          <Link to="/map" className="card" style={{
            borderRadius: 20, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "var(--red-tint)", color: "var(--red)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Map size={17} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="subhead" style={{ fontSize: 14 }}>{t("explore.map_title")}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("explore.map_hint")}</div>
            </div>
            <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
          </Link>

          <Link to="/events" className="card" style={{
            borderRadius: 20, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "var(--green-tint)", color: "var(--green-strong)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <CalendarDays size={17} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="subhead" style={{ fontSize: 14 }}>{t("explore.events_title")}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("explore.events_hint")}</div>
            </div>
            <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
          </Link>

          <Link to="/marketplace" className="card" style={{
            borderRadius: 20, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <ShoppingBag size={17} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="subhead" style={{ fontSize: 14 }}>{t("explore.marketplace_title")}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("explore.marketplace_hint")}</div>
            </div>
            <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
          </Link>

          <Link to="/adoption" className="card" style={{
            borderRadius: 20, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "var(--red-tint)", color: "var(--red)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Heart size={17} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="subhead" style={{ fontSize: 14 }}>{t("explore.adoption_title")}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("explore.adoption_hint")}</div>
            </div>
            <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
          </Link>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 className="subhead" style={{ margin: 0 }}>{t("explore.communities_title")}</h3>
            <Link to="/communities" style={{ display: "flex", alignItems: "center", fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
              {t("explore.see_all")} <ChevronRight size={14} />
            </Link>
          </div>

          {showCommunitiesSkeleton && <ListItemSkeleton count={2} />}

          {communities?.length > 0 && (
            <div className="card-grid" style={{ marginBottom: 24 }}>
                {communities.map((c) => (
                  <Link key={c.id} to={`/communities/${c.id}`} className="card" style={{
                    borderRadius: 20, padding: 14, display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 13,
                    }}>
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="subhead" style={{ fontSize: 13 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.members_count} {pluralize(c.members_count, [t("plural.member_one"), t("plural.member_few"), t("plural.member_many")])}</div>
                    </div>
                  </Link>
                ))}
              </div>
          )}

          <h3 className="subhead" style={{ marginBottom: 10 }}>{t("explore.services_title")}</h3>

          <div className="chip-row" style={{ padding: 0, marginBottom: 10 }}>
            {SERVICE_TYPES.map((sv) => (
              <button
                key={sv.value}
                className={`chip${serviceFilter === sv.value ? " active" : ""}`}
                onClick={() => setServiceFilter(sv.value)}
              >
                {t(sv.labelKey)}
              </button>
            ))}
          </div>

          {showServicesSkeleton && (
            <div className="card-grid" style={{ marginBottom: 24 }}>
              <ServiceCardSkeleton />
              <ServiceCardSkeleton />
            </div>
          )}

          {!loadingServices && providers.length === 0 && (
            <div className="empty-state" style={{ padding: "24px 20px" }}>
              {t("explore.no_providers")}
            </div>
          )}

          {!loadingServices && providers.length > 0 && (
            <div className="card-grid" style={{ marginBottom: 24 }}>
              {providers.map((p) => <ProviderCard key={p.id} provider={p} onReviewed={loadServices} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
