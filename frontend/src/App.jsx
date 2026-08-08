import { Routes, Route, Link, NavLink } from "react-router-dom";
import { MapPin, User, PlusCircle } from "lucide-react";
import TabBar from "./components/TabBar";
import Feed from "./pages/Feed";
import Explore from "./pages/Explore";
import Create from "./pages/Create";
import Messages from "./pages/Messages";
import NewPost from "./pages/NewPost";
import PostDetail from "./pages/PostDetail";
import Pets from "./pages/Pets";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import { NAV_ITEMS } from "./navConfig";

export default function App() {
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
            <PlusCircle size={16} strokeWidth={2.4} /> Создать
          </Link>
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
        <Route path="/profile" element={<Profile />} />
        <Route path="/users/:id" element={<UserProfile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <TabBar />
    </div>
  );
}
