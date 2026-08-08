import { Routes, Route, Link } from "react-router-dom";
import { MapPin, User } from "lucide-react";
import TabBar from "./components/TabBar";
import Feed from "./pages/Feed";
import NewPost from "./pages/NewPost";
import PostDetail from "./pages/PostDetail";
import Pets from "./pages/Pets";
import Services from "./pages/Services";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <div className="app-shell">
      <div className="top-header glass">
        <div className="brand-block">
          <span className="brand">Lapa</span>
          <span className="brand-geo">
            <MapPin size={10} strokeWidth={2.5} /> beograd
          </span>
        </div>
        <Link to="/profile" className="header-avatar">
          <User size={16} strokeWidth={2.2} />
        </Link>
      </div>

      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/new-post" element={<NewPost />} />
        <Route path="/posts/:id" element={<PostDetail />} />
        <Route path="/pets" element={<Pets />} />
        <Route path="/services" element={<Services />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>

      <TabBar />
    </div>
  );
}
