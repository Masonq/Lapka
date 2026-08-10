import { useEffect, useState } from "react";
import { Routes, Route, Link, NavLink, useLocation } from "react-router-dom";
import { User, PlusCircle, Bell, Search, X } from "lucide-react";
import ScrollToTop from "./ScrollToTop";
import { useSearchContext } from "./SearchContext";
import OnboardingModal from "./components/OnboardingModal";
import TabBar from "./components/TabBar";
import Feed from "./pages/Feed";
import Explore from "./pages/Explore";
import Create from "./pages/Create";
import Messages from "./pages/Messages";
import NewPost from "./pages/NewPost";
import PostDetail from "./pages/PostDetail";
import Pets from "./pages/Pets";
import PetProfile from "./pages/PetProfile";
import SavedPosts from "./pages/SavedPosts";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Communities from "./pages/Communities";
import CommunityDetail from "./pages/CommunityDetail";
import Nearby from "./pages/Nearby";
import MapView from "./pages/MapView";
import MessageThread from "./pages/MessageThread";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Marketplace from "./pages/Marketplace";
import NewListing from "./pages/NewListing";
import ListingDetail from "./pages/ListingDetail";
import Adoption from "./pages/Adoption";
import FollowList from "./pages/FollowList";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import { NAV_ITEMS } from "./navConfig";
import { useAuth } from "./AuthContext";
import { api } from "./api/client";
import { useRealtimeEvent } from "./RealtimeContext";

export default function App() {
  const { isAuthed } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { config: searchConfig } = useSearchContext();
  const location = useLocation();
  const isThreadPage = /^\/messages\/[^/]+$/.test(location.pathname);

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
              placeholder={searchConfig.placeholder || "Искать…"}
            />
            <button className="icon-btn" onClick={() => setSearchOpen(false)} aria-label="Закрыть поиск">
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <>
            {searchConfig && (
              <button className="header-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Поиск">
                <Search size={17} strokeWidth={2.2} />
              </button>
            )}

            <Link to="/" className="brand-block" aria-label="На главную">
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
                  {label}
                </NavLink>
              ))}
            </nav>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
              <Link to="/create" className="btn btn-primary desktop-only" style={{ padding: "9px 16px" }}>
                <PlusCircle size={16} strokeWidth={2.4} /> Добавить
              </Link>
              {isAuthed && (
                <Link to="/notifications" className="header-icon-btn" aria-label="Уведомления">
                  <Bell size={17} strokeWidth={2.2} />
                  {unreadCount > 0 && <span className="header-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                </Link>
              )}
              <Link to="/profile" className="header-avatar" aria-label="Профиль">
                <User size={16} strokeWidth={2.2} />
              </Link>
            </div>
          </>
        )}
        </div>
      )}

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
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
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

      {!searchOpen && !isThreadPage && (
        <>
          <div className="bottom-scrim" />
          <TabBar unreadMessages={unreadMessages} />
        </>
      )}
    </div>
  );
}
