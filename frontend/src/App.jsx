import { useEffect, useState } from "react";
import { Routes, Route, Link, NavLink } from "react-router-dom";
import { MapPin, User, PlusCircle, Bell } from "lucide-react";
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
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import { NAV_ITEMS } from "./navConfig";
import { useAuth } from "./AuthContext";
import { api } from "./api/client";

export default function App() {
  const { isAuthed } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthed) {
      setUnreadCount(0);
      return;
    }
    function poll() {
      api.unreadNotificationsCount().then(({ count }) => setUnreadCount(count)).catch(() => {});
    }
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [isAuthed]);

  return (
    <div className="app-shell">
      <div className="top-header card">
        <div className="brand-block">
          <span className="brand">PetSocial</span>
          <span className="brand-geo">
            <MapPin size={10} strokeWidth={2.5} /> beograd
          </span>
        </div>

        <nav className="desktop-nav">
          {NAV_ITEMS.map(({ to, label, end }) => (
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

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
      </div>

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
        <Route path="/profile" element={<Profile />} />
        <Route path="/users/:id" element={<UserProfile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <TabBar />
    </div>
  );
}
