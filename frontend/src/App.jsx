import { Routes, Route } from "react-router-dom";
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
      <div className="top-header">
        <div className="brand">
          LapaBG<span className="brand-dot" />
        </div>
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
