import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Link, NavLink, useLocation } from "react-router-dom";
import { User, PlusCircle, Bell, Search, X, Loader2 } from "lucide-react";
import ScrollToTop from "./ScrollToTop";
import { useSearchContext } from "./SearchContext";
import OnboardingModal from "./components/OnboardingModal";
import TabBar from "./components/TabBar";

/**
 * Suspense-фолбэк с задержкой — раньше спиннер появлялся мгновенно при
 * любой, даже незаметно короткой, загрузке JS-чанка страницы, что выглядело
 * как лишнее мигание (та же причина, что и у задержки скелетов). React сам
 * корректно убирает Suspense-фолбэк, как только реальный контент готов —
 * риска "застревания" в отличие от обычных скелетов нет, поэтому здесь
 * достаточно простой задержки перед показом, без сложной логики
 * минимального времени показа.
 */
function DelayedSuspenseFallback() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(timer);
  }, []);
  if (!show) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}>
      <Loader2 size={28} className="spin" style={{ color: "var(--text-faint)" }} />
    </div>
  );
}

// Feed — единственная страница с обычным (не ленивым) импортом: это то, что
// видит почти каждый пользователь на самом первом экране, лениво грузить её
// означало бы добавить мигание загрузки на самый частый сценарий из всех.
// Остальные 27 страниц — lazy(), чтобы не тащить их код (включая тяжёлые
// библиотеки вроде leaflet для карты) в главный бандл, если пользователь
// туда вообще не заходит в этой сессии.
import Feed from "./pages/Feed";
const Explore = lazy(() => import("./pages/Explore"));
const Create = lazy(() => import("./pages/Create"));
const Messages = lazy(() => import("./pages/Messages"));
const NewPost = lazy(() => import("./pages/NewPost"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Pets = lazy(() => import("./pages/Pets"));
const PetProfile = lazy(() => import("./pages/PetProfile"));
const SavedPosts = lazy(() => import("./pages/SavedPosts"));
const SavedListings = lazy(() => import("./pages/SavedListings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const AdminProviders = lazy(() => import("./pages/AdminProviders"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminCommunities = lazy(() => import("./pages/AdminCommunities"));
const AdminAuditLog = lazy(() => import("./pages/AdminAuditLog"));
const Communities = lazy(() => import("./pages/Communities"));
const CommunityDetail = lazy(() => import("./pages/CommunityDetail"));
const Nearby = lazy(() => import("./pages/Nearby"));
const MapView = lazy(() => import("./pages/MapView"));
const MessageThread = lazy(() => import("./pages/MessageThread"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const NewListing = lazy(() => import("./pages/NewListing"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const Adoption = lazy(() => import("./pages/Adoption"));
const FollowList = lazy(() => import("./pages/FollowList"));
const Profile = lazy(() => import("./pages/Profile"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { NAV_ITEMS } from "./navConfig";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import { api } from "./api/client";
import { useRealtimeEvent } from "./RealtimeContext";
import { initAnalytics, trackPageview } from "./analytics";

export default function App() {
  const { t } = useTranslation();
  const { isAuthed } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { config: searchConfig } = useSearchContext();
  const location = useLocation();
  const isThreadPage = /^\/messages\/[^/]+$/.test(location.pathname);

  useEffect(() => { initAnalytics(); }, []);
  useEffect(() => { trackPageview(location.pathname); }, [location.pathname]);

  useEffect(() => setSearchOpen(false), [location.pathname]);
  useEffect(() => {
    if (!searchConfig) setSearchOpen(false);
  }, [searchConfig]);

  useEffect(() => {
    if (!isAuthed) {
      setUnreadCount(0);
      setUnreadMessages(0);
      return;
    }
    function poll() {
      api.unreadNotificationsCount().then(({ count }) => setUnreadCount(count)).catch(() => {});
      api.unreadMessagesCount().then(({ count }) => setUnreadMessages(count)).catch(() => {});
    }
    poll();
    // Поллинг реже, чем раньше (было 30с) — теперь только страховка на случай,
    // если WebSocket недоступен (прокси/файрвол блокирует upgrade), основная
    // доставка идёт через real-time ниже
    const interval = setInterval(poll, 60000);
    return () => clearInterval(interval);
  }, [isAuthed]);

  useRealtimeEvent((event) => {
    if (event.type === "new_notification") {
      setUnreadCount((n) => n + 1);
    } else if (event.type === "new_message") {
      // Не бампаю счётчик, если пользователь прямо сейчас смотрит именно эту
      // переписку — там сообщение и так появится живьём, а непрочитанным
      // оно быть не должно (см. MessageThread.jsx, отмечает прочитанным при открытии)
      const inThatThread = location.pathname === `/messages/${event.from_user_id}`;
      if (!inThatThread) setUnreadMessages((n) => n + 1);
    }
  });

  useEffect(() => {
    if (!isAuthed) return;
    if (localStorage.getItem("onboarding_completed") === "true") return;
    api.me().then((me) => {
      if (!me.has_completed_onboarding) setShowOnboarding(true);
    }).catch(() => {});
  }, [isAuthed]);

  return (
    <div className="app-shell">
      <ScrollToTop />
      {showOnboarding && <OnboardingModal onDone={() => setShowOnboarding(false)} />}
      {!isThreadPage && (
        <div className="top-header card">
          {searchOpen && searchConfig ? (
            <div className="header-search-active">
              <Search size={17} strokeWidth={2.2} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
            <input
              type="text"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              value={searchConfig.value}
              onChange={(e) => searchConfig.onChange(e.target.value)}
              placeholder={searchConfig.placeholder || t("common.search_placeholder")}
            />
            <button className="icon-btn" onClick={() => setSearchOpen(false)} aria-label={t("common.close_search")}>
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <>
            {searchConfig && (
              <button className="header-icon-btn" onClick={() => setSearchOpen(true)} aria-label={t("nav.explore")}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            )}

            <Link to="/" className="brand-block" aria-label={t("common.go_home")}>
              <img src="/logo.png" alt="Lapki.info" className="brand-logo" />
            </Link>

            <nav className="desktop-nav">
              {NAV_ITEMS.filter((item) => !item.primary).map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => `desktop-nav-item${isActive ? " active" : ""}`}
                >
                  {t(label)}
                </NavLink>
              ))}
            </nav>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
              <Link to="/create" className="btn btn-primary desktop-only" style={{ padding: "9px 16px" }}>
                <PlusCircle size={16} strokeWidth={2.4} /> {t("nav.create")}
              </Link>
              {isAuthed && (
                <Link to="/notifications" className="header-icon-btn" aria-label={t("common.notifications")}>
                  <Bell size={17} strokeWidth={2.2} />
                  {unreadCount > 0 && <span className="header-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                </Link>
              )}
              <Link to="/profile" className="header-avatar" aria-label={t("nav.profile")}>
                <User size={16} strokeWidth={2.2} />
              </Link>
            </div>
          </>
        )}
        </div>
      )}

      <Suspense fallback={<DelayedSuspenseFallback />}>
        <div key={location.pathname} className="page-transition">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/create" element={<Create />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/new-post" element={<NewPost />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/pets" element={<Pets />} />
          <Route path="/pets/:id" element={<PetProfile />} />
          <Route path="/saved" element={<SavedPosts />} />
          <Route path="/saved-listings" element={<SavedListings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/providers" element={<AdminProviders />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/communities" element={<AdminCommunities />} />
          <Route path="/admin/audit-log" element={<AdminAuditLog />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/communities/:id" element={<CommunityDetail />} />
          <Route path="/nearby" element={<Nearby />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/messages/:userId" element={<MessageThread />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/new" element={<NewListing />} />
          <Route path="/marketplace/:id" element={<ListingDetail />} />
          <Route path="/adoption" element={<Adoption />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/users/:id" element={<UserProfile />} />
          <Route path="/users/:id/connections" element={<FollowList />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </div>
      </Suspense>

      {!searchOpen && !isThreadPage && (
        <>
          <div className="bottom-scrim" />
          <TabBar unreadMessages={unreadMessages} />
        </>
      )}
    </div>
  );
}
