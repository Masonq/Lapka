import { Routes, Route, Link, NavLink } from "react-router-dom";
import { MapPin, User, Plus } from "lucide-react";
import TabBar from "./components/TabBar";
import Feed from "./pages/Feed";
import NewPost from "./pages/NewPost";
import PostDetail from "./pages/PostDetail";
import Pets from "./pages/Pets";
import Services from "./pages/Services";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { NAV_ITEMS } from "./navConfig";

export default function App() {
  return (
    <div className="app-shell">
      <div className="top-header card">
        <div className="brand-block">
          <span className="brand">Lapa</span>
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
          <Link to="/new-post" className="btn btn-primary desktop-only" style={{ padding: "9px 16px" }}>
            <Plus size={16} strokeWidth={2.4} /> Новый пост
          </Link>
          <Link to="/profile" className="header-avatar" aria-label="Профиль">
            <User size={16} strokeWidth={2.2} />
          </Link>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/new-post" element={<NewPost />} />
        <Route path="/posts/:id" element={<PostDetail />} />
        <Route path="/pets" element={<Pets />} />
        <Route path="/services" element={<Services />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <TabBar />
    </div>
  );
}
